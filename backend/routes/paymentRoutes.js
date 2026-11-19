
const express = require('express')
const router = express.Router()
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

const multer = require('multer')
const path = require('path')
const fs = require('fs')

// =====================================
// UPLOAD DIRECTORIES
// =====================================

const receiptUploadDir = path.join(
  __dirname,
  '..',
  'uploads',
  'payment-receipts'
)

const qrUploadDir = path.join(
  __dirname,
  '..',
  'uploads',
  'gcash-qr'
)

fs.mkdirSync(receiptUploadDir, { recursive: true })
fs.mkdirSync(qrUploadDir, { recursive: true })

// =====================================
// HELPER: DELETE FILE SAFELY
// =====================================

const deleteFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

// =====================================
// RECEIPT UPLOAD CONFIGURATION
// =====================================

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, receiptUploadDir)
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()

    cb(
      null,
      `receipt-${req.user.user_id}-${Date.now()}${ext}`
    )
  }
})

const receiptUpload = multer({
  storage: receiptStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ]

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error('Only JPG, PNG, and WEBP images are allowed.')
      )
    }

    cb(null, true)
  }
})

// =====================================
// GCASH QR UPLOAD CONFIGURATION
// =====================================

const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, qrUploadDir)
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()

    cb(
      null,
      `gcash-qr-${Date.now()}${ext}`
    )
  }
})

const qrUpload = multer({
  storage: qrStorage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ]

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error('Only JPG, PNG, and WEBP images are allowed.')
      )
    }

    cb(null, true)
  }
})

// =====================================
// ADMIN CHECK
// =====================================

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access is required.'
    })
  }

  next()
}

// =====================================
// QR UPLOAD ERROR HANDLER
// =====================================

const handleQrUpload = (req, res, next) => {
  qrUpload.single('gcash_qr')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || 'QR image upload failed.'
      })
    }

    next()
  })
}

// =====================================
// PUBLIC: GET ACTIVE GCASH QR
// CUSTOMER CHECKOUT USES THIS
// =====================================

router.get('/gcash-qr', async (req, res) => {
  try {
    const [settings] = await db.promise().query(
      `
        SELECT
          gcash_qr_image,
          is_active
        FROM payment_settings
        WHERE setting_id = 1
        LIMIT 1
      `
    )

    if (
      settings.length === 0 ||
      !settings[0].gcash_qr_image ||
      Number(settings[0].is_active) !== 1
    ) {
      return res.json({
        available: false,
        qr_image: null
      })
    }

    res.json({
      available: true,
      qr_image: settings[0].gcash_qr_image
    })
  } catch (error) {
    console.error('Get active GCash QR error:', error)

    res.status(500).json({
      message: 'Failed to retrieve GCash QR.'
    })
  }
})

// =====================================
// ADMIN: GET GCASH QR SETTINGS
// =====================================

router.get(
  '/admin/gcash-qr',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const [settings] = await db.promise().query(
        `
          SELECT
            setting_id,
            gcash_qr_image,
            is_active,
            updated_by,
            updated_at
          FROM payment_settings
          WHERE setting_id = 1
          LIMIT 1
        `
      )

      if (settings.length === 0) {
        return res.json({
          gcash_qr_image: null,
          is_active: 0,
          updated_by: null,
          updated_at: null
        })
      }

      res.json(settings[0])
    } catch (error) {
      console.error('Get Admin GCash QR error:', error)

      res.status(500).json({
        message: 'Failed to retrieve GCash QR settings.'
      })
    }
  }
)

// =====================================
// ADMIN: UPLOAD OR REPLACE GCASH QR
// FORM FIELD: gcash_qr
// =====================================

