
const express = require('express')
const router = express.Router()
const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

// ========================================
// DELIVERY AREA RULES
// ========================================

const DELIVERY_AREAS = {
  malay_mainland: { label: 'Malay (Mainland)', fee: 0 },
  boracay: { label: 'Boracay Island', fee: 100 },
  buruanga: { label: 'Buruanga', fee: 200 },
  tangalan: { label: 'Tangalan', fee: 200 },
  numancia: { label: 'Numancia', fee: 200 },
  lezo: { label: 'Lezo', fee: 200 },
  new_washington: { label: 'New Washington', fee: 200 },
  kalibo: { label: 'Kalibo', fee: 200 },
}

// ========================================
// GET ALL ORDERS
// ========================================

router.get('/', (req, res) => {
  const { status, user_id } = req.query

  let sql = `
    SELECT
      o.order_id,
      o.user_id,
      u.full_name,
      o.product_amount,
      o.delivery_fee,
      o.total_amount,
      o.status,
      o.order_date
    FROM orders o
    INNER JOIN users u ON o.user_id = u.user_id
    WHERE 1 = 1
  `

  const values = []

  if (status) {
    sql += ' AND o.status = ?'
    values.push(status)
  }

  if (user_id) {
    sql += ' AND o.user_id = ?'
    values.push(user_id)
  }

  sql += ' ORDER BY o.order_id DESC'

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Get orders error:', err)
      return res.status(500).json({
        message: 'Failed to fetch orders.',
      })
    }

    res.json(results)
  })
})

// ========================================
// GET ORDER DETAILS
// ========================================

router.get('/:id', (req, res) => {
  const { id } = req.params

  const orderSql = `
    SELECT
      o.order_id,
      o.user_id,
      u.full_name,
      o.product_amount,
      o.delivery_fee,
      o.total_amount,
      o.status,
      o.order_date,
      d.delivery_area,
      d.delivery_address,
      d.contact_number,
      d.delivery_status,
      d.delivery_date,
      d.notes,
      p.payment_id,
      p.payment_type,
      p.payment_method,
      p.payment_status,
      p.amount AS payment_amount,
      p.reference_number,
      p.receipt_image,
      p.refund_amount,
      p.refunded_at
    FROM orders o
    INNER JOIN users u ON o.user_id = u.user_id
    LEFT JOIN deliveries d ON o.order_id = d.order_id
    LEFT JOIN payments p ON o.order_id = p.order_id
    WHERE o.order_id = ?
    ORDER BY p.payment_id ASC
  `

  db.query(orderSql, [id], (err, orders) => {
    if (err) {
      console.error('Get order error:', err)
      return res.status(500).json({
        message: 'Failed to fetch order.',
      })
    }

    if (orders.length === 0) {
      return res.status(404).json({
        message: 'Order not found.',
      })
    }

    const itemsSql = `
      SELECT
        oi.order_item_id,
        oi.product_id,
        p.product_name,
        oi.quantity,
        oi.quantity_option_id,
        oi.option_label,
        oi.quantity_value,
        oi.unit,
        oi.price,
        oi.subtotal
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `

    db.query(itemsSql, [id], (itemsError, items) => {
      if (itemsError) {
        console.error('Get order items error:', itemsError)
        return res.status(500).json({
          message: 'Failed to fetch order items.',
        })
      }

      const order = {
        ...orders[0],
        payments: orders
          .filter(row => row.payment_id !== null)
          .map(row => ({
            payment_id: row.payment_id,
            payment_type: row.payment_type,
            payment_method: row.payment_method,
            payment_status: row.payment_status,
            amount: row.payment_amount,
            reference_number: row.reference_number,
            receipt_image: row.receipt_image,
            refund_amount: row.refund_amount,
            refunded_at: row.refunded_at,
          })),
      }

      delete order.payment_id
      delete order.payment_type
      delete order.payment_method
      delete order.payment_status
      delete order.payment_amount
      delete order.reference_number
      delete order.receipt_image
      delete order.refund_amount
      delete order.refunded_at

      res.json({
        order,
        items,
      })
    })
  })
})

// ========================================
// PLACE ORDER
// ========================================

router.post('/', authMiddleware, (req, res) => {
  const userId = req.user.user_id

  const {
    delivery_area,
    delivery_address,
    contact_number,
    notes,
    items,
  } = req.body

  if (
    !delivery_area ||
    !delivery_address ||
    !contact_number ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      message: 'Delivery area, address, contact number, and order items are required.',
    })
  }

  const area = DELIVERY_AREAS[delivery_area]

  if (!area) {
    return res.status(400).json({
      message: 'Invalid delivery area. Ani-Malay currently delivers only to the listed areas in Aklan.',
    })
  }

  const deliveryFee = area.fee

  db.beginTransaction(transactionError => {
    if (transactionError) {
      console.error('Transaction error:', transactionError)
      return res.status(500).json({
        message: 'Failed to start order transaction.',
      })
    }

    let transactionFinished = false

    const rollback = (statusCode, message, error = null) => {
      if (transactionFinished) return
      transactionFinished = true

      db.rollback(() => {
        if (error) console.error('Order transaction error:', error)
        res.status(statusCode).json({ message })
      })
    }

    const productIds = [
      ...new Set(items.map(item => Number(item.product_id))),
    ]

    if (
      productIds.some(id => !Number.isInteger(id) || id <= 0)
    ) {
      return rollback(400, 'Invalid product information.')
    }

    const placeholders = productIds.map(() => '?').join(',')

    // Lock products while checking and deducting stock.
    const productSql = `
      SELECT
        product_id,
        product_name,
        price,
        stock_quantity,
        unit,
        status
      FROM products
      WHERE product_id IN (${placeholders})
      FOR UPDATE
    `

    db.query(productSql, productIds, (productError, products) => {
      if (productError) {
        return rollback(500, 'Failed to verify products.', productError)
      }

      if (products.length !== productIds.length) {
        return rollback(400, 'One or more products are unavailable.')
      }

      const unavailableProduct = products.find(product =>
        product.status &&
        product.status.toLowerCase() === 'archived'
      )

      if (unavailableProduct) {
        return rollback(
          400,
          `${unavailableProduct.product_name} is unavailable.`
        )
      }

      // Lock all quantity options belonging to the selected products.
      const optionSql = `
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
        FOR UPDATE
      `

      db.query(optionSql, productIds, (optionError, options) => {
        if (optionError) {
          return rollback(
            500,
            'Failed to verify product quantity options.',
            optionError
          )
        }

        const orderItems = []
        const selectedPairs = new Set()
        const stockDeductions = {}

        let productAmount = 0

        for (const item of items) {
          const product = products.find(
            p => Number(p.product_id) === Number(item.product_id)
          )

          if (!product) {
            return rollback(400, 'Product not found.')
          }

          const quantity = Number(item.quantity)

          if (!Number.isInteger(quantity) || quantity <= 0) {
            return rollback(
              400,
              `Invalid quantity for ${product.product_name}.`
            )
          }

          const requestedOptionId = Number(
            item.quantity_option_id || item.option_id || 0
          )

          let option

          if (requestedOptionId > 0) {
            option = options.find(
              o =>
                Number(o.option_id) === requestedOptionId &&
                Number(o.product_id) === Number(product.product_id)
            )
          } else {
            // Backward compatibility for the old checkout.
            // Uses the default one-unit option.
            option = options.find(
              o =>
                Number(o.product_id) === Number(product.product_id) &&
                Number(o.quantity_value) === 1 &&
                String(o.unit).toLowerCase() ===
                  String(product.unit).toLowerCase() &&
                Number(o.price) === Number(product.price) &&
                Number(o.is_available) === 1
            )
          }

          if (!option) {
            return rollback(
              400,
              `Please select a valid quantity option for ${product.product_name}.`
            )
          }

          if (Number(option.is_available) !== 1) {
            return rollback(
              400,
              `${option.option_label} of ${product.product_name} is currently unavailable.`
            )
          }

          // Do not allow the exact same option to appear twice.
          // Different options of the same product are allowed.
          const pairKey = `${product.product_id}-${option.option_id}`

          if (selectedPairs.has(pairKey)) {
            return rollback(
              400,
              `Duplicate quantity option for ${product.product_name}.`
            )
          }

          selectedPairs.add(pairKey)

          const quantityValue = Number(option.quantity_value)
          const price = Number(option.price)

          if (
            !Number.isFinite(quantityValue) ||
            quantityValue <= 0 ||
            !Number.isFinite(price) ||
            price < 0
          ) {
            return rollback(
              400,
              `Invalid quantity option information for ${product.product_name}.`
            )
          }

          // Example:
          // 2 packs x 0.250 kg = 0.500 kg deducted from stock.
          const actualStockQuantity = quantity * quantityValue

          stockDeductions[product.product_id] =
            (stockDeductions[product.product_id] || 0) +
            actualStockQuantity

          const subtotal = Number((price * quantity).toFixed(2))

          productAmount += subtotal

          orderItems.push({
            product_id: product.product_id,
            quantity_option_id: option.option_id,
            option_label: option.option_label,
            quantity_value: quantityValue,
            unit: option.unit,
            quantity,
            price,
            subtotal,
          })
        }

        // Check total stock usage per product.
        for (const product of products) {
          const requiredStock =
            stockDeductions[product.product_id] || 0

          const availableStock = Number(product.stock_quantity)

          if (requiredStock > availableStock) {
            return rollback(
              400,
              `Insufficient stock for ${product.product_name}. Available: ${availableStock} ${product.unit}.`
            )
          }
        }

        productAmount = Number(productAmount.toFixed(2))

        const totalAmount = Number(
          (productAmount + deliveryFee).toFixed(2)
        )

        // ========================================
        // CREATE ORDER
        // ========================================

        const orderSql = `
          INSERT INTO orders
          (
            user_id,
            product_amount,
            delivery_fee,
            total_amount,
            status
          )
          VALUES (?, ?, ?, ?, 'pending')
        `

        db.query(
          orderSql,
          [userId, productAmount, deliveryFee, totalAmount],
          (orderError, orderResult) => {
            if (orderError) {
              return rollback(500, 'Failed to create order.', orderError)
            }

            const orderId = orderResult.insertId

            // ========================================
            // SAVE ORDER ITEMS
            // ========================================

            const insertItems = index => {
              if (index >= orderItems.length) {
                createProductPayment()
                return
              }

              const item = orderItems[index]

              const sql = `
                INSERT INTO order_items
                (
                  order_id,
                  product_id,
                  quantity_option_id,
                  option_label,
                  quantity_value,
                  unit,
                  quantity,
                  price,
                  subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `

              db.query(
                sql,
                [
                  orderId,
                  item.product_id,
                  item.quantity_option_id,
                  item.option_label,
                  item.quantity_value,
                  item.unit,
                  item.quantity,
                  item.price,
                  item.subtotal,
                ],
                error => {
                  if (error) {
                    return rollback(
                      500,
                      'Failed to save order items.',
                      error
                    )
                  }

                  insertItems(index + 1)
                }
              )
            }

            // ========================================
            // PRODUCT PAYMENT - COD
            // ========================================

            const createProductPayment = () => {
              const sql = `
                INSERT INTO payments
                (
                  order_id,
                  payment_type,
                  payment_method,
                  amount,
                  payment_status
                )
                VALUES (?, 'product', 'COD', ?, 'pending')
              `

              db.query(sql, [orderId, productAmount], error => {
                if (error) {
                  return rollback(
                    500,
                    'Failed to create product payment.',
                    error
                  )
                }

                if (deliveryFee > 0) {
                  createShippingPayment()
                } else {
                  createDelivery()
                }
              })
            }

            // ========================================
            // SHIPPING PAYMENT - GCASH
            // ========================================

            const createShippingPayment = () => {
              const sql = `
                INSERT INTO payments
                (
                  order_id,
                  payment_type,
                  payment_method,
                  amount,
                  payment_status,
                  refund_amount
                )
                VALUES (?, 'shipping', 'GCash', ?, 'pending', ?)
              `

              const refundAmount =
                delivery_area === 'boracay' ? 50 : 0

              db.query(
                sql,
                [orderId, deliveryFee, refundAmount],
                error => {
                  if (error) {
                    return rollback(
                      500,
                      'Failed to create shipping payment.',
                      error
                    )
                  }

                  createDelivery()
                }
              )
            }

            // ========================================
            // CREATE DELIVERY
            // ========================================

            const createDelivery = () => {
              const sql = `
                INSERT INTO deliveries
                (
                  order_id,
                  delivery_area,
                  delivery_address,
                  contact_number,
                  delivery_status,
                  notes
                )
                VALUES (?, ?, ?, ?, 'pending', ?)
              `

              db.query(
                sql,
                [
                  orderId,
                  delivery_area,
                  delivery_address,
                  contact_number,
                  notes || null,
                ],
                error => {
                  if (error) {
                    return rollback(
                      500,
                      'Failed to create delivery record.',
                      error
                    )
                  }

                  updateStock()
                }
              )
            }

            // ========================================
            // DEDUCT STOCK
            // ========================================

            const updateStock = () => {
              const deductions = Object.entries(stockDeductions)

              const updateNext = index => {
                if (index >= deductions.length) {
                  clearCart()
                  return
                }

                const [productId, quantityToDeduct] = deductions[index]

                db.query(
                  `
                    UPDATE products
                    SET stock_quantity = stock_quantity - ?
                    WHERE product_id = ?
                      AND stock_quantity >= ?
                  `,
                  [
                    quantityToDeduct,
                    productId,
                    quantityToDeduct,
                  ],
                  (error, result) => {
                    if (error) {
                      return rollback(
                        500,
                        'Failed to update product stock.',
                        error
                      )
                    }

                    if (result.affectedRows === 0) {
                      return rollback(
                        400,
                        'Insufficient stock. Please update your cart.'
                      )
                    }

                    updateNext(index + 1)
                  }
                )
              }

              updateNext(0)
            }

            // ========================================
            // CLEAR CUSTOMER CART
            // ========================================

            const clearCart = () => {
              db.query(
                'SELECT cart_id FROM carts WHERE user_id = ? LIMIT 1',
                [userId],
                (cartError, cartResults) => {
                  if (cartError) {
                    return rollback(
                      500,
                      'Failed to find customer cart.',
                      cartError
                    )
                  }

                  if (cartResults.length === 0) {
                    finishOrder()
                    return
                  }

                  db.query(
                    'DELETE FROM cart_items WHERE cart_id = ?',
                    [cartResults[0].cart_id],
                    deleteError => {
                      if (deleteError) {
                        return rollback(
                          500,
                          'Failed to clear customer cart.',
                          deleteError
                        )
                      }

                      finishOrder()
                    }
                  )
                }
              )
            }

            // ========================================
            // COMMIT ORDER
            // ========================================

            const finishOrder = () => {
              db.commit(commitError => {
                if (commitError) {
                  return rollback(
                    500,
                    'Failed to complete order.',
                    commitError
                  )
                }

                transactionFinished = true

                res.status(201).json({
                  message: 'Order created successfully.',
                  order_id: orderId,
                  product_amount: productAmount,
                  delivery_fee: deliveryFee,
                  total_amount: totalAmount,
                  delivery_area,
                  delivery_area_label: area.label,
                  product_payment_method: 'COD',
                  shipping_payment_method:
                    deliveryFee > 0 ? 'GCash' : null,
                  shipping_payment_status:
                    deliveryFee > 0 ? 'pending' : null,
                  order_status: 'pending',
                })
              })
            }

            insertItems(0)
          }
        )
      })
    })
  })
})

