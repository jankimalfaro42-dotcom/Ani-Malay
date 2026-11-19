
import { useCallback, useEffect, useState } from 'react'
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Archive,
  BarChart3,
  Eye,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import './Admin.css'

const API_URL = 'http://localhost:5000/api'
const REFRESH_INTERVAL = 30000

function getArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.orders)) return data.orders
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data?.bestSelling)) return data.bestSelling
  if (Array.isArray(data?.monthlySales)) return data.monthlySales
  return []
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getBestSellingQuantity(product) {
  return Number(
    product.total_quantity ??
    product.total_sold ??
    product.quantity_sold ??
    product.totalQuantity ??
    product.quantity ??
    0
  )
}

function getBestSellingSales(product) {
  return Number(
    product.total_sales ??
    product.total_revenue ??
    product.sales ??
    product.subtotal ??
    0
  )
}

function getMonthlyAmount(item) {
  return Number(
    item.total_sales ??
    item.total_amount ??
    item.sales ??
    item.revenue ??
    0
  )
}

function getMonthLabel(item) {
  if (item.month_name) return item.month_name
  if (item.month_label) return item.month_label
  if (item.month_year) return item.month_year
  if (item.period) return item.period

  if (item.month && typeof item.month === 'string') {
    return item.month
  }

  if (item.month_number) {
    return new Date(
      Number(item.year) || new Date().getFullYear(),
      Number(item.month_number) - 1
    ).toLocaleDateString('en-PH', { month: 'short' })
  }

  return 'Month'
}

function Admin() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [bestSelling, setBestSelling] = useState([])
  const [monthlySales, setMonthlySales] = useState([])

  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchEndpoint = async (endpoint) => {
    const response = await fetch(`${API_URL}${endpoint}`)

    if (!response.ok) {
      throw new Error(`Unable to load ${endpoint}`)
    }

    return response.json()
  }

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true)
    }

    try {
      const results = await Promise.allSettled([
        fetchEndpoint('/products'),
        fetchEndpoint('/orders'),
        fetchEndpoint('/users'),
        fetchEndpoint('/reports/best-selling'),
        fetchEndpoint('/reports/monthly-sales'),
      ])

      const [productResult, orderResult, userResult, bestResult, monthlyResult] =
        results

      const failedRequests = []

      if (productResult.status === 'fulfilled') {
        setProducts(getArray(productResult.value))
      } else {
        failedRequests.push('products')
      }

      if (orderResult.status === 'fulfilled') {
        setOrders(getArray(orderResult.value))
      } else {
        failedRequests.push('orders')
      }

      if (userResult.status === 'fulfilled') {
        setUsers(getArray(userResult.value))
      } else {
        failedRequests.push('users')
      }

      if (bestResult.status === 'fulfilled') {
        setBestSelling(getArray(bestResult.value))
      } else {
        setBestSelling([])
        failedRequests.push('best-selling report')
      }

      if (monthlyResult.status === 'fulfilled') {
        setMonthlySales(getArray(monthlyResult.value))
      } else {
        setMonthlySales([])
        failedRequests.push('monthly sales report')
      }

      if (failedRequests.length > 0) {
        setError(
          `Some dashboard information could not be loaded: ${failedRequests.join(', ')}.`
        )
      } else {
        setError('')
      }

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Unable to connect to the Ani-Malay server.')
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()

    const interval = setInterval(() => {
      loadDashboard()
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [loadDashboard])

  const activeProducts = products.filter(
    (product) => product.status !== 'archived'
  )

  const totalProducts = activeProducts.length

  const totalConsumers = users.filter(
    (user) => user.role === 'consumer'
  ).length

  const pendingOrders = orders.filter(
    (order) => order.status === 'pending'
  ).length

  const completedOrders = orders.filter(
    (order) => order.status === 'completed'
  ).length

  const totalSales = orders
    .filter((order) => order.status === 'completed')
    .reduce(
      (total, order) =>
        total + Number(order.product_amount ?? order.total_amount ?? 0),
      0
    )

  const lowStockProducts = activeProducts.filter(
    (product) => Number(product.stock_quantity) <= 10
  )

  const recentOrders = [...orders]
    .sort((a, b) => {
      return new Date(b.order_date) - new Date(a.order_date)
    })
    .slice(0, 5)

  const topProducts = [...bestSelling]
    .sort((a, b) => getBestSellingQuantity(b) - getBestSellingQuantity(a))
    .slice(0, 5)

  const maxMonthlySales = Math.max(
    ...monthlySales.map(getMonthlyAmount),
    1
  )

  if (initialLoading) {
    return (
      <div className="admin-page admin-dashboard-content">
        <main className="admin-main">
          <div className="admin-dashboard-loading">
            <RefreshCw size={25} className="admin-refresh-spinning" />
            <p>Loading dashboard data...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-page admin-dashboard-content">
      <main className="admin-main">

        {/* REFRESH TOOLBAR */}
        <div className="admin-dashboard-toolbar">
          <div className="admin-dashboard-update">
            <span className="admin-live-dot" />
            <div>
              <strong>Dashboard is up to date</strong>
              <small>
                {lastUpdated
                  ? `Last updated: ${lastUpdated.toLocaleTimeString('en-PH')}`
                  : 'Waiting for updates'}
              </small>
            </div>
          </div>

          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'admin-refresh-spinning' : ''}
            />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {error && (
          <div className="admin-dashboard-error">
            <AlertTriangle size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* STATISTICS */}
        <section className="admin-stats">

          <div className="admin-stat-card">
            <div className="admin-stat-icon green">
              <Users size={22} />
            </div>
            <div>
              <span>Registered Consumers</span>
              <h2>{totalConsumers}</h2>
              <small>Consumer accounts</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon blue">
              <Package size={22} />
            </div>
            <div>
              <span>Active Products</span>
              <h2>{totalProducts}</h2>
              <small>Available product listings</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon orange">
              <ShoppingCart size={22} />
            </div>
            <div>
              <span>Total Orders</span>
              <h2>{orders.length}</h2>
              <small>All recorded orders</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon yellow">
              <Clock size={22} />
            </div>
            <div>
              <span>Pending Orders</span>
              <h2>{pendingOrders}</h2>
              <small>Awaiting confirmation</small>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon purple">
              <TrendingUp size={22} />
            </div>
            <div>
              <span>Product Sales</span>
              <h2>{formatCurrency(totalSales)}</h2>
              <small>Completed orders only</small>
            </div>
          </div>

        </section>

        {/* MAIN DASHBOARD GRID */}
        <div className="admin-dashboard-grid">

          {/* RECENT ORDERS */}
          <section className="admin-panel admin-recent-orders">
            <div className="admin-panel-header">
              <div>
                <h3>Recent Orders</h3>
                <p>Latest customer transactions</p>
              </div>

              <Link to="/admin/orders" className="admin-panel-link">
                View All <Eye size={15} />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="admin-empty-state">
                <ShoppingCart size={30} />
                <p>No orders available yet.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.order_id}>
                        <td>
                          <Link
                            to={`/admin/orders/${order.order_id}`}
                            className="admin-order-link"
                          >
                            #{order.order_id}
                          </Link>
                        </td>
                        <td>{order.full_name || 'Customer'}</td>
                        <td>
                          {formatCurrency(
                            order.total_amount ?? order.product_amount
                          )}
                        </td>
                        <td>
                          <span
                            className={`admin-status ${String(
                              order.status || 'pending'
                            ).toLowerCase()}`}
                          >
                            {String(order.status || 'pending').replaceAll(
                              '_',
                              ' '
                            )}
                          </span>
                        </td>
                        <td>{formatDate(order.order_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* LOW STOCK */}
          <section className="admin-panel admin-low-stock">
            <div className="admin-panel-header">
              <div>
                <h3>Low Stock Products</h3>
                <p>Products with 10 or fewer stocks</p>
              </div>

              <AlertTriangle size={20} color="#d58b25" />
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="admin-empty-state">
                <CheckCircle size={30} />
                <p>All products have sufficient stock.</p>
              </div>
            ) : (
              <div className="low-stock-list">
                {lowStockProducts.slice(0, 6).map((product) => (
                  <div
                    className="low-stock-item"
                    key={product.product_id}
                  >
                    <div className="low-stock-product">
                      <strong>{product.product_name}</strong>
                      <small>{product.category_name || 'Product'}</small>
                    </div>

                    <span className="low-stock-count">
                      {product.stock_quantity} left
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Link to="/admin/products" className="admin-panel-bottom-link">
              Manage Products
            </Link>
          </section>

          {/* BEST SELLING PRODUCTS */}
          <section className="admin-panel admin-best-selling">
            <div className="admin-panel-header">
              <div>
                <h3>Best-Selling Products</h3>
                <p>Top products based on completed orders</p>
              </div>

              <TrendingUp size={20} color="#2d7752" />
            </div>

            {topProducts.length === 0 ? (
              <div className="admin-empty-state">
                <BarChart3 size={30} />
                <p>No completed product sales yet.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Quantity Sold</th>
                      <th>Product Sales</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={product.product_id || index}>
                        <td>
                          <span className="admin-best-rank">
                            {index + 1}
                          </span>
                        </td>
                        <td>
                          <strong>
                            {product.product_name || 'Product'}
                          </strong>
                        </td>
                        <td>{getBestSellingQuantity(product)}</td>
                        <td>
                          {formatCurrency(getBestSellingSales(product))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* MONTHLY SALES */}
          <section className="admin-panel admin-monthly-sales">
            <div className="admin-panel-header">
              <div>
                <h3>Monthly Product Sales</h3>
                <p>Sales from completed orders</p>
              </div>

              <BarChart3 size={20} color="#2d7752" />
            </div>

            {monthlySales.length === 0 ? (
              <div className="admin-empty-state">
                <BarChart3 size={30} />
                <p>No monthly sales data available.</p>
              </div>
            ) : (
              <div className="admin-monthly-chart">
                {monthlySales.slice(-6).map((item, index) => {
                  const amount = getMonthlyAmount(item)
                  const height = Math.max(
                    (amount / maxMonthlySales) * 100,
                    amount > 0 ? 5 : 0
                  )

                  return (
                    <div className="admin-chart-column" key={index}>
                      <strong>{formatCurrency(amount)}</strong>

                      <div className="admin-chart-track">
                        <div
                          className="admin-chart-bar"
                          style={{ height: `${height}%` }}
                        />
                      </div>

                      <span>{getMonthLabel(item)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>

        {/* QUICK OVERVIEW */}
        <section className="admin-panel admin-overview">
          <div className="admin-panel-header">
            <div>
              <h3>Marketplace Overview</h3>
              <p>Quick summary of your marketplace activity</p>
            </div>
          </div>

          <div className="admin-overview-grid">

            <div className="admin-overview-item">
              <div className="admin-overview-icon">
                <Users size={20} />
              </div>
              <div>
                <span>Registered Consumers</span>
                <strong>{totalConsumers}</strong>
              </div>
            </div>

            <div className="admin-overview-item">
              <div className="admin-overview-icon">
                <CheckCircle size={20} />
              </div>
              <div>
                <span>Completed Orders</span>
                <strong>{completedOrders}</strong>
              </div>
            </div>

            <div className="admin-overview-item">
              <div className="admin-overview-icon">
                <AlertTriangle size={20} />
              </div>
              <div>
                <span>Low Stock Products</span>
                <strong>{lowStockProducts.length}</strong>
              </div>
            </div>

            <div className="admin-overview-item">
              <div className="admin-overview-icon">
                <Archive size={20} />
              </div>
              <div>
                <span>Archived Products</span>
                <strong>
                  {products.filter(
                    (product) => product.status === 'archived'
                  ).length}
                </strong>
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  )
}

export default Admin
