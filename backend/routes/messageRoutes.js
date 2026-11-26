const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

// ===============================
// MULTER CONFIG FOR MESSAGE IMAGES
// Single image, JPG/PNG/WEBP, max 5MB
// ===============================
const messageUploadDir = path.join(process.cwd(), 'uploads', 'messages')
fs.mkdirSync(messageUploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, messageUploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `msg-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed.'))
  }
}

const uploadMessageImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single('image')

function cleanupUploadedFile(file) {
  if (file?.path) {
    fs.unlink(file.path, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Failed to clean up message image:', unlinkErr)
      }
    })
  }
}

// Require admin role for admin-only routes
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required',
    })
  }

  next()
}

// GET ALL CONVERSATIONS — ADMIN ONLY
router.get('/conversations', authMiddleware, requireAdmin, (req, res) => {
  const sql = `
    SELECT
      u.user_id,
      u.full_name,
      u.email,
      MAX(m.created_at) AS last_message_at,
      SUBSTRING_INDEX(
        GROUP_CONCAT(
          CASE
            WHEN m.message_text IS NOT NULL AND TRIM(m.message_text) <> '' THEN m.message_text
            WHEN m.image_url IS NOT NULL AND TRIM(m.image_url) <> '' THEN '[Photo]'
            ELSE ''
          END
          ORDER BY m.created_at DESC, m.message_id DESC
        ),
        ',,',
        1
      ) AS latest_message,
      SUM(
        CASE
          WHEN m.sender_role = 'consumer' AND m.is_read = 0 THEN 1
          ELSE 0
        END
      ) AS unread_count
    FROM users u
    INNER JOIN messages m ON m.user_id = u.user_id
    WHERE u.role = 'consumer'
    GROUP BY u.user_id, u.full_name, u.email
    ORDER BY last_message_at DESC
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Fetch conversations error:', err)
      return res.status(500).json({
        message: 'Failed to fetch conversations',
      })
    }

    res.json(results)
  })
})

// GET UNREAD ADMIN MESSAGES COUNT — CONSUMER ONLY
router.get('/unread-count', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Consumer access required',
    })
  }

  const sql = `
    SELECT COUNT(*) AS unread_count
    FROM messages
    WHERE user_id = ?
      AND sender_role = 'admin'
      AND is_read = 0
  `

  db.query(sql, [req.user.user_id], (err, results) => {
    if (err) {
      console.error('Unread messages count error:', err)

      return res.status(500).json({
        message: 'Failed to fetch unread messages count',
      })
    }

    res.json({
      unread_count: Number(results[0]?.unread_count || 0),
    })
  })
})

// GET CONVERSATION HISTORY
// Consumers can only access their own conversation.
// Admins can access any consumer's conversation.
router.get('/conversation/:userId', authMiddleware, (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: 'Invalid user ID',
    })
  }

  if (
    req.user.role !== 'admin' &&
    Number(req.user.user_id) !== userId
  ) {
    return res.status(403).json({
      message: 'You can only access your own messages',
    })
  }

  const sql = `
    SELECT
      message_id,
      user_id,
      sender_role,
      message_text,
      image_url,
      is_read,
      created_at
    FROM messages
    WHERE user_id = ?
    ORDER BY created_at ASC, message_id ASC
  `

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Fetch messages error:', err)

      return res.status(500).json({
        message: 'Failed to fetch messages',
      })
    }

    // Mark messages from the other side as read
    const senderToMarkRead =
      req.user.role === 'admin' ? 'consumer' : 'admin'

    db.query(
      `UPDATE messages
       SET is_read = 1
       WHERE user_id = ?
         AND sender_role = ?
         AND is_read = 0`,
      [userId, senderToMarkRead],
      (updateErr) => {
        if (updateErr) {
          console.error('Mark messages read error:', updateErr)
        }

        res.json(results)
      }
    )
  })
})

// CONSUMER SENDS A MESSAGE (Text and/or Image)
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumers can use this endpoint',
    })
  }

  uploadMessageImage(req, res, (uploadErr) => {
    const uploadedFile = req.file || null

    if (uploadErr) {
      cleanupUploadedFile(uploadedFile)

      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'Image must be 5 MB or smaller.',
        })
      }

      return res.status(400).json({
        message: uploadErr.message || 'Image upload failed.',
      })
    }

    const messageText = String(req.body?.message_text || '').trim()
    const imageUrl = `uploadedFile ? /uploads/messages/${uploadedFile.filename} : null`

    if (!messageText && !imageUrl) {
      return res.status(400).json({
        message: 'Please enter a message or attach a picture.',
      })
    }

    if (messageText.length > 5000) {
      cleanupUploadedFile(uploadedFile)
      return res.status(400).json({
        message: 'Message must not exceed 5000 characters',
      })
    }

    const sql = `
      INSERT INTO messages (user_id, sender_role, message_text, image_url)
      VALUES (?, 'consumer', ?, ?)
    `

    db.query(sql, [req.user.user_id, messageText, imageUrl], (err, result) => {
      if (err) {
        console.error('Send consumer message error:', err)
        cleanupUploadedFile(uploadedFile)

        return res.status(500).json({
          message: 'Failed to send message',
        })
      }

      res.status(201).json({
        message: 'Message sent successfully',
        message_id: result.insertId,
        image_url: imageUrl,
      })
    })
  })
})

