const express = require('express')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const router = express.Router()
const db = require('../db')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const authMiddleware = require('../middleware/authMiddleware')

// =====================================
// PROFILE PICTURE UPLOAD CONFIGURATION
// =====================================

const profileUploadDir = path.join(
  __dirname,
  '..',
  'uploads',
  'profiles'
)

fs.mkdirSync(profileUploadDir, { recursive: true })

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir)
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const uniqueName = `profile-${req.user.user_id}-${Date.now()}${extension}`
    cb(null, uniqueName)
  },
})

const profileUpload = multer({
  storage: profileStorage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true)
    }

    cb(new Error('Only JPG, PNG, and WEBP images are allowed.'))
  },
})

// =====================================
// HELPER: NORMALIZE MOBILE NUMBER
// =====================================

const normalizePhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) {
    return `0${digits.slice(2)}`
  }
  return digits
}

// =====================================
// LOGIN HELPER (EMAIL OR MOBILE NUMBER)
// =====================================

const authenticateUser = async (req, res, requiredRole) => {
  try {
    const rawIdentifier =
      req.body.identifier ??
      req.body.email ??
      req.body.contact_number ??
      ''
    const password = req.body.password

    const cleanIdentifier = String(rawIdentifier).trim()

    if (!cleanIdentifier || !password) {
      return res.status(400).json({
        message: 'Email or mobile number and password are required',
      })
    }

    const isEmail = cleanIdentifier.includes('@')
    const normalizedPhone = normalizePhone(cleanIdentifier)

    let sql
    let params

    if (isEmail) {
      sql = `
        SELECT
          user_id,
          full_name,
          email,
          contact_number,
          address,
          profile_picture,
          password,
          role,
          status
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `
      params = [cleanIdentifier]
    } else {
      sql = `
        SELECT
          user_id,
          full_name,
          email,
          contact_number,
          address,
          profile_picture,
          password,
          role,
          status
        FROM users
        WHERE contact_number = ?
           OR REPLACE(REPLACE(REPLACE(contact_number, ' ', ''), '-', ''), '+', '') = ?
        LIMIT 1
      `
      params = [cleanIdentifier, normalizedPhone]
    }

    const [results] = await db.promise().query(sql, params)

    if (results.length === 0) {
      return res.status(401).json({
        message: 'Invalid email/mobile number or password',
      })
    }

    const user = results[0]

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email/mobile number or password',
      })
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Your account is inactive',
      })
    }

    if (user.role !== requiredRole) {
      return res.status(403).json({
        message:
          requiredRole === 'admin'
            ? 'This account is not authorized for Admin Login.'
            : 'Administrator accounts must use the Admin Login page.',
      })
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'ani-malay-secret-key',
      {
        expiresIn: '1d',
      }
    )

    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        contact_number: user.contact_number,
        address: user.address,
        profile_picture: user.profile_picture || '',
        role: user.role,
        status: user.status,
      },
    })
  } catch (error) {
    console.error('Authentication error:', error)

    return res.status(500).json({
      message: 'Login failed. Please try again.',
    })
  }
}

// =====================================
// VERIFY CURRENT LOGGED-IN USER
// GET /api/users/me
// =====================================

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `
        SELECT
          user_id,
          full_name,
          email,
          contact_number,
          address,
          profile_picture,
          role,
          status
        FROM users
        WHERE user_id = ?
        LIMIT 1
      `,
      [req.user.user_id]
    )

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    return res.json({
      user: rows[0],
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return res.status(500).json({
      message: 'Failed to load user profile',
    })
  }
})

// =====================================
// ADMIN LOGIN
// POST /api/users/admin-login
// =====================================

router.post('/admin-login', (req, res) => {
  return authenticateUser(req, res, 'admin')
})

// =====================================
// CONSUMER LOGIN
// POST /api/users/login
// =====================================

router.post('/login', (req, res) => {
  return authenticateUser(req, res, 'consumer')
})

// =====================================
// GET ALL USERS
// =====================================

