
const express = require('express')
const router = express.Router()
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

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
        GROUP_CONCAT(m.message_text ORDER BY m.created_at DESC, m.message_id DESC),
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

// CONSUMER SENDS A MESSAGE
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumers can use this endpoint',
    })
  }

  const messageText = String(req.body.message_text || '').trim()

  if (!messageText) {
    return res.status(400).json({
      message: 'Message cannot be empty',
    })
  }

  if (messageText.length > 5000) {
    return res.status(400).json({
      message: 'Message must not exceed 5000 characters',
    })
  }

  const sql = `
    INSERT INTO messages (user_id, sender_role, message_text)
    VALUES (?, 'consumer', ?)
  `

  db.query(sql, [req.user.user_id, messageText], (err, result) => {
    if (err) {
      console.error('Send consumer message error:', err)

      return res.status(500).json({
        message: 'Failed to send message',
      })
    }

    res.status(201).json({
      message: 'Message sent successfully',
      message_id: result.insertId,
    })
  })
})

// ADMIN REPLIES TO A CONSUMER
router.post('/:userId/reply', authMiddleware, requireAdmin, (req, res) => {
  const userId = Number(req.params.userId)
  const messageText = String(req.body.message_text || '').trim()

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: 'Invalid user ID',
    })
  }

  if (!messageText) {
    return res.status(400).json({
      message: 'Reply cannot be empty',
    })
  }

  if (messageText.length > 5000) {
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

        return res.status(500).json({
          message: 'Failed to verify consumer',
        })
      }

      if (users.length === 0) {
        return res.status(404).json({
          message: 'Consumer not found',
        })
      }

      db.query(
        `INSERT INTO messages (user_id, sender_role, message_text)
         VALUES (?, 'admin', ?)`,
        [userId, messageText],
        (err, result) => {
          if (err) {
            console.error('Admin reply error:', err)

            return res.status(500).json({
              message: 'Failed to send reply',
            })
          }

          res.status(201).json({
            message: 'Reply sent successfully',
            message_id: result.insertId,
          })
        }
      )
    }
  )
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