router.post(
  '/admin/gcash-qr',
  authMiddleware,
  adminOnly,
  handleQrUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select a GCash QR image.'
        })
      }

      const [existingSettings] = await db.promise().query(
        `
          SELECT gcash_qr_image
          FROM payment_settings
          WHERE setting_id = 1
          LIMIT 1
        `
      )

      const oldQrPath =
        existingSettings.length > 0
          ? existingSettings[0].gcash_qr_image
          : null

      const newQrPath =
        `/uploads/gcash-qr/${req.file.filename}`

      await db.promise().query(
        `
          INSERT INTO payment_settings (
            setting_id,
            gcash_qr_image,
            is_active,
            updated_by
          )
          VALUES (1, ?, 0, ?)
          ON DUPLICATE KEY UPDATE
            gcash_qr_image = VALUES(gcash_qr_image),
            updated_by = VALUES(updated_by)
        `,
        [
          newQrPath,
          req.user.user_id
        ]
      )

      // Remove previous QR only after successful database update.
      if (oldQrPath && oldQrPath !== newQrPath) {
        const oldFilePath = path.join(
          __dirname,
          '..',
          oldQrPath.replace(/^\/uploads\//, 'uploads/')
        )

        deleteFile(oldFilePath)
      }

      res.json({
        message: 'GCash QR uploaded successfully. Activate it when ready.',
        gcash_qr_image: newQrPath
      })
    } catch (error) {
      if (req.file) {
        deleteFile(req.file.path)
      }

      console.error('Upload GCash QR error:', error)

      res.status(500).json({
        message: 'Failed to upload GCash QR.'
      })
    }
  }
)

// =====================================
// ADMIN: ACTIVATE OR DEACTIVATE QR
// BODY: { "is_active": true }
// =====================================

router.put(
  '/admin/gcash-qr/status',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { is_active } = req.body

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          message: 'Please provide a valid active status.'
        })
      }

      const [settings] = await db.promise().query(
        `
          SELECT gcash_qr_image
          FROM payment_settings
          WHERE setting_id = 1
          LIMIT 1
        `
      )

      if (
        settings.length === 0 ||
        !settings[0].gcash_qr_image
      ) {
        return res.status(400).json({
          message: 'Upload a GCash QR image before activating it.'
        })
      }

      await db.promise().query(
        `
          UPDATE payment_settings
          SET
            is_active = ?,
            updated_by = ?
          WHERE setting_id = 1
        `,
        [
          is_active ? 1 : 0,
          req.user.user_id
        ]
      )

      res.json({
        message: is_active
          ? 'GCash QR is now active.'
          : 'GCash QR has been deactivated.',
        is_active: is_active ? 1 : 0
      })
    } catch (error) {
      console.error('Update GCash QR status error:', error)

      res.status(500).json({
        message: 'Failed to update GCash QR status.'
      })
    }
  }
)

// =====================================
// ADMIN: REMOVE GCASH QR
// =====================================

router.delete(
  '/admin/gcash-qr',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const [settings] = await db.promise().query(
        `
          SELECT gcash_qr_image
          FROM payment_settings
          WHERE setting_id = 1
          LIMIT 1
        `
      )

      if (
        settings.length === 0 ||
        !settings[0].gcash_qr_image
      ) {
        return res.status(404).json({
          message: 'There is no GCash QR to remove.'
        })
      }

      const oldQrPath = settings[0].gcash_qr_image

      await db.promise().query(
        `
          UPDATE payment_settings
          SET
            gcash_qr_image = NULL,
            is_active = 0,
            updated_by = ?
          WHERE setting_id = 1
        `,
        [req.user.user_id]
      )

      const oldFilePath = path.join(
        __dirname,
        '..',
        oldQrPath.replace(/^\/uploads\//, 'uploads/')
      )

      deleteFile(oldFilePath)

      res.json({
        message: 'GCash QR has been removed.',
        is_active: 0,
        gcash_qr_image: null
      })
    } catch (error) {
      console.error('Remove GCash QR error:', error)

      res.status(500).json({
        message: 'Failed to remove GCash QR.'
      })
    }
  }
)

// =====================================
// GET ALL PAYMENTS
// =====================================