router.get('/', (req, res) => {
  const { search, role, status } = req.query

  let sql = `
    SELECT
      user_id,
      full_name,
      email,
      contact_number,
      address,
      profile_picture,
      role,
      status,
      created_at
    FROM users
    WHERE 1 = 1
  `

  const values = []

  if (search) {
    sql += `
      AND (
        full_name LIKE ?
        OR email LIKE ?
        OR contact_number LIKE ?
      )
    `

    values.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    )
  }

  if (role) {
    sql +=  `AND role = ?`
    values.push(role)
  }

  if (status) {
    sql +=  `AND status = ?`
    values.push(status)
  }

  sql +=  `ORDER BY user_id DESC`

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err)

      return res.status(500).json({
        message: 'Failed to fetch users',
      })
    }

    res.json(results)
  })
})

// =====================================
// CREATE USER / CONSUMER REGISTRATION
// =====================================

router.post('/', async (req, res) => {
  try {
    const {
      full_name,
      email,
      contact_number,
      address,
      password,
    } = req.body

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: 'Full name, email, and password are required',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const sql = `
      INSERT INTO users
      (
        full_name,
        email,
        contact_number,
        address,
        password,
        role,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'consumer', 'active')
    `

    const values = [
      full_name,
      email.trim(),
      contact_number ? contact_number.trim() : null,
      address || null,
      hashedPassword,
    ]

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error adding user:', err)

        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            message: 'Email or contact number already exists',
          })
        }

        return res.status(500).json({
          message: 'Failed to add user',
        })
      }

      res.status(201).json({
        message: 'User added successfully',
        user_id: result.insertId,
      })
    })
  } catch (error) {
    console.error('Password hashing error:', error)

    res.status(500).json({
      message: 'Failed to add user',
    })
  }
})

// =====================================
// UPDATE USER
// =====================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const {
      full_name,
      email,
      contact_number,
      address,
      password,
      role,
    } = req.body

    let sql
    let values

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)

      sql = `
        UPDATE users
        SET
          full_name = ?,
          email = ?,
          contact_number = ?,
          address = ?,
          password = ?,
          role = ?
        WHERE user_id = ?
      `

      values = [
        full_name,
        email,
        contact_number,
        address,
        hashedPassword,
        role,
        id,
      ]
    } else {
      sql = `
        UPDATE users
        SET
          full_name = ?,
          email = ?,
          contact_number = ?,
          address = ?,
          role = ?
        WHERE user_id = ?
      `

      values = [
        full_name,
        email,
        contact_number,
        address,
        role,
        id,
      ]
    }

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating user:', err)

        return res.status(500).json({
          message: 'Failed to update user',
        })
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      res.json({
        message: 'User updated successfully',
      })
    })
  } catch (error) {
    console.error('Password hashing error:', error)

    res.status(500).json({
      message: 'Failed to update user',
    })
  }
})

// =====================================
// ACTIVATE / DEACTIVATE USER
// =====================================

router.put('/:id/status', (req, res) => {
  const { id } = req.params
  const { status } = req.body

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      message: 'Invalid user status',
    })
  }

  const sql = `
    UPDATE users
    SET status = ?
    WHERE user_id = ?
  `

  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error('Error updating user status:', err)

      return res.status(500).json({
        message: 'Failed to update user status',
      })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.json({
      message: `User ${status} successfully`,
    })
  })
})

// =====================================
// EXISTING CHANGE PASSWORD
// =====================================

router.put('/:id/change-password', async (req, res) => {
  try {
    const userId = req.params.id

    const {
      current_password,
      new_password,
    } = req.body

    if (!current_password || !new_password) {
      return res.status(400).json({
        message: 'Current password and new password are required',
      })
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters',
      })
    }

    const sql = `
      SELECT password
      FROM users
      WHERE user_id = ?
      LIMIT 1
    `

    db.query(sql, [userId], async (err, results) => {
      if (err) {
        console.error('Change password database error:', err)

        return res.status(500).json({
          message: 'Failed to change password',
        })
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      try {
        const user = results[0]

        const passwordMatch = await bcrypt.compare(
          current_password,
          user.password
        )

        if (!passwordMatch) {
          return res.status(401).json({
            message: 'Current password is incorrect',
          })
        }

        const hashedPassword = await bcrypt.hash(
          new_password,
          10
        )

        const updateSql = `
          UPDATE users
          SET password = ?
          WHERE user_id = ?
        `

        db.query(
          updateSql,
          [hashedPassword, userId],
          (updateErr) => {
            if (updateErr) {
              console.error('Password update error:', updateErr)

              return res.status(500).json({
                message: 'Failed to update password',
              })
            }

            res.json({
              message: 'Password changed successfully',
            })
          }
        )
      } catch (error) {
        console.error('Password comparison error:', error)

        return res.status(500).json({
          message: 'Failed to change password',
        })
      }
    })
  } catch (error) {
    console.error('Change password error:', error)

    res.status(500).json({
      message: 'Failed to change password',
    })
  }
})

