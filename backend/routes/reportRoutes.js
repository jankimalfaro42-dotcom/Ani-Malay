const express = require('express')
const router = express.Router()
const db = require('../db')

// ===============================
// DASHBOARD SUMMARY
// ===============================
router.get('/summary', (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'consumer') AS total_users,
      (SELECT COUNT(*) FROM products WHERE status = 'active') AS total_products,
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE status = 'completed'
      ) AS total_sales,
      (
        SELECT COUNT(*)
        FROM products
        WHERE stock_quantity <= 10
          AND status = 'active'
      ) AS low_stock_products
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching dashboard summary:', err)

      return res.status(500).json({
        message: 'Failed to fetch dashboard summary',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// TOTAL SALES
// ===============================
router.get('/sales', (req, res) => {
  const sql = `
    SELECT
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM orders
    WHERE status = 'completed'
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching total sales:', err)

      return res.status(500).json({
        message: 'Failed to fetch total sales',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// TOTAL ORDERS
// ===============================
router.get('/orders', (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total_orders,
      SUM(status = 'pending') AS pending_orders,
      SUM(status = 'confirmed') AS confirmed_orders,
      SUM(status = 'processing') AS processing_orders,
      SUM(status = 'ready') AS ready_orders,
      SUM(status = 'out_for_delivery') AS out_for_delivery_orders,
      SUM(status = 'completed') AS completed_orders,
      SUM(status = 'cancelled') AS cancelled_orders
    FROM orders
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching order statistics:', err)

      return res.status(500).json({
        message: 'Failed to fetch order statistics',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// BEST-SELLING PRODUCTS
// ===============================
router.get('/best-selling', (req, res) => {
  const sql = `
    SELECT
      p.product_id,
      p.product_name,
      SUM(oi.quantity) AS total_quantity_sold,
      SUM(oi.subtotal) AS total_sales
    FROM order_items oi
    INNER JOIN orders o
      ON oi.order_id = o.order_id
    INNER JOIN products p
      ON oi.product_id = p.product_id
    WHERE o.status = 'completed'
    GROUP BY
      p.product_id,
      p.product_name
    ORDER BY total_quantity_sold DESC
    LIMIT 10
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching best-selling products:', err)

      return res.status(500).json({
        message: 'Failed to fetch best-selling products',
      })
    }

    res.json(results)
  })
})

// ===============================
// LOW-STOCK PRODUCTS
// ===============================
router.get('/low-stock', (req, res) => {
  const { limit } = req.query

  const stockLimit = Number(limit) || 10

  const sql = `
    SELECT
      product_id,
      product_name,
      stock_quantity,
      unit,
      status
    FROM products
    WHERE stock_quantity <= ?
      AND status = 'active'
    ORDER BY stock_quantity ASC
  `

  db.query(sql, [stockLimit], (err, results) => {
    if (err) {
      console.error('❌ Error fetching low-stock products:', err)

      return res.status(500).json({
        message: 'Failed to fetch low-stock products',
      })
    }

    res.json(results)
  })
})

// ===============================
// PRODUCT AVAILABILITY
// ===============================
router.get('/product-availability', (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total_products,
      SUM(status = 'active') AS active_products,
      SUM(status = 'archived') AS archived_products,
      SUM(stock_quantity > 0 AND status = 'active') AS available_products,
      SUM(stock_quantity = 0 AND status = 'active') AS out_of_stock_products
    FROM products
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching product availability:', err)

      return res.status(500).json({
        message: 'Failed to fetch product availability',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// MONTHLY SALES
// ===============================
router.get('/monthly-sales', (req, res) => {
  const sql = `
    SELECT
      YEAR(order_date) AS year,
      MONTH(order_date) AS month,
      MONTHNAME(order_date) AS month_name,
      COUNT(order_id) AS total_orders,
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM orders
    WHERE status = 'completed'
    GROUP BY
      YEAR(order_date),
      MONTH(order_date),
      MONTHNAME(order_date)
    ORDER BY
      year DESC,
      month DESC
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching monthly sales:', err)

      return res.status(500).json({
        message: 'Failed to fetch monthly sales',
      })
    }

    res.json(results)
  })
})

// ===============================
// RECENT ORDERS
// ===============================
router.get('/recent-orders', (req, res) => {
  const sql = `
    SELECT
      o.order_id,
      u.full_name,
      o.total_amount,
      o.status,
      o.order_date
    FROM orders o
    INNER JOIN users u
      ON o.user_id = u.user_id
    ORDER BY o.order_date DESC
    LIMIT 10
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching recent orders:', err)

      return res.status(500).json({
        message: 'Failed to fetch recent orders',
      })
    }

    res.json(results)
  })
})



// ===============================
// DASHBOARD SUMMARY
// ===============================
router.get('/summary', (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'consumer') AS total_users,
      (SELECT COUNT(*) FROM products WHERE status = 'active') AS total_products,
      (SELECT COUNT(*) FROM orders) AS total_orders,
      (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE status = 'completed'
      ) AS total_sales,
      (
        SELECT COUNT(*)
        FROM products
        WHERE stock_quantity <= 10
          AND status = 'active'
      ) AS low_stock_products
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching dashboard summary:', err)

      return res.status(500).json({
        message: 'Failed to fetch dashboard summary',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// TOTAL SALES
// ===============================
router.get('/sales', (req, res) => {
  const sql = `
    SELECT
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM orders
    WHERE status = 'completed'
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching total sales:', err)

      return res.status(500).json({
        message: 'Failed to fetch total sales',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// TOTAL ORDERS
// ===============================
router.get('/orders', (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total_orders,
      SUM(status = 'pending') AS pending_orders,
      SUM(status = 'confirmed') AS confirmed_orders,
      SUM(status = 'processing') AS processing_orders,
      SUM(status = 'ready') AS ready_orders,
      SUM(status = 'out_for_delivery') AS out_for_delivery_orders,
      SUM(status = 'completed') AS completed_orders,
      SUM(status = 'cancelled') AS cancelled_orders
    FROM orders
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching order statistics:', err)

      return res.status(500).json({
        message: 'Failed to fetch order statistics',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// BEST-SELLING PRODUCTS
// ===============================
router.get('/best-selling', (req, res) => {
  const sql = `
    SELECT
      p.product_id,
      p.product_name,
      SUM(oi.quantity) AS total_quantity_sold,
      SUM(oi.subtotal) AS total_sales
    FROM order_items oi
    INNER JOIN orders o
      ON oi.order_id = o.order_id
    INNER JOIN products p
      ON oi.product_id = p.product_id
    WHERE o.status = 'completed'
    GROUP BY
      p.product_id,
      p.product_name
    ORDER BY total_quantity_sold DESC
    LIMIT 10
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching best-selling products:', err)

      return res.status(500).json({
        message: 'Failed to fetch best-selling products',
      })
    }

    res.json(results)
  })
})

// ===============================
// LOW-STOCK PRODUCTS
// ===============================
router.get('/low-stock', (req, res) => {
  const { limit } = req.query

  const stockLimit = Number(limit) || 10

  const sql = `
    SELECT
      product_id,
      product_name,
      stock_quantity,
      unit,
      status
    FROM products
    WHERE stock_quantity <= ?
      AND status = 'active'
    ORDER BY stock_quantity ASC
  `

  db.query(sql, [stockLimit], (err, results) => {
    if (err) {
      console.error('❌ Error fetching low-stock products:', err)

      return res.status(500).json({
        message: 'Failed to fetch low-stock products',
      })
    }

    res.json(results)
  })
})

// ===============================
// PRODUCT AVAILABILITY
// ===============================
router.get('/product-availability', (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total_products,
      SUM(status = 'active') AS active_products,
      SUM(status = 'archived') AS archived_products,
      SUM(stock_quantity > 0 AND status = 'active') AS available_products,
      SUM(stock_quantity = 0 AND status = 'active') AS out_of_stock_products
    FROM products
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching product availability:', err)

      return res.status(500).json({
        message: 'Failed to fetch product availability',
      })
    }

    res.json(results[0])
  })
})

// ===============================
// MONTHLY SALES
// ===============================
router.get('/monthly-sales', (req, res) => {
  const sql = `
    SELECT
      YEAR(order_date) AS year,
      MONTH(order_date) AS month,
      MONTHNAME(order_date) AS month_name,
      COUNT(order_id) AS total_orders,
      COALESCE(SUM(total_amount), 0) AS total_sales
    FROM orders
    WHERE status = 'completed'
    GROUP BY
      YEAR(order_date),
      MONTH(order_date),
      MONTHNAME(order_date)
    ORDER BY
      year DESC,
      month DESC
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching monthly sales:', err)

      return res.status(500).json({
        message: 'Failed to fetch monthly sales',
      })
    }

    res.json(results)
  })
})

// ===============================
// RECENT ORDERS
// ===============================
router.get('/recent-orders', (req, res) => {
  const sql = `
    SELECT
      o.order_id,
      u.full_name,
      o.total_amount,
      o.status,
      o.order_date
    FROM orders o
    INNER JOIN users u
      ON o.user_id = u.user_id
    ORDER BY o.order_date DESC
    LIMIT 10
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('❌ Error fetching recent orders:', err)

      return res.status(500).json({
        message: 'Failed to fetch recent orders',
      })
    }

    res.json(results)
  })
})

module.exports = router