router.get('/', async (req, res) => {
  try {
    const { payment_status, payment_method, order_id } = req.query

    let sql = `
      SELECT
        p.payment_id,
        p.order_id,
        o.user_id,
        u.full_name,
        p.payment_type,
        p.payment_method,
        p.amount,
        p.payment_status,
        p.reference_number,
        p.receipt_image,
        p.verified_by,
        p.verified_at,
        p.rejection_reason,
        p.refund_amount,
        p.refunded_at,
        p.payment_date
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.order_id
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE 1 = 1
    `

    const params = []

    if (payment_status) {
      sql += ' AND p.payment_status = ?'
      params.push(payment_status)
    }

    if (payment_method) {
      sql += ' AND p.payment_method = ?'
      params.push(payment_method)
    }

    if (order_id) {
      sql += ' AND p.order_id = ?'
      params.push(order_id)
    }

    sql += ' ORDER BY p.payment_id DESC'

    const [payments] = await db.promise().query(sql, params)

    res.json(payments)
  } catch (error) {
    console.error('Get payments error:', error)

    res.status(500).json({
      message: 'Failed to retrieve payments.'
    })
  }
})

// =====================================
// CUSTOMER SUBMITS SHIPPING PAYMENT PROOF
// =====================================

router.post(
  '/shipping/:orderId/receipt',
  authMiddleware,
  receiptUpload.single('receipt_image'),
  async (req, res) => {
    try {
      const orderId = req.params.orderId
      const userId = req.user.user_id
      const referenceNumber = (
        req.body.reference_number || ''
      ).trim()

      if (!referenceNumber) {
        if (req.file) {
          deleteFile(req.file.path)
        }

        return res.status(400).json({
          message: 'GCash reference number is required.'
        })
      }

      if (!req.file) {
        return res.status(400).json({
          message: 'Please upload your GCash receipt.'
        })
      }

      const [payments] = await db.promise().query(
        `
          SELECT
            p.payment_id,
            p.payment_status
          FROM payments p
          INNER JOIN orders o
            ON p.order_id = o.order_id
          WHERE
            p.order_id = ?
            AND o.user_id = ?
            AND p.payment_type = 'shipping'
          LIMIT 1
        `,
        [orderId, userId]
      )

      if (payments.length === 0) {
        deleteFile(req.file.path)

        return res.status(404).json({
          message: 'Shipping payment for this order was not found.'
        })
      }

      const payment = payments[0]

      if (
        !['pending', 'rejected'].includes(
          payment.payment_status
        )
      ) {
        deleteFile(req.file.path)

        return res.status(400).json({
          message: 'This shipping payment has already been submitted or verified.'
        })
      }

      const receiptPath =
        `/uploads/payment-receipts/${req.file.filename}`

      await db.promise().query(
        `
          UPDATE payments
          SET
            reference_number = ?,
            receipt_image = ?,
            payment_status = 'for_verification',
            rejection_reason = NULL,
            verified_by = NULL,
            verified_at = NULL
          WHERE payment_id = ?
        `,
        [
          referenceNumber,
          receiptPath,
          payment.payment_id
        ]
      )

      res.json({
        message: 'Shipping payment proof submitted successfully. Please wait for Admin verification.',
        payment_id: payment.payment_id,
        order_id: orderId,
        payment_status: 'for_verification'
      })
    } catch (error) {
      if (req.file) {
        deleteFile(req.file.path)
      }

      console.error('Shipping receipt upload error:', error)

      res.status(500).json({
        message: 'Failed to submit shipping payment proof.'
      })
    }
  }
)

// =====================================
// GET PAYMENT DETAILS
// =====================================

router.get('/:id', async (req, res) => {
  try {
    const [payments] = await db.promise().query(
      `
        SELECT
          p.*,
          o.user_id,
          u.full_name
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.order_id
        LEFT JOIN users u ON o.user_id = u.user_id
        WHERE p.payment_id = ?
      `,
      [req.params.id]
    )

    if (payments.length === 0) {
      return res.status(404).json({
        message: 'Payment not found.'
      })
    }

    res.json(payments[0])
  } catch (error) {
    console.error('Get payment details error:', error)

    res.status(500).json({
      message: 'Failed to retrieve payment details.'
    })
  }
})