// =====================================
// ADMIN CHANGE PASSWORD
// POST /api/users/admin/change-password
// =====================================

router.post(
  '/admin/change-password',
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only administrators can change the Admin password.',
        })
      }

      const { current_password, new_password } = req.body

      if (!current_password || !new_password) {
        return res.status(400).json({
          message: 'Current password and new password are required.',
        })
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters.',
        })
      }

      if (current_password === new_password) {
        return res.status(400).json({
          message: 'Your new password must be different from your current password.',
        })
      }

      const userId = req.user.user_id

      const [results] = await db.promise().query(
        'SELECT password FROM users WHERE user_id = ? LIMIT 1',
        [userId]
      )

      if (results.length === 0) {
        return res.status(404).json({
          message: 'Admin account not found.',
        })
      }

      const passwordMatch = await bcrypt.compare(
        current_password,
        results[0].password
      )

      if (!passwordMatch) {
        return res.status(401).json({
          message: 'Current password is incorrect.',
        })
      }

      const hashedPassword = await bcrypt.hash(
        new_password,
        10
      )

      await db.promise().query(
        'UPDATE users SET password = ? WHERE user_id = ?',
        [hashedPassword, userId]
      )

      return res.json({
        message: 'Admin password changed successfully.',
      })
    } catch (error) {
      console.error('Admin change password error:', error)

      return res.status(500).json({
        message: 'Unable to change password. Please try again.',
      })
    }
  }
)

// =====================================
// FORGOT PASSWORD - SEND 6-DIGIT OTP
// POST /api/users/forgot-password
// =====================================

router.post('/forgot-password', async (req, res) => {
  try {
    const rawTarget = req.body.target ?? req.body.identifier ?? req.body.email ?? ''
    const cleanTarget = String(rawTarget).trim()

    if (!cleanTarget) {
      return res.status(400).json({
        message: 'Email or mobile number is required',
      })
    }

    const isEmail = cleanTarget.includes('@')
    const normalizedPhone = normalizePhone(cleanTarget)

    const [results] = await db.promise().query(
      isEmail
        ? `
          SELECT user_id, full_name, email, contact_number, status
          FROM users
          WHERE LOWER(email) = LOWER(?)
          LIMIT 1
        `
        : `
          SELECT user_id, full_name, email, contact_number, status
          FROM users
          WHERE contact_number = ?
             OR REPLACE(REPLACE(REPLACE(contact_number, ' ', ''), '-', ''), '+', '') = ?
          LIMIT 1
        `,
      isEmail ? [cleanTarget] : [cleanTarget, normalizedPhone]
    )

    if (results.length === 0) {
      return res.status(404).json({
        message: 'No account found with that email or mobile number',
      })
    }

    const user = results[0]

    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Your account is inactive',
      })
    }

    const otpCode = String(crypto.randomInt(100000, 1000000))
    const verificationTarget = isEmail
      ? user.email
      : (user.contact_number || cleanTarget)

    const [insertResult] = await db.promise().query(
      `
        INSERT INTO verification_codes
          (user_id, target, type, code, expires_at)
        VALUES
          (?, ?, 'password_reset', ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
      `,
      [user.user_id, verificationTarget, otpCode]
    )

    return res.json({
      message: 'A 6-digit verification code has been generated.',
      user_id: user.user_id,
      verification_id: insertResult.insertId,
      target: verificationTarget,
      expires_in_minutes: 10,
      dev_otp: otpCode,
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({
      message: 'Failed to process request',
    })
  }
})

// =====================================
// VERIFY 6-DIGIT OTP FOR PASSWORD RESET
// POST /api/users/verify-otp
// =====================================

