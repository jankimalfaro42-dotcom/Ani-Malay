
import { useEffect, useMemo, useState } from 'react'
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
  AlertCircle,
} from 'lucide-react'

import './AdminConsumers.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api'

function getUsers(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.users)) return data.users
  if (Array.isArray(data?.data)) return data.data
  return []
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
  const [consumers, setConsumers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedConsumer, setSelectedConsumer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadConsumers = async (manual = false) => {
    if (manual) setRefreshing(true)

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
      setError(
        'Unable to load consumer accounts. Please check your server connection.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadConsumers()
  }, [])

  const filteredConsumers = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    if (!keyword) return consumers

    return consumers.filter((consumer) => {
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
                {filteredConsumers.length === 1 ? '' : 's'} found
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
                  {filteredConsumers.map((consumer) => (
                    <tr key={consumer.user_id}>
                      <td>
                        <div className="consumer-name-cell">
                          <div className="consumer-avatar">
                            {consumer.profile_picture ? (
                              <img
                                src={
                                  consumer.profile_picture.startsWith('http')
                                    ? consumer.profile_picture
                                    : `https://ani-malay-production.up.railway.app/${consumer.profile_picture.replace(/^\/+/, '')}`
                                }
                                alt=""
                              />
                            ) : (
                              getInitials(consumer.full_name)
                            )}
                          </div>

                          <div>
                            <strong>{consumer.full_name || 'Unnamed Consumer'}</strong>
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
                        <span
                          className={`consumer-status ${
                            String(consumer.status || '').toLowerCase() === 'active'
                              ? 'active'
                              : 'other'
                          }`}
                        >
                          {consumer.status || 'Not specified'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="consumer-view-btn"
                          onClick={() => setSelectedConsumer(consumer)}
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* CONSUMER DETAILS MODAL */}

        {selectedConsumer && (
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
                  {selectedConsumer.profile_picture ? (
                    <img
                      src={
                        selectedConsumer.profile_picture.startsWith('http')
                          ? selectedConsumer.profile_picture
                          : `https://ani-malay-production.up.railway.app/${selectedConsumer.profile_picture.replace(/^\/+/, '')}`
                      }
                      alt=""
                    />
                  ) : (
                    getInitials(selectedConsumer.full_name)
                  )}
                </div>

                <div>
                  <h4>{selectedConsumer.full_name || 'Unnamed Consumer'}</h4>
                  <span>Consumer ID: #{selectedConsumer.user_id}</span>
                </div>
              </div>

              <div className="consumer-details-list">
                <div>
                  <Mail size={17} />
                  <section>
                    <small>Email Address</small>
                    <strong>{selectedConsumer.email || 'Not provided'}</strong>
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
                    <strong>{formatDate(selectedConsumer.created_at)}</strong>
                  </section>
                </div>

                <div>
                  <UserRound size={17} />
                  <section>
                    <small>Account Status</small>
                    <strong>{selectedConsumer.status || 'Not specified'}</strong>
                  </section>
                </div>
              </div>

              <button
                type="button"
                className="consumer-modal-close-btn"
                onClick={() => setSelectedConsumer(null)}
              >
                Close
              </button>
            </section>
          </div>
        )}

      </main>
    </div>
  )
}

export default AdminConsumers
