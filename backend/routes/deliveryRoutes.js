const express = require('express')
const router = express.Router()
const db = require('../db')

const allowedStatuses = [
  'pending',
  'confirmed',
  'processing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
]

// ========================================
// GET ALL DELIVERIES + PURCHASED PRODUCTS
// ========================================
router.get('/', (req, res) => {
  const { delivery_status, order_id } = req.query

  let sql = `
    SELECT
      d.delivery_id,
      d.order_id,
      o.user_id,
      u.full_name AS customer_name,
      o.order_date,
      o.total_amount,
      o.status AS order_status,
      d.delivery_address,
      d.contact_number,
      o.status AS delivery_status,
      d.delivery_date,
      d.notes,
      d.rider_id,
      r.full_name AS rider_name,
      r.contact_number AS rider_contact_number,
      d.created_at,
      GROUP_CONCAT(
        CONCAT(p.product_name, ' (x', oi.quantity, ')')
        ORDER BY oi.order_item_id
        SEPARATOR ', '
      ) AS purchased_products,
      COALESCE(SUM(oi.quantity), 0) AS total_items
    FROM deliveries d
    INNER JOIN orders o ON d.order_id = o.order_id
    INNER JOIN users u ON o.user_id = u.user_id
    LEFT JOIN riders r ON d.rider_id = r.rider_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.product_id
    WHERE 1 = 1
  `

  const values = []

  if (delivery_status) {
    sql += ' AND o.status = ?'
    values.push(delivery_status)
  }

  if (order_id) {
    sql += ' AND d.order_id = ?'
    values.push(order_id)
  }

  sql += `
    GROUP BY
      d.delivery_id, d.order_id, o.user_id, u.full_name,
      o.order_date, o.total_amount, o.status,
      d.delivery_address, d.contact_number, d.delivery_date,
      d.notes, d.rider_id, r.full_name,
      r.contact_number, d.created_at
    ORDER BY d.delivery_id DESC
  `

  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error fetching deliveries:', err)
      return res.status(500).json({
        message: 'Failed to fetch deliveries.',
      })
    }

    res.json(results)
  })
})

// ========================================
// GET DELIVERY BY ID
// ========================================
router.get('/:id', (req, res) => {
  const deliveryId = Number(req.params.id)

  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    return res.status(400).json({
      message: 'Invalid delivery ID.',
    })
  }

  const sql = `
    SELECT
      d.delivery_id,
      d.order_id,
      o.user_id,
      u.full_name AS customer_name,
      o.order_date,
      o.total_amount,
      o.status AS order_status,
      d.delivery_address,
      d.contact_number,
      o.status AS delivery_status,
      d.delivery_date,
      d.notes,
      d.rider_id,
      r.full_name AS rider_name,
      r.contact_number AS rider_contact_number,
      d.created_at,
      GROUP_CONCAT(
        CONCAT(p.product_name, ' (x', oi.quantity, ')')
        ORDER BY oi.order_item_id
        SEPARATOR ', '
      ) AS purchased_products,
      COALESCE(SUM(oi.quantity), 0) AS total_items
    FROM deliveries d
    INNER JOIN orders o ON d.order_id = o.order_id
    INNER JOIN users u ON o.user_id = u.user_id
    LEFT JOIN riders r ON d.rider_id = r.rider_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.product_id
    WHERE d.delivery_id = ?
    GROUP BY
      d.delivery_id, d.order_id, o.user_id, u.full_name,
      o.order_date, o.total_amount, o.status,
      d.delivery_address, d.contact_number, d.delivery_date,
      d.notes, d.rider_id, r.full_name,
      r.contact_number, d.created_at
  `

  db.query(sql, [deliveryId], (err, results) => {
    if (err) {
      console.error('Error fetching delivery:', err)
      return res.status(500).json({
        message: 'Failed to fetch delivery.',
      })
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Delivery not found.',
      })
    }

    res.json(results[0])
  })
})

