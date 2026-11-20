import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Truck,
  RefreshCw,
  MapPin,
  Phone,
  UserRound,
  Package,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock3,
  CalendarDays,
  ShoppingBag,
  PhilippinePeso,
} from 'lucide-react'
import './AdminDeliveries.css'

const API = 'https://ani-malay-production.up.railway.app/api'

const formatCurrency = (amount) =>
  `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (date) => {
  if (!date) return '—'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return '—'

  return parsedDate.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const formatStatus = (status) => {
  if (!status) return 'Pending'

  return String(status)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const getStatusClass = (status) => {
  const normalized = String(status || 'pending').toLowerCase()

  if (normalized === 'delivered') return 'delivered'
  if (normalized === 'out_for_delivery') return 'out-for-delivery'
  if (normalized === 'preparing') return 'preparing'
  if (normalized === 'failed' || normalized === 'cancelled') {
    return 'failed'
  }

  return 'pending'
}

function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadDeliveries = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const response = await fetch(`${API}/deliveries`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load deliveries.')
      }

      const deliveryList = Array.isArray(data)
        ? data
        : Array.isArray(data.deliveries)
          ? data.deliveries
          : []

      setDeliveries(deliveryList)
    } catch (err) {
      console.error('Load deliveries error:', err)
      setError(
        err.message ||
          'Unable to connect to the server. Please try again.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDeliveries()
  }, [loadDeliveries])

  const filteredDeliveries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) return deliveries

    return deliveries.filter((delivery) => {
      const searchableValues = [
        delivery.delivery_id,
        delivery.order_id,
        delivery.customer_name,
        delivery.full_name,
        delivery.contact_number,
        delivery.delivery_address,
        delivery.delivery_status,
        delivery.order_status,
        delivery.rider_name,
        delivery.rider_contact_number,
        delivery.purchased_products,
        delivery.total_amount,
      ]

      return searchableValues.some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    })
  }, [deliveries, searchTerm])

  const stats = useMemo(() => {
    const total = deliveries.length

    const delivered = deliveries.filter(
      (item) =>
        String(item.delivery_status || '').toLowerCase() === 'delivered'
    ).length

    const inTransit = deliveries.filter(
      (item) =>
        String(item.delivery_status || '').toLowerCase() ===
        'out_for_delivery'
    ).length

    const pending = deliveries.filter((item) => {
      const status = String(item.delivery_status || 'pending').toLowerCase()

      return ['pending', 'preparing'].includes(status)
    }).length

    return { total, delivered, inTransit, pending }
  }, [deliveries])

  return (
    <div className="admin-deliveries-page">
      <header className="deliveries-page-header">
        <div className="deliveries-heading">
        </div>

        <button
          type="button"
          className="deliveries-refresh-button"
          onClick={() => loadDeliveries(true)}
          disabled={loading || refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? 'deliveries-spinning' : ''}
          />
          {refreshing ? 'Refreshing...' : 'Refresh Records'}
        </button>
      </header>

      <div className="deliveries-readonly-notice">
        <AlertCircle size={18} />
        <div>
          <strong>Read-only delivery records</strong>
          <p>
            To change a rider or update an order, open the corresponding
            order in Order Details.
          </p>
        </div>
      </div>

      <section className="deliveries-stats-grid">
        <article className="deliveries-stat-card">
          <div className="deliveries-stat-icon green">
            <Package size={21} />
          </div>

          <div className="deliveries-stat-content">
            <span>Total deliveries</span>
            <strong>{stats.total}</strong>
            <small>All recorded deliveries</small>
          </div>
        </article>

        <article className="deliveries-stat-card">
          <div className="deliveries-stat-icon amber">
            <Clock3 size={21} />
          </div>

          <div className="deliveries-stat-content">
            <span>Pending / Preparing</span>
            <strong>{stats.pending}</strong>
            <small>Awaiting delivery completion</small>
          </div>
        </article>

        <article className="deliveries-stat-card">
          <div className="deliveries-stat-icon blue">
            <Truck size={21} />
          </div>

          <div className="deliveries-stat-content">
            <span>Out for delivery</span>
            <strong>{stats.inTransit}</strong>
            <small>Currently on the way</small>
          </div>
        </article>

        <article className="deliveries-stat-card">
          <div className="deliveries-stat-icon purple">
            <CheckCircle2 size={21} />
          </div>

          <div className="deliveries-stat-content">
            <span>Delivered</span>
            <strong>{stats.delivered}</strong>
            <small>Successfully delivered</small>
          </div>
        </article>
      </section>

      <section className="deliveries-records-card">
        <div className="deliveries-records-header">
          <div>
            <h2>Delivery Records</h2>
            <p>
              {filteredDeliveries.length} record
              {filteredDeliveries.length !== 1 ? 's' : ''} displayed
            </p>
          </div>

          <div className="deliveries-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Search order, customer, rider..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search delivery records"
            />

            {searchTerm && (
              <button
                type="button"
                className="deliveries-clear-search"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="deliveries-error">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to load delivery records</strong>
              <p>{error}</p>

              <button
                type="button"
                onClick={() => loadDeliveries(true)}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="deliveries-state">
            <RefreshCw
              size={25}
              className="deliveries-spinning"
            />
            <p>Loading delivery records...</p>
          </div>
        ) : !error && filteredDeliveries.length === 0 ? (
          <div className="deliveries-state">
            <div className="deliveries-empty-icon">
              <ShoppingBag size={27} />
            </div>

            <h3>
              {searchTerm
                ? 'No matching deliveries'
                : 'No delivery records yet'}
            </h3>

            <p>
              {searchTerm
                ? 'Try searching with another order number, customer, or rider.'
                : 'Delivery records will appear here when available.'}
            </p>
          </div>
        ) : !error ? (
          <div className="deliveries-table-wrap">
            <table className="deliveries-table">
              <thead>
                <tr>
                  <th>Delivery / Order</th>
                  <th>Customer Information</th>
                  <th>Purchased Products</th>
                  <th>Total Amount</th>
                  <th>Assigned Rider</th>
                  <th>Delivery Status</th>
                  <th>Order Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr
                    key={
                      delivery.delivery_id ||
                      delivery.order_id
                    }
                  >
                    <td>
                      <div className="deliveries-id-cell">
                        <div className="deliveries-row-icon">
                          <Truck size={18} />
                        </div>

                        <div>
                          <strong>
                            D-{String(
                              delivery.delivery_id ?? '—'
                            ).padStart(4, '0')}
                          </strong>

                          <span>
                            Order #
                            {delivery.order_id ?? '—'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="deliveries-customer-cell">
                        <strong>
                          {delivery.customer_name ||
                            delivery.full_name ||
                            'Unknown customer'}
                        </strong>

                        <span>
                          <Phone size={13} />
                          {delivery.contact_number ||
                            'No contact number'}
                        </span>

                        <span className="deliveries-address">
                          <MapPin size={13} />
                          {delivery.delivery_address ||
                            'No address saved'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="deliveries-products-cell">
                        <div className="deliveries-products-heading">
                          <ShoppingBag size={15} />
                          <strong>Ordered items</strong>
                        </div>

                        <p>
                          {delivery.purchased_products ||
                            'Product details unavailable'}
                        </p>

                        {delivery.total_items != null && (
                          <span>
                            {delivery.total_items} total item(s)
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="deliveries-amount-cell">
                        <strong>
                          {formatCurrency(delivery.total_amount)}
                        </strong>
                        <span>Order total</span>
                      </div>
                    </td>

                    <td>
                      {delivery.rider_name ? (
                        <div className="deliveries-rider-cell">
                          <div className="deliveries-rider-avatar">
                            <UserRound size={17} />
                          </div>

                          <div>
                            <strong>{delivery.rider_name}</strong>

                            <span>
                              <Phone size={13} />
                              {delivery.rider_contact_number ||
                                'No contact number'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="deliveries-unassigned">
                          <UserRound size={15} />
                          No rider assigned
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`deliveries-status-badge ${getStatusClass(
                          delivery.delivery_status
                        )}`}
                      >
                        <span className="deliveries-status-dot" />
                        {formatStatus(delivery.delivery_status)}
                      </span>
                    </td>

                    <td>
                      <div className="deliveries-date-cell">
                        <CalendarDays size={15} />
                        <span>
                          {formatDate(
                            delivery.order_date ||
                              delivery.created_at
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && !error && deliveries.length > 0 && (
          <footer className="deliveries-table-footer">
            <span>
              Showing {filteredDeliveries.length} of {deliveries.length}{' '}
              delivery records
            </span>

            <span className="deliveries-footer-note">
              <CheckCircle2 size={15} />
              Display only
            </span>
          </footer>
        )}
      </section>

      <footer className="deliveries-page-footer">
        <div className="deliveries-footer-brand">
          <div className="deliveries-footer-logo"></div>
          <div>          
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AdminDeliveries
