import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, ImagePlus, X, Send } from 'lucide-react'
import './Messages.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api/messages'
const SERVER_URL = 'https://ani-malay-production.up.railway.app'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function getImageUrl(path) {
  if (!path) return null

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return `${SERVER_URL}/${path.replace(/^\/+/, '')}`
}

function Messages() {
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [adminStatus, setAdminStatus] = useState('checking')

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()

  const token = localStorage.getItem('token')

  // FETCH MESSAGES
  const fetchMessages = useCallback(async () => {
    if (!user?.user_id || !token) {
      setError('Mag-login muna para magamit ang Messages.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/conversation/${user.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Hindi ma-load ang messages.')
      }

      setMessages(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Hindi makakonekta sa server.')
    } finally {
      setLoading(false)
    }
  }, [user?.user_id, token])

  // CHECK ADMIN ONLINE STATUS
  const fetchAdminStatus = useCallback(async () => {
    if (!token) {
      setAdminStatus('offline')
      return
    }

    try {
      const response = await fetch(`${API_URL}/presence`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Unable to check Admin status.')
      }

      const data = await response.json()

      setAdminStatus(
        data.is_online ? 'online' : 'offline'
      )
    } catch (err) {
      console.error('Admin status check failed:', err)
      setAdminStatus('offline')
    }
  }, [token])

  // INITIAL LOAD
  useEffect(() => {
    fetchMessages()
    fetchAdminStatus()
  }, [fetchMessages, fetchAdminStatus])

  // AUTOMATIC ADMIN STATUS CHECK EVERY 15 SECONDS
  useEffect(() => {
    const interval = setInterval(
      fetchAdminStatus,
      15000
    )

    return () => clearInterval(interval)
  }, [fetchAdminStatus])

  // CLEAN UP PREVIEW ON UNMOUNT
  useEffect(() => {
    return () => {
      if (selectedImage?.preview) {
        URL.revokeObjectURL(selectedImage.preview)
      }
    }
  }, [selectedImage])

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('JPG, PNG, o WEBP lang ang puwedeng i-attach.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('Hanggang 5 MB lang ang maximum size ng picture.')
      return
    }

    if (selectedImage?.preview) {
      URL.revokeObjectURL(selectedImage.preview)
    }

    setError('')
    setSelectedImage({
      file,
      preview: URL.createObjectURL(file),
    })
  }

  const clearSelectedImage = () => {
    if (selectedImage?.preview) {
      URL.revokeObjectURL(selectedImage.preview)
    }
    setSelectedImage(null)
  }

  // SEND MESSAGE (Text and/or Image)
  const handleSend = async (event) => {
    event.preventDefault()

    const text = messageText.trim()

    if ((!text && !selectedImage) || sending) return

    if (!token || !user?.user_id) {
      setError('Mag-login muna bago magpadala ng message.')
      return
    }

    setSending(true)
    setError('')

    try {
      let response

      if (selectedImage?.file) {
        const formData = new FormData()
        formData.append('message_text', text)
        formData.append('image', selectedImage.file)

        response = await fetch(`${API_URL}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })
      } else {
        response = await fetch(`${API_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message_text: text,
          }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Hindi naipadala ang message.'
        )
      }

      setMessageText('')
      clearSelectedImage()
      await fetchMessages()
    } catch (err) {
      setError(err.message || 'Hindi naipadala ang message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="messages-page">
      <section className="messages-card">

        {/* HEADER */}
        <header className="messages-header">
          <div className="messages-icon">
            <MessageCircle size={25} />
          </div>

          <div className="messages-header-info">
            <h1>Messages</h1>

            <p>
              May concern ka? Makipag-ugnayan sa Ani-Malay Admin.
            </p>

            {/* ADMIN PRESENCE INDICATOR */}
            <div
              className={`consumer-admin-presence ${
                adminStatus === 'online'
                  ? 'online'
                  : adminStatus === 'checking'
                    ? 'checking'
                    : 'offline'
              }`}
            >
              <span className="consumer-admin-presence-dot" />

              <span>
                {adminStatus === 'checking'
                  ? 'Checking Admin status...'
                  : adminStatus === 'online'
                    ? 'Admin Online'
                    : 'Admin Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* INFORMATION NOTICE */}
        <div className="messages-notice">
          Ipadala rito ang iyong mga katanungan o concerns tungkol sa
          products, orders, payments, at deliveries. Puwede ka ring mag-attach ng picture.
        </div>

        {/* MESSAGE HISTORY */}
        <div className="messages-list">
          {loading ? (
            <p className="messages-empty">
              Loading messages...
            </p>
          ) : messages.length === 0 ? (
            <p className="messages-empty">
              Wala pang messages. Maaari kang magpadala ng concern sa ibaba.
            </p>
          ) : (
            messages.map((message) => {
              const imageUrl = getImageUrl(message.image_url)

              return (
                <div
                  key={message.message_id}
                  className={`message-bubble ${
                    message.sender_role === 'consumer'
                      ? 'message-own'
                      : 'message-admin'
                  }`}
                >
                  <span className="message-sender">
                    {message.sender_role === 'consumer'
                      ? 'You'
                      : 'Ani-Malay Admin'}
                  </span>

                  {imageUrl && (
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="View full image"
                      style={{ display: 'inline-block', marginTop: '6px' }}
                    >
                      <img
                        src={imageUrl}
                        alt="Attached message"
                        style={{
                          maxWidth: '220px',
                          maxHeight: '220px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    </a>
                  )}

                  {message.message_text && (
                    <p>{message.message_text}</p>
                  )}

                  <time>
                    {new Date(message.created_at).toLocaleString()}
                  </time>
                </div>
              )
            })
          )}
        </div>

        {/* ERROR */}
        {error && (
          <p className="messages-error" role="alert">
            {error}
          </p>
        )}

        {/* SELECTED IMAGE PREVIEW */}
        {selectedImage && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              marginBottom: '8px',
              borderRadius: '10px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
            }}
          >
            <img
              src={selectedImage.preview}
              alt="Preview"
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'cover',
                borderRadius: '8px',
              }}
            />
            <span style={{ fontSize: '13px', color: '#374151' }}>
              {selectedImage.file.name}
            </span>
            <button
              type="button"
              onClick={clearSelectedImage}
              aria-label="Remove attached image"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* MESSAGE INPUT */}
        <form className="messages-form" onSubmit={handleSend}>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="I-type ang iyong concern..."
            maxLength={5000}
            rows={3}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              marginTop: '8px',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                color: '#1f2937',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <ImagePlus size={18} />
              <span>Attach Picture</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </label>

            <button
              type="submit"
              disabled={
                sending ||
                (!messageText.trim() && !selectedImage) ||
                !token ||
                !user?.user_id
              }
            >
              <Send size={16} style={{ marginRight: '6px' }} />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>

      </section>
    </main>
  )
}

export default Messages