
const express = require('express')
const router = express.Router()
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

// Get consumer notifications
router.get('/', authMiddleware, (req, res) => {
  const userId = req.user.user_id

  db.query(
    `SELECT notification_id, order_id, notification_type,
            title, message, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId],
    (err, results) => {
      if (err) {
        console.error('Notifications error:', err)
        return res.status(500).json({
          message: 'Unable to load notifications',
        })
      }

      res.json(results)
    }
  )
})

// Get unread notification count
router.get('/unread-count', authMiddleware, (req, res) => {
  const userId = req.user.user_id

  db.query(
    `SELECT COUNT(*) AS unread_count
     FROM notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    (err, results) => {
      if (err) {
        console.error('Unread count error:', err)
        return res.status(500).json({
          message: 'Unable to get unread count',
        })
      }

      res.json({
        unread_count: results[0].unread_count,
      })
    }
  )
})

// Mark one notification as read
router.put('/:id/read', authMiddleware, (req, res) => {
  const notificationId = req.params.id
  const userId = req.user.user_id

  db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE notification_id = ? AND user_id = ?`,
    [notificationId, userId],
    (err, result) => {
      if (err) {
        console.error('Mark as read error:', err)
        return res.status(500).json({
          message: 'Unable to update notification',
        })
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Notification not found',
        })
      }

      res.json({
        message: 'Notification marked as read',
      })
    }
  )
})

// Mark all consumer notifications as read
router.put('/read-all', authMiddleware, (req, res) => {
  const userId = req.user.user_id

  db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    (err) => {
      if (err) {
        console.error('Mark all as read error:', err)
        return res.status(500).json({
          message: 'Unable to update notifications',
        })
      }

      res.json({
        message: 'All notifications marked as read',
      })
    }
  )
})

module.exports = router
