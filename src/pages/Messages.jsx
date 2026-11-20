
import { useCallback, useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import './Messages.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api/messages'

function Messages() {
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
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

  // SEND MESSAGE
  const handleSend = async (event) => {
    event.preventDefault()

    const text = messageText.trim()

    if (!text || sending) return

    if (!token || !user?.user_id) {
      setError('Mag-login muna bago magpadala ng message.')
      return
    }

    setSending(true)
    setError('')

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message_text: text,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Hindi naipadala ang message.'
        )
      }

      setMessageText('')
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
          products, orders, payments, at deliveries.
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
            messages.map((message) => (
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

                <p>{message.message_text}</p>

                <time>
                  {new Date(message.created_at).toLocaleString()}
                </time>
              </div>
            ))
          )}
        </div>

        {/* ERROR */}
        {error && (
          <p className="messages-error" role="alert">
            {error}
          </p>
        )}

        {/* MESSAGE INPUT */}
        <form className="messages-form" onSubmit={handleSend}>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="I-type ang iyong concern..."
            maxLength={5000}
            rows={3}
            required
          />

          <button
            type="submit"
            disabled={
              sending ||
              !messageText.trim() ||
              !token ||
              !user?.user_id
            }
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </form>

      </section>
    </main>
  )
}

export default Messages
