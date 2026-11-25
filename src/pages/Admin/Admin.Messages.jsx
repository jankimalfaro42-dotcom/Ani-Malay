import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  MessageCircle,
  Send,
  RefreshCw,
} from 'lucide-react'
import './AdminMessages.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api/messages'
const USERS_API_URL = 'https://ani-malay-production.up.railway.app/api/users'

function AdminMessages() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const queryUserId = searchParams.get('userId') || searchParams.get('consumerId')
  const stateUserId =
    location.state?.selectedUserId ?? location.state?.userId ?? null
  const targetUserId = queryUserId || stateUserId

  const stateConsumerName = location.state?.consumerName || ''
  const stateConsumerEmail = location.state?.consumerEmail || ''

  const [conversations, setConversations] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [replyText, setReplyText] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [adminStatus, setAdminStatus] = useState('checking')

  const selectedUserRef = useRef(null)
  selectedUserRef.current = selectedUser

  const token = localStorage.getItem('token')

  // FETCH ADMIN PRESENCE
  const fetchAdminPresence = useCallback(async () => {
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
      console.error('Admin presence error:', err)
      setAdminStatus('offline')
    }
  }, [token])

  // CHECK ADMIN STATUS EVERY 15 SECONDS
  useEffect(() => {
    fetchAdminPresence()

    const interval = setInterval(
      fetchAdminPresence,
      15000
    )

    return () => clearInterval(interval)
  }, [fetchAdminPresence])

  // RESOLVE TARGET CONSUMER IF NOT YET IN CONVERSATIONS LIST
  const resolveTargetConsumer = useCallback(
    async (userId) => {
      if (!userId) return null

      const numericId = Number(userId)

      if (stateConsumerName || stateConsumerEmail) {
        return {
          user_id: numericId,
          full_name: stateConsumerName || `Consumer #${numericId}`,
          email: stateConsumerEmail || '',
          latest_message: '',
          unread_count: 0,
        }
      }

      try {
        const response = await fetch(`${USERS_API_URL}/${numericId}`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        })

        if (!response.ok) {
          return {
            user_id: numericId,
            full_name: `Consumer #${numericId}`,
            email: '',
            latest_message: '',
            unread_count: 0,
          }
        }

        const data = await response.json()
        const consumer = data?.user || data

        return {
          user_id: Number(consumer?.user_id || numericId),
          full_name: consumer?.full_name || `Consumer #${numericId}`,
          email: consumer?.email || '',
          latest_message: '',
          unread_count: 0,
        }
      } catch {
        return {
          user_id: numericId,
          full_name: `Consumer #${numericId}`,
          email: '',
          latest_message: '',
          unread_count: 0,
        }
      }
    },
    [stateConsumerName, stateConsumerEmail, token]
  )

  // FETCH CONVERSATIONS
  const fetchConversations = useCallback(async () => {
    if (!token) {
      setError('Mag-login bilang admin para makita ang inbox.')
      setLoadingConversations(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Hindi ma-load ang inbox.')
      }

      const list = Array.isArray(data) ? data : []
      setConversations(list)
      setError('')

      const currentSelected = selectedUserRef.current

      if (currentSelected) {
        const updatedSelectedUser = list.find(
          (item) =>
            Number(item.user_id) === Number(currentSelected.user_id)
        )

        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser)
        }
      } else if (targetUserId) {
        const matched = list.find(
          (item) => Number(item.user_id) === Number(targetUserId)
        )

        if (matched) {
          setSelectedUser(matched)
        } else {
          const fallbackUser = await resolveTargetConsumer(targetUserId)
          if (fallbackUser) {
            setSelectedUser(fallbackUser)
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Hindi makakonekta sa server.')
    } finally {
      setLoadingConversations(false)
    }
  }, [token, targetUserId, resolveTargetConsumer])

  // FETCH MESSAGES
  const fetchMessages = useCallback(async (userId) => {
    if (!userId || !token) return

    setLoadingMessages(true)

    try {
      const response = await fetch(
        `${API_URL}/conversation/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Hindi ma-load ang conversation.'
        )
      }

      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Hindi ma-load ang messages.')
    } finally {
      setLoadingMessages(false)
    }
  }, [token])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (selectedUser?.user_id) {
      fetchMessages(selectedUser.user_id)
    } else {
      setMessages([])
    }
  }, [selectedUser?.user_id, fetchMessages])

  // SELECT CONVERSATION
  const handleSelectConversation = (conversation) => {
    setSelectedUser(conversation)
    setError('')
  }

  // SEND ADMIN REPLY
  const handleReply = async (event) => {
    event.preventDefault()

    const text = replyText.trim()

    if (!text || !selectedUser || sending) return

    setSending(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/${selectedUser.user_id}/reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message_text: text,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Hindi naipadala ang reply.'
        )
      }

      setReplyText('')

      await fetchMessages(selectedUser.user_id)
      await fetchConversations()
    } catch (err) {
      setError(err.message || 'Hindi naipadala ang reply.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="admin-messages-page">

      {/* PAGE HEADING */}
      <div className="admin-messages-heading">
        <div>
          <h1>
            <MessageCircle size={27} />
            Messages Inbox
          </h1>

          <p>Consumer concerns and conversations</p>

          <div
            className={`admin-presence ${
              adminStatus === 'online'
                ? 'online'
                : 'offline'
            }`}
          >
            <span className="admin-presence-dot" />

            {adminStatus === 'checking'
              ? 'Checking status...'
              : adminStatus === 'online'
                ? 'You are Online'
                : 'You are Offline'}
          </div>
        </div>

        <button
          type="button"
          className="admin-messages-refresh"
          onClick={() => {
            fetchConversations()

            if (selectedUser) {
              fetchMessages(selectedUser.user_id)
            }

            fetchAdminPresence()
          }}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="admin-messages-error" role="alert">
          {error}
        </div>
      )}

      <div className="admin-messages-layout">

        {/* INBOX */}
        <aside className="admin-conversation-panel">
          <div className="admin-conversation-title">
            <h2>Inbox</h2>
            <span>{conversations.length}</span>
          </div>

          {loadingConversations ? (
            <p className="admin-messages-empty">
              Loading inbox...
            </p>
          ) : conversations.length === 0 ? (
            <p className="admin-messages-empty">
              Wala pang conversations. Lalabas dito ang consumers na nag-message.
            </p>
          ) : (
            <div className="admin-conversation-list">
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.user_id}
                  className={`admin-conversation-item ${
                    Number(selectedUser?.user_id) ===
                    Number(conversation.user_id)
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    handleSelectConversation(conversation)
                  }
                >
                  <span className="admin-conversation-avatar">
                    {(conversation.full_name || 'C')
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <span className="admin-conversation-info">
                    <strong>
                      {conversation.full_name || 'Consumer'}
                    </strong>

                    <small>{conversation.email}</small>

                    <span className="admin-conversation-preview">
                      {conversation.latest_message || 'No message'}
                    </span>
                  </span>

                  {Number(conversation.unread_count) > 0 && (
                    <span className="admin-unread-badge">
                      {conversation.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* CHAT PANEL */}
        <section className="admin-chat-panel">
          {!selectedUser ? (
            <div className="admin-chat-placeholder">
              <MessageCircle size={48} />
              <h2>Select a conversation</h2>
              <p>
                Pumili ng consumer sa inbox para makita at masagot ang messages.
              </p>
            </div>
          ) : (
            <>
              <header className="admin-chat-header">
                <span className="admin-conversation-avatar">
                  {(selectedUser.full_name || 'C')
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <div>
                  <h2>
                    {selectedUser.full_name || 'Consumer'}
                  </h2>

                  <p>{selectedUser.email}</p>
                </div>
              </header>

              {/* MESSAGE HISTORY */}
              <div className="admin-chat-messages">
                {loadingMessages ? (
                  <p className="admin-messages-empty">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="admin-messages-empty">
                    Wala pang messages sa conversation na ito.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.message_id}
                      className={`admin-chat-bubble ${
                        message.sender_role === 'admin'
                          ? 'admin-chat-own'
                          : 'admin-chat-consumer'
                      }`}
                    >
                      <span>
                        {message.sender_role === 'admin'
                          ? 'Ani-Malay Admin'
                          : selectedUser.full_name || 'Consumer'}
                      </span>

                      <p>{message.message_text}</p>

                      <time>
                        {new Date(
                          message.created_at
                        ).toLocaleString()}
                      </time>
                    </div>
                  ))
                )}
              </div>

              {/* REPLY FORM */}
              <form
                className="admin-chat-reply-form"
                onSubmit={handleReply}
              >
                <textarea
                  value={replyText}
                  onChange={(event) =>
                    setReplyText(event.target.value)
                  }
                  placeholder="I-type ang reply sa consumer..."
                  rows={2}
                  maxLength={5000}
                  required
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !replyText.trim() ||
                    !token
                  }
                >
                  <Send size={17} />
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminMessages