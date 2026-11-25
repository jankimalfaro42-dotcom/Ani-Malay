import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Archive,
  LogOut,
  Truck,
  MessageCircle,
  MessageSquare,
  QrCode,
  Menu,
  X,
  Users,
  Settings,
} from 'lucide-react'

import './AdminLayout.css'

const BASE_API_URL = 'https://ani-malay-production.up.railway.app/api'
const API_URL = `${BASE_API_URL}/messages`

function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  const token = localStorage.getItem('token')

  // ADMIN ONLINE HEARTBEAT
  useEffect(() => {
    if (!token) return

    let isMounted = true

    const sendHeartbeat = async () => {
      try {
        await fetch(`${API_URL}/presence`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (error) {
        if (isMounted) {
          console.error('Admin presence update failed:', error)
        }
      }
    }

    sendHeartbeat()

    const heartbeatInterval = setInterval(
      sendHeartbeat,
      15000
    )

    return () => {
      isMounted = false
      clearInterval(heartbeatInterval)

      fetch(`${API_URL}/presence/offline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
      }).catch(() => {})
    }
  }, [token])

  // NEW / PENDING ORDERS BADGE COUNT
  useEffect(() => {
    if (!token) return

    let isMounted = true

    const fetchPendingOrdersCount = async () => {
      try {
        const res = await fetch(`${BASE_API_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) return

        const data = await res.json()
        const ordersList = Array.isArray(data)
          ? data
          : Array.isArray(data.orders)
          ? data.orders
          : []

        const count = ordersList.filter(
          (order) =>
            String(order.status || order.order_status || '').toLowerCase() === 'pending'
        ).length

        if (isMounted) {
          setPendingOrdersCount(count)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch pending orders count:', error)
        }
      }
    }

    fetchPendingOrdersCount()

    const interval = setInterval(fetchPendingOrdersCount, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [token])

  // UNREAD / NEW MESSAGES BADGE COUNT
  useEffect(() => {
    if (!token) return

    let isMounted = true

    const fetchUnreadMessagesCount = async () => {
      try {
        const res = await fetch(`${API_URL}/conversations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) return

        const data = await res.json()

        let totalUnread = 0

        if (typeof data?.unreadCount === 'number') {
          totalUnread = data.unreadCount
        } else if (typeof data?.unread_count === 'number') {
          totalUnread = data.unread_count
        } else {
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.conversations)
            ? data.conversations
            : Array.isArray(data?.messages)
            ? data.messages
            : []

          totalUnread = list.reduce((sum, item) => {
            const itemUnread = Number(
              item.unread_count ?? item.unreadCount ?? 0
            )
            if (itemUnread > 0) return sum + itemUnread

            const isUnread =
              item.is_read === 0 ||
              item.is_read === false ||
              item.read === false ||
              String(item.status || '').toLowerCase() === 'unread'

            return sum + (isUnread ? 1 : 0)
          }, 0)
        }

        if (isMounted) {
          setUnreadMessagesCount(totalUnread)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch unread messages count:', error)
        }
      }
    }

    fetchUnreadMessagesCount()

    const interval = setInterval(fetchUnreadMessagesCount, 15000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [token])

  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/admin/consumers',
      label: 'Consumers',
      icon: Users,
    },
    {
      to: '/admin/products',
      label: 'Products',
      icon: Package,
    },
    {
      to: '/admin/archived-products',
      label: 'Archived Products',
      icon: Archive,
    },
    {
      to: '/admin/orders',
      label: 'Orders',
      icon: ShoppingCart,
      badge: pendingOrdersCount,
    },
    {
      to: '/admin/deliveries',
      label: 'Deliveries',
      icon: Truck,
    },
    {
      to: '/admin/gcash-qr',
      label: 'GCash QR Management',
      icon: QrCode,
    },
    {
      to: '/admin/messages',
      label: 'Messages',
      icon: MessageCircle,
      badge: unreadMessagesCount,
    },
    {
      to: '/admin/feedbacks',
      label: 'Feedbacks',
      icon: MessageSquare,
    },
    {
      to: '/admin/settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const handleLogout = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to log out?'
    )

    if (!confirmed) return

    try {
      if (token) {
        await fetch(`${API_URL}/presence/offline`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error('Unable to update Admin status:', error)
    }

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    window.location.href = '/login'
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  return (
    <div className="admin-layout">

      {/* MOBILE TOPBAR */}
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="admin-mobile-brand">
          <img src="/logo.jpg" alt="Ani-Malay" />
          <span>Ani-Malay Admin</span>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          onClick={closeMenu}
          aria-label="Close navigation menu"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`admin-layout-sidebar ${
          menuOpen ? 'mobile-open' : ''
        }`}
      >

        {/* ANIMATED PALAY */}
        <div
          className="admin-rice-decoration"
          aria-hidden="true"
        >
          <span className="admin-rice-stalk admin-rice-left">
            🌾
          </span>

          <span className="admin-rice-stalk admin-rice-center">
            🌾
          </span>

          <span className="admin-rice-stalk admin-rice-right">
            🌾
          </span>
        </div>

        {/* ANI-MALAY LOGO */}
        <div className="admin-layout-logo">
          <img
            src="/logo.jpg"
            alt="Ani-Malay Logo"
            className="admin-layout-logo-image"
          />

          <button
            type="button"
            className="admin-sidebar-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="admin-layout-nav">
          <span className="admin-layout-nav-label">
            WORKSPACE
          </span>

          {navItems.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `admin-layout-nav-item${isActive ? ' active' : ''}`
              }
            >
              <Icon size={19} />
              <span className="admin-nav-label-text">{label}</span>
              {badge > 0 && (
                <span
                  className="admin-nav-badge"
                  aria-label={`${badge} unread`}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* SIDEBAR BOTTOM */}
        <div className="admin-layout-sidebar-bottom">
          <button
            type="button"
            className="admin-layout-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-layout-content">
        <Outlet />
      </main>

    </div>
  )
}

export default AdminLayout