import { useCallback, useEffect, useState } from 'react'
import {
  MessageSquare,
  Star,
  Send,
  X,
  Camera,
  ShieldCheck,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import './Feedback.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api'
const SERVER_URL = 'https://ani-malay-production.up.railway.app'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'Crops', value: 'crops' },
  { label: 'Livestock', value: 'livestock' },
  { label: 'Fisheries', value: 'fisheries' },
]

function getProfilePicture(path) {
  if (!path) return null

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${SERVER_URL}/${path.replace(/^\/+/, '')}`
}

function getToken() {
  return localStorage.getItem('token')
}

function Feedback() {
  const [showForm, setShowForm] = useState(false)
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [myReviews, setMyReviews] = useState([])

  const [product, setProduct] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [images, setImages] = useState([])

  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState('success')
  const [pageNotice, setPageNotice] = useState('')
  const [pageNoticeType, setPageNoticeType] = useState('success')

  const [filter, setFilter] = useState('all')
  const [categoryTab, setCategoryTab] = useState('all')

  const [loading, setLoading] = useState(true)
  const [myReviewsLoading, setMyReviewsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()

  const isConsumer = currentUser?.role === 'consumer'

  // ===============================
  // FETCH PRODUCTS
  // ===============================
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/products`)

      if (!response.ok) {
        throw new Error('Failed to load products.')
      }

      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Could not load products:', error)
    }
  }, [])

  // ===============================
  // FETCH APPROVED PUBLIC REVIEWS
  // ===============================
  const fetchReviews = useCallback(async () => {
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/reviews?status=approved`)

      if (!response.ok) {
        throw new Error('Failed to load approved reviews.')
      }

      const data = await response.json()
      setReviews(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Could not load reviews:', error)
      setPageNoticeType('error')
      setPageNotice('Could not load reviews. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ===============================
  // FETCH MY REVIEWS
  // ===============================
  const fetchMyReviews = useCallback(async () => {
    const token = getToken()

    if (!token) {
      setMyReviews([])
      return
    }

    setMyReviewsLoading(true)

    try {
      const response = await fetch(`${API_URL}/reviews/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load your reviews.')
      }

      setMyReviews(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Could not load my reviews:', error)
      setPageNoticeType('error')
      setPageNotice(error.message || 'Could not load your reviews.')
    } finally {
      setMyReviewsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchProducts()
      fetchReviews()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchProducts, fetchReviews])

  // ===============================
  // RATING SUMMARY
  // ===============================
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
      reviews.length
    : 0

  // ===============================
  // FILTER PUBLIC REVIEWS
  // ===============================
  const filteredReviews = reviews.filter((review) => {
    const matchesRating =
      filter === 'all' || Number(review.rating) === Number(filter)

    const reviewCategory = (review.category_name || '').toLowerCase().trim()

    const matchesCategory =
      categoryTab === 'all' ||
      reviewCategory === categoryTab

    return matchesRating && matchesCategory
  })

  // ===============================
  // FILTER MY REVIEWS
  // ===============================
  const filteredMyReviews = myReviews.filter((review) => {
    return (
      filter === 'all' ||
      Number(review.rating) === Number(filter)
    )
  })

  // ===============================
  // IMAGE PREVIEW HELPERS
  // ===============================
  const releaseImagePreviews = (items) => {
    items.forEach((image) => URL.revokeObjectURL(image.preview))
  }

  const openForm = () => {
    setNotice('')
    setPageNotice('')
    setShowForm(true)
  }

  const closeForm = () => {
    releaseImagePreviews(images)
    setImages([])
    setShowForm(false)
    setProduct('')
    setRating(0)
    setComment('')
    setNotice('')
  }

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || [])
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    const validFiles = files.filter(
      (file) =>
        allowedTypes.includes(file.type) &&
        file.size <= MAX_IMAGE_SIZE
    )

    if (validFiles.length !== files.length) {
      setNoticeType('error')
      setNotice('JPG, PNG, or WEBP only. Maximum size is 5 MB per picture.')
    } else {
      setNotice('')
    }

    const slots = Math.max(0, 3 - images.length)

    const newImages = validFiles.slice(0, slots).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
    }))

    setImages((current) => [...current, ...newImages])
    event.target.value = ''
  }

  const removeImage = (id) => {
    setImages((current) => {
      const image = current.find((item) => item.id === id)

      if (image) {
        URL.revokeObjectURL(image.preview)
      }

      return current.filter((item) => item.id !== id)
    })
  }

  // ===============================
  // SUBMIT REVIEW
  // ===============================
  const handleSubmit = async (event) => {
    event.preventDefault()
    setNotice('')

    const token = getToken()

    if (!currentUser?.user_id || !token || !isConsumer) {
      setNoticeType('error')
      setNotice('Please log in to your consumer account before submitting a review.')
      return
    }

    if (!product || !rating || !comment.trim()) {
      setNoticeType('error')
      setNotice('Please select a product, choose a rating, and write your review.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: Number(product),
          rating: Number(rating),
          comment: comment.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit your review.')
      }

      setNoticeType('success')
      setNotice(
        'Review submitted successfully! It is now pending Admin approval.'
      )

      releaseImagePreviews(images)
      setImages([])
      setProduct('')
      setRating(0)
      setComment('')

      await fetchMyReviews()
      await fetchReviews()
    } catch (error) {
      setNoticeType('error')
      setNotice(error.message || 'Unable to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ===============================
  // DELETE MY REVIEW
  // ===============================
  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this review? This action cannot be undone.'
    )

    if (!confirmed) return

    const token = getToken()

    if (!token) {
      setPageNoticeType('error')
      setPageNotice('Your session has expired. Please log in again.')
      return
    }

    setDeletingId(reviewId)
    setPageNotice('')

    try {
      const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete review.')
      }

      setPageNoticeType('success')
      setPageNotice('Your review was deleted successfully.')

      await fetchMyReviews()
      await fetchReviews()
    } catch (error) {
      setPageNoticeType('error')
      setPageNotice(error.message || 'Unable to delete review.')
    } finally {
      setDeletingId(null)
    }
  }

  // ===============================
  // CHANGE REVIEW TAB
  // ===============================
  const handleTabChange = (value) => {
    setCategoryTab(value)
    setFilter('all')
    setPageNotice('')

    if (value === 'mine') {
      fetchMyReviews()
    }
  }

  // ===============================
  // REVIEW CARD
  // ===============================
  const renderReviewCard = (review, showStatus = false) => {
    const profilePicture = getProfilePicture(review.profile_picture)

    return (
      <article className="feedback-review-card" key={review.review_id}>
        <div className="feedback-review-top">
          <div className="feedback-review-avatar">
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

          <div className="feedback-review-author">
            <strong>{review.full_name || 'Customer'}</strong>
            <span>
              {review.created_at
                ? new Date(review.created_at).toLocaleDateString()
                : 'Date unavailable'}
            </span>
          </div>

          {showStatus && (
            <span
              className={`feedback-status-badge ${String(review.status || 'pending').toLowerCase()}`}
            >
              {review.status || 'Pending'}
            </span>
          )}
        </div>

        <div className="feedback-review-product">
          <div className="feedback-review-product-info">
            <span>{review.product_name || 'Product'}</span>
            {review.category_name && (
              <small>{review.category_name}</small>
            )}
          </div>

          <span className="feedback-review-stars">
            {'★'.repeat(Number(review.rating))}
            {'☆'.repeat(5 - Number(review.rating))}
          </span>
        </div>

        <p className="feedback-review-comment">
          {review.comment || 'No written comment was provided.'}
        </p>

        {showStatus && (
          <div className="feedback-my-review-actions">
            <button
              type="button"
              className="feedback-delete-button"
              onClick={() => handleDeleteReview(review.review_id)}
              disabled={deletingId === review.review_id}
            >
              <Trash2 size={16} />
              {deletingId === review.review_id ? 'Deleting...' : 'Delete Review'}
            </button>
          </div>
        )}
      </article>
    )
  }

  return (
    <main className="feedback-page">
      {/* HERO */}
      <section className="feedback-hero">
        <div className="feedback-hero-copy">
          <span className="feedback-eyebrow">ANI-MALAY COMMUNITY</span>
          <h1>Feedback &amp; Reviews</h1>
          <p>
            Discover what customers think about local agricultural products
            and share your own experience.
          </p>

          {isConsumer && (
            <button
              type="button"
              className="feedback-primary-button"
              onClick={openForm}
            >
              <MessageSquare size={19} />
              Submit a Review
            </button>
          )}
        </div>

        <div className="feedback-hero-icon" aria-hidden="true">
          <MessageSquare size={56} />
          <Star className="feedback-hero-star" size={28} fill="currentColor" />
        </div>
      </section>

      {/* RATING SUMMARY */}
      <section className="feedback-rating-summary">
        <div className="feedback-rating-main">
          <span className="feedback-rating-number">
            {averageRating.toFixed(1)}
          </span>
          <div>
            <div className="feedback-stars-static">
              {'★'.repeat(Math.round(averageRating))}
              {'☆'.repeat(5 - Math.round(averageRating))}
            </div>
            <p>Average rating from approved reviews</p>
          </div>
        </div>

        <div className="feedback-summary-divider" />

        <div className="feedback-summary-stat">
          <strong>{reviews.length}</strong>
          <span>Approved reviews</span>
        </div>

        <div className="feedback-summary-stat">
          <ShieldCheck size={24} />
          <span>Reviews are checked by Admin before publishing</span>
        </div>
      </section>

      {/* REVIEWS SECTION */}
      <section className="feedback-reviews-section">
        <div className="feedback-section-heading">
          <div>
            <span className="feedback-section-kicker">COMMUNITY VOICES</span>
            <h2>
              {categoryTab === 'mine' ? 'My Reviews' : 'Customer Reviews'}
            </h2>
            <p>
              {categoryTab === 'mine'
                ? 'View and manage the reviews you have submitted.'
                : 'See product experiences shared by consumers.'}
            </p>
          </div>

          <label className="feedback-filter">
            <span>Rating</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </label>
        </div>

        {/* CATEGORY TABS */}
        <div className="feedback-category-tabs">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category.value}
              className={categoryTab === category.value ? 'active' : ''}
              onClick={() => handleTabChange(category.value)}
            >
              {category.label}
            </button>
          ))}

          {isConsumer && (
            <button
              type="button"
              className={categoryTab === 'mine' ? 'active' : ''}
              onClick={() => handleTabChange('mine')}
            >
              My Reviews
            </button>
          )}
        </div>

        {/* PAGE NOTICE */}
        {pageNotice && (
          <div
            className={`feedback-page-notice ${pageNoticeType}`}
            role="status"
          >
            {pageNotice}
          </div>
        )}

        {/* PUBLIC REVIEWS */}
        {categoryTab !== 'mine' ? (
          loading ? (
            <div className="feedback-empty">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="feedback-empty">
              <MessageSquare size={34} />
              <h3>No approved reviews yet</h3>
              <p>Approved reviews for this category will appear here.</p>
            </div>
          ) : (
            <div className="feedback-review-list">
              {filteredReviews.map((review) => renderReviewCard(review))}
            </div>
          )
        ) : (
          /* MY REVIEWS */
          !isConsumer ? (
            <div className="feedback-empty">
              <MessageSquare size={34} />
              <h3>Consumer login required</h3>
              <p>Please log in to view your submitted reviews.</p>
            </div>
          ) : myReviewsLoading ? (
            <div className="feedback-empty">Loading your reviews...</div>
          ) : filteredMyReviews.length === 0 ? (
            <div className="feedback-empty">
              <MessageSquare size={34} />
              <h3>You haven't submitted any reviews yet</h3>
              <p>Your submitted reviews will appear here.</p>
              <button
                type="button"
                className="feedback-primary-button"
                onClick={openForm}
              >
                <MessageSquare size={17} />
                Write Your First Review
              </button>
            </div>
          ) : (
            <div className="feedback-review-list">
              {filteredMyReviews.map((review) =>
                renderReviewCard(review, true)
              )}
            </div>
          )
        )}
      </section>

      {/* PRIVATE MESSAGES */}
      <section className="feedback-private-note">
        <div className="feedback-private-icon">
          <MessageCircle size={24} />
        </div>
        <div>
          <h3>Need to raise a private concern?</h3>
          <p>
            For personal complaints about orders, delivery, or account concerns,
            contact the LGU Admin privately through Messages.
          </p>
        </div>
        <Link to="/messages" className="feedback-messages-link">
          Open Messages
        </Link>
      </section>

      {/* SUBMIT REVIEW MODAL */}
      {showForm && (
        <div
          className="feedback-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
          >
            <div className="feedback-modal-heading">
              <div>
                <span className="feedback-section-kicker">YOUR EXPERIENCE</span>
                <h2 id="feedback-modal-title">Submit a Review</h2>
                <p>Tell other consumers about the product.</p>
              </div>

              <button
                type="button"
                className="feedback-close-button"
                onClick={closeForm}
                aria-label="Close review form"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="feedback-form-field">
                <label htmlFor="review-product">Select Product *</label>
                <select
                  id="review-product"
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  required
                >
                  <option value="">Choose a product</option>
                  {products.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="feedback-form-field">
                <label>Product Rating *</label>
                <div className="feedback-star-picker">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setRating(value)}
                      className={value <= rating ? 'active' : ''}
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      aria-pressed={rating === value}
                    >
                      <Star
                        size={32}
                        fill={value <= rating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                  <span>{rating ? `${rating} out of 5` : 'Select rating'}</span>
                </div>
              </div>

              <div className="feedback-form-field">
                <label htmlFor="review-comment">Write a Review *</label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="How was the quality of the product?"
                  rows={5}
                  maxLength={2000}
                  required
                />
                <span className="feedback-form-counter">
                  {comment.length}/2000 characters
                </span>
              </div>

              <div className="feedback-form-field">
                <label>Attach Pictures (Optional)</label>
                <p className="feedback-upload-help">
                  Up to 3 images, JPG/PNG/WEBP, maximum 5 MB each.
                </p>

                <label className="feedback-upload-box">
                  <Camera size={25} />
                  <strong>Upload product pictures</strong>
                  <span>Choose images from your device</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={images.length >= 3}
                    onChange={handleImageChange}
                  />
                </label>

                {images.length > 0 && (
                  <div className="feedback-upload-previews">
                    {images.map((image) => (
                      <div className="feedback-upload-preview" key={image.id}>
                        <img src={image.preview} alt={image.file.name} />
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          aria-label={`Remove ${image.file.name}`}
                        >
                          <X size={15} />
                        </button>
                        <small>{image.file.name}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {notice && (
                <div
                  className={`feedback-form-notice ${noticeType}`}
                  role="status"
                >
                  {notice}
                </div>
              )}

              <div className="feedback-approval-note">
                <ShieldCheck size={18} />
                Reviews should be checked by the Admin before becoming public.
              </div>

              <button
                type="submit"
                className="feedback-submit-button"
                disabled={submitting}
              >
                <Send size={17} />
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default Feedback