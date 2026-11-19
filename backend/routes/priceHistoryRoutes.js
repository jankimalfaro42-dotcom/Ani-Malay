const express = require('express')
const router = express.Router()
const db = require('../db')

// ===============================
// GET ALL PRICE HISTORY
// ===============================
router.get('/', (req, res) => {
  const { product_id } = req.query

  let sql = `
    SELECT
      ph.price_history_id,
      ph.product_id,
      p.product_name,
      ph.price,
      ph.recorded_at
    FROM price_history ph
    INNER JOIN products p
      ON ph.product_id = p.product_id
    WHERE 1 = 1
  `

  const values = []

  if (product_id) {
    sql += ' AND ph.product_id = ?'
    values.push(product_id)
  }

  sql += ' ORDER BY ph.recorded_at DESC'

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('❌ Error fetching price history:', err)

      return res.status(500).json({
        message: 'Failed to fetch price history',
      })
    }

    res.json(results)
  })
})

// ===============================
// GET PRICE HISTORY BY ID
// ===============================
router.get('/:id', (req, res) => {
  const { id } = req.params

  const sql = `
    SELECT
      ph.price_history_id,
      ph.product_id,
      p.product_name,
      ph.price,
      ph.recorded_at
    FROM price_history ph
    INNER JOIN products p
      ON ph.product_id = p.product_id
    WHERE ph.price_history_id = ?
  `

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('❌ Error fetching price history:', err)

      return res.status(500).json({
        message: 'Failed to fetch price history',
      })
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Price history not found',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// RECORD PRODUCT PRICE
// ===============================
router.post('/', (req, res) => {
  const {
    product_id,
    price,
  } = req.body

  if (!product_id || price === undefined) {
    return res.status(400).json({
      message: 'Product ID and price are required',
    })
  }

  if (Number(price) < 0) {
    return res.status(400).json({
      message: 'Price cannot be negative',
    })
  }

  const sql = `
    INSERT INTO price_history
    (
      product_id,
      price
    )
    VALUES (?, ?)
  `

  db.query(sql, [product_id, price], (err, result) => {
    if (err) {
      console.error('❌ Error recording price:', err)

      return res.status(500).json({
        message: 'Failed to record product price',
      })
    }

    res.status(201).json({
      message: 'Product price recorded successfully',
      price_history_id: result.insertId,
    })
  })
})

// ===============================
// UPDATE PRICE HISTORY RECORD
// ===============================
router.put('/:id', (req, res) => {
  const { id } = req.params
  const { price } = req.body

  if (price === undefined) {
    return res.status(400).json({
      message: 'Price is required',
    })
  }

  if (Number(price) < 0) {
    return res.status(400).json({
      message: 'Price cannot be negative',
    })
  }

  const sql = `
    UPDATE price_history
    SET price = ?
    WHERE price_history_id = ?
  `

  db.query(sql, [price, id], (err, result) => {
    if (err) {
      console.error('❌ Error updating price history:', err)

      return res.status(500).json({
        message: 'Failed to update price history',
      })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Price history not found',
      })
    }

    res.json({
      message: 'Price history updated successfully',
    })
  })
})

// ===============================
// DELETE PRICE HISTORY RECORD
// ===============================
router.delete('/:id', (req, res) => {
  const { id } = req.params

  const sql = `
    DELETE FROM price_history
    WHERE price_history_id = ?
  `

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Error deleting price history:', err)

      return res.status(500).json({
        message: 'Failed to delete price history',
      })
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Price history not found',
      })
    }

    res.json({
      message: 'Price history deleted successfully',
    })
  })
})

module.exports = router