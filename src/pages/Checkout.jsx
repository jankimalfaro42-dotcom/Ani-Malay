import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { notify } from '../utils/notify'

import '../App.css'

const API_URL = 'https://ani-malay-production.up.railway.app'

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
  const [receiptImage, setReceiptImage] = useState(null)

  const [pendingOrderId, setPendingOrderId] = useState(null)

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
    setReceiptImage(null)
    setPendingOrderId(null)
  }

  // ==========================================
  // PLACE ORDER AND SUBMIT SHIPPING RECEIPT
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

    if (cartItems.length === 0 && !pendingOrderId) {
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

    if (!pendingOrderId) {
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
    }

    // ========================================
    // ADVANCE SHIPPING PAYMENT VALIDATION
    // ========================================

    if (requiresAdvancePayment) {
      if (!referenceNumber.trim()) {
        notify(
          'warning',
          'Reference Number Required',
          'Please enter your GCash reference number.'
        )
        return
      }

      if (!receiptImage && !pendingOrderId) {
        notify(
          'warning',
          'Receipt Required',
          'Please upload your GCash payment receipt.'
        )
        return
      }

      if (
        receiptImage &&
        receiptImage.size > 5 * 1024 * 1024
      ) {
        notify(
          'warning',
          'File Too Large',
          'Your receipt image must not exceed 5 MB.'
        )
        return
      }

      if (
        receiptImage &&
        ![
          'image/jpeg',
          'image/png',
          'image/webp',
        ].includes(receiptImage.type)
      ) {
        notify(
          'warning',
          'Invalid Image',
          'Please upload a JPG, PNG, or WEBP image.'
        )
        return
      }
    }

    setIsSubmitting(true)

    try {
      let orderId = pendingOrderId

      // ======================================
      // STEP 1: CREATE ORDER
      // ======================================

      if (!orderId) {
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

        orderId = orderData.order_id
        setPendingOrderId(orderId)

        if (!orderId) {
          throw new Error(
            'The server did not return an order ID.'
          )
        }
      }

      // ======================================
      // STEP 2: SUBMIT SHIPPING RECEIPT
      // ======================================

      if (requiresAdvancePayment) {
        if (!receiptImage) {
          throw new Error(
            'Your order was created, but the receipt image is missing. Please select your receipt and submit again.'
          )
        }

        const formData = new FormData()

        formData.append(
          'reference_number',
          referenceNumber.trim()
        )

        formData.append(
          'receipt_image',
          receiptImage
        )

        const receiptResponse = await fetch(
          `${API_URL}/api/payments/shipping/${orderId}/receipt`,
          {
            method: 'POST',

            headers: {
              Authorization: `Bearer ${token}`,
            },

            body: formData,
          }
        )

        const receiptData = await parseApiResponse(
          receiptResponse,
          `Order created, but shipping receipt submission failed.`
        )

        if (!receiptResponse.ok) {
          throw new Error(
            receiptData.message ||
              'Order created, but shipping receipt submission failed. Please try again.'
          )
        }
      }

      // ======================================
      // STEP 3: SUCCESS
      // ======================================

      setPendingOrderId(null)

      notify(
        'success',
        'Order Submitted Successfully!',
        `Your order #${orderId} has been submitted.`
      )

      if (requiresAdvancePayment) {
        notify(
          'info',
          'Waiting for Admin Verification',
          'Please message the LGU Admin for order confirmation. Verification may take approximately 1–5 minutes.'
        )
      }

      setTimeout(() => {
        navigate('/orders')
      }, 1800)

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

  if (cartItems.length === 0 && !pendingOrderId) {
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
                    Advance Shipping Fee Required
                  </strong>

                  <p>
                    Your selected delivery area requires an
                    advance shipping payment of{' '}
                    <strong>
                      ₱{deliveryFee.toFixed(2)}
                    </strong>{' '}
                    through GCash.
                  </p>

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
                  GCash Shipping Payment Instructions
                </strong>

                <p>
                  Please obtain the official LGU Malay GCash
                  QR code from the Municipal Agriculture
                  Office/Admin and pay exactly ₱
                  {deliveryFee.toFixed(2)}.
                </p>

                <p>
                  Keep your GCash transaction receipt.
                  Enter its reference number and upload
                  a screenshot below.
                </p>

                <div className="checkout-form-group">
                  <label>GCash Reference Number</label>

                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) =>
                      setReferenceNumber(e.target.value)
                    }
                    placeholder="Enter your GCash reference number"
                    required
                  />
                </div>

                <div className="checkout-form-group">
                  <label>Upload GCash Receipt</label>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      setReceiptImage(
                        e.target.files?.[0] || null
                      )
                    }
                    required={!pendingOrderId}
                  />

                  <small>
                    Accepted formats: JPG, PNG, WEBP.
                    Maximum size: 5 MB.
                  </small>

                  {receiptImage && (
                    <p>
                      Selected file:{' '}
                      <strong>{receiptImage.name}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {requiresAdvancePayment && (
              <div className="gcash-required-note">
                <strong>Important Payment Reminder</strong>

                <p>
                  Only the shipping fee is paid in advance
                  through GCash. The payment for your
                  agricultural products will be collected
                  upon delivery.
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

          {pendingOrderId && (
            <p>
              Order #{pendingOrderId} was created.
              Please complete your shipping receipt submission.
            </p>
          )}

          <button
            type="submit"
            className="place-order-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Processing...'
              : pendingOrderId
                ? 'Submit Shipping Receipt'
                : 'Place Order'}
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