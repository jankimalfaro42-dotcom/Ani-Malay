
const jwt = require('jsonwebtoken')
const db = require('../db')

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication token is required',
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'ani-malay-secret-key'
    )

    if (!decoded.user_id) {
      return res.status(401).json({
        message: 'Invalid authentication token',
      })
    }

    db.query(
      `SELECT user_id, email, role, status
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [decoded.user_id],
      (err, results) => {
        if (err) {
          console.error('Authentication database error:', err)

          return res.status(500).json({
            message: 'Unable to verify account',
          })
        }

        if (!results || results.length === 0) {
          return res.status(401).json({
            message: 'Account not found',
          })
        }

        const user = results[0]

        if (
          user.status &&
          String(user.status).toLowerCase() !== 'active'
        ) {
          return res.status(403).json({
            message: 'Your account is inactive',
          })
        }

        req.user = {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          status: user.status,
        }

        next()
      }
    )
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token',
    })
  }
}

module.exports = authMiddleware