// =====================================
// ADMIN APPROVES / REJECTS / REFUNDS
// =====================================

router.put(
  '/:id/status',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const paymentId = req.params.id
      const { payment_status, rejection_reason } = req.body

      const allowedStatuses = [
        'paid',
        'rejected',
        'failed',
        'refunded'
      ]

      if (!allowedStatuses.includes(payment_status)) {
        return res.status(400).json({
          message: 'Invalid payment status.'
        })
      }

      const [payments] = await db.promise().query(
        `
          SELECT
            p.*,
            o.status AS order_status
          FROM payments p
          INNER JOIN orders o
            ON p.order_id = o.order_id
          WHERE p.payment_id = ?
          LIMIT 1
        `,
        [paymentId]
      )

      if (payments.length === 0) {
        return res.status(404).json({
          message: 'Payment not found.'
        })
      }

      const payment = payments[0]

      // APPROVE PAYMENT
      if (payment_status === 'paid') {
        if (
          payment.payment_type === 'shipping' &&
          payment.payment_status !== 'for_verification'
        ) {
          return res.status(400).json({
            message: 'Shipping payment must have submitted proof before approval.'
          })
        }

        await db.promise().query(
          `
            UPDATE payments
            SET
              payment_status = 'paid',
              verified_by = ?,
              verified_at = NOW(),
              rejection_reason = NULL
            WHERE payment_id = ?
          `,
          [req.user.user_id, paymentId]
        )

        return res.json({
          message: 'Payment successfully verified and approved.',
          payment_status: 'paid'
        })
      }

      // REJECT SHIPPING PAYMENT
      if (payment_status === 'rejected') {
        if (
          payment.payment_type !== 'shipping' ||
          payment.payment_status !== 'for_verification'
        ) {
          return res.status(400).json({
            message: 'Only submitted shipping payment proofs can be rejected.'
          })
        }

        const reason = (rejection_reason || '').trim()

        if (!reason) {
          return res.status(400).json({
            message: 'Please provide a reason for rejecting the payment.'
          })
        }

        await db.promise().query(
          `
            UPDATE payments
            SET
              payment_status = 'rejected',
              rejection_reason = ?,
              verified_by = ?,
              verified_at = NOW()
            WHERE payment_id = ?
          `,
          [reason, req.user.user_id, paymentId]
        )

        return res.json({
          message: 'Shipping payment proof rejected.',
          payment_status: 'rejected'
        })
      }

      // MARK PAYMENT AS FAILED
      if (payment_status === 'failed') {
        await db.promise().query(
          `
            UPDATE payments
            SET
              payment_status = 'failed',
              verified_by = ?,
              verified_at = NOW()
            WHERE payment_id = ?
          `,
          [req.user.user_id, paymentId]
        )

        return res.json({
          message: 'Payment marked as failed.',
          payment_status: 'failed'
        })
      }

      // RECORD BORACAY SHIPPING REFUND
      if (payment_status === 'refunded') {
        if (
          payment.payment_type !== 'shipping' ||
          payment.payment_status !== 'paid' ||
          Number(payment.refund_amount) <= 0
        ) {
          return res.status(400).json({
            message: 'This payment is not eligible for a shipping refund.'
          })
        }

        if (payment.order_status !== 'completed') {
          return res.status(400).json({
            message: 'The order must be completed before recording the refund.'
          })
        }

        await db.promise().query(
          `
            UPDATE payments
            SET
              payment_status = 'refunded',
              refunded_at = NOW(),
              verified_by = ?
            WHERE payment_id = ?
          `,
          [req.user.user_id, paymentId]
        )

        return res.json({
          message: 'Shipping refund successfully recorded.',
          refund_amount: payment.refund_amount,
          payment_status: 'refunded'
        })
      }
    } catch (error) {
      console.error('Update payment status error:', error)

      res.status(500).json({
        message: 'Failed to update payment status.'
      })
    }
  }
)

module.exports = router
