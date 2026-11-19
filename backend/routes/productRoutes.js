
const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const db = require('../db')

const router = express.Router()

// ========================================
// UPLOAD FOLDER
// ========================================

const uploadDir = path.join(__dirname, '../uploads/products')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// ========================================
// MULTER STORAGE
// ========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname)

    const filename =
      Date.now() +
      '-' +
      Math.round(Math.random() * 1e9) +
      extension

    cb(null, filename)
  },
})

// ========================================
// MULTER FILTER
// ========================================

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.'),
      false
    )
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})

// ========================================
// GET ALL PRODUCTS WITH QUANTITY OPTIONS
// ========================================

router.get('/', (req, res) => {
  const sql = `
    SELECT
      p.product_id,
      p.product_name,
      p.description,
      p.price,
      p.unit,
      p.stock_quantity,
      p.image,
      p.status,
      p.is_featured,
      p.category_id,
      c.category_name
    FROM products p
    LEFT JOIN categories c
      ON p.category_id = c.category_id
    ORDER BY p.product_id DESC
  `

  db.query(sql, (err, products) => {
    if (err) {
      console.error('Get products error:', err)

      return res.status(500).json({
        message: 'Failed to fetch products',
        error: err.message,
      })
    }

    if (!products.length) {
      return res.json([])
    }

    const productIds = products.map(
      product => product.product_id
    )

    const placeholders = productIds.map(() => '?').join(',')

    const optionsSql = `
      SELECT
        option_id,
        product_id,
        option_label,
        quantity_value,
        unit,
        price,
        is_available
      FROM product_quantity_options
      WHERE product_id IN (${placeholders})
      ORDER BY quantity_value ASC, option_id ASC
    `

    db.query(optionsSql, productIds, (optionError, options) => {
      if (optionError) {
        console.error('Get quantity options error:', optionError)

        return res.status(500).json({
          message: 'Failed to fetch product quantity options',
          error: optionError.message,
        })
      }

      const productsWithOptions = products.map(product => ({
        ...product,
        quantity_options: options.filter(
          option =>
            Number(option.product_id) === Number(product.product_id)
        ),
      }))

      res.json(productsWithOptions)
    })
  })
})

// ========================================
// GET SINGLE PRODUCT WITH QUANTITY OPTIONS
// ========================================

router.get('/:id', (req, res) => {
  const { id } = req.params

  const sql = `
    SELECT
      p.product_id,
      p.product_name,
      p.description,
      p.price,
      p.unit,
      p.stock_quantity,
      p.image,
      p.status,
      p.is_featured,
      p.category_id,
      c.category_name
    FROM products p
    LEFT JOIN categories c
      ON p.category_id = c.category_id
    WHERE p.product_id = ?
  `

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Get product error:', err)

      return res.status(500).json({
        message: 'Failed to fetch product',
        error: err.message,
      })
    }

    if (!results.length) {
      return res.status(404).json({
        message: 'Product not found',
      })
    }

    const product = results[0]

    const optionsSql = `
      SELECT
        option_id,
        product_id,
        option_label,
        quantity_value,
        unit,
        price,
        is_available
      FROM product_quantity_options
      WHERE product_id = ?
      ORDER BY quantity_value ASC, option_id ASC
    `

    db.query(optionsSql, [id], (optionError, options) => {
      if (optionError) {
        console.error('Get quantity options error:', optionError)

        return res.status(500).json({
          message: 'Failed to fetch product quantity options',
          error: optionError.message,
        })
      }

      res.json({
        ...product,
        quantity_options: options,
      })
    })
  })
})

// ========================================
// GET QUANTITY OPTIONS FOR ONE PRODUCT
// ========================================

router.get('/:id/quantity-options', (req, res) => {
  const { id } = req.params

  const sql = `
    SELECT
      option_id,
      product_id,
      option_label,
      quantity_value,
      unit,
      price,
      is_available
    FROM product_quantity_options
    WHERE product_id = ?
    ORDER BY quantity_value ASC, option_id ASC
  `

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Get quantity options error:', err)

      return res.status(500).json({
        message: 'Failed to fetch quantity options',
        error: err.message,
      })
    }

    res.json(results)
  })
})

// ========================================
// ADD QUANTITY OPTION
// ========================================

