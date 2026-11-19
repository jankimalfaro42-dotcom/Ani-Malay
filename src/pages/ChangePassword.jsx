import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function ChangePassword() {

  const navigate = useNavigate()

  const storedUser = localStorage.getItem('user')
  const user = storedUser ? JSON.parse(storedUser) : null

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (e) => {

    e.preventDefault()

    setMessage('')
    setError('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setError(
        'New password must be different from your current password.'
      )
      return
    }

    try {

      setLoading(true)

      const response = await fetch(
        `http://localhost:5000/api/users/${user.user_id}/change-password`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.message || 'Failed to change password.'
        )
        return
      }

      setMessage('Password changed successfully!')

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

    } catch (error) {

      console.error(
        '❌ Change password error:',
        error
      )

      setError(
        'Unable to connect to the server.'
      )

    } finally {

      setLoading(false)

    }
  }

  return (
    <section className="my-account-page">

      <div className="account-content-card edit-profile-card">

        <div className="content-heading">

          <h2>Change Password</h2>

          <p>
            Keep your account secure by updating your password.
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          <div className="edit-profile-grid">

            <div className="form-group">

              <label>Current Password</label>

              <input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(e.target.value)
                }
                required
              />

            </div>

            <div className="form-group">

              <label>New Password</label>

              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                required
              />

            </div>

            <div className="form-group">

              <label>Confirm New Password</label>

              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
              />

            </div>

          </div>

          <p
            style={{
              fontSize: '13px',
              color: '#666',
              marginTop: '10px',
            }}
          >
            Password must contain at least 8 characters.
          </p>

          {message && (
            <p className="success-message">
              {message}
            </p>
          )}

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <div className="edit-profile-actions">

            <button
              type="button"
              className="account-secondary-button"
              onClick={() => navigate('/my-account?section=security')}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading
                ? 'Changing Password...'
                : 'Change Password'}
            </button>

          </div>

        </form>

      </div>

    </section>
  )
}

export default ChangePassword