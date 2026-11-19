
const express = require('express')
const router = express.Router()

const db = require('../db')
const authMiddleware = require('../middleware/authMiddleware')

// Protect every Cart API endpoint
router.use(authMiddleware)

// Cart is for consumer accounts only
router.use((req, res, next) => {
  if (req.user.role !== 'consumer') {
    return res.status(403).json({
      message: 'Only consumer accounts can access the cart.',
    })
  }

  next()
})

// =========================
// GET MY CART
// GET /api/cart
// GET /api/cart/:user_id
// =========================

router.get(['/', '/:user_id'], async (req, res) => {
  try {
    const userId = req.user.user_id

    const [items] = await db.promise().query(
      `SELECT
        ci.cart_item_id,
        p.product_id,
        p.product_name,
        p.description,
        p.image,
        p.stock_quantity,
        p.unit AS product_unit,
        cat.category_name,

        qo.option_id AS quantity_option_id,
        qo.option_label,
        qo.quantity_value,
        qo.unit,
        qo.price,

        ci.quantity,

        (qo.price * ci.quantity) AS subtotal,

        FLOOR(
          p.stock_quantity / NULLIF(qo.quantity_value, 0)
        ) AS available_stock_packs

      FROM carts c

      INNER JOIN cart_items ci
        ON c.cart_id = ci.cart_id

      INNER JOIN products p
        ON ci.product_id = p.product_id

      INNER JOIN product_quantity_options qo
        ON ci.quantity_option_id = qo.option_id
        AND qo.product_id = p.product_id

      LEFT JOIN categories cat
        ON p.category_id = cat.category_id

      WHERE c.user_id = ?
        AND p.status != 'archived'

      ORDER BY ci.cart_item_id DESC`,
      [userId]
    )

    return res.json(items)
  } catch (error) {
    console.error('Get cart error:', error)

    return res.status(500).json({
      message: 'Unable to load your cart.',
    })
  }
})

// =========================
// ADD TO CART
// POST /api/cart
// =========================

