import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  UserRound,
  X,
  Eye,
  MessageCircle,
  AlertCircle,
} from 'lucide-react'

import './AdminConsumers.css'

const API_ORIGIN = 'https://ani-malay-production.up.railway.app'
const API_URL = `${API_ORIGIN}/api`
const ONLINE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function getUsers(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getConsumerAvatarSrc(consumer) {
  const rawAvatar =
    consumer?.profile_picture ||
    consumer?.avatar ||
    consumer?.photo_url ||
    consumer?.profile_image ||
    consumer?.image_url ||
    ''

  const trimmed = String(rawAvatar || '').trim()
  if (!trimmed) return ''

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }

  return `${API_ORIGIN}/${trimmed.replace(/^\/+/, '')}`
}

function parseTimestamp(value) {
  if (!value) return null
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value
    return Number.isNaN(ms) ? null : ms
  }
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Offline'
  const diffMs = Math.max(0, Date.now() - timestamp)
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getPresenceInfo(consumer) {
  const activityTimestamp =
    parseTimestamp(consumer?.last_active_at) ??
    parseTimestamp(consumer?.last_seen) ??
    parseTimestamp(consumer?.last_seen_at) ??
    parseTimestamp(consumer?.last_online_at) ??
    parseTimestamp(consumer?.updated_at) ??
    null

  const explicitOnline =
    consumer?.is_online === true ||
    consumer?.is_online === 1 ||
    String(consumer?.is_online || '').toLowerCase() === 'true' ||
    consumer?.online === true ||
    consumer?.online === 1 ||
    String(consumer?.online_status || consumer?.presence || '').toLowerCase() ===
      'online'

  const explicitOffline =
    consumer?.is_online === false ||
    consumer?.is_online === 0 ||
    String(consumer?.is_online || '').toLowerCase() === 'false' ||
    String(consumer?.online_status || consumer?.presence || '').toLowerCase() ===
      'offline'

  const recentByTimestamp =
    activityTimestamp !== null &&
    Date.now() - activityTimestamp <= ONLINE_WINDOW_MS

  let isOnline = false
  if (explicitOffline) {
    isOnline = false
  } else if (explicitOnline) {
    isOnline = activityTimestamp === null ? true : recentByTimestamp
  } else {
    isOnline = recentByTimestamp
  }

  const sortTimestamp =
    activityTimestamp ?? parseTimestamp(consumer?.created_at) ?? 0

  return {
    isOnline,
    label: isOnline ? 'Online' : 'Offline',
    detail: isOnline
      ? activityTimestamp
        ? `Active (${formatRelativeTime(activityTimestamp)})`
        : 'Active now'
      : activityTimestamp
        ? `Last active ${formatRelativeTime(activityTimestamp)}`
        : 'Offline',
    sortTimestamp,
  }
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitials(name) {
  if (!name) return 'C'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function AdminConsumers() {
  const navigate = useNavigate()

  const [consumers, setConsumers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedConsumer, setSelectedConsumer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadConsumers = async (manual = false, silent = false) => {
    if (manual) setRefreshing(true)
    if (!silent && !manual) setLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/users?role=consumer`,
        { cache: 'no-store' }
      )

      if (!response.ok) {
        throw new Error('Unable to load consumer accounts.')
      }

      const data = await response.json()
      const users = getUsers(data)

      setConsumers(
        users.filter((user) => user.role === 'consumer')
      )

      setError('')
    } catch (err) {
      console.error('Consumers loading error:', err)
      if (!silent) {
        setError(
          'Unable to load consumer accounts. Please check your server connection.'
        )
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadConsumers()

    const interval = setInterval(() => {
      loadConsumers(false, true)
    }, 20000)

    return () => clearInterval(interval)
  }, [])

  const handleMessageConsumer = (consumer) => {
    if (!consumer?.user_id) return

    setSelectedConsumer(null)
    navigate(`/admin/messages?userId=${consumer.user_id}`, {
      state: {
        selectedUserId: consumer.user_id,
        consumerName: consumer.full_name || 'Unnamed Consumer',
        consumerEmail: consumer.email || '',
      },
    })
  }

  const filteredConsumers = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    const matches = !keyword
      ? consumers
      : consumers.filter((consumer) => {
          const searchable = [
            consumer.full_name,
            consumer.email,
            consumer.contact_number,
            consumer.address,
          ]

          return searchable.some((value) =>
            String(value || '').toLowerCase().includes(keyword)
          )
        })

    return [...matches].sort((a, b) => {
      const presenceA = getPresenceInfo(a)
      const presenceB = getPresenceInfo(b)

      if (presenceA.isOnline !== presenceB.isOnline) {
        return presenceA.isOnline ? -1 : 1
      }

      return presenceB.sortTimestamp - presenceA.sortTimestamp
    })
  }, [consumers, search])

  return (
    <div className="admin-page admin-consumers-content">
      <main className="admin-main">
        {/* SEARCH AND REFRESH */}

        <section className="consumers-toolbar">
          <div className="consumers-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or contact number..."
              aria-label="Search consumers"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="consumers-refresh-btn"
            onClick={() => loadConsumers(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'consumers-spinning' : ''}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </section>

        {error && (
          <div className="consumers-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* CONSUMERS TABLE */}

        <section className="consumers-table-panel">
          <div className="consumers-table-heading">
            <div>
              <h3>Registered Accounts</h3>
              <p>
                {filteredConsumers.length} consumer
                {filteredConsumers.length === 1 ? '' : 's'} found • Sorted by
                most recently active
              </p>
            </div>
          </div>

          {loading ? (
            <div className="consumers-empty-state">
              <RefreshCw size={25} className="consumers-spinning" />
              <p>Loading consumer accounts...</p>
            </div>
          ) : filteredConsumers.length === 0 ? (
            <div className="consumers-empty-state">
              <Users size={34} />
              <strong>
                {search ? 'No matching consumers' : 'No consumers registered yet'}
              </strong>
              <p>
                {search
                  ? 'Try searching with another name, email, or contact number.'
                  : 'Registered customer accounts will appear here.'}
              </p>
            </div>
          ) : (
            <div className="consumers-table-wrapper">
              <table className="consumers-table">
                <thead>
                  <tr>
                    <th>Consumer</th>
                    <th>Contact Information</th>
                    <th>Address</th>
                    <th>Date Registered</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredConsumers.map((consumer) => {
                    const avatarSrc = getConsumerAvatarSrc(consumer)
                    const presence = getPresenceInfo(consumer)

                    return (
                      <tr key={consumer.user_id}>
                        <td>
                          <div className="consumer-name-cell">
                            <div className="consumer-avatar">
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt={consumer.full_name || 'Consumer'}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: 'inherit',
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                getInitials(consumer.full_name)
                              )}
                            </div>

                            <div>
                              <strong>
                                {consumer.full_name || 'Unnamed Consumer'}
                              </strong>
                              <small>ID: #{consumer.user_id}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="consumer-contact-cell">
                            <span>
                              <Mail size={13} />
                              {consumer.email || 'No email'}
                            </span>
                            <span>
                              <Phone size={13} />
                              {consumer.contact_number || 'No contact number'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="consumer-address">
                            {consumer.address || 'No address provided'}
                          </span>
                        </td>

                        <td>{formatDate(consumer.created_at)}</td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                            }}
                          >
                            <span
                              className={`consumer-status ${
                                presence.isOnline ? 'active' : 'other'
                              }`}
                            >
                              {presence.label}
                            </span>
                            <small
                              style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                              }}
                            >
                              {presence.detail}
                            </small>
                          </div>
                        </td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <button
                              type="button"
                              className="consumer-view-btn"
                              onClick={() => setSelectedConsumer(consumer)}
                            >
                              <Eye size={15} />
                              View
                            </button>

                            <button
                              type="button"
                              className="consumer-message-btn"
                              onClick={() => handleMessageConsumer(consumer)}
                              title={`Message ${consumer.full_name || 'Consumer'}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 11px',
                                borderRadius: '8px',
                                border: '1px solid #16a34a',
                                backgroundColor: '#f0fdf4',
                                color: '#15803d',
                                fontWeight: 600,
                                fontSize: '0.84rem',
                                cursor: 'pointer',
                              }}
                            >
                              <MessageCircle size={15} />
                              Message
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* CONSUMER DETAILS MODAL */}

        {selectedConsumer && (() => {
          const modalAvatarSrc = getConsumerAvatarSrc(selectedConsumer)
          const modalPresence = getPresenceInfo(selectedConsumer)

          return (
            <div
              className="consumer-modal-overlay"
              onClick={() => setSelectedConsumer(null)}
            >
              <section
                className="consumer-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="consumer-modal-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="consumer-modal-header">
                  <div>
                    <h3 id="consumer-modal-title">Consumer Details</h3>
                    <p>Registered marketplace account information</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedConsumer(null)}
                    aria-label="Close details"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="consumer-modal-profile">
                  <div className="consumer-modal-avatar">
                    {modalAvatarSrc ? (
                      <img
                        src={modalAvatarSrc}
                        alt={selectedConsumer.full_name || 'Consumer'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 'inherit',
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      getInitials(selectedConsumer.full_name)
                    )}
                  </div>

                  <div>
                    <h4>
                      {selectedConsumer.full_name || 'Unnamed Consumer'}
                    </h4>
                    <span>Consumer ID: #{selectedConsumer.user_id}</span>
                  </div>
                </div>

                <div className="consumer-details-list">
                  <div>
                    <Mail size={17} />
                    <section>
                      <small>Email Address</small>
                      <strong>
                        {selectedConsumer.email || 'Not provided'}
                      </strong>
                    </section>
                  </div>

                  <div>
                    <Phone size={17} />
                    <section>
                      <small>Contact Number</small>
                      <strong>
                        {selectedConsumer.contact_number || 'Not provided'}
                      </strong>
                    </section>
                  </div>

                  <div>
                    <MapPin size={17} />
                    <section>
                      <small>Address</small>
                      <strong>
                        {selectedConsumer.address || 'Not provided'}
                      </strong>
                    </section>
                  </div>

                  <div>
                    <CalendarDays size={17} />
                    <section>
                      <small>Date Registered</small>
                      <strong>
                        {formatDate(selectedConsumer.created_at)}
                      </strong>
                    </section>
                  </div>

                  <div>
                    <UserRound size={17} />
                    <section>
                      <small>Live Presence</small>
                      <strong>
                        {modalPresence.label} ({modalPresence.detail})
                      </strong>
                    </section>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleMessageConsumer(selectedConsumer)}
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#15803d',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <MessageCircle size={16} />
                    Message Consumer
                  </button>

                  <button
                    type="button"
                    className="consumer-modal-close-btn"
                    onClick={() => setSelectedConsumer(null)}
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>
          )
        })()}
      </main>
    </div>
  )
}

export default AdminConsumers