// ========================================
// CREATE DELIVERY USING ORDER STATUS
// ========================================
router.post('/', (req, res) => {
  const {
    order_id,
    delivery_address,
    contact_number,
    delivery_date,
    notes,
  } = req.body

  const orderId = Number(order_id)

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0 ||
    !String(delivery_address || '').trim() ||
    !String(contact_number || '').trim()
  ) {
    return res.status(400).json({
      message: 'Valid order ID, delivery address, and contact number are required.',
    })
  }

  db.query(
    'SELECT status FROM orders WHERE order_id = ?',
    [orderId],
    (orderError, orders) => {
      if (orderError) {
        console.error('Error checking order:', orderError)
        return res.status(500).json({
          message: 'Failed to check order.',
        })
      }

      if (orders.length === 0) {
        return res.status(404).json({
          message: 'Order not found.',
        })
      }

      const status = orders[0].status

      db.query(
        `INSERT INTO deliveries (
          order_id, delivery_address, contact_number,
          delivery_status, delivery_date, notes
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          String(delivery_address).trim(),
          String(contact_number).trim(),
          status,
          delivery_date || null,
          notes ? String(notes).trim() : null,
        ],
        (err, result) => {
          if (err) {
            console.error('Error creating delivery:', err)
            return res.status(500).json({
              message: 'Failed to create delivery.',
            })
          }

          res.status(201).json({
            message: 'Delivery created successfully.',
            delivery_id: result.insertId,
            order_id: orderId,
            order_status: status,
            delivery_status: status,
          })
        }
      )
    }
  )
})

// ========================================
// ASSIGN OR UPDATE RIDER
// ========================================
router.put('/order/:orderId/rider', (req, res) => {
  const orderId = Number(req.params.orderId)
  const fullName = String(req.body.full_name || '').trim()
  const contactNumber = String(req.body.contact_number || '').trim()

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      message: 'Invalid order ID.',
    })
  }

  if (!fullName || !contactNumber) {
    return res.status(400).json({
      message: 'Rider name and contact number are required.',
    })
  }

  db.query(
    `SELECT delivery_id, rider_id
     FROM deliveries
     WHERE order_id = ?
     LIMIT 1`,
    [orderId],
    (deliveryError, deliveries) => {
      if (deliveryError) {
        console.error('Error checking delivery:', deliveryError)
        return res.status(500).json({
          message: 'Failed to check delivery record.',
        })
      }

      if (deliveries.length === 0) {
        return res.status(404).json({
          message: 'No delivery record exists for this order.',
        })
      }

      const delivery = deliveries[0]

      if (delivery.rider_id) {
        return db.query(
          `UPDATE riders
           SET full_name = ?, contact_number = ?
           WHERE rider_id = ?`,
          [fullName, contactNumber, delivery.rider_id],
          (err, result) => {
            if (err) {
              console.error('Error updating rider:', err)
              return res.status(500).json({
                message: 'Failed to update rider details.',
              })
            }

            if (result.affectedRows === 0) {
              return res.status(404).json({
                message: 'Assigned rider record not found.',
              })
            }

            res.json({
              message: 'Rider details updated successfully.',
              order_id: orderId,
              rider_id: delivery.rider_id,
              full_name: fullName,
              contact_number: contactNumber,
            })
          }
        )
      }

      db.query(
        `INSERT INTO riders (full_name, contact_number, status)
         VALUES (?, ?, 'available')`,
        [fullName, contactNumber],
        (insertError, result) => {
          if (insertError) {
            console.error('Error creating rider:', insertError)
            return res.status(500).json({
              message: 'Failed to save rider details.',
            })
          }

          const riderId = result.insertId

          db.query(
            `UPDATE deliveries SET rider_id = ? WHERE delivery_id = ?`,
            [riderId, delivery.delivery_id],
            (assignError, assignResult) => {
              if (assignError || assignResult.affectedRows === 0) {
                console.error('Error assigning rider:', assignError)
                return res.status(500).json({
                  message: 'Failed to assign rider to the delivery.',
                })
              }

              db.query(
                `UPDATE riders SET status = 'assigned' WHERE rider_id = ?`,
                [riderId],
                (statusError) => {
                  if (statusError) {
                    console.error('Error updating rider status:', statusError)
                    return res.status(500).json({
                      message: 'Rider assigned, but rider status update failed.',
                    })
                  }

                  res.json({
                    message: 'Rider assigned successfully.',
                    order_id: orderId,
                    rider_id: riderId,
                    full_name: fullName,
                    contact_number: contactNumber,
                  })
                }
              )
            }
          )
        }
      )
    }
  )
})

// ========================================
// UPDATE DELIVERY INFORMATION
// ========================================
router.put('/:id', (req, res) => {
  const deliveryId = Number(req.params.id)
  const {
    delivery_address,
    contact_number,
    delivery_date,
    notes,
  } = req.body

  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    return res.status(400).json({
      message: 'Invalid delivery ID.',
    })
  }

  if (
    !String(delivery_address || '').trim() ||
    !String(contact_number || '').trim()
  ) {
    return res.status(400).json({
      message: 'Delivery address and contact number are required.',
    })
  }

  const sql = `
    UPDATE deliveries
    SET delivery_address = ?,
        contact_number = ?,
        delivery_date = ?,
        notes = ?
    WHERE delivery_id = ?
  `

  db.query(
    sql,
    [
      String(delivery_address).trim(),
      String(contact_number).trim(),
      delivery_date || null,
      notes ? String(notes).trim() : null,
      deliveryId,
    ],
    (err, result) => {
      if (err) {
        console.error('Error updating delivery:', err)
        return res.status(500).json({
          message: 'Failed to update delivery.',
        })
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Delivery not found.',
        })
      }

      res.json({
        message: 'Delivery updated successfully.',
      })
    }
  )
})

// ========================================
// UPDATE DELIVERY STATUS + ORDER STATUS
// ========================================
router.put('/:id/status', (req, res) => {
  const deliveryId = Number(req.params.id)
  const { delivery_status } = req.body

  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    return res.status(400).json({
      message: 'Invalid delivery ID.',
    })
  }

  if (!allowedStatuses.includes(delivery_status)) {
    return res.status(400).json({
      message: 'Invalid status.',
    })
  }

  db.beginTransaction((transactionError) => {
    if (transactionError) {
      console.error('Transaction error:', transactionError)
      return res.status(500).json({
        message: 'Failed to start status update.',
      })
    }

    db.query(
      'SELECT order_id FROM deliveries WHERE delivery_id = ?',
      [deliveryId],
      (findError, rows) => {
        if (findError || rows.length === 0) {
          return db.rollback(() => {
            if (findError) {
              console.error('Error finding delivery:', findError)
            }

            res.status(findError ? 500 : 404).json({
              message: findError
                ? 'Failed to find delivery.'
                : 'Delivery not found.',
            })
          })
        }

        const orderId = rows[0].order_id

        db.query(
          'UPDATE orders SET status = ? WHERE order_id = ?',
          [delivery_status, orderId],
          (orderError, orderResult) => {
            if (orderError || orderResult.affectedRows === 0) {
              return db.rollback(() => {
                console.error('Order status update error:', orderError)
                res.status(500).json({
                  message: 'Failed to update order status.',
                })
              })
            }

            db.query(
              'UPDATE deliveries SET delivery_status = ? WHERE delivery_id = ?',
              [delivery_status, deliveryId],
              (deliveryError, deliveryResult) => {
                if (deliveryError || deliveryResult.affectedRows === 0) {
                  return db.rollback(() => {
                    console.error('Delivery status update error:', deliveryError)
                    res.status(500).json({
                      message: 'Failed to update delivery status.',
                    })
                  })
                }

                db.commit((commitError) => {
                  if (commitError) {
                    return db.rollback(() => {
                      console.error('Commit error:', commitError)
                      res.status(500).json({
                        message: 'Failed to save status changes.',
                      })
                    })
                  }

                  res.json({
                    message: 'Order and delivery statuses synchronized.',
                    order_id: orderId,
                    order_status: delivery_status,
                    delivery_status,
                  })
                })
              }
            )
          }
        )
      }
    )
  })
})

// ========================================
// CANCEL DELIVERY AND ORDER
// ========================================
router.put('/:id/cancel', (req, res) => {
  const deliveryId = Number(req.params.id)

  if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
    return res.status(400).json({
      message: 'Invalid delivery ID.',
    })
  }

  db.beginTransaction((transactionError) => {
    if (transactionError) {
      return res.status(500).json({
        message: 'Failed to start cancellation.',
      })
    }

    db.query(
      'SELECT order_id, delivery_status FROM deliveries WHERE delivery_id = ?',
      [deliveryId],
      (findError, rows) => {
        if (findError || rows.length === 0) {
          return db.rollback(() => {
            res.status(findError ? 500 : 404).json({
              message: findError
                ? 'Failed to find delivery.'
                : 'Delivery not found.',
            })
          })
        }

        if (['completed', 'delivered', 'cancelled'].includes(rows[0].delivery_status)) {
          return db.rollback(() => {
            res.status(400).json({
              message: 'This order cannot be cancelled.',
            })
          })
        }

        const orderId = rows[0].order_id

        db.query(
          "UPDATE orders SET status = 'cancelled' WHERE order_id = ?",
          [orderId],
          (orderError) => {
            if (orderError) {
              return db.rollback(() => {
                res.status(500).json({
                  message: 'Failed to cancel order.',
                })
              })
            }

            db.query(
              "UPDATE deliveries SET delivery_status = 'cancelled' WHERE delivery_id = ?",
              [deliveryId],
              (deliveryError) => {
                if (deliveryError) {
                  return db.rollback(() => {
                    res.status(500).json({
                      message: 'Failed to cancel delivery.',
                    })
                  })
                }

                db.commit((commitError) => {
                  if (commitError) {
                    return db.rollback(() => {
                      res.status(500).json({
                        message: 'Failed to save cancellation.',
                      })
                    })
                  }

                  res.json({
                    message: 'Order and delivery cancelled successfully.',
                    order_id: orderId,
                    order_status: 'cancelled',
                    delivery_status: 'cancelled',
                  })
                })
              }
            )
          }
        )
      }
    )
  })
})

module.exports = router