router.post('/verify-otp', async (req, res) => {
  try {
    const { user_id, verification_id, otp, code } = req.body
    const cleanOtp = String(otp ?? code ?? '').trim()

    if (!user_id || !verification_id || !cleanOtp) {
      return res.status(400).json({
        message: 'User ID, verification ID, and 6-digit OTP are required',
      })
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        message: 'OTP must be a 6-digit number',
      })
    }

    const [rows] = await db.promise().query(
      `
        SELECT *
        FROM verification_codes
        WHERE verification_id = ?
          AND user_id = ?
          AND type = 'password_reset'
        LIMIT 1
      `,
      [verification_id, user_id]
    )

    if (rows.length === 0) {
      return res.status(400).json({
        message: 'Invalid verification request',
      })
    }

    const record = rows[0]

    if (record.used_at) {
      return res.status(400).json({
        message: 'This OTP has already been used',
      })
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'OTP has expired. Please request a new code.',
      })
    }

    if (String(record.code).trim() !== cleanOtp) {
      return res.status(400).json({
        message: 'Incorrect 6-digit OTP code',
      })
    }

    await db.promise().query(
      `
        UPDATE verification_codes
        SET verified_at = NOW()
        WHERE verification_id = ?
      `,
      [verification_id]
    )

    return res.json({
      message: 'OTP verified successfully. You may now set a new password.',
      verification_id: Number(verification_id),
      user_id: Number(user_id),
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return res.status(500).json({
      message: 'Failed to verify OTP',
    })
  }
})

// =====================================
// RESET PASSWORD
// POST /api/users/reset-password
// =====================================

router.post('/reset-password', async (req, res) => {
  try {
    const {
      user_id,
      verification_id,
      new_password,
    } = req.body

    if (
      !user_id ||
      !verification_id ||
      !new_password
    ) {
      return res.status(400).json({
        message: 'User ID, verification ID, and new password are required',
      })
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        message: 'New password must be at least 8 characters',
      })
    }

    const [results] = await db.promise().query(
      `
        SELECT *
        FROM verification_codes
        WHERE verification_id = ?
          AND user_id = ?
          AND type = 'password_reset'
          AND verified_at IS NOT NULL
        LIMIT 1
      `,
      [verification_id, user_id]
    )

    if (results.length === 0) {
      return res.status(400).json({
        message: 'Password reset verification is invalid or incomplete',
      })
    }

    const record = results[0]

    if (record.used_at) {
      return res.status(400).json({
        message: 'This reset session has already been used',
      })
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({
        message: 'Verification code has expired. Please start over.',
      })
    }

    const hashedPassword = await bcrypt.hash(
      new_password,
      10
    )

    const [updateResult] = await db.promise().query(
      `
        UPDATE users
        SET password = ?
        WHERE user_id = ?
      `,
      [hashedPassword, user_id]
    )

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    await db.promise().query(
      `
        UPDATE verification_codes
        SET used_at = NOW()
        WHERE verification_id = ?
      `,
      [verification_id]
    )

    return res.json({
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)

    return res.status(500).json({
      message: 'Failed to reset password',
    })
  }
})

// =====================================
// UPLOAD PROFILE PICTURE
// =====================================

router.post(
  '/me/profile-picture',
  authMiddleware,
  profileUpload.single('profile_picture'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select a profile picture.',
        })
      }

      const userId = req.user.user_id
      const profilePicture = `/uploads/profiles/${req.file.filename}`

      const [result] = await db.promise().query(
        'UPDATE users SET profile_picture = ? WHERE user_id = ?',
        [profilePicture, userId]
      )

      if (result.affectedRows === 0) {
        fs.unlink(req.file.path, () => {})

        return res.status(404).json({
          message: 'User account not found.',
        })
      }

      res.json({
        message: 'Profile picture updated successfully.',
        profile_picture: profilePicture,
      })
    } catch (error) {
      console.error('Profile picture upload error:', error)

      if (req.file) {
        fs.unlink(req.file.path, () => {})
      }

      res.status(500).json({
        message: 'Failed to update profile picture.',
      })
    }
  }
)

// =====================================
// SAVED DELIVERY ADDRESSES
// =====================================

const allowedDeliveryAreas = [
  'malay_mainland',
  'boracay',
  'buruanga',
  'tangalan',
  'numancia',
  'lezo',
  'new_washington',
  'kalibo',
]

const allowedAddressLabels = [
  'Home',
  'Work',
  'Hotel',
  'Business',
  'Other',
]

const isConsumer = (req, res) => {
  if (req.user.role !== 'consumer') {
    res.status(403).json({
      message: 'Only consumer accounts can manage saved delivery addresses.',
    })
    return false
  }

  return true
}

