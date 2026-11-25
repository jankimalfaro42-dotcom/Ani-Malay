const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

// ===============================
// MULTER CONFIG FOR REVIEW IMAGES
// Up to 3 images, JPG/PNG/WEBP, max 5MB each
// ===============================
const reviewUploadDir = path.join(process.cwd(), 'uploads', 'reviews')
fs.mkdirSync(reviewUploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reviewUploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uniqueName = `review-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
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

const uploadReviewImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).array('images', 3)

function cleanupUploadedFiles(files = []) {
  files.forEach((file) => {
    if (file?.path) {
      fs.unlink(file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Failed to clean up uploaded file:', unlinkErr)
        }
      })
    }
  })
}

function attachImagesToReviews(rows, callback) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return callback(null, [])
  }

  const reviewIds = rows.map((row) => row.review_id)
  const placeholders = reviewIds.map(() => '?').join(', ')

  const imageSql = `
    SELECT review_id, image_url
    FROM review_images
    WHERE review_id IN (${placeholders})
    ORDER BY image_id ASC
  `

  db.query(imageSql, reviewIds, (err, imageRows) => {
    if (err) {
      return callback(err)
    }

    const imagesByReviewId = {}
    imageRows.forEach((img) => {
      if (!imagesByReviewId[img.review_id]) {
        imagesByReviewId[img.review_id] = []
      }
      imagesByReviewId[img.review_id].push(img.image_url)
    })

    const formatted = rows.map((row) => ({
      ...row,
      images: imagesByReviewId[row.review_id] || [],
    }))

    callback(null, formatted)
  })
}

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

    attachImagesToReviews(results, (imgErr, formattedResults) => {
      if (imgErr) {
        console.error('❌ Error fetching review images:', imgErr)
        return res.status(500).json({
          message: 'Failed to fetch review images.',
        })
      }

      res.json(formattedResults)
    })
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
    sql +=  `AND r.product_id = ?`
    values.push(product_id)
  }

  if (user_id) {
    sql +=  `AND r.user_id = ?`
    values.push(user_id)
  }

  if (status) {
    sql +=  `AND r.status = ?`
    values.push(status)
  }

  sql +=  `ORDER BY r.review_id DESC`

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('❌ Error fetching reviews:', err)

      return res.status(500).json({
        message: 'Failed to fetch reviews',
      })
    }

    attachImagesToReviews(results, (imgErr, formattedResults) => {
      if (imgErr) {
        console.error('❌ Error fetching review images:', imgErr)
        return res.status(500).json({
          message: 'Failed to fetch review images',
        })
      }

      res.json(formattedResults)
    })
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

    attachImagesToReviews(results, (imgErr, formattedResults) => {
      if (imgErr) {
        console.error('❌ Error fetching review images:', imgErr)
        return res.status(500).json({
          message: 'Failed to fetch review images',
        })
      }

      res.json(formattedResults[0])
    })
  })
})

// ===============================
// CREATE REVIEW
// Uses the logged-in user's ID from JWT
// Accepts optional multipart images under field name "images"
// ===============================
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumers can submit reviews.',
    })
  }

  uploadReviewImages(req, res, (uploadErr) => {
    const uploadedFiles = req.files || []

    if (uploadErr) {
      cleanupUploadedFiles(uploadedFiles)

      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'Each image must be 5 MB or smaller.',
        })
      }

      if (uploadErr.code === 'LIMIT_UNEXPECTED_FILE' || uploadErr.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'You can upload up to 3 images per review.',
        })
      }

      return res.status(400).json({
        message: uploadErr.message || 'Image upload failed.',
      })
    }

    const {
      product_id,
      rating,
      comment,
    } = req.body

    const numericRating = Number(rating)

    if (!product_id || rating === undefined || rating === null || rating === '') {
      cleanupUploadedFiles(uploadedFiles)
      return res.status(400).json({
        message: 'Product ID and rating are required.',
      })
    }

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      cleanupUploadedFiles(uploadedFiles)
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
        cleanupUploadedFiles(uploadedFiles)

        return res.status(500).json({
          message: 'Failed to add review',
        })
      }

      const reviewId = result.insertId
      const imageUrls = uploadedFiles.map((file) => `/uploads/reviews/${file.filename}`)

      if (imageUrls.length === 0) {
        return res.status(201).json({
          message: 'Review submitted successfully',
          review_id: reviewId,
          images: [],
        })
      }

      const insertImagesSql = `
        INSERT INTO review_images (review_id, image_url)
        VALUES ?
      `
      const imageRows = imageUrls.map((url) => [reviewId, url])

      db.query(insertImagesSql, [imageRows], (imgErr) => {
        if (imgErr) {
          console.error('❌ Error saving review images:', imgErr)
          cleanupUploadedFiles(uploadedFiles)

          return res.status(500).json({
            message: 'Review saved, but failed to save uploaded images.',
          })
        }

        return res.status(201).json({
          message: 'Review submitted successfully',
          review_id: reviewId,
          images: imageUrls,
        })
      })
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
    sql +=  `AND user_id = ?`
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