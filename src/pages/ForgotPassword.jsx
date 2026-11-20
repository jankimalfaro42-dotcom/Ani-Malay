import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function ForgotPassword() {

  const navigate = useNavigate()

  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {

    e.preventDefault()

    setError('')

    if (!target.trim()) {
      setError('Please enter your email or mobile number.')
      return
    }

    try {

      setLoading(true)

      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/users/forgot-password',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            target: target.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.message || 'Account not found.'
        )
        return
      }

      // Temporarily save reset information
      sessionStorage.setItem(
        'passwordResetUser',
        JSON.stringify({
          user_id: data.user_id,
          target: data.target,
        })
      )

      // Go to verification page
      navigate('/forgot-password/verify')

    } catch (error) {

      console.error(
        '❌ Forgot password error:',
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

          <h2>Forgot Password</h2>

          <p>
            Enter your registered email address or mobile number
            to reset your password.
          </p>

        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">

            <label>
              Email or Mobile Number
            </label>

            <input
              type="text"
              placeholder="Enter email or mobile number"
              value={target}
              onChange={(e) =>
                setTarget(e.target.value)
              }
              required
            />

          </div>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <div className="edit-profile-actions">

            <button
              type="button"
              className="account-secondary-button"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading
                ? 'Checking...'
                : 'Continue'}
            </button>

          </div>

        </form>

      </div>

    </section>
  )
}

export default ForgotPassword