// GET ALL SAVED ADDRESSES
// GET /api/users/me/addresses

router.get('/me/addresses', authMiddleware, async (req, res) => {
  try {
    if (!isConsumer(req, res)) return

    const userId = req.user.user_id

    const [addresses] = await db.promise().query(
      `SELECT
        address_id,
        recipient_name,
        contact_number,
        address_label,
        delivery_area,
        complete_address,
        landmark,
        is_default,
        created_at,
        updated_at
       FROM user_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC`,
      [userId]
    )

    return res.json(addresses)
  } catch (error) {
    console.error('Get saved addresses error:', error)

    return res.status(500).json({
      message: 'Failed to retrieve saved addresses.',
    })
  }
})

// ADD SAVED ADDRESS
// POST /api/users/me/addresses

router.post('/me/addresses', authMiddleware, async (req, res) => {
  try {
    if (!isConsumer(req, res)) return

    const userId = req.user.user_id

    const {
      recipient_name,
      contact_number,
      address_label,
      delivery_area,
      complete_address,
      landmark,
      is_default,
    } = req.body

    if (
      !recipient_name?.trim() ||
      !contact_number?.trim() ||
      !address_label ||
      !delivery_area ||
      !complete_address?.trim()
    ) {
      return res.status(400).json({
        message: 'Please complete all required address fields.',
      })
    }

    if (!allowedAddressLabels.includes(address_label)) {
      return res.status(400).json({
        message: 'Invalid address label.',
      })
    }

    if (!allowedDeliveryAreas.includes(delivery_area)) {
      return res.status(400).json({
        message: 'Invalid delivery area.',
      })
    }

    const [existingAddresses] = await db.promise().query(
      `SELECT address_id
       FROM user_addresses
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    )

    const makeDefault =
      Boolean(is_default) || existingAddresses.length === 0

    if (makeDefault) {
      await db.promise().query(
        `UPDATE user_addresses
         SET is_default = 0
         WHERE user_id = ?`,
        [userId]
      )
    }

    const [result] = await db.promise().query(
      `INSERT INTO user_addresses (
        user_id,
        recipient_name,
        contact_number,
        address_label,
        delivery_area,
        complete_address,
        landmark,
        is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        recipient_name.trim(),
        contact_number.trim(),
        address_label,
        delivery_area,
        complete_address.trim(),
        landmark?.trim() || null,
        makeDefault ? 1 : 0,
      ]
    )

    const [newAddress] = await db.promise().query(
      `SELECT *
       FROM user_addresses
       WHERE address_id = ?
         AND user_id = ?
       LIMIT 1`,
      [result.insertId, userId]
    )

    return res.status(201).json({
      message: 'Delivery address saved successfully.',
      address: newAddress[0],
    })
  } catch (error) {
    console.error('Add saved address error:', error)

    return res.status(500).json({
      message: 'Failed to save delivery address.',
    })
  }
})

// EDIT SAVED ADDRESS
// PUT /api/users/me/addresses/:addressId

