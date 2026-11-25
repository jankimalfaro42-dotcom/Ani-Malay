import { useEffect, useState } from 'react'
import {
  ShoppingCart,
  ArrowLeft,
  RefreshCw,
  Package,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import './AdminOrders.css'

function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // FETCH ORDERS
  const fetchOrders = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true)
      }
      // Keep previously loaded orders visible during refresh.
      setError('')

      const response = await fetch('https://ani-malay-production.up.railway.app/api/orders')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load orders.')
      }

      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Admin orders error:', err)
      setError(err.message || 'Unable to load orders.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOrders(false)
  }, [])

  const formatDate = date => {
    if (!date) return 'N/A'

    return new Date(date).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const formatStatus = status => {
    return (status || 'pending')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
  }

  const formatMoney = amount => {
    return Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div className="admin-orders-page">
      <div className="admin-orders-toolbar">
        <Link to="/admin" className="admin-orders-back">
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <button
          type="button"
          className="admin-orders-refresh"
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh Orders'}
        </button>
      </div>

      <section className="admin-orders-panel">
        <div className="admin-orders-panel-header">
          <div className="admin-orders-panel-title">
            <span>ORDER MANAGEMENT</span>
            <h2>All Orders</h2>
            <p>View orders submitted by consumers.</p>
          </div>

          <div className="admin-orders-count">
            <Package size={17} />
            <strong>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </strong>
          </div>
        </div>

        {/* Initial loading only. Keep existing table visible on refresh. */}
        {loading && orders.length === 0 && !error ? (
          <div className="admin-orders-state">
            <div className="admin-orders-spinner" />
            <h3>Loading orders...</h3>
            <p>Please wait while we retrieve the orders.</p>
          </div>
        ) : error && orders.length === 0 ? (
          <div className="admin-orders-state admin-orders-error">
            <AlertCircle size={34} />
            <h3>Unable to Load Orders</h3>
            <p>{error}</p>
            <button
              type="button"
              className="admin-orders-primary-btn"
              onClick={() => fetchOrders(true)}
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="admin-orders-state">
            <div className="admin-orders-empty-icon">
              <ShoppingCart size={32} />
            </div>
            <h3>No Orders Found</h3>
            <p>Orders placed by consumers will appear here.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="admin-orders-inline-error">
                <AlertCircle size={16} />
                {error}
                <button type="button" onClick={() => fetchOrders(true)}>
                  Retry
                </button>
              </div>
            )}

            <div className="admin-orders-table-wrapper">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    <th>ORDER ID</th>
                    <th>CONSUMER</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th>ORDER DATE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map(order => (
                    <tr key={order.order_id}>
                      <td>
                        <strong className="admin-orders-id">
                          #AM-{String(order.order_id).padStart(5, '0')}
                        </strong>
                      </td>

                      <td>
                        <span className="admin-orders-consumer">
                          {order.full_name || 'Unknown Consumer'}
                        </span>
                      </td>

                      <td className="admin-orders-total">
                        ₱{formatMoney(order.total_amount)}
                      </td>

                      <td>
                        <span
                          className={`admin-order-status ${(order.status || 'pending').toLowerCase()}`}
                        >
                          <span className="admin-orders-status-dot" />
                          {formatStatus(order.status)}
                        </span>
                      </td>

                      <td className="admin-orders-date">
                        {formatDate(order.order_date)}
                      </td>

                      <td>
                        <Link
                          to={`/admin/orders/${order.order_id}`}
                          className="admin-orders-view-btn"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default AdminOrders