router.post('/:id/quantity-options', (req, res) => {
  const { id } = req.params

  const {
    option_label,
    quantity_value,
    unit,
    price,
  } = req.body || {}

  if (
    !option_label ||
    !unit ||
    quantity_value === undefined ||
    quantity_value === '' ||
    price === undefined ||
    price === ''
  ) {
    return res.status(400).json({
      message: 'Please complete all quantity option fields.',
    })
  }

  if (
    !Number.isFinite(Number(quantity_value)) ||
    Number(quantity_value) <= 0 ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return res.status(400).json({
      message: 'Invalid quantity or price.',
    })
  }

  db.query(
    'SELECT product_id FROM products WHERE product_id = ?',
    [id],
    (productError, products) => {
      if (productError) {
        console.error('Verify product error:', productError)

        return res.status(500).json({
          message: 'Failed to verify product.',
        })
      }

      if (!products.length) {
        return res.status(404).json({
          message: 'Product not found.',
        })
      }

      const sql = `
        INSERT INTO product_quantity_options (
          product_id,
          option_label,
          quantity_value,
          unit,
          price,
          is_available
        )
        VALUES (?, ?, ?, ?, ?, 1)
      `

      db.query(
        sql,
        [
          id,
          option_label.trim(),
          Number(quantity_value),
          unit.trim(),
          Number(price),
        ],
        (err, result) => {
          if (err) {
            console.error('Add quantity option error:', err)

            return res.status(500).json({
              message: 'Failed to add quantity option.',
              error: err.message,
            })
          }

          res.status(201).json({
            message: 'Quantity option added successfully.',
            option_id: result.insertId,
          })
        }
      )
    }
  )
})

// ========================================
// UPDATE QUANTITY OPTION
// ========================================

router.put('/:id/quantity-options/:optionId', (req, res) => {
  const { id, optionId } = req.params

  const {
    option_label,
    quantity_value,
    unit,
    price,
  } = req.body || {}

  if (
    !option_label ||
    !unit ||
    quantity_value === undefined ||
    quantity_value === '' ||
    price === undefined ||
    price === ''
  ) {
    return res.status(400).json({
      message: 'Please complete all quantity option fields.',
    })
  }

  if (
    !Number.isFinite(Number(quantity_value)) ||
    Number(quantity_value) <= 0 ||
    !Number.isFinite(Number(price)) ||
    Number(price) < 0
  ) {
    return res.status(400).json({
      message: 'Invalid quantity or price.',
    })
  }

  const sql = `
    UPDATE product_quantity_options
    SET
      option_label = ?,
      quantity_value = ?,
      unit = ?,
      price = ?
    WHERE option_id = ?
      AND product_id = ?
  `

  db.query(
    sql,
    [
      option_label.trim(),
      Number(quantity_value),
      unit.trim(),
      Number(price),
      optionId,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error('Update quantity option error:', err)

        return res.status(500).json({
          message: 'Failed to update quantity option.',
          error: err.message,
        })
      }

      if (!result.affectedRows) {
        return res.status(404).json({
          message: 'Quantity option not found.',
        })
      }

      res.json({
        message: 'Quantity option updated successfully.',
      })
    }
  )
})

// ========================================
// ENABLE / DISABLE QUANTITY OPTION
// ========================================

router.patch(
  '/:id/quantity-options/:optionId/availability',
  (req, res) => {
    const { id, optionId } = req.params
    const { is_available } = req.body || {}

    if (![true, false, 1, 0, '1', '0'].includes(is_available)) {
      return res.status(400).json({
        message: 'Invalid availability value.',
      })
    }

    const available =
      is_available === true ||
      is_available === 1 ||
      is_available === '1'
        ? 1
        : 0

    const sql = `
      UPDATE product_quantity_options
      SET is_available = ?
      WHERE option_id = ?
        AND product_id = ?
    `

    db.query(
      sql,
      [available, optionId, id],
      (err, result) => {
        if (err) {
          console.error('Option availability error:', err)

          return res.status(500).json({
            message: 'Failed to update availability.',
            error: err.message,
          })
        }

        if (!result.affectedRows) {
          return res.status(404).json({
            message: 'Quantity option not found.',
          })
        }

        res.json({
          message: available
            ? 'Quantity option enabled.'
            : 'Quantity option disabled.',
        })
      }
    )
  }
)

// ========================================
// ADD PRODUCT
// ========================================

router.post('/', upload.single('image'), (req, res) => {
  const {
    product_name,
    category_id,
    description,
    price,
    unit,
    stock_quantity,
    status,
    is_featured,
  } = req.body || {}

  if (!product_name) {
    return res.status(400).json({
      message: 'Product name is required',
    })
  }

  if (!category_id) {
    return res.status(400).json({
      message: 'Category is required',
    })
  }

  if (price === undefined || price === null || price === '') {
    return res.status(400).json({
      message: 'Price is required',
    })
  }

  const image = req.file
    ? `/uploads/products/${req.file.filename}`
    : null

  const productStatus = status || 'active'

  const featured =
    is_featured === '1' ||
    is_featured === 'true' ||
    is_featured === 1 ||
    is_featured === true
      ? 1
      : 0

  const sql = `
    INSERT INTO products (
      product_name,
      category_id,
      description,
      price,
      unit,
      stock_quantity,
      image,
      status,
      is_featured
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `

  const values = [
    product_name,
    category_id,
    description || null,
    Number(price),
    unit || 'kg',
    Number(stock_quantity) || 0,
    image,
    productStatus,
    featured,
  ]

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Add product error:', err)

      return res.status(500).json({
        message: 'Failed to add product',
        error: err.message,
      })
    }

    res.status(201).json({
      message: 'Product added successfully',
      product_id: result.insertId,
    })
  })
})

// ========================================
// UPDATE PRODUCT
// ========================================

router.put('/:id', upload.single('image'), (req, res) => {
  const { id } = req.params

  const {
    product_name,
    category_id,
    description,
    price,
    unit,
    stock_quantity,
    status,
    is_featured,
  } = req.body || {}

  if (!product_name) {
    return res.status(400).json({
      message: 'Product name is required',
    })
  }

  if (!category_id) {
    return res.status(400).json({
      message: 'Category is required',
    })
  }

  const featured =
    is_featured === '1' ||
    is_featured === 'true' ||
    is_featured === 1 ||
    is_featured === true
      ? 1
      : 0

  const values = [
    product_name,
    category_id,
    description || null,
    Number(price) || 0,
    unit || 'kg',
    Number(stock_quantity) || 0,
  ]

  let sql

  if (req.file) {
    const newImage = `/uploads/products/${req.file.filename}`

    sql = `
      UPDATE products
      SET
        product_name = ?,
        category_id = ?,
        description = ?,
        price = ?,
        unit = ?,
        stock_quantity = ?,
        image = ?,
        status = ?,
        is_featured = ?
      WHERE product_id = ?
    `

    values.push(
      newImage,
      status || 'active',
      featured,
      id
    )
  } else {
    sql = `
      UPDATE products
      SET
        product_name = ?,
        category_id = ?,
        description = ?,
        price = ?,
        unit = ?,
        stock_quantity = ?,
        status = ?,
        is_featured = ?
      WHERE product_id = ?
    `

    values.push(
      status || 'active',
      featured,
      id
    )
  }

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Update product error:', err)

      return res.status(500).json({
        message: 'Failed to update product',
        error: err.message,
      })
    }

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Product not found',
      })
    }

    res.json({
      message: 'Product updated successfully',
    })
  })
})

// ========================================
// UPDATE STOCK
// ========================================

router.put('/:id/stock', (req, res) => {
  const { id } = req.params
  const { stock_quantity } = req.body || {}

  if (
    stock_quantity === undefined ||
    stock_quantity === null ||
    !Number.isFinite(Number(stock_quantity)) ||
    Number(stock_quantity) < 0
  ) {
    return res.status(400).json({
      message: 'A valid stock quantity is required',
    })
  }

  const sql = `
    UPDATE products
    SET stock_quantity = ?
    WHERE product_id = ?
  `

  db.query(
    sql,
    [Number(stock_quantity), id],
    (err, result) => {
      if (err) {
        console.error('Update stock error:', err)

        return res.status(500).json({
          message: 'Failed to update stock',
          error: err.message,
        })
      }

      if (!result.affectedRows) {
        return res.status(404).json({
          message: 'Product not found',
        })
      }

      res.json({
        message: 'Stock updated successfully',
      })
    }
  )
})

// ========================================
// SET FEATURED
// ========================================

router.put('/:id/featured', (req, res) => {
  const { id } = req.params
  const { is_featured } = req.body || {}

  const featured =
    is_featured === true ||
    is_featured === 1 ||
    is_featured === '1' ||
    is_featured === 'true'
      ? 1
      : 0

  const sql = `
    UPDATE products
    SET is_featured = ?
    WHERE product_id = ?
  `

  db.query(sql, [featured, id], (err, result) => {
    if (err) {
      console.error('Featured update error:', err)

      return res.status(500).json({
        message: 'Failed to update featured status',
        error: err.message,
      })
    }

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Product not found',
      })
    }

    res.json({
      message: featured
        ? 'Product added to featured'
        : 'Product removed from featured',
    })
  })
})

// ========================================
// ARCHIVE PRODUCT
// ========================================

router.put('/:id/archive', (req, res) => {
  const { id } = req.params

  const sql = `
    UPDATE products
    SET status = 'archived'
    WHERE product_id = ?
  `

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Archive product error:', err)

      return res.status(500).json({
        message: 'Failed to archive product',
        error: err.message,
      })
    }

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Product not found',
      })
    }

    res.json({
      message: 'Product archived successfully',
    })
  })
})

// ========================================
// RESTORE PRODUCT
// ========================================

router.put('/:id/restore', (req, res) => {
  const { id } = req.params

  const sql = `
    UPDATE products
    SET status = 'active'
    WHERE product_id = ?
  `

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Restore product error:', err)

      return res.status(500).json({
        message: 'Failed to restore product',
        error: err.message,
      })
    }

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Product not found',
      })
    }

    res.json({
      message: 'Product restored successfully',
    })
  })
})

// ========================================
// MULTER ERROR HANDLER
// ========================================

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message,
    })
  }

  if (err) {
    console.error('Product route error:', err)

    return res.status(400).json({
      message: err.message,
    })
  }

  next()
})

// ========================================
// EXPORT
// ========================================

module.exports = router
