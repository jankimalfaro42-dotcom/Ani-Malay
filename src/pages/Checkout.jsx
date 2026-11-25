import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notify } from '../utils/notify'

import '../App.css'

const API_URL = 'https://ani-malay-production.up.railway.app'
const LOCAL_GCASH_STORAGE_KEY = 'ani_malay_gcash_qr_config'

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

async function parseApiResponse(response, fallbackErrorMessage) {
  const rawText = await response.text()

  try {
    return rawText ? JSON.parse(rawText) : {}
  } catch {
    console.error(
      `Non-JSON response from ${response.url} (status ${response.status}): ${rawText.slice(0, 300)}`
    )

    throw new Error(
      `${fallbackErrorMessage} (Server returned HTML instead of JSON — status ${response.status}).`
    )
  }
}

function getLocalGcashConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_GCASH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function Checkout() {
  const navigate = useNavigate()

  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [deliveryArea, setDeliveryArea] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  const [referenceNumber, setReferenceNumber] = useState('')

  const [gcashInfo, setGcashInfo] = useState(() => {
    const saved = getLocalGcashConfig()
    return {
      accountName:
        saved?.accountName ||
        saved?.account_name ||
        'Municipal Agriculture Office - LGU Malay',
      accountNumber:
        saved?.accountNumber ||
        saved?.account_number ||
        '09XX XXX XXXX',
      qrImage:
        saved?.qrImage ||
        saved?.qr_image ||
        saved?.qrUrl ||
        saved?.qr_url ||
        '',
    }
  })

  const token = localStorage.getItem('token')
  const savedUser = localStorage.getItem('user')

  let user = null

  try {
    user = savedUser ? JSON.parse(savedUser) : null
  } catch (error) {
    console.error('User data error:', error)
  }

  const userId = user?.user_id

  const selectedArea = DELIVERY_AREAS[deliveryArea] || null
  const deliveryFee = selectedArea?.fee || 0

  const requiresAdvancePayment =
    selectedArea !== null && deliveryFee > 0

  // ==========================================
  // LOAD CART
  // ==========================================

  useEffect(() => {
    const fetchCart = async () => {
      if (!userId || !token) {
        setLoading(false)

        notify(
          'warning',
          'Login Required',
          'Please log in before proceeding to checkout.'
        )

        navigate('/login')
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/api/cart/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const data = await parseApiResponse(
          response,
          'Failed to load cart.'
        )

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load cart.')
        }

        setCartItems(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Checkout cart error:', error)

        notify(
          'error',
          'Cart Loading Failed',
          error.message || 'Failed to load your cart.'
        )

        setTimeout(() => navigate('/cart'), 1200)
      } finally {
        setLoading(false)
      }
    }

    fetchCart()
  }, [userId, token, navigate])

  // ==========================================
  // LOAD LGU GCASH QR & ACCOUNT DETAILS
  // ==========================================

  useEffect(() => {
    let isMounted = true

    const fetchGcashQr = async () => {
      try {
        const response = await fetch(`${API_URL}/api/gcash-qr`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        })

        if (!response.ok) return

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) return

        const data = await response.json()
        const payload = data?.data || data

        if (isMounted && payload && typeof payload === 'object') {
          setGcashInfo(prev => ({
            accountName:
              payload.accountName ||
              payload.account_name ||
              prev.accountName,
            accountNumber:
              payload.accountNumber ||
              payload.account_number ||
              prev.accountNumber,
            qrImage:
              payload.qrImage ||
              payload.qr_image ||
              payload.qrUrl ||
              payload.qr_url ||
              prev.qrImage,
          }))
        }
      } catch {
        // Fallback to localStorage / defaults silently if route is not yet on backend
      }
    }

    fetchGcashQr()

    return () => {
      isMounted = false
    }
  }, [token])

  // ==========================================
  // TOTALS
  // ==========================================

  const subtotal = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  )

  const total = subtotal + deliveryFee

  // ==========================================
  // DELIVERY AREA CHANGE
  // ==========================================

  const handleDeliveryAreaChange = (e) => {
    setDeliveryArea(e.target.value)
    setReferenceNumber('')
  }

  // ==========================================
  // PLACE ORDER DIRECTLY ONCE REFERENCE NUMBER IS ENTERED
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isSubmitting) return

    if (!userId || !token) {
      notify(
        'warning',
        'Login Required',
        'Please log in again before placing your order.'
      )

      navigate('/login')
      return
    }

    if (!fullName.trim()) {
      notify(
        'warning',
        'Missing Information',
        'Please enter your full name.'
      )
      return
    }

    if (!contactNumber.trim()) {
      notify(
        'warning',
        'Missing Information',
        'Please enter your contact number.'
      )
      return
    }

    if (!deliveryArea || !selectedArea) {
      notify(
        'warning',
        'Delivery Area Required',
        'Please select a delivery area.'
      )
      return
    }

    if (!address.trim()) {
      notify(
        'warning',
        'Missing Address',
        'Please enter your complete delivery address.'
      )
      return
    }

    if (requiresAdvancePayment && !referenceNumber.trim()) {
      notify(
        'warning',
        'Reference Number Required',
        'Please enter your GCash reference number so you can place your order.'
      )
      return
    }

    if (cartItems.length === 0) {
      notify(
        'warning',
        'Empty Cart',
        'Your cart is empty.'
      )

      navigate('/cart')
      return
    }

    // ========================================
    // VALIDATE QUANTITY OPTIONS
    // ========================================

    const invalidItem = cartItems.find(
      item =>
        !Number.isInteger(Number(item.quantity_option_id)) ||
        Number(item.quantity_option_id) <= 0
    )

    if (invalidItem) {
      notify(
        'error',
        'Quantity Option Missing',
        `Please remove and add ${invalidItem.product_name} to your cart again so its quantity option can be loaded.`
      )
      return
    }

    setIsSubmitting(true)

    try {
      const cleanRef = referenceNumber.trim() || null

      const orderItems = cartItems.map(item => ({
        product_id: Number(item.product_id),
        quantity_option_id: Number(item.quantity_option_id),
        quantity: Number(item.quantity),
      }))

      const orderResponse = await fetch(
        `${API_URL}/api/orders`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            full_name: fullName.trim(),
            payment_method: 'COD',
            delivery_area: deliveryArea,
            delivery_address: address.trim(),
            contact_number: contactNumber.trim(),
            notes: notes.trim(),
            gcash_reference_number: cleanRef,
            reference_number: cleanRef,
            items: orderItems,
          }),
        }
      )

      const orderData = await parseApiResponse(
        orderResponse,
        'Failed to place your order.'
      )

      if (!orderResponse.ok) {
        throw new Error(
          orderData.message || 'Failed to place your order.'
        )
      }

      const orderId = orderData.order_id

      if (!orderId) {
        throw new Error(
          'The server did not return an order ID.'
        )
      }

      // Optional: save shipping reference if your backend still expects /receipt
      if (requiresAdvancePayment && cleanRef) {
        try {
          await fetch(
            `${API_URL}/api/payments/shipping/${orderId}/receipt`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                reference_number: cleanRef,
              }),
            }
          )
        } catch (receiptErr) {
          console.warn('Shipping receipt route warning:', receiptErr)
        }
      }

      notify(
        'success',
        'Order Placed Successfully!',
        `Your order #${orderId} has been placed.`
      )

      if (requiresAdvancePayment) {
        notify(
          'info',
          'Advance Shipping Fee Verification',
          'Your order has been placed with your GCash reference number and will be processed once the admin verifies your advance shipping payment.'
        )
      }

      setTimeout(() => {
        navigate('/orders')
      }, 1500)

    } catch (error) {
      console.error('Checkout error:', error)

      notify(
        'error',
        'Checkout Notice',
        error.message || 'Something went wrong during checkout.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <section className="checkout-page">
        <div className="checkout-loading">
          Loading checkout...
        </div>
      </section>
    )
  }

  // ==========================================
  // EMPTY CART
  // ==========================================

  if (cartItems.length === 0) {
    return (
      <section className="checkout-page">
        <div className="checkout-empty">
          <div className="checkout-empty-icon">
            🛒
          </div>

          <h2>Your cart is empty</h2>

          <p>
            Add products to your cart before checking out.
          </p>

          <button
            type="button"
            onClick={() => navigate('/products')}
          >
            Start Shopping
          </button>
        </div>
      </section>
    )
  }

  // ==========================================
  // CHECKOUT UI
  // ==========================================

  return (
    <section className="checkout-page">

      <div className="checkout-header">
        <span>CHECKOUT</span>

        <h1>Complete Your Order</h1>

        <p>
          Review your order and provide your delivery information.
        </p>
      </div>

      <form
        className="checkout-layout"
        onSubmit={handleSubmit}
      >

        {/* LEFT SIDE */}

        <div className="checkout-main">

          {/* DELIVERY INFORMATION */}

          <div className="checkout-card">
            <h2>Delivery Information</h2>

            <div className="checkout-form-grid">

              <div className="checkout-form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="checkout-form-group">
                <label>Contact Number</label>

                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="09XXXXXXXXX"
                  required
                />
              </div>

            </div>

            <div className="checkout-form-group">
              <label>Delivery Area</label>

              <select
                value={deliveryArea}
                onChange={handleDeliveryAreaChange}
                required
              >
                <option value="">
                  Select delivery area
                </option>

                <option value="malay_mainland">
                  Malay (Mainland) — Free Delivery
                </option>

                <option value="boracay">
                  Boracay Island — ₱100
                </option>

                <option value="buruanga">
                  Buruanga — ₱200
                </option>

                <option value="tangalan">
                  Tangalan — ₱200
                </option>

                <option value="numancia">
                  Numancia — ₱200
                </option>

                <option value="lezo">
                  Lezo — ₱200
                </option>

                <option value="new_washington">
                  New Washington — ₱200
                </option>

                <option value="kalibo">
                  Kalibo — ₱200
                </option>
              </select>
            </div>

            <div className="checkout-form-group">
              <label>Complete Delivery Address</label>

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Barangay, street, house/building number, landmarks..."
                rows="4"
                required
              />
            </div>

            {requiresAdvancePayment && (
              <div className="advance-fee-notice">
                <div className="advance-fee-icon">
                  ⚠️
                </div>

                <div>
                  <strong>
                    Advance Shipping Fee Required (₱{deliveryFee.toFixed(2)})
                  </strong>

                  <p>
                    Your selected delivery area requires an
                    advance shipping payment of{' '}
                    <strong>
                      ₱{deliveryFee.toFixed(2)}
                    </strong>{' '}
                    through GCash. Enter your GCash reference
                    number below to place your order.
                  </p>

                  <div className="gcash-lgu-details">
                    <p>
                      <strong>GCash Name:</strong>{' '}
                      {gcashInfo.accountName}
                    </p>
                    <p>
                      <strong>GCash Number:</strong>{' '}
                      {gcashInfo.accountNumber}
                    </p>
                    {gcashInfo.qrImage && (
                      <div className="gcash-qr-preview-box">
                        <img
                          src={
                            gcashInfo.qrImage.startsWith('/uploads/')
                              ? `${API_URL}${gcashInfo.qrImage}`
                              : gcashInfo.qrImage
                          }
                          alt="Official LGU Malay GCash QR Code"
                          className="gcash-qr-image"
                        />
                      </div>
                    )}
                  </div>

                  <small>
                    Only the shipping fee is paid in advance.
                    Your agricultural products will remain COD.
                  </small>

                  {deliveryArea === 'boracay' && (
                    <p>
                      <strong>Boracay refund:</strong> ₱50 will
                      be refunded after you successfully receive
                      your order personally. Your ₱100 advance
                      payment therefore has a final shipping
                      cost of ₱50.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="checkout-form-group">
              <label>Order Notes</label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions (optional)"
                rows="3"
              />
            </div>
          </div>

          {/* PAYMENT INFORMATION */}

          <div className="checkout-card">
            <h2>Payment Method</h2>

            <div className="payment-options">

              <div className="payment-option selected">
                <div className="payment-icon cod-icon">
                  💵
                </div>

                <div className="payment-info">
                  <strong>
                    Cash on Delivery (COD)
                  </strong>

                  <span>
                    Pay for your agricultural products when
                    your order arrives.
                  </span>
                </div>
              </div>

              {requiresAdvancePayment && (
                <div className="payment-option selected">
                  <div className="payment-icon gcash-icon">
                    G
                  </div>

                  <div className="payment-info">
                    <strong>
                      GCash — Shipping Fee Only
                    </strong>

                    <span>
                      Advance payment required for delivery.
                      This is separate from your product payment.
                    </span>
                  </div>
                </div>
              )}

            </div>

            {requiresAdvancePayment && (
              <div className="gcash-required-note">
                <strong>
                  GCash Shipping Payment Details
                </strong>

                <p>
                  Pay exactly <strong>₱{deliveryFee.toFixed(2)}</strong>{' '}
                  via GCash to <strong>{gcashInfo.accountName}</strong>{' '}
                  (<strong>{gcashInfo.accountNumber}</strong>) or scan
                  the QR code above, then enter your GCash reference
                  number below to place your order.
                </p>

                <div className="checkout-form-group">
                  <label>GCash Reference Number</label>

                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) =>
                      setReferenceNumber(e.target.value)
                    }
                    placeholder="Enter GCash reference number"
                    required={requiresAdvancePayment}
                  />
                </div>
              </div>
            )}

            {requiresAdvancePayment && (
              <div className="gcash-required-note">
                <strong>Important Payment Reminder</strong>

                <p>
                  Once you enter your GCash reference number and
                  place your order, your order will be processed
                  after the admin verifies your advance shipping
                  payment. Only the shipping fee is paid in
                  advance through GCash; payment for your
                  agricultural products will be collected upon
                  delivery (COD).
                </p>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT SIDE — ORDER SUMMARY */}

        <aside className="checkout-summary">
          <h2>Order Summary</h2>

          <div className="checkout-products">
            {cartItems.map((item) => (
              <div
                className="checkout-product"
                key={item.cart_item_id}
              >
                <div className="checkout-product-image">
                  {item.image ? (
                    <img
                      src={
                        item.image.startsWith('/uploads/')
                          ? `${API_URL}${item.image}`
                          : item.image
                      }
                      alt={item.product_name}
                    />
                  ) : (
                    <span>🌾</span>
                  )}
                </div>

                <div className="checkout-product-info">
                  <strong>{item.product_name}</strong>

                  <span>
                    {item.option_label || `${item.quantity_value || 1} ${item.unit || ''}`}
                  </span>

                  <span>
                    Packs: {item.quantity}
                  </span>

                  <span>
                    ₱{Number(item.price || 0).toFixed(2)} per option
                  </span>
                </div>

                <strong>
                  ₱
                  {(
                    Number(item.price) *
                    Number(item.quantity)
                  ).toFixed(2)}
                </strong>
              </div>
            ))}
          </div>

          <div className="checkout-divider" />

          <div className="checkout-summary-row">
            <span>Product Subtotal</span>

            <strong>
              ₱{subtotal.toFixed(2)}
            </strong>
          </div>

          <div className="checkout-summary-row">
            <span>Shipping Fee</span>

            <strong>
              {deliveryFee > 0
                ? `₱${deliveryFee.toFixed(2)}`
                : 'Free'}
            </strong>
          </div>

          <div className="checkout-divider" />

          <div className="checkout-total">
            <span>Total Order Amount</span>

            <strong>
              ₱{total.toFixed(2)}
            </strong>
          </div>

          <p>
            Product payment: COD
            {requiresAdvancePayment
              ? ' | Shipping fee: Advance GCash'
              : ''}
          </p>

          <button
            type="submit"
            className="place-order-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>

          <button
            type="button"
            className="back-cart-btn"
            onClick={() => navigate('/cart')}
            disabled={isSubmitting}
          >
            ← Back to Cart
          </button>
        </aside>

      </form>
    </section>
  )
}

export default Checkout