// ADMIN REPLIES TO A CONSUMER (Text and/or Image)
router.post('/:userId/reply', authMiddleware, requireAdmin, (req, res) => {
  const userId = Number(req.params.userId)

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: 'Invalid user ID',
    })
  }

  uploadMessageImage(req, res, (uploadErr) => {
    const uploadedFile = req.file || null

    if (uploadErr) {
      cleanupUploadedFile(uploadedFile)

      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'Image must be 5 MB or smaller.',
        })
      }

      return res.status(400).json({
        message: uploadErr.message || 'Image upload failed.',
      })
    }

    const messageText = String(req.body?.message_text || '').trim()
    const imageUrl = `uploadedFile ? /uploads/messages/${uploadedFile.filename} : null`

    if (!messageText && !imageUrl) {
      return res.status(400).json({
        message: 'Please enter a reply or attach a picture.',
      })
    }

    if (messageText.length > 5000) {
      cleanupUploadedFile(uploadedFile)
      return res.status(400).json({
        message: 'Reply must not exceed 5000 characters',
      })
    }

    db.query(
      'SELECT user_id FROM users WHERE user_id = ? AND role = ? LIMIT 1',
      [userId, 'consumer'],
      (userErr, users) => {
        if (userErr) {
          console.error('Check consumer error:', userErr)
          cleanupUploadedFile(uploadedFile)

          return res.status(500).json({
            message: 'Failed to verify consumer',
          })
        }

        if (users.length === 0) {
          cleanupUploadedFile(uploadedFile)
          return res.status(404).json({
            message: 'Consumer not found',
          })
        }

        db.query(
          `INSERT INTO messages (user_id, sender_role, message_text, image_url)
           VALUES (?, 'admin', ?, ?)`,
          [userId, messageText, imageUrl],
          (err, result) => {
            if (err) {
              console.error('Admin reply error:', err)
              cleanupUploadedFile(uploadedFile)

              return res.status(500).json({
                message: 'Failed to send reply',
              })
            }

            res.status(201).json({
              message: 'Reply sent successfully',
              message_id: result.insertId,
              image_url: imageUrl,
            })
          }
        )
      }
    )
  })
})

// =========================================
// ADMIN ONLINE / OFFLINE PRESENCE
// =========================================

// ADMIN HEARTBEAT — called while admin is logged in
router.post('/presence', authMiddleware, requireAdmin, (req, res) => {
  const adminId = req.user.user_id

  const sql = `
    UPDATE admin_presence
    SET admin_user_id = ?, last_seen = NOW()
    WHERE presence_id = 1
  `

  db.query(sql, [adminId], (err) => {
    if (err) {
      console.error('Admin presence update error:', err)

      return res.status(500).json({
        message: 'Failed to update admin presence',
      })
    }

    res.json({
      success: true,
      status: 'online',
    })
  })
})

// ADMIN GOES OFFLINE — called during logout
router.post('/presence/offline', authMiddleware, requireAdmin, (req, res) => {
  const adminId = req.user.user_id

  const sql = `
    UPDATE admin_presence
    SET last_seen = NULL
    WHERE presence_id = 1 AND admin_user_id = ?
  `

  db.query(sql, [adminId], (err) => {
    if (err) {
      console.error('Admin offline update error:', err)

      return res.status(500).json({
        message: 'Failed to update admin status',
      })
    }

    res.json({
      success: true,
      status: 'offline',
    })
  })
})

// CONSUMERS CHECK ADMIN STATUS
router.get('/presence', authMiddleware, (req, res) => {
  if (
    req.user.role !== 'consumer' &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({
      message: 'Access denied',
    })
  }

  const sql = `
    SELECT
      CASE
        WHEN last_seen >= NOW() - INTERVAL 45 SECOND THEN 1
        ELSE 0
      END AS is_online
    FROM admin_presence
    WHERE presence_id = 1
    LIMIT 1
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Check admin presence error:', err)

      return res.status(500).json({
        message: 'Failed to check admin status',
      })
    }

    const isOnline =
      results.length > 0 &&
      Number(results[0].is_online) === 1

    res.json({
      is_online: isOnline,
      status: isOnline ? 'online' : 'offline',
    })
  })
})

module.exports = router