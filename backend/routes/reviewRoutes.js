
const express = require('express')
const router = express.Router()
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

// ===============================
// GET MY REVIEWS
// Returns all reviews of the logged-in consumer,
// including pending, approved, and rejected.
// ===============================
router.get('/mine', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumers can access their reviews.',
    })
  }

  const sql = `
    SELECT
      r.review_id,
      r.user_id,
      u.full_name,
      u.profile_picture,
      r.product_id,
      p.product_name,
      c.category_name,
      r.rating,
      r.comment,
      r.status,
      r.created_at,
      r.updated_at
    FROM reviews r
    INNER JOIN users u
      ON r.user_id = u.user_id
    INNER JOIN products p
      ON r.product_id = p.product_id
    LEFT JOIN categories c
      ON p.category_id = c.category_id
    WHERE r.user_id = ?
    ORDER BY r.review_id DESC
  `

  db.query(sql, [req.user.user_id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching my reviews:', err)

      return res.status(500).json({
        message: 'Failed to fetch your reviews.',
      })
    }

    res.json(results)
  })
})

// ===============================
// GET ALL REVIEWS
// Supports product, user, and status filters
// ===============================
router.get('/', (req, res) => {
  const { product_id, user_id, status } = req.query

  let sql = `
    SELECT
      r.review_id,
      r.user_id,
      u.full_name,
      u.profile_picture,
      r.product_id,
      p.product_name,
      c.category_name,
      r.rating,
      r.comment,
      r.status,
      r.created_at,
      r.updated_at
    FROM reviews r
    INNER JOIN users u
      ON r.user_id = u.user_id
    INNER JOIN products p
      ON r.product_id = p.product_id
    LEFT JOIN categories c
      ON p.category_id = c.category_id
    WHERE 1 = 1
  `

  const values = []

  if (product_id) {
    sql += ` AND r.product_id = ?`
    values.push(product_id)
  }

  if (user_id) {
    sql += ` AND r.user_id = ?`
    values.push(user_id)
  }

  if (status) {
    sql += ` AND r.status = ?`
    values.push(status)
  }

  sql += ` ORDER BY r.review_id DESC`

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('❌ Error fetching reviews:', err)

      return res.status(500).json({
        message: 'Failed to fetch reviews',
      })
    }

    res.json(results)
  })
})

// ===============================
// GET REVIEW BY ID
// ===============================
router.get('/:id', (req, res) => {
  const { id } = req.params

  const sql = `
    SELECT
      r.review_id,
      r.user_id,
      u.full_name,
      u.profile_picture,
      r.product_id,
      p.product_name,
      c.category_name,
      r.rating,
      r.comment,
      r.status,
      r.created_at,
      r.updated_at
    FROM reviews r
    INNER JOIN users u
      ON r.user_id = u.user_id
    INNER JOIN products p
      ON r.product_id = p.product_id
    LEFT JOIN categories c
      ON p.category_id = c.category_id
    WHERE r.review_id = ?
  `

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching review:', err)

      return res.status(500).json({
        message: 'Failed to fetch review',
      })
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Review not found',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// CREATE REVIEW
// Uses the logged-in user's ID from JWT
// ===============================
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumers can submit reviews.',
    })
  }

  const {
    product_id,
    rating,
    comment,
  } = req.body

  const numericRating = Number(rating)

  if (!product_id || rating === undefined || rating === null || rating === '') {
    return res.status(400).json({
      message: 'Product ID and rating are required.',
    })
  }

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return res.status(400).json({
      message: 'Rating must be a whole number between 1 and 5.',
    })
  }

  const sql = `
    INSERT INTO reviews
    (
      user_id,
      product_id,
      rating,
      comment,
      status
    )
    VALUES (?, ?, ?, ?, 'pending')
  `

  const values = [
    req.user.user_id,
    product_id,
    numericRating,
    comment || null,
  ]

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error adding review:', err)

      return res.status(500).json({
        message: 'Failed to add review',
      })
    }

    res.status(201).json({
      message: 'Review submitted successfully',
      review_id: result.insertId,
    })
  })
})

// ===============================
// UPDATE REVIEW
// Consumers can only update their own reviews
// ===============================
router.put('/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumers can update their reviews.',
    })
  }

  const { id } = req.params
  const { rating, comment } = req.body
  const numericRating = Number(rating)

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return res.status(400).json({
      message: 'Rating must be a whole number between 1 and 5.',
    })
  }

  const sql = `
    UPDATE reviews
    SET
      rating = ?,
      comment = ?,
      status = 'pending'
    WHERE review_id = ?
      AND user_id = ?
  `

  const values = [
    numericRating,
    comment || null,
    id,
    req.user.user_id,
  ]

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error updating review:', err)

      return res.status(500).json({
        message: 'Failed to update review',
      })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Review not found or you do not own this review.',
      })
    }

    res.json({
      message: 'Review updated and submitted for moderation.',
    })
  })
})

// ===============================
// APPROVE / REJECT REVIEW
// Existing Admin endpoint preserved
// ===============================
router.put('/:id/status', (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const allowedStatuses = [
    'pending',
    'approved',
    'rejected',
  ]

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid review status',
    })
  }

  const sql = `
    UPDATE reviews
    SET status = ?
    WHERE review_id = ?
  `

  db.query(sql, [status, id], (err, result) => {
    if (err) {
      console.error('❌ Error updating review status:', err)

      return res.status(500).json({
        message: 'Failed to update review status',
      })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Review not found',
      })
    }

    res.json({
      message: `Review ${status} successfully`,
    })
  })
})

// ===============================
// DELETE REVIEW
// Consumers can delete only their own reviews.
// Admins can retain moderation deletion access.
// ===============================
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params

  let sql = `
    DELETE FROM reviews
    WHERE review_id = ?
  `

  const values = [id]

  if (req.user.role === 'consumer') {
    sql += ` AND user_id = ?`
    values.push(req.user.user_id)
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'You are not allowed to delete reviews.',
    })
  }

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error deleting review:', err)

      return res.status(500).json({
        message: 'Failed to delete review',
      })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Review not found or you do not have permission to delete it.',
      })
    }

    res.json({
      message: 'Review deleted successfully',
    })
  })
})

module.exports = router
