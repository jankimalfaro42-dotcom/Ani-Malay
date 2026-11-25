import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Package,
  UserRound,
  Receipt,
  CreditCard,
  Phone,
  CalendarDays,
  Truck,
  CheckCircle2,
  ShoppingBag,
  UserRoundCheck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import './AdminOrderDetails.css'

const API = 'https://ani-malay-production.up.railway.app/api'
const API_ORIGIN = API.replace(/\/api$/, '')

function AdminOrderDetails() {
  const { id } = useParams()

  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [riderName, setRiderName] = useState('')
  const [riderContact, setRiderContact] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingRider, setSavingRider] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusError, setStatusError] = useState(false)
  const [riderMessage, setRiderMessage] = useState('')
  const [riderError, setRiderError] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const orderStatuses = [
    'pending',
    'confirmed',
    'processing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
  ]

  const formatStatus = (status) => {
    if (!status) return 'Not available'

    return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
  }

  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const formatDate = (date) => {
    if (!date) return 'Not available'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not available'
    }

    return parsedDate.toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const getReferenceNumber = (orderObj) =>
    orderObj?.gcash_reference_number ||
    orderObj?.reference_number ||
    orderObj?.shipping_reference_number ||
    orderObj?.payment_reference ||
    ''

  const getReceiptSrc = (orderObj) => {
    const rawReceipt =
      orderObj?.receipt_image ||
      orderObj?.shipping_receipt ||
      orderObj?.payment_receipt ||
      orderObj?.gcash_receipt ||
      ''

    if (!rawReceipt) return ''
    if (
      rawReceipt.startsWith('http://') ||
      rawReceipt.startsWith('https://') ||
      rawReceipt.startsWith('data:')
    ) {
      return rawReceipt
    }
    return rawReceipt.startsWith('/')
      ? `${API_ORIGIN}${rawReceipt}`
      : `${API_ORIGIN}/${rawReceipt}`
  }

  const loadOrder = async () => {
    const response = await fetch(`${API}/orders/${id}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to load order details.')
    }

    if (!data.order) {
      throw new Error('Order not found.')
    }

    const orderData = data.order

    // Load deliveries and select only the delivery belonging to this order.
    const deliveryResponse = await fetch(`${API}/deliveries`)
    const deliveryData = await deliveryResponse.json()

    if (!deliveryResponse.ok) {
      throw new Error(
        deliveryData.message || 'Failed to load delivery information.'
      )
    }

    const deliveryList = Array.isArray(deliveryData)
      ? deliveryData
      : Array.isArray(deliveryData.deliveries)
        ? deliveryData.deliveries
        : []

    const delivery =
      deliveryList.find(
        (item) => Number(item.order_id) === Number(id)
      ) || null

    const completeOrder = delivery
      ? {
          ...orderData,
          delivery_id: delivery.delivery_id,
          delivery_address: delivery.delivery_address,
          contact_number: delivery.contact_number,
          delivery_status: delivery.delivery_status,
          delivery_date: delivery.delivery_date,
          notes: delivery.notes,
          rider_id: delivery.rider_id,
          rider_name: delivery.rider_name,
          rider_contact_number: delivery.rider_contact_number,
        }
      : orderData

    setOrder(completeOrder)
    setSelectedStatus(orderData.status || 'pending')
    setItems(Array.isArray(data.items) ? data.items : [])
    setRiderName(delivery?.rider_name || '')
    setRiderContact(delivery?.rider_contact_number || '')
  }

  useEffect(() => {
    let active = true

    const loadPage = async () => {
      setLoading(true)
      setFetchError('')

      try {
        await loadOrder()
      } catch (error) {
        console.error('Order details error:', error)

        if (active) {
          setFetchError(error.message || 'Unable to load this order.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => {
      active = false
    }
  }, [id])

  const executeStatusUpdate = async () => {
    if (!order || !selectedStatus || savingStatus) return

    setSavingStatus(true)
    setStatusMessage('')
    setStatusError(false)

    try {
      const response = await fetch(
        `${API}/orders/${order.order_id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: selectedStatus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update order status.')
      }

      setOrder((previous) => ({
        ...previous,
        status: selectedStatus,
      }))

      setConfirmAction(null)
      setStatusMessage('Order status updated successfully.')
    } catch (error) {
      setStatusMessage(error.message || 'Something went wrong.')
      setStatusError(true)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleStatusUpdate = () => {
    if (!order || !selectedStatus || savingStatus) return

    if (selectedStatus === order.status) {
      setStatusMessage('The order already has this status.')
      setStatusError(false)
      return
    }

    setConfirmAction({
      type: 'status',
      title: 'Update Order Status?',
      message: `Change order status to ${formatStatus(selectedStatus)}?`,
      confirmLabel: 'Yes, Update Status',
    })
  }

  const executeAssignRider = async (cleanName, cleanContact) => {
    if (!order || savingRider) return

    setSavingRider(true)
    setRiderMessage('')
    setRiderError(false)

    try {
      const response = await fetch(
        `${API}/deliveries/order/${order.order_id}/rider`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: cleanName,
            contact_number: cleanContact,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save rider details.')
      }

      await loadOrder()

      setConfirmAction(null)
      setRiderMessage(
        data.message || 'Rider details saved successfully.'
      )
    } catch (error) {
      console.error('Assign rider error:', error)
      setRiderMessage(error.message || 'Failed to save rider details.')
      setRiderError(true)
    } finally {
      setSavingRider(false)
    }
  }

  const handleAssignRider = () => {
    if (!order) return

    const cleanName = riderName.trim()
    const cleanContact = riderContact.trim()

    if (!cleanName || !cleanContact || savingRider) {
      setRiderMessage('Enter the rider name and contact number.')
      setRiderError(true)
      return
    }

    setConfirmAction({
      type: 'rider',
      title: 'Save Rider Details?',
      message: `Assign ${cleanName} (${cleanContact}) to this order?`,
      confirmLabel: 'Yes, Save Rider',
      payload: { cleanName, cleanContact },
    })
  }

  const handleConfirmModalProceed = () => {
    if (!confirmAction) return
    if (confirmAction.type === 'status') {
      executeStatusUpdate()
    } else if (confirmAction.type === 'rider') {
      executeAssignRider(
        confirmAction.payload.cleanName,
        confirmAction.payload.cleanContact
      )
    }
  }

  if (loading) {
    return (
      <div className="admin-order-details-page">
        <div className="admin-order-details-message">
          <p>Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="admin-order-details-page">
        <div className="admin-order-details-message">
          <h2>Unable to display order</h2>
          <p>{fetchError || 'Order not found.'}</p>

          <Link to="/admin/orders" className="admin-back-link">
            <ArrowLeft size={17} />
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const referenceNumber = getReferenceNumber(order)
  const receiptSrc = getReceiptSrc(order)
  const isConfirmBusy = savingStatus || savingRider

  return (
    <div className="admin-order-details-page">
      <header className="admin-order-details-header">
        <div className="admin-order-heading">
          <span className="admin-header-label">ORDER MANAGEMENT</span>
          <h1>Order Details</h1>
          <p>
            Review customer, delivery, payment, and product information.
          </p>
        </div>

        <Link to="/admin/orders" className="admin-back-link">
          <ArrowLeft size={17} />
          Back to Orders
        </Link>
      </header>

      {fetchError && (
        <p className="admin-status-message error">{fetchError}</p>
      )}

      <div className="admin-order-reference">
        <div className="admin-order-reference-icon">
          <Receipt size={23} />
        </div>

        <div className="admin-order-reference-text">
          <span>Order reference</span>
          <h2>AM-{String(order.order_id).padStart(5, '0')}</h2>
          <p>Placed {formatDate(order.order_date)}</p>
        </div>

        <span className={`admin-order-status ${order.status}`}>
          {formatStatus(order.status)}
        </span>
      </div>

      <section className="admin-status-panel">
        <div className="admin-status-panel-heading">
          <div className="admin-section-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <h2>Order Status</h2>
            <p>Update the progress of this order.</p>
          </div>
        </div>

        <div className="admin-status-editor">
          <div className="admin-status-field">
            <label htmlFor="order-status">New status</label>

            <select
              id="order-status"
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value)
                setStatusMessage('')
              }}
              disabled={savingStatus}
            >
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <button
            className="admin-save-status"
            type="button"
            onClick={handleStatusUpdate}
            disabled={savingStatus || !selectedStatus}
          >
            {savingStatus ? 'Saving...' : 'Save Status'}
          </button>
        </div>

        {statusMessage && (
          <p
            className={`admin-status-message ${
              statusError ? 'error' : 'success'
            }`}
          >
            {statusMessage}
          </p>
        )}
      </section>

      <section className="admin-status-panel admin-rider-panel">
        <div className="admin-status-panel-heading">
          <div className="admin-section-icon">
            <UserRoundCheck size={20} />
          </div>

          <div>
            <h2>Assign Delivery Rider</h2>
            <p>Enter the rider's name and contact number.</p>
          </div>
        </div>

        {order.rider_name ? (
          <div className="admin-assigned-rider">
            <strong>Currently assigned: {order.rider_name}</strong>
            <span>
              <Phone size={15} className="admin-inline-icon" />
              {order.rider_contact_number || 'No contact number'}
            </span>
          </div>
        ) : (
          <p className="admin-rider-unassigned">
            No rider assigned yet.
          </p>
        )}

        <div className="admin-status-editor">
          <div className="admin-status-field">
            <label htmlFor="rider-name">Rider's Full Name</label>

            <input
              id="rider-name"
              type="text"
              placeholder="Enter rider's full name"
              value={riderName}
              onChange={(event) => {
                setRiderName(event.target.value)
                setRiderMessage('')
              }}
              disabled={savingRider}
            />
          </div>

          <div className="admin-status-field">
            <label htmlFor="rider-contact">
              Rider's Contact Number
            </label>

            <input
              id="rider-contact"
              type="tel"
              placeholder="Enter contact number"
              value={riderContact}
              onChange={(event) => {
                setRiderContact(event.target.value)
                setRiderMessage('')
              }}
              disabled={savingRider}
            />
          </div>

          <button
            className="admin-save-status"
            type="button"
            onClick={handleAssignRider}
            disabled={
              savingRider ||
              !riderName.trim() ||
              !riderContact.trim()
            }
          >
            {savingRider
              ? 'Saving...'
              : order.rider_id
                ? 'Update Rider'
                : 'Assign Rider'}
          </button>
        </div>

        {riderMessage && (
          <p
            className={`admin-status-message ${
              riderError ? 'error' : 'success'
            }`}
          >
            {riderMessage}
          </p>
        )}
      </section>

      <div className="admin-order-information-grid">
        <section className="admin-detail-section">
          <div className="admin-detail-title">
            <div className="admin-section-icon">
              <UserRound size={20} />
            </div>

            <div>
              <h3>Consumer Information</h3>
              <p>Customer details for this order</p>
            </div>
          </div>

          <div className="admin-detail-info">
            <div>
              <span>Customer name</span>
              <strong>{order.full_name || 'Unknown'}</strong>
            </div>

            <div>
              <span>Order date</span>
              <strong>{formatDate(order.order_date)}</strong>
            </div>
          </div>
        </section>

        <section className="admin-detail-section">
          <div className="admin-detail-title">
            <div className="admin-section-icon">
              <Truck size={20} />
            </div>

            <div>
              <h3>Delivery Information</h3>
              <p>Destination and delivery details</p>
            </div>
          </div>

          <div className="admin-detail-info">
            <div>
              <span>Delivery address</span>
              <strong>
                {order.delivery_address || 'No delivery address saved'}
              </strong>
            </div>

            <div>
              <span>Contact number</span>
              <strong>
                <Phone size={15} className="admin-inline-icon" />
                {order.contact_number || 'Not provided'}
              </strong>
            </div>

            <div>
              <span>Delivery status</span>
              <strong>
                {formatStatus(order.delivery_status || 'pending')}
              </strong>
            </div>

            {order.delivery_date && (
              <div>
                <span>Delivery date</span>
                <strong>
                  <CalendarDays
                    size={15}
                    className="admin-inline-icon"
                  />
                  {formatDate(order.delivery_date)}
                </strong>
              </div>
            )}

            {order.notes && (
              <div className="admin-detail-full">
                <span>Delivery notes</span>
                <strong>{order.notes}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="admin-detail-section">
          <div className="admin-detail-title">
            <div className="admin-section-icon">
              <CreditCard size={20} />
            </div>

            <div>
              <h3>Payment Information</h3>
              <p>Payment method and shipping fee verification</p>
            </div>
          </div>

          <div className="admin-detail-info">
            <div>
              <span>Payment method</span>
              <strong>{order.payment_method || 'Not available'}</strong>
            </div>

            <div>
              <span>Payment status</span>
              <strong>
                {formatStatus(order.payment_status || 'pending')}
              </strong>
            </div>

            {order.payment_amount != null && (
              <div>
                <span>Payment amount</span>
                <strong>{formatCurrency(order.payment_amount)}</strong>
              </div>
            )}

            <div>
              <span>GCash reference no.</span>
              <strong>{referenceNumber || 'Not yet provided'}</strong>
            </div>

            <div className="admin-detail-full">
              <span>Shipping receipt (optional)</span>
              {receiptSrc ? (
                <div style={{ marginTop: '8px' }}>
                  <a
                    href={receiptSrc}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-block',
                      fontSize: '0.84rem',
                      marginBottom: '8px',
                      color: '#15803d',
                      fontWeight: 600,
                    }}
                  >
                    Open full receipt image ↗
                  </a>
                  <div>
                    <img
                      src={receiptSrc}
                      alt="Consumer GCash Shipping Receipt"
                      style={{
                        maxWidth: '240px',
                        width: '100%',
                        height: 'auto',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <strong>No receipt image uploaded (optional)</strong>
              )}
            </div>
          </div>
        </section>

        <section className="admin-detail-section admin-order-summary-card">
          <div className="admin-detail-title">
            <div className="admin-section-icon">
              <ShoppingBag size={20} />
            </div>

            <div>
              <h3>Order Summary</h3>
              <p>{items.length} product line(s) in this order</p>
            </div>
          </div>

          <div className="admin-order-summary-row">
            <span>Products</span>
            <strong>{items.length}</strong>
          </div>

          <div className="admin-order-summary-row">
            <span>Total quantity</span>
            <strong>
              {items.reduce(
                (total, item) => total + Number(item.quantity || 0),
                0
              )}
            </strong>
          </div>

          <div className="admin-order-summary-row admin-summary-total">
            <span>Total amount</span>
            <strong>{formatCurrency(order.total_amount)}</strong>
          </div>
        </section>
      </div>

      <section className="admin-detail-section admin-products-section">
        <div className="admin-detail-title">
          <div className="admin-section-icon">
            <Package size={20} />
          </div>

          <div>
            <h3>Ordered Products</h3>
            <p>Products included in this order</p>
          </div>
        </div>

        <div className="admin-order-items">
          {items.length === 0 ? (
            <p className="admin-empty-items">
              No products found for this order.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={
                      item.order_item_id ||
                      `${item.product_name}-${index}`
                    }
                  >
                    <td>
                      <div className="admin-product-name">
                        <div className="admin-product-icon">
                          <Package size={18} />
                        </div>

                        <strong>
                          {item.product_name || 'Product'}
                        </strong>
                      </div>
                    </td>

                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.price)}</td>

                    <td className="admin-subtotal">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-order-total">
          <span>Total Order Amount</span>
          <strong>{formatCurrency(order.total_amount)}</strong>
        </div>
      </section>

      {confirmAction && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !isConfirmBusy && setConfirmAction(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '410px',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '22px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.22)',
              color: '#1e293b',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: '1.12rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {confirmAction.title}
            </h3>
            <p
              style={{
                margin: '0 0 18px',
                fontSize: '0.94rem',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              {confirmAction.message}
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isConfirmBusy}
                style={{
                  padding: '9px 15px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  fontWeight: 600,
                  cursor: isConfirmBusy ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModalProceed}
                disabled={isConfirmBusy}
                style={{
                  padding: '9px 15px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: isConfirmBusy ? 'not-allowed' : 'pointer',
                  opacity: isConfirmBusy ? 0.65 : 1,
                }}
              >
                {isConfirmBusy ? 'Saving...' : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminOrderDetails