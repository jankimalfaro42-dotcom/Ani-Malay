import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useEffect, useRef, useState } from 'react'

import {
  MessageCircle,
  Star,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Bell,
  Check,
  Home as HomeIcon,
  ShoppingBag,
  ClipboardList,
  UserRound,
} from 'lucide-react'

import Home from './pages/Home'
import Products from './pages/products'
import Login from './pages/Login'
import Register from './pages/Register'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import About from './pages/About'
import Crops from './pages/Crops'
import Livestock from './pages/Livestock'
import Fisheries from './pages/Fisheries'

import MyAccount from './pages/MyAccount'
import ChangePassword from './pages/ChangePassword'
import ForgotPassword from './pages/ForgotPassword'
import ForgotPasswordVerify from './pages/ForgotPasswordVerify'
import ForgotPasswordReset from './pages/ForgotPasswordReset'
import EditProfile from './pages/EditProfile'
import Messages from './pages/Messages'
import Feedback from './pages/Feedback'

import Admin from './pages/Admin/Admin'
import AdminProducts from './pages/Admin/AdminProducts'
import AdminArchivedProducts from './pages/Admin/AdminArchivedProducts'
import AdminOrders from './pages/Admin/AdminOrders'
import AdminOrderDetails from './pages/Admin/AdminOrderDetails'
import AdminDeliveries from './pages/Admin/AdminDeliveries'
import AdminFeedbacks from './pages/Admin/AdminFeedbacks'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminMessages from './pages/Admin/Admin.Messages'
import AdminLogin from './pages/Admin/Adminlogin'
import AdminSettings from './pages/Admin/AdminSettings'
import LoadingScreen from './pages/LoadingScreen'
import AdminConsumers from './pages/Admin/AdminConsumers'

import AdminRoute from './AdminRoute'

import './pages/Admin/AdminOrderDetails.css'
import './ToastNotification.css'
import './pages/NotificationBell.css'
import './App.css'

const API_URL = 'https://ani-malay-production.up.railway.app'

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()

  // =====================================
  // GLOBAL TOAST NOTIFICATION
  // =====================================

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    const handleNotification = (event) => {
      const {
        type = 'success',
        title = 'Success',
        message = '',
        duration = 3200,
      } = event.detail || {}

      clearTimeout(toastTimer.current)

      setToast({
        type,
        title,
        message,
      })

      toastTimer.current = setTimeout(() => {
        setToast(null)
      }, duration)
    }

    window.addEventListener('aniMalayToast', handleNotification)

    return () => {
      window.removeEventListener('aniMalayToast', handleNotification)
      clearTimeout(toastTimer.current)
    }
  }, [])

  const closeToast = () => {
    clearTimeout(toastTimer.current)
    setToast(null)
  }

  // =====================================
  // SESSION CLEANUP ON 401
  // =====================================

  const clearInvalidSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCartCount(0)
    setMessageUnreadCount(0)
    setNotifications([])
    setUnreadCount(0)
    setShowNotifications(false)
  }

  // =====================================
  // CONNECTION STATUS
  // =====================================

  const [isConnected, setIsConnected] = useState(true)
  const [connectionChecked, setConnectionChecked] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const checkingConnection = useRef(false)

  const checkConnection = async () => {
    if (!navigator.onLine) {
      setIsConnected(false)
      setConnectionChecked(true)
      return
    }

    if (checkingConnection.current) return

    checkingConnection.current = true

    const controller = new AbortController()

    const timeout = setTimeout(() => {
      controller.abort()
    }, 2500)

    try {
      const response = await fetch(`${API_URL}/`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })

      setIsConnected(response.ok)
    } catch (error) {
      setIsConnected(false)
    } finally {
      clearTimeout(timeout)
      checkingConnection.current = false
      setConnectionChecked(true)
    }
  }

  useEffect(() => {
    checkConnection()

    const interval = setInterval(checkConnection, 3000)

    const handleOnline = () => checkConnection()

    const handleOffline = () => {
      setIsConnected(false)
      setConnectionChecked(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // INITIAL LOADING SCREEN TIMER
  useEffect(() => {
    if (!connectionChecked) return

    const timer = setTimeout(() => {
      setIsInitialLoading(false)
    }, 4000)

    return () => clearTimeout(timer)
  }, [connectionChecked])

  // =====================================
  // LOGIN LOADING
  // =====================================

  const [isLoginLoading, setIsLoginLoading] = useState(false)

  useEffect(() => {
    let loginTimer

    const handleLoginSuccess = () => {
      setIsLoginLoading(true)

      clearTimeout(loginTimer)

      loginTimer = setTimeout(() => {
        setIsLoginLoading(false)
      }, 4000)
    }

    window.addEventListener('aniMalayLoginSuccess', handleLoginSuccess)

    return () => {
      window.removeEventListener('aniMalayLoginSuccess', handleLoginSuccess)
      clearTimeout(loginTimer)
    }
  }, [])

  // =====================================
  // LOGIN INFORMATION
  // =====================================

  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  let user = null

  if (storedUser) {
    try {
      user = JSON.parse(storedUser)
    } catch (error) {
      console.error('User data error:', error)
      user = null
    }
  }

  const isLoggedIn = Boolean(token && user)
  const isAdmin = user?.role === 'admin'

  const isAdminLoginPage = location.pathname === '/admin/login'

  const isAdminPage =
    location.pathname === '/admin' ||
    (
      location.pathname.startsWith('/admin/') &&
      !isAdminLoginPage
    )

  // LOADING SCREEN CONDITIONS
  const showLoadingScreen =
    isInitialLoading ||
    isLoginLoading ||
    (
      isAdminPage &&
      connectionChecked &&
      !isConnected
    )

  // =====================================
  // CART COUNT
  // =====================================

  const [cartCount, setCartCount] = useState(0)

  const fetchCartCount = async () => {
    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')

    if (!savedUser || !savedToken) {
      setCartCount(0)
      return
    }

    try {
      const currentUser = JSON.parse(savedUser)

      if (
        !currentUser.user_id ||
        currentUser.role !== 'consumer'
      ) {
        setCartCount(0)
        return
      }

      const response = await fetch(
        `${API_URL}/api/cart/${currentUser.user_id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      )

      if (response.status === 401) {
        clearInvalidSession()
        return
      }

      if (!response.ok) {
        setCartCount(0)
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        setCartCount(0)
        return
      }

      const totalQuantity = data.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      )

      setCartCount(totalQuantity)
    } catch (error) {
      console.error('Cart count error:', error)
      setCartCount(0)
    }
  }

  useEffect(() => {
    fetchCartCount()
  }, [user?.user_id, token])

  useEffect(() => {
    const handleCartUpdated = () => fetchCartCount()

    window.addEventListener('cartUpdated', handleCartUpdated)

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated)
    }
  }, [])

  useEffect(() => {
    fetchCartCount()
  }, [location.pathname])

  // =====================================
  // CONSUMER MESSAGES UNREAD COUNT
  // =====================================

  const [messageUnreadCount, setMessageUnreadCount] = useState(0)

  const fetchMessageUnreadCount = async () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (!savedToken || !savedUser) {
      setMessageUnreadCount(0)
      return
    }

    try {
      const currentUser = JSON.parse(savedUser)

      if (
        !currentUser.user_id ||
        currentUser.role === 'admin'
      ) {
        setMessageUnreadCount(0)
        return
      }

      const response = await fetch(
        `${API_URL}/api/messages/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      )

      if (response.status === 401) {
        clearInvalidSession()
        return
      }

      if (!response.ok) return

      const data = await response.json()

      setMessageUnreadCount(
        Number(data.unread_count || 0)
      )
    } catch (error) {
      console.error('Message unread count error:', error)
    }
  }

  useEffect(() => {
    if (!isLoggedIn || isAdmin) {
      setMessageUnreadCount(0)
      return
    }

    fetchMessageUnreadCount()

    const interval = setInterval(
      fetchMessageUnreadCount,
      15000
    )

    return () => clearInterval(interval)
  }, [isLoggedIn, isAdmin, user?.user_id])

  useEffect(() => {
    if (location.pathname === '/messages') {
      fetchMessageUnreadCount()
    }
  }, [location.pathname])

  useEffect(() => {
    const handleMessagesUpdated = () => {
      fetchMessageUnreadCount()
    }

    window.addEventListener(
      'messagesUpdated',
      handleMessagesUpdated
    )

    return () => {
      window.removeEventListener(
        'messagesUpdated',
        handleMessagesUpdated
      )
    }
  }, [])

  // =====================================
  // CONSUMER NOTIFICATIONS
  // =====================================

  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  const fetchNotifications = async () => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (!savedToken || !savedUser) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    try {
      const currentUser = JSON.parse(savedUser)

      if (!currentUser.user_id || currentUser.role === 'admin') {
        setNotifications([])
        setUnreadCount(0)
        return
      }

      const headers = {
        Authorization: `Bearer ${savedToken}`,
      }

      const [notificationsResponse, countResponse] = await Promise.all([
        fetch(`${API_URL}/api/notifications`, { headers }),
        fetch(`${API_URL}/api/notifications/unread-count`, {
          headers,
        }),
      ])

      if (
        notificationsResponse.status === 401 ||
        countResponse.status === 401
      ) {
        clearInvalidSession()
        return
      }

      if (!notificationsResponse.ok || !countResponse.ok) return

      const notificationData = await notificationsResponse.json()
      const countData = await countResponse.json()

      setNotifications(
        Array.isArray(notificationData) ? notificationData : []
      )

      setUnreadCount(Number(countData.unread_count || 0))
    } catch (error) {
      console.error('Notification fetch error:', error)
    }
  }

  useEffect(() => {
    if (!isLoggedIn || isAdmin) {
      setNotifications([])
      setUnreadCount(0)
      setShowNotifications(false)
      return
    }

    fetchNotifications()

    const interval = setInterval(fetchNotifications, 15000)

    return () => clearInterval(interval)
  }, [isLoggedIn, isAdmin, user?.user_id])

  // MARK ONE NOTIFICATION AS READ
  const handleMarkAsRead = async (notificationId) => {
    const savedToken = localStorage.getItem('token')

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      )

      if (response.status === 401) {
        clearInvalidSession()
        return
      }

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Mark notification as read error:', error)
    }
  }

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    const savedToken = localStorage.getItem('token')

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/read-all`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      )

      if (response.status === 401) {
        clearInvalidSession()
        return
      }

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error('Mark all notifications as read error:', error)
    }
  }

  // =====================================
  // REQUIRE CONSUMER LOGIN FOR HEADER ICONS
  // =====================================

  const requireConsumerLogin = (featureName) => {
    if (!isLoggedIn) {
      window.dispatchEvent(
        new CustomEvent('aniMalayToast', {
          detail: {
            type: 'warning',
            title: 'Login Required',
            message: `Please login first to access your ${featureName}.`,
          },
        })
      )
      navigate('/login')
      return false
    }

    if (isAdmin) {
      window.dispatchEvent(
        new CustomEvent('aniMalayToast', {
          detail: {
            type: 'warning',
            title: 'Consumer Account Required',
            message: `Please use a consumer account to access ${featureName}.`,
          },
        })
      )
      return false
    }

    return true
  }

  // =====================================
  // NOTIFICATION DROPDOWN
  // =====================================

  const notificationBell = !isAdmin ? (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-bell-btn"
        onClick={() => {
          if (!requireConsumerLogin('notifications')) return
          setShowNotifications((prev) => !prev)
        }}
        title="Notifications"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={showNotifications}
      >
        <Bell size={22} />

        {isLoggedIn && unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isLoggedIn && showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>
              <span>{unreadCount} unread</span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
              >
                <Check size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={30} />
                <p>No notifications yet</p>
                <span>Order updates will appear here.</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.notification_id}
                  className={`notification-item ${
                    Number(notification.is_read) === 0
                      ? 'unread'
                      : ''
                  }`}
                  onClick={() => {
                    if (Number(notification.is_read) === 0) {
                      handleMarkAsRead(
                        notification.notification_id
                      )
                    }

                    setShowNotifications(false)
                    navigate('/orders')
                  }}
                >
                  <div className="notification-item-icon">
                    <Bell size={18} />
                  </div>

                  <div className="notification-item-content">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <span>
                      {new Date(
                        notification.created_at
                      ).toLocaleString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {Number(notification.is_read) === 0 && (
                    <span className="notification-unread-dot" />
                  )}
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            className="notification-view-orders"
            onClick={() => {
              setShowNotifications(false)
              navigate('/orders')
            }}
          >
            View My Orders
          </button>
        </div>
      )}
    </div>
  ) : null

  // =====================================
  // LOGOUT
  // =====================================

  const handleLogout = () => {
    clearInvalidSession()
    window.location.href = '/login'
  }

  // =====================================
  // NAVBAR CONDITIONS
  // =====================================

  const isAuthPage = [
    '/login',
    '/register',
    '/forgot-password',
    '/forgot-password/verify',
    '/forgot-password/reset',
    '/admin/login',
  ].includes(location.pathname)

  const showPublicNavbar = !isAdminPage && !isAuthPage

  const showHomeBottomNav = showPublicNavbar

  // =====================================
  // LOADING SCREEN
  // =====================================

  if (showLoadingScreen) {
    return (
      <LoadingScreen
        isOffline={
          isAdminPage &&
          connectionChecked &&
          !isConnected
        }
      />
    )
  }

  // =====================================
  // MAIN APP
  // =====================================

  return (
    <div className="app">

      {showPublicNavbar && (
        <nav className="home-navbar">
          <Link
            to="/"
            className="home-navbar-brand"
            aria-label="Ani-Malay Home"
          >
            <img
              src="/logo.jpg"
              alt="Ani-Malay Logo"
              className="home-navbar-logo"
            />

            <span>Ani-Malay</span>
          </Link>

          <div className="home-navbar-actions">

            {!isAdmin && (
              <button
                type="button"
                className="home-header-icon message-icon-link"
                title="Messages"
                aria-label={`Messages, ${messageUnreadCount} unread`}
                onClick={() => {
                  if (!requireConsumerLogin('messages')) return
                  navigate('/messages')
                }}
              >
                <MessageCircle size={22} />

                {isLoggedIn && messageUnreadCount > 0 && (
                  <span className="message-unread-count">
                    {messageUnreadCount > 99
                      ? '99+'
                      : messageUnreadCount}
                  </span>
                )}
              </button>
            )}

            {notificationBell}

            {!isAdmin && (
              <button
                type="button"
                className="home-header-icon cart-button"
                aria-label={`Shopping Cart, ${cartCount} items`}
                title="Cart"
                onClick={() => {
                  if (!requireConsumerLogin('cart')) return
                  navigate('/cart')
                }}
              >
                <ShoppingBag size={22} />

                {isLoggedIn && cartCount > 0 && (
                  <span className="cart-count">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}

          </div>
        </nav>
      )}

      {toast && (
        <div
          className={`ani-toast ani-toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <div className="ani-toast-icon">
            {toast.type === 'success' && <CheckCircle size={23} />}
            {toast.type === 'error' && <AlertCircle size={23} />}
            {toast.type === 'warning' && <AlertTriangle size={23} />}
            {toast.type === 'info' && <Info size={23} />}
          </div>

          <div className="ani-toast-content">
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>

          <button
            type="button"
            className="ani-toast-close"
            onClick={closeToast}
            aria-label="Close notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className={showPublicNavbar ? 'public-content' : ''}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/crops" element={<Crops />} />
          <Route path="/products" element={<Products />} />
          <Route path="/livestock" element={<Livestock />} />
          <Route path="/fisheries" element={<Fisheries />} />
          <Route path="/about" element={<About />} />

          <Route path="/feedback" element={<Feedback />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />

          <Route path="/my-account" element={<MyAccount />} />

          <Route
            path="/my-account/edit-profile"
            element={<EditProfile />}
          />

          <Route
            path="/change-password"
            element={<ChangePassword />}
          />

          <Route path="/messages" element={<Messages />} />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/forgot-password/verify"
            element={<ForgotPasswordVerify />}
          />

          <Route
            path="/forgot-password/reset"
            element={<ForgotPasswordReset />}
          />

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Admin />} />

            <Route path="products" element={<AdminProducts />} />

            <Route
              path="archived-products"
              element={<AdminArchivedProducts />}
            />

            <Route path="orders" element={<AdminOrders />} />

            <Route
              path="orders/:id"
              element={<AdminOrderDetails />}
            />

            <Route
              path="deliveries"
              element={<AdminDeliveries />}
            />

            <Route
              path="feedbacks"
              element={<AdminFeedbacks />}
            />

            <Route
              path="consumers"
              element={<AdminConsumers />}
            />

            <Route
              path="messages"
              element={<AdminMessages />}
            />

            <Route
              path="settings"
              element={<AdminSettings />}
            />
          </Route>
        </Routes>
      </div>

      {showHomeBottomNav && (
        <nav className="home-bottom-nav">

          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `home-bottom-link ${isActive ? 'active' : ''}`
            }
          >
            <HomeIcon size={21} />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/products"
            className={({ isActive }) =>
              `home-bottom-link ${isActive ? 'active' : ''}`
            }
          >
            <ShoppingBag size={21} />
            <span>Shop</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `home-bottom-link ${isActive ? 'active' : ''}`
            }
          >
            <ClipboardList size={21} />
            <span>Orders</span>
          </NavLink>

          <NavLink
            to="/feedback"
            className={({ isActive }) =>
              `home-bottom-link ${isActive ? 'active' : ''}`
            }
          >
            <Star size={21} />
            <span>Feedback</span>
          </NavLink>

          <NavLink
            to="/my-account"
            className={({ isActive }) =>
              `home-bottom-link ${isActive ? 'active' : ''}`
            }
          >
            <UserRound size={21} />
            <span>Account</span>
          </NavLink>

        </nav>
      )}

    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App