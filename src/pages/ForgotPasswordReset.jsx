import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function ForgotPasswordReset() {

  const navigate = useNavigate()

  const storedVerification = sessionStorage.getItem(
    'passwordResetVerification'
  )

  const verification = storedVerification
    ? JSON.parse(storedVerification)
    : null

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!verification) {
    navigate('/forgot-password')
    return null
  }

  const handleSubmit = async (e) => {

    e.preventDefault()

    setError('')
    setMessage('')

    if (newPassword.length < 8) {
      setError(
        'New password must be at least 8 characters.'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setError(
        'New passwords do not match.'
      )
      return
    }

    try {

      setLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/users/reset-password',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            user_id: verification.user_id,
            verification_id: verification.verification_id,
            new_password: newPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.message || 'Failed to reset password.'
        )
        return
      }

      setMessage(
        'Password reset successfully!'
      )

      // Remove temporary reset information
      sessionStorage.removeItem(
        'passwordResetUser'
      )

      sessionStorage.removeItem(
        'passwordResetVerification'
      )

      // Give user time to see success message
      setTimeout(() => {
        navigate('/login')
      }, 1500)

    } catch (error) {

      console.error(
        '❌ Reset password error:',
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

          <h2>Reset Password</h2>

          <p>
            Create a new password for your Ani-Malay account.
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>
              New Password
            </label>

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

            <label>
              Confirm New Password
            </label>

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
              onClick={() =>
                navigate('/login')
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading
                ? 'Resetting...'
                : 'Reset Password'}
            </button>

          </div>

        </form>

      </div>

    </section>
  )
}

export default ForgotPasswordReset