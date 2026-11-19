
const express = require('express')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const db = require('../db')

const router = express.Router()

// Gmail sender configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_APP_PASSWORD || '').replace(/\s/g, ''),
  },
})

// Generate a secure 6-digit OTP
function generateCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

// SEND VERIFICATION CODE
router.post('/send', async (req, res) => {
  const { user_id, type, target } = req.body

  if (!user_id || !type || !target) {
    return res.status(400).json({
      message: 'Required verification information is missing.',
    })
  }

  if (type !== 'password_reset') {
    return res.status(400).json({
      message: 'Invalid verification type.',
    })
  }

  const email = String(target).trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      message: 'Please provide a valid email address.',
    })
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error('Gmail configuration is missing.')

    return res.status(500).json({
      message: 'Email service is not configured.',
    })
  }

  try {
    // Confirm the email belongs to this active account
    db.query(
      `SELECT user_id, full_name, email, role, status
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [user_id],
      async (err, users) => {
        if (err) {
          console.error('Account lookup error:', err)

          return res.status(500).json({
            message: 'Unable to process your request.',
          })
        }

        if (
          !users.length ||
          users[0].email.toLowerCase() !== email ||
          users[0].status !== 'active' ||
          !['admin', 'consumer'].includes(users[0].role)
        ) {
          return res.status(400).json({
            message: 'Account email could not be verified.',
          })
        }

        // Limit OTP requests to 3 within 15 minutes
        db.query(
          `SELECT COUNT(*) AS total
           FROM verification_codes
           WHERE user_id = ?
             AND type = 'password_reset'
             AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
          [user_id],
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

            // Invalidate older unused codes for this account
            db.query(
              `DELETE FROM verification_codes
               WHERE user_id = ?
                 AND type = 'password_reset'
                 AND verified_at IS NULL`,
              [user_id],
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
                  [user_id, hashedCode, email, expiresAt],
                  async (insertErr, result) => {
                    if (insertErr) {
                      console.error('OTP database error:', insertErr)

                      return res.status(500).json({
                        message: 'Unable to create a verification code.',
                      })
                    }

                    try {
                      await transporter.sendMail({
                        from: `"Ani-Malay" <${process.env.EMAIL_USER}>`,
                        to: email,
                        subject: 'Ani-Malay Password Reset Code',
                        text: `Hello ${users[0].full_name},

Your Ani-Malay password reset code is ${code}.

This code expires in 5 minutes.

Do not share this code with anyone.`,
                        html: `
                          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:25px;color:#333">
                            <h2 style="color:#2d7752">Ani-Malay</h2>
                            <p>Hello ${users[0].full_name},</p>
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

                      return res.json({
                        message: 'Verification code sent to your email.',
                        verification_id: result.insertId,
                      })
                    } catch (mailErr) {
                      console.error('Gmail sending error:', mailErr)

                      db.query(
                        'DELETE FROM verification_codes WHERE verification_id = ?',
                        [result.insertId],
                        () => {}
                      )

                      return res.status(500).json({
                        message: 'Unable to send the email. Please check the Gmail configuration.',
                      })
                    }
                  }
                )
              }
            )
          }
        )
      }
    )
  } catch (error) {
    console.error('OTP error:', error)

    return res.status(500).json({
      message: 'Unable to process your request.',
    })
  }
})

// VERIFY CODE
router.post('/verify', (req, res) => {
  const { user_id, type, target, code } = req.body

  if (!user_id || !type || !target || !code) {
    return res.status(400).json({
      message: 'All verification fields are required.',
    })
  }

  if (type !== 'password_reset' || !/^\d{6}$/.test(String(code))) {
    return res.status(400).json({
      message: 'Invalid verification code.',
    })
  }

  const hashedCode = crypto
    .createHash('sha256')
    .update(String(code))
    .digest('hex')

  const email = String(target).trim().toLowerCase()

  const sql = `
    SELECT verification_id
    FROM verification_codes
    WHERE user_id = ?
      AND type = ?
      AND target = ?
      AND code = ?
      AND verified_at IS NULL
      AND expires_at > NOW()
    ORDER BY verification_id DESC
    LIMIT 1
  `

  db.query(
    sql,
    [user_id, type, email, hashedCode],
    (err, results) => {
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

      const verification = results[0]

      db.query(
        `UPDATE verification_codes
         SET verified_at = NOW()
         WHERE verification_id = ?
           AND verified_at IS NULL`,
        [verification.verification_id],
        (updateErr, result) => {
          if (updateErr || result.affectedRows !== 1) {
            console.error('Verification update error:', updateErr)

            return res.status(500).json({
              message: 'Unable to complete verification.',
            })
          }

          return res.json({
            message: 'Verification successful.',
            verification_id: verification.verification_id,
          })
        }
      )
    }
  )
})

module.exports = router