router.post('/', async (req, res) => {
  const productId = Number(req.body.product_id)
  const quantity = Number(req.body.quantity)
  const requestedOptionId =
    req.body.quantity_option_id ?? req.body.option_id

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return res.status(400).json({
      message: 'Invalid product or quantity.',
    })
  }

  if (
    requestedOptionId !== undefined &&
    requestedOptionId !== null &&
    (
      !Number.isInteger(Number(requestedOptionId)) ||
      Number(requestedOptionId) <= 0
    )
  ) {
    return res.status(400).json({
      message: 'Invalid quantity option.',
    })
  }

  const userId = req.user.user_id
  const connection = await db.promise().getConnection()

  let transactionStarted = false

  try {
    await connection.beginTransaction()
    transactionStarted = true

    // Lock the product to protect stock calculations.
    const [products] = await connection.query(
      `SELECT
        product_id,
        product_name,
        price,
        unit,
        stock_quantity,
        status
       FROM products
       WHERE product_id = ?
       LIMIT 1
       FOR UPDATE`,
      [productId]
    )

    if (products.length === 0) {
      await connection.rollback()
      transactionStarted = false

      return res.status(404).json({
        message: 'Product not found.',
      })
    }

    const product = products[0]
    const stock = Number(product.stock_quantity) || 0

    if (product.status === 'archived' || product.status === 'inactive') {
      await connection.rollback()
      transactionStarted = false

      return res.status(400).json({
        message: 'This product is no longer available.',
      })
    }

    if (stock <= 0) {
      await connection.rollback()
      transactionStarted = false

      return res.status(400).json({
        message: 'This product is out of stock.',
      })
    }

    // Find the selected quantity option.
    // Older frontend requests can still use the original
    // one-unit product option until the UI is updated.
    let optionSql
    let optionValues

    if (requestedOptionId !== undefined && requestedOptionId !== null) {
      optionSql = `
        SELECT
          option_id,
          product_id,
          option_label,
          quantity_value,
          unit,
          price,
          is_available
        FROM product_quantity_options
        WHERE option_id = ?
          AND product_id = ?
        LIMIT 1
        FOR UPDATE
      `

      optionValues = [Number(requestedOptionId), productId]
    } else {
      optionSql = `
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
          AND quantity_value = 1.000
          AND unit = ?
          AND price = ?
          AND is_available = 1
        ORDER BY option_id ASC
        LIMIT 1
        FOR UPDATE
      `

      optionValues = [productId, product.unit, product.price]
    }

    const [options] = await connection.query(
      optionSql,
      optionValues
    )

    if (options.length === 0) {
      await connection.rollback()
      transactionStarted = false

      return res.status(400).json({
        message: 'Please select a valid quantity option.',
      })
    }

    const option = options[0]
    const optionQuantity = Number(option.quantity_value)

    if (
      Number(option.is_available) !== 1 ||
      !Number.isFinite(optionQuantity) ||
      optionQuantity <= 0
    ) {
      await connection.rollback()
      transactionStarted = false

      return res.status(400).json({
        message: 'This quantity option is not available.',
      })
    }

    // Create a cart if the consumer does not have one.
    await connection.query(
      `INSERT IGNORE INTO carts (user_id)
       VALUES (?)`,
      [userId]
    )

    // Lock this consumer's cart.
    const [carts] = await connection.query(
      `SELECT cart_id
       FROM carts
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId]
    )

    if (carts.length === 0) {
      throw new Error('Unable to create or find consumer cart.')
    }

    const cartId = carts[0].cart_id

    // Check the exact product AND quantity option.
    const [existingItems] = await connection.query(
      `SELECT cart_item_id, quantity
       FROM cart_items
       WHERE cart_id = ?
         AND product_id = ?
         AND quantity_option_id = ?
       LIMIT 1
       FOR UPDATE`,
      [cartId, productId, option.option_id]
    )

    const existingQuantity =
      existingItems.length > 0
        ? Number(existingItems[0].quantity)
        : 0

    const newQuantity = existingQuantity + quantity

    // Include other quantity options of the same product
    // when calculating the stock already in this cart.
    const [cartProductItems] = await connection.query(
      `SELECT
        ci.quantity,
        qo.quantity_value
       FROM cart_items ci
       INNER JOIN product_quantity_options qo
         ON ci.quantity_option_id = qo.option_id
       WHERE ci.cart_id = ?
         AND ci.product_id = ?
       FOR UPDATE`,
      [cartId, productId]
    )

    const otherReservedStock = cartProductItems.reduce(
      (total, item) => total +
        (
          Number(item.quantity) *
          Number(item.quantity_value)
        ),
      0
    )

    const previousSelectedStock =
      existingQuantity * optionQuantity

    const newTotalStock =
      otherReservedStock -
      previousSelectedStock +
      (newQuantity * optionQuantity)

    if (newTotalStock > stock + 0.000001) {
      await connection.rollback()
      transactionStarted = false

      const remaining = Math.max(
        0,
        stock - otherReservedStock
      )

      return res.status(400).json({
        message:
          `Insufficient stock. Only ${remaining.toFixed(3)} ${option.unit} remaining.`,
      })
    }

    if (existingItems.length > 0) {
      await connection.query(
        `UPDATE cart_items
         SET quantity = ?
         WHERE cart_item_id = ?
           AND cart_id = ?`,
        [
          newQuantity,
          existingItems[0].cart_item_id,
          cartId,
        ]
      )
    } else {
      await connection.query(
        `INSERT INTO cart_items
          (cart_id, product_id, quantity_option_id, quantity)
         VALUES (?, ?, ?, ?)`,
        [
          cartId,
          productId,
          option.option_id,
          quantity,
        ]
      )
    }

    await connection.commit()
    transactionStarted = false

    return res.status(200).json({
      message: 'Product added to cart successfully.',
      quantity: newQuantity,
      quantity_option_id: option.option_id,
      option_label: option.option_label,
      price: Number(option.price),
    })
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    console.error('Add to cart error:', error)

    return res.status(500).json({
      message: 'Unable to add product to cart.',
    })
  } finally {
    connection.release()
  }
})

// =========================
// UPDATE CART QUANTITY
// PUT /api/cart/:cart_item_id
// =========================

router.put('/:cart_item_id', async (req, res) => {
  const cartItemId = Number(req.params.cart_item_id)
  const quantity = Number(req.body.quantity)

  if (
    !Number.isInteger(cartItemId) ||
    cartItemId <= 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return res.status(400).json({
      message: 'Invalid cart item or quantity.',
    })
  }

  const userId = req.user.user_id
  const connection = await db.promise().getConnection()

  let transactionStarted = false

  try {
    await connection.beginTransaction()
    transactionStarted = true

    // Verify ownership and lock the product.
    const [items] = await connection.query(
      `SELECT
        ci.cart_item_id,
        ci.cart_id,
        ci.product_id,
        ci.quantity,
        ci.quantity_option_id,
        qo.quantity_value,
        qo.unit,
        p.stock_quantity,
        p.status
       FROM cart_items ci
       INNER JOIN carts c
         ON ci.cart_id = c.cart_id
       INNER JOIN products p
         ON ci.product_id = p.product_id
       INNER JOIN product_quantity_options qo
         ON ci.quantity_option_id = qo.option_id
       WHERE ci.cart_item_id = ?
         AND c.user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [cartItemId, userId]
    )

    if (items.length === 0) {
      await connection.rollback()
      transactionStarted = false

      return res.status(404).json({
        message: 'Cart item not found.',
      })
    }

    const item = items[0]
    const stock = Number(item.stock_quantity) || 0
    const optionQuantity = Number(item.quantity_value)

    if (item.status === 'archived' || item.status === 'inactive') {
      await connection.rollback()
      transactionStarted = false

      return res.status(400).json({
        message: 'This product is no longer available.',
      })
    }

    // Check other options of the same product in this cart.
    const [otherItems] = await connection.query(
      `SELECT
        ci.quantity,
        qo.quantity_value
       FROM cart_items ci
       INNER JOIN product_quantity_options qo
         ON ci.quantity_option_id = qo.option_id
       WHERE ci.cart_id = ?
         AND ci.product_id = ?
         AND ci.cart_item_id != ?
       FOR UPDATE`,
      [item.cart_id, item.product_id, cartItemId]
    )

    const otherReservedStock = otherItems.reduce(
      (total, other) => total +
        (
          Number(other.quantity) *
          Number(other.quantity_value)
        ),
      0
    )

    const requestedStock = quantity * optionQuantity

    if (otherReservedStock + requestedStock > stock + 0.000001) {
      await connection.rollback()
      transactionStarted = false

      return res.status(400).json({
        message: 'Requested quantity exceeds available stock.',
      })
    }

    await connection.query(
      `UPDATE cart_items
       SET quantity = ?
       WHERE cart_item_id = ?
         AND cart_id = ?`,
      [quantity, cartItemId, item.cart_id]
    )

    await connection.commit()
    transactionStarted = false

    return res.json({
      message: 'Cart quantity updated successfully.',
    })
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback()
    }

    console.error('Update cart error:', error)

    return res.status(500).json({
      message: 'Unable to update cart quantity.',
    })
  } finally {
    connection.release()
  }
})

// =========================
// REMOVE CART ITEM
// DELETE /api/cart/:cart_item_id
// =========================

router.delete('/:cart_item_id', async (req, res) => {
  const cartItemId = Number(req.params.cart_item_id)

  if (
    !Number.isInteger(cartItemId) ||
    cartItemId <= 0
  ) {
    return res.status(400).json({
      message: 'Invalid cart item.',
    })
  }

  try {
    const [result] = await db.promise().query(
      `DELETE ci
       FROM cart_items ci
       INNER JOIN carts c
         ON ci.cart_id = c.cart_id
       WHERE ci.cart_item_id = ?
         AND c.user_id = ?`,
      [cartItemId, req.user.user_id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Cart item not found.',
      })
    }

    return res.json({
      message: 'Product removed from cart successfully.',
    })
  } catch (error) {
    console.error('Remove cart item error:', error)

    return res.status(500).json({
      message: 'Unable to remove product from cart.',
    })
  }
})

module.exports = router