// ========================================
// UPDATE ORDER STATUS + NOTIFICATION
// ========================================

router.put('/:id/status', (req, res) => {
  const { id } = req.params
  const { status } = req.body

  const allowedStatuses = [
    'pending',
    'confirmed',
    'processing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
  ]

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid order status.',
    })
  }

  let deliveryStatus = 'pending'

  if (status === 'out_for_delivery') {
    deliveryStatus = 'out_for_delivery'
  } else if (status === 'completed') {
    deliveryStatus = 'delivered'
  } else if (status === 'cancelled') {
    deliveryStatus = 'cancelled'
  }

  const notificationMessages = {
    confirmed: {
      title: 'Order Confirmed!',
      message: `Your order #${id} has been confirmed by Ani-Malay.`,
    },
    processing: {
      title: 'Order Processing',
      message: `Your order #${id} is now being prepared.`,
    },
    ready: {
      title: 'Order Ready!',
      message: `Your order #${id} is ready for delivery.`,
    },
    out_for_delivery: {
      title: 'Order Out for Delivery!',
      message: `Your order #${id} is now on its way to you.`,
    },
    completed: {
      title: 'Order Completed!',
      message: `Your order #${id} has been successfully completed. Thank you for shopping with Ani-Malay!`,
    },
    cancelled: {
      title: 'Order Cancelled',
      message: `Your order #${id} has been cancelled.`,
    },
  }

  db.beginTransaction(transactionError => {
    if (transactionError) {
      console.error('Status transaction error:', transactionError)

      return res.status(500).json({
        message: 'Failed to start status update.',
      })
    }

    const rollback = (statusCode, message, error = null) => {
      db.rollback(() => {
        if (error) console.error('Status update error:', error)
        res.status(statusCode).json({ message })
      })
    }

    db.query(
      'SELECT user_id, status FROM orders WHERE order_id = ? FOR UPDATE',
      [id],
      (orderError, orders) => {
        if (orderError) {
          return rollback(500, 'Failed to retrieve order.', orderError)
        }

        if (!orders || orders.length === 0) {
          return rollback(404, 'Order not found.')
        }

        const userId = orders[0].user_id
        const previousStatus = orders[0].status

        const finishTransaction = () => {
          db.commit(commitError => {
            if (commitError) {
              return rollback(
                500,
                'Failed to save status changes.',
                commitError
              )
            }

            res.json({
              message: 'Order, delivery, and notification updated successfully.',
              order_id: Number(id),
              order_status: status,
              delivery_status: deliveryStatus,
              notification_created:
                previousStatus !== status &&
                Boolean(notificationMessages[status]),
            })
          })
        }

        const saveNotification = () => {
          const notification = notificationMessages[status]

          if (previousStatus === status || !notification) {
            return finishTransaction()
          }

          db.query(
            `INSERT INTO notifications
             (user_id, order_id, notification_type, title, message)
             VALUES (?, ?, ?, ?, ?)`,
            [
              userId,
              id,
              `order_${status}`,
              notification.title,
              notification.message,
            ],
            notificationError => {
              if (notificationError) {
                return rollback(
                  500,
                  'Failed to save order notification.',
                  notificationError
                )
              }

              finishTransaction()
            }
          )
        }

        const updateDelivery = () => {
          db.query(
            'UPDATE deliveries SET delivery_status = ? WHERE order_id = ?',
            [deliveryStatus, id],
            (deliveryError, deliveryResult) => {
              if (deliveryError || deliveryResult.affectedRows === 0) {
                return rollback(
                  500,
                  'Failed to update delivery status.',
                  deliveryError
                )
              }

              saveNotification()
            }
          )
        }

        db.query(
          'UPDATE orders SET status = ? WHERE order_id = ?',
          [status, id],
          updateError => {
            if (updateError) {
              return rollback(
                500,
                'Failed to update order status.',
                updateError
              )
            }

            updateDelivery()
          }
        )
      }
    )
  })
})

module.exports = router
