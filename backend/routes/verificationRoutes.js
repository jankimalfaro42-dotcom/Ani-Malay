const express = require('express')
const crypto = require('crypto')
const { Resend } = require('resend')
const db = require('../db')

const router = express.Router()

let resendClient = null

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

function generateCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

function findUserByTarget(target, callback) {
  const cleaned = String(target || '').trim()
  const lowerEmail = cleaned.toLowerCase()
  const digitsOnly = cleaned.replace(/\D/g, '')

  const sql = `
    SELECT user_id, full_name, email, contact_number, role, status
    FROM users
    WHERE LOWER(email) = ?
       OR contact_number = ?
       OR REPLACE(REPLACE(REPLACE(contact_number, '-', ''), ' ', ''), '+', '') = ?
    LIMIT 1
  `

  db.query(sql, [lowerEmail, cleaned, digitsOnly], (err, rows) => {
    if (err) {
      return callback(err, null)
    }
    return callback(null, rows && rows.length ? rows[0] : null)
  })
}

// POST /api/users/forgot-password (handles initial send and resend)
router.post('/forgot-password', async (req, res) => {
  const { target } = req.body

  if (!target || !String(target).trim()) {
    return res.status(400).json({
      message: 'Please enter your registered email address or mobile number.',
    })
  }

  const resend = getResendClient()
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM

  if (!resend || !fromEmail) {
    console.error('Resend configuration is missing (RESEND_API_KEY or RESEND_FROM_EMAIL).')
    return res.status(500).json({
      message: 'Email service is not configured.',
    })
  }

  findUserByTarget(target, (lookupErr, user) => {
    if (lookupErr) {
      console.error('Account lookup error:', lookupErr)
      return res.status(500).json({
        message: 'Unable to process your request.',
      })
    }

    if (
      !user ||
      user.status !== 'active' ||
      !['admin', 'consumer'].includes(user.role)
    ) {
      return res.status(404).json({
        message: 'Account not found or inactive.',
      })
    }

    const email = String(user.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'This account does not have a valid email address for OTP delivery.',
      })
    }

    // Limit OTP requests to 3 within 15 minutes
    db.query(
      `SELECT COUNT(*) AS total
       FROM verification_codes
       WHERE user_id = ?
         AND type = 'password_reset'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [user.user_id],
      (countErr, countResults) => {
        if (countErr) {
          console.error('OTP limit check error:', countErr)
          return res.status(500).json({
            message: 'Unable to process your request.',
          })
        }

        if (Number(countResults[0].total) >= 3) {
          return res.status(429).json({
            message: 'Too many code requests. Please try again later.',
          })
        }

        const code = generateCode()
        const hashedCode = crypto
          .createHash('sha256')
          .update(code)
          .digest('hex')
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

        // Remove older unverified password reset codes for this user
        db.query(
          `DELETE FROM verification_codes
           WHERE user_id = ?
             AND type = 'password_reset'
             AND verified_at IS NULL`,
          [user.user_id],
          (deleteErr) => {
            if (deleteErr) {
              console.error('Old OTP cleanup error:', deleteErr)
              return res.status(500).json({
                message: 'Unable to create a verification code.',
              })
            }

            db.query(
              `INSERT INTO verification_codes
               (user_id, code, type, target, expires_at)
               VALUES (?, ?, 'password_reset', ?, ?)`,
              [user.user_id, hashedCode, email, expiresAt],
              async (insertErr, insertResult) => {
                if (insertErr) {
                  console.error('OTP database error:', insertErr)
                  return res.status(500).json({
                    message: 'Unable to create a verification code.',
                  })
                }

                const verificationId = insertResult.insertId

                try {
                  const { error: resendErr } = await resend.emails.send({
                    from: `Ani-Malay <${fromEmail}>`,
                    to: [email],
                    subject: 'Ani-Malay Password Reset Code',
                    text: `Hello ${user.full_name || 'User'},

Your Ani-Malay password reset code is ${code}.

This code expires in 5 minutes.

Do not share this code with anyone.`,
                    html: `
                      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:25px;color:#333">
                        <h2 style="color:#2d7752">Ani-Malay</h2>
                        <p>Hello ${user.full_name || 'User'},</p>
                        <p>You requested to reset your password.</p>
                        <p>Your verification code is:</p>
                        <h1 style="letter-spacing:8px;color:#2d7752">${code}</h1>
                        <p>This code expires in <strong>5 minutes</strong>.</p>
                        <p>If you did not request this code, you can ignore this email.</p>
                        <hr />
                        <small>Do not share this code with anyone.</small>
                      </div>
                    `,
                  })

                  if (resendErr) {
                    console.error('Resend API error:', resendErr)
                    db.query(
                      'DELETE FROM verification_codes WHERE verification_id = ?',
                      [verificationId],
                      () => {}
                    )
                    return res.status(500).json({
                      message: 'Unable to send verification email via Resend.',
                    })
                  }

                  return res.json({
                    message: 'Verification code sent to your email.',
                    user_id: user.user_id,
                    verification_id: verificationId,
                    target: email,
                  })
                } catch (sendErr) {
                  console.error('Resend sending exception:', sendErr)
                  db.query(
                    'DELETE FROM verification_codes WHERE verification_id = ?',
                    [verificationId],
                    () => {}
                  )
                  return res.status(500).json({
                    message: 'Unable to send verification email.',
                  })
                }
              }
            )
          }
        )
      }
    )
  })
})

// POST /api/users/verify-otp
router.post('/verify-otp', (req, res) => {
  const { user_id, verification_id, otp, code } = req.body
  const submittedCode = String(otp ?? code ?? '').trim()

  if (!user_id || !verification_id || !submittedCode) {
    return res.status(400).json({
      message: 'All verification fields are required.',
    })
  }

  if (!/^\d{6}$/.test(submittedCode)) {
    return res.status(400).json({
      message: 'Invalid verification code.',
    })
  }

  const hashedCode = crypto
    .createHash('sha256')
    .update(submittedCode)
    .digest('hex')

  const sql = `
    SELECT verification_id
    FROM verification_codes
    WHERE verification_id = ?
      AND user_id = ?
      AND type = 'password_reset'
      AND code = ?
      AND verified_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `

  db.query(sql, [verification_id, user_id, hashedCode], (err, results) => {
    if (err) {
      console.error('OTP verification error:', err)
      return res.status(500).json({
        message: 'Verification failed.',
      })
    }

    if (!results.length) {
      return res.status(400).json({
        message: 'Invalid or expired verification code.',
      })
    }

    const row = results[0]

    db.query(
      `UPDATE verification_codes
       SET verified_at = NOW()
       WHERE verification_id = ?
         AND verified_at IS NULL`,
      [row.verification_id],
      (updateErr, updateResult) => {
        if (updateErr || updateResult.affectedRows !== 1) {
          console.error('Verification update error:', updateErr)
          return res.status(500).json({
            message: 'Unable to complete verification.',
          })
        }

        return res.json({
          message: 'Verification successful.',
          verification_id: row.verification_id,
        })
      }
    )
  })
})

module.exports = router