router.put('/me/addresses/:addressId', authMiddleware, async (req, res) => {
  try {
    if (!isConsumer(req, res)) return

    const userId = req.user.user_id
    const addressId = Number(req.params.addressId)

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({
        message: 'Invalid address ID.',
      })
    }

    const {
      recipient_name,
      contact_number,
      address_label,
      delivery_area,
      complete_address,
      landmark,
      is_default,
    } = req.body

    if (
      !recipient_name?.trim() ||
      !contact_number?.trim() ||
      !address_label ||
      !delivery_area ||
      !complete_address?.trim()
    ) {
      return res.status(400).json({
        message: 'Please complete all required address fields.',
      })
    }

    if (!allowedAddressLabels.includes(address_label)) {
      return res.status(400).json({
        message: 'Invalid address label.',
      })
    }

    if (!allowedDeliveryAreas.includes(delivery_area)) {
      return res.status(400).json({
        message: 'Invalid delivery area.',
      })
    }

    const [existing] = await db.promise().query(
      `SELECT address_id, is_default
       FROM user_addresses
       WHERE address_id = ?
         AND user_id = ?
       LIMIT 1`,
      [addressId, userId]
    )

    if (existing.length === 0) {
      return res.status(404).json({
        message: 'Saved address not found.',
      })
    }

    if (is_default === false && Number(existing[0].is_default) === 1) {
      return res.status(400).json({
        message: 'Please set another address as default before changing this one.',
      })
    }

    if (is_default === true) {
      await db.promise().query(
        `UPDATE user_addresses
         SET is_default = 0
         WHERE user_id = ?`,
        [userId]
      )
    }

    await db.promise().query(
      `UPDATE user_addresses
       SET
         recipient_name = ?,
         contact_number = ?,
         address_label = ?,
         delivery_area = ?,
         complete_address = ?,
         landmark = ?,
         is_default = ?
       WHERE address_id = ?
         AND user_id = ?`,
      [
        recipient_name.trim(),
        contact_number.trim(),
        address_label,
        delivery_area,
        complete_address.trim(),
        landmark?.trim() || null,
        is_default === true ? 1 : Number(existing[0].is_default),
        addressId,
        userId,
      ]
    )

    const [updatedAddress] = await db.promise().query(
      `SELECT *
       FROM user_addresses
       WHERE address_id = ?
         AND user_id = ?
       LIMIT 1`,
      [addressId, userId]
    )

    return res.json({
      message: 'Delivery address updated successfully.',
      address: updatedAddress[0],
    })
  } catch (error) {
    console.error('Update saved address error:', error)

    return res.status(500).json({
      message: 'Failed to update delivery address.',
    })
  }
})

// SET DEFAULT ADDRESS
// PUT /api/users/me/addresses/:addressId/default

router.put(
  '/me/addresses/:addressId/default',
  authMiddleware,
  async (req, res) => {
    try {
      if (!isConsumer(req, res)) return

      const userId = req.user.user_id
      const addressId = Number(req.params.addressId)

      if (!Number.isInteger(addressId) || addressId <= 0) {
        return res.status(400).json({
          message: 'Invalid address ID.',
        })
      }

      const [existing] = await db.promise().query(
        `SELECT address_id
         FROM user_addresses
         WHERE address_id = ?
           AND user_id = ?
         LIMIT 1`,
        [addressId, userId]
      )

      if (existing.length === 0) {
        return res.status(404).json({
          message: 'Saved address not found.',
        })
      }

      await db.promise().query(
        `UPDATE user_addresses
         SET is_default = (address_id = ?)
         WHERE user_id = ?`,
        [addressId, userId]
      )

      return res.json({
        message: 'Default delivery address updated successfully.',
      })
    } catch (error) {
      console.error('Set default address error:', error)

      return res.status(500).json({
        message: 'Failed to update default address.',
      })
    }
  }
)

// DELETE SAVED ADDRESS
// DELETE /api/users/me/addresses/:addressId

router.delete(
  '/me/addresses/:addressId',
  authMiddleware,
  async (req, res) => {
    try {
      if (!isConsumer(req, res)) return

      const userId = req.user.user_id
      const addressId = Number(req.params.addressId)

      if (!Number.isInteger(addressId) || addressId <= 0) {
        return res.status(400).json({
          message: 'Invalid address ID.',
        })
      }

      const [existing] = await db.promise().query(
        `SELECT address_id, is_default
         FROM user_addresses
         WHERE address_id = ?
           AND user_id = ?
         LIMIT 1`,
        [addressId, userId]
      )

      if (existing.length === 0) {
        return res.status(404).json({
          message: 'Saved address not found.',
        })
      }

      await db.promise().query(
        `DELETE FROM user_addresses
         WHERE address_id = ?
           AND user_id = ?`,
        [addressId, userId]
      )

      if (Number(existing[0].is_default) === 1) {
        const [remaining] = await db.promise().query(
          `SELECT address_id
           FROM user_addresses
           WHERE user_id = ?
           ORDER BY updated_at DESC, address_id DESC
           LIMIT 1`,
          [userId]
        )

        if (remaining.length > 0) {
          await db.promise().query(
            `UPDATE user_addresses
             SET is_default = 1
             WHERE address_id = ?
               AND user_id = ?`,
            [remaining[0].address_id, userId]
          )
        }
      }

      return res.json({
        message: 'Delivery address deleted successfully.',
      })
    } catch (error) {
      console.error('Delete saved address error:', error)

      return res.status(500).json({
        message: 'Failed to delete delivery address.',
      })
    }
  }
)

module.exports = router