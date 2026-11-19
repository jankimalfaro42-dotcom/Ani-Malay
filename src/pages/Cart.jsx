
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notify } from '../utils/notify'
import { Trash2, ShoppingCart, X } from 'lucide-react'

import '../App.css'
import './CartConfirmation.css'

function Cart() {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingItem, setUpdatingItem] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  const navigate = useNavigate()

  // GET USER AND TOKEN
  const savedUser = localStorage.getItem('user')
  const token = localStorage.getItem('token')

  let userId = null

  if (savedUser) {
    try {
      const user = JSON.parse(savedUser)
      userId = user.user_id
    } catch (error) {
      console.error('User data error:', error)
    }
  }

  // AUTHORIZATION HEADERS
  const getAuthHeaders = (includeJson = false) => {
    const currentToken = localStorage.getItem('token')

    return {
      ...(includeJson && {
        'Content-Type': 'application/json',
      }),
      Authorization: `Bearer ${currentToken}`,
    }
  }

  // UPDATE NAVBAR COUNT
  const updateNavbarCount = (items) => {
    const totalQuantity = items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    )

    window.dispatchEvent(
      new CustomEvent('cartUpdated', {
        detail: { count: totalQuantity },
      })
    )
  }

  // FETCH CART
  const fetchCart = async () => {
    const currentToken = localStorage.getItem('token')

    if (!userId || !currentToken) {
      setCartItems([])
      updateNavbarCount([])
      setLoading(false)
      setError('Please login first.')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `http://localhost:5000/api/cart/${userId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load cart')
      }

      if (!Array.isArray(data)) {
        setCartItems([])
        updateNavbarCount([])
        return
      }

      setCartItems(data)
      updateNavbarCount(data)
    } catch (error) {
      console.error('Cart error:', error)
      setError(error.message || 'Failed to load your cart.')
    } finally {
      setLoading(false)
    }
  }

  // LOAD CART
  useEffect(() => {
    fetchCart()
  }, [userId, token])

  // FORMAT PRICE
  const formatPrice = (price) => {
    return `₱${Number(price || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // PRODUCT IMAGE
  const getProductImage = (image) => {
    if (!image) return null

    if (image.startsWith('/uploads/')) {
      return `http://localhost:5000${image}`
    }

    return image
  }

  // GET SELECTED QUANTITY OPTION LABEL
  const getOptionLabel = (item) => {
    if (item.option_label) {
      return item.option_label
    }

    const quantityValue = Number(item.quantity_value || 1)
    const unit = item.unit || 'unit'

    return `${quantityValue} ${unit}`
  }

  // GET AVAILABLE PACKS
  const getAvailablePacks = (item) => {
    if (item.available_stock_packs !== undefined &&
        item.available_stock_packs !== null) {
      return Math.max(0, Math.floor(Number(item.available_stock_packs)))
    }

    const stock = Number(item.stock_quantity || 0)
    const quantityValue = Number(item.quantity_value || 1)

    if (quantityValue <= 0) return 0

    return Math.max(0, Math.floor(stock / quantityValue))
  }

  // SUBTOTAL
  const subtotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) * Number(item.quantity || 0),
    0
  )

  // UPDATE QUANTITY
  const updateQuantity = async (
    cartItemId,
    newQuantity,
    stockQuantity
  ) => {
    if (newQuantity < 1) return

    const stock = Number(stockQuantity) || 0

    if (newQuantity > stock) {
      notify(
        'warning',
        'Stock Limit Reached',
        `Only ${stock} pack(s) available in stock.`
      )
      return
    }

    if (updatingItem !== null) return

    const originalItems = [...cartItems]

    const oldItem = originalItems.find(
      (item) =>
        Number(item.cart_item_id) === Number(cartItemId)
    )

    if (!oldItem) return

    const oldQuantity = Number(oldItem.quantity)

    setUpdatingItem(cartItemId)

    const updatedItems = originalItems.map((item) => {
      if (
        Number(item.cart_item_id) !== Number(cartItemId)
      ) {
        return item
      }

      return {
        ...item,
        quantity: newQuantity,
        subtotal: Number(item.price || 0) * newQuantity,
      }
    })

    setCartItems(updatedItems)
    updateNavbarCount(updatedItems)

    try {
      const response = await fetch(
        `http://localhost:5000/api/cart/${cartItemId}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify({
            quantity: newQuantity,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update quantity')
      }

      notify(
        'success',
        'Cart Updated',
        `${oldItem.product_name} quantity is now ${newQuantity} pack(s).`
      )
    } catch (error) {
      console.error('Quantity update error:', error)

      const rollbackItems = originalItems.map((item) => {
        if (
          Number(item.cart_item_id) !== Number(cartItemId)
        ) {
          return item
        }

        return {
          ...item,
          quantity: oldQuantity,
          subtotal: Number(item.price || 0) * oldQuantity,
        }
      })

      setCartItems(rollbackItems)
      updateNavbarCount(rollbackItems)

      notify(
        'error',
        'Update Failed',
        error.message || 'Failed to update quantity.'
      )
    } finally {
      setUpdatingItem(null)
    }
  }

  // OPEN DELETE CONFIRMATION
  const removeCartItem = (cartItemId) => {
    if (updatingItem !== null) return

    const item = cartItems.find(
      (item) =>
        Number(item.cart_item_id) === Number(cartItemId)
    )

    if (!item) return

    setConfirmItem(item)
  }

  // CONFIRM DELETE
  const confirmRemoveCartItem = async () => {
    if (!confirmItem || updatingItem !== null) return

    const cartItemId = confirmItem.cart_item_id

    setUpdatingItem(cartItemId)

    try {
      const response = await fetch(
        `http://localhost:5000/api/cart/${cartItemId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove product')
      }

      const updatedItems = cartItems.filter(
        (item) =>
          Number(item.cart_item_id) !== Number(cartItemId)
      )

      setCartItems(updatedItems)
      updateNavbarCount(updatedItems)
      setConfirmItem(null)

      notify(
        'success',
        'Item Removed',
        `${confirmItem.product_name} has been removed from your cart.`
      )
    } catch (error) {
      console.error('Remove cart item error:', error)

      notify(
        'error',
        'Unable to Remove Item',
        error.message || 'Failed to remove product.'
      )
    } finally {
      setUpdatingItem(null)
    }
  }

  return (
    <section className="cart-page">

      {/* HEADER */}
      <div className="cart-heading">
        <span className="section-label">SHOPPING CART</span>

        <h1>My Cart</h1>

        <p>
          Review your selected agricultural products
          before checkout.
        </p>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="cart-empty">
          <h2>Loading your cart...</h2>
          <p>Please wait.</p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="cart-empty">
          <h2>Unable to load cart</h2>
          <p>{error}</p>

          <button
            type="button"
            className="checkout-btn"
            onClick={fetchCart}
          >
            Try Again
          </button>
        </div>
      )}

      {/* EMPTY CART */}
      {!loading && !error && cartItems.length === 0 && (
        <div className="cart-empty">
          <div className="cart-empty-icon">🛒</div>

          <h2>Your cart is empty</h2>

          <p>
            You haven't added any agricultural products yet.
          </p>

          <button
            type="button"
            className="continue-shopping-btn"
            onClick={() => navigate('/products')}
          >
            Start Shopping
          </button>
        </div>
      )}

      {/* CART PRODUCTS */}
      {!loading && !error && cartItems.length > 0 && (
        <div className="cart-layout">

          {/* ITEMS */}
          <div className="cart-items">
            {cartItems.map((item) => {
              const imageUrl = getProductImage(item.image)
              const quantity = Number(item.quantity)
              const stock = getAvailablePacks(item)
              const optionLabel = getOptionLabel(item)

              const isUpdating =
                updatingItem === item.cart_item_id

              const itemSubtotal =
                Number(item.price || 0) * quantity

              return (
                <div
                  className="cart-item"
                  key={item.cart_item_id}
                >

                  {/* IMAGE */}
                  <div className="cart-item-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.product_name}
                      />
                    ) : (
                      <span>🌾</span>
                    )}
                  </div>

                  {/* INFORMATION */}
                  <div className="cart-item-info">
                    <span className="cart-item-category">
                      {item.category_name ||
                        'AGRICULTURAL PRODUCT'}
                    </span>

                    <h2>{item.product_name}</h2>

                    {item.description && (
                      <p>{item.description}</p>
                    )}

                    <div className="cart-item-price">
                      {formatPrice(item.price)}
                      <span> / {optionLabel}</span>
                    </div>

                    <p>
                      Selected option: <strong>{optionLabel}</strong>
                    </p>

                    <p>
                      Available packs: {stock}
                    </p>

                    <p>
                      Item subtotal: <strong>{formatPrice(itemSubtotal)}</strong>
                    </p>
                  </div>

                  {/* ACTIONS */}
                  <div className="cart-item-actions">

                    {/* QUANTITY */}
                    <div className="quantity-control">
                      <button
                        type="button"
                        disabled={quantity <= 1 || isUpdating}
                        onClick={() =>
                          updateQuantity(
                            item.cart_item_id,
                            quantity - 1,
                            stock
                          )
                        }
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>

                      <span>
                        {isUpdating ? '...' : quantity}
                      </span>

                      <button
                        type="button"
                        disabled={
                          quantity >= stock || isUpdating
                        }
                        onClick={() =>
                          updateQuantity(
                            item.cart_item_id,
                            quantity + 1,
                            stock
                          )
                        }
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <span className="cart-pack-label">
                      pack(s)
                    </span>

                    {/* DELETE */}
                    <button
                      type="button"
                      className="remove-cart-btn"
                      disabled={isUpdating}
                      onClick={() =>
                        removeCartItem(item.cart_item_id)
                      }
                      aria-label={`Remove ${item.product_name} from cart`}
                      title="Remove from cart"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* SUMMARY */}
          <div className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total">
              <span>Total</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <button
              type="button"
              className="checkout-btn"
              onClick={() => navigate('/checkout')}
            >
              Proceed to Checkout
            </button>

            <button
              type="button"
              className="continue-shopping-btn"
              onClick={() => navigate('/products')}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION */}
      {confirmItem && (
        <div
          className="cart-confirm-overlay"
          onClick={() => {
            if (updatingItem === null) {
              setConfirmItem(null)
            }
          }}
        >
          <div
            className="cart-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="cart-confirm-close"
              onClick={() => setConfirmItem(null)}
              disabled={updatingItem !== null}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            <div className="cart-confirm-icon">
              <ShoppingCart size={27} />
            </div>

            <h2 id="cart-confirm-title">
              Remove Item?
            </h2>

            <p>
              Are you sure you want to remove{' '}
              <strong>{confirmItem.product_name}</strong>
              {' '}({getOptionLabel(confirmItem)}) from your
              shopping cart?
            </p>

            <div className="cart-confirm-actions">
              <button
                type="button"
                className="cart-confirm-cancel"
                onClick={() => setConfirmItem(null)}
                disabled={updatingItem !== null}
              >
                Keep Item
              </button>

              <button
                type="button"
                className="cart-confirm-delete"
                onClick={confirmRemoveCartItem}
                disabled={updatingItem !== null}
              >
                {updatingItem !== null
                  ? 'Removing...'
                  : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Cart
