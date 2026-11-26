import { useCallback, useEffect, useState } from 'react'
import {
  Star,
  RefreshCw,
  CheckCircle,
  XCircle,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import './AdminFeedbacks.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api/reviews'
const SERVER_URL = 'https://ani-malay-production.up.railway.app'

function getImageUrl(path) {
  if (!path) return null

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${SERVER_URL}/${path.replace(/^\/+/, '')}`
}

function getProfilePicture(path) {
  return getImageUrl(path)
}

function AdminFeedbacks() {
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        filter === 'all' ? API_URL : `${API_URL}?status=${filter}`
      )

      if (!response.ok) throw new Error('Failed to load reviews.')

      const data = await response.json()
      setReviews(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const updateStatus = async (reviewId, status) => {
    setBusyId(reviewId)
    setError('')
    setNotice('')

    try {
      const response = await fetch(`${API_URL}/${reviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update review.')
      }

      setNotice(`Review #${reviewId} ${status} successfully.`)
      await fetchReviews()
    } catch (err) {
      setError(err.message || 'Could not update review.')
    } finally {
      setBusyId(null)
    }
  }

  const deleteReview = async (reviewId) => {
    const confirmed = window.confirm(
      `Delete review #${reviewId}? This cannot be undone.`
    )

    if (!confirmed) return

    setBusyId(reviewId)
    setError('')
    setNotice('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/${reviewId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete review.')
      }

      setNotice(`Review #${reviewId} deleted successfully.`)
      await fetchReviews()
    } catch (err) {
      setError(err.message || 'Could not delete review.')
    } finally {
      setBusyId(null)
    }
  }

  const pendingCount = reviews.filter(
    (review) => review.status === 'pending'
  ).length

  const approvedCount = reviews.filter(
    (review) => review.status === 'approved'
  ).length

  const rejectedCount = reviews.filter(
    (review) => review.status === 'rejected'
  ).length

  return (
    <div className="admin-feedbacks-page">
      <div className="admin-feedbacks-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Customer Feedbacks</h1>
            {pendingCount > 0 && (
              <span
                className="feedback-new-badge"
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2px 9px',
                  borderRadius: '999px',
                  lineHeight: 1.4,
                }}
              >
                {pendingCount} New
              </span>
            )}
          </div>
          <p>Review and manage customer ratings and comments.</p>
        </div>

        <button
          className="feedback-refresh-btn"
          onClick={fetchReviews}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="feedback-stats">
        <div className="feedback-stat-card">
          <span>Total Reviews</span>
          <strong>{reviews.length}</strong>
        </div>
        <div className="feedback-stat-card pending">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="feedback-stat-card approved">
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </div>
        <div className="feedback-stat-card rejected">
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
        </div>
      </div>

      <div className="feedback-toolbar">
        <div className="feedback-toolbar-title">
          <MessageSquare size={20} />
          <h2>Review Submissions</h2>
          {pendingCount > 0 && (
            <span
              className="feedback-new-badge"
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                marginLeft: '6px',
              }}
            >
              {pendingCount}
            </span>
          )}
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter reviews by status"
        >
          <option value="all">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <div className="feedback-alert error">{error}</div>}
      {notice && <div className="feedback-alert success">{notice}</div>}

      {loading ? (
        <div className="feedback-empty">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="feedback-empty">
          <MessageSquare size={36} />
          <h3>No reviews found</h3>
          <p>Reviews will appear here when they are submitted.</p>
        </div>
      ) : (
        <div className="admin-review-list">
          {reviews.map((review) => {
            const profilePicture = getProfilePicture(review.profile_picture)
            const reviewImages = Array.isArray(review.images) ? review.images : []

            return (
              <article className="admin-review-card" key={review.review_id}>
                <div className="admin-review-top">
                  <div className="admin-review-customer-info">
                    <div className="admin-review-avatar">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt={`${review.full_name || 'Customer'} profile`}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        (review.full_name || 'C').charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <h3>{review.product_name || 'Product'}</h3>
                      <p className="admin-review-customer">
                        By {review.full_name || 'Customer'} · Review #{review.review_id}
                      </p>
                    </div>
                  </div>

                  <span className={`review-status-badge ${review.status}`}>
                    {review.status || 'pending'}
                  </span>
                </div>

                <div
                  className="admin-review-stars"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      fill={star <= Number(review.rating) ? 'currentColor' : 'none'}
                    />
                  ))}
                  <strong>{review.rating}/5</strong>
                </div>

                <p className="admin-review-comment">
                  {review.comment || 'No written comment was provided.'}
                </p>

                {reviewImages.length > 0 && (
                  <div
                    className="admin-review-images"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      margin: '10px 0',
                    }}
                  >
                    {reviewImages.map((imgPath, index) => {
                      const src = getImageUrl(imgPath)
                      if (!src) return null

                      return (
                        <a
                          key={`${review.review_id}-img-${index}`}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          title="View full image"
                        >
                          <img
                            src={src}
                            alt={`${review.product_name || 'Product'} review ${index + 1}`}
                            className="admin-review-image"
                            style={{
                              width: '84px',
                              height: '84px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        </a>
                      )
                    })}
                  </div>
                )}

                <div className="admin-review-date">
                  Submitted:{' '}
                  {review.created_at
                    ? new Date(review.created_at).toLocaleString()
                    : 'Date unavailable'}
                </div>

                <div className="admin-review-actions">
                  {review.status !== 'approved' && (
                    <button
                      className="approve-review-btn"
                      onClick={() => updateStatus(review.review_id, 'approved')}
                      disabled={busyId === review.review_id}
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                  )}

                  {review.status !== 'rejected' && (
                    <button
                      className="reject-review-btn"
                      onClick={() => updateStatus(review.review_id, 'rejected')}
                      disabled={busyId === review.review_id}
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  )}

                  <button
                    className="delete-review-btn"
                    onClick={() => deleteReview(review.review_id)}
                    disabled={busyId === review.review_id}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminFeedbacks