import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function ForgotPasswordVerify() {

  const navigate = useNavigate()

  const storedReset = sessionStorage.getItem(
    'passwordResetUser'
  )

  const resetUser = storedReset
    ? JSON.parse(storedReset)
    : null

  const [code, setCode] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!resetUser) {
    navigate('/forgot-password')
    return null
  }

  const sendCode = async () => {

    setError('')
    setMessage('')

    try {

      setLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/verification/send',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            user_id: resetUser.user_id,
            type: 'password_reset',
            target: resetUser.target,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.message || 'Failed to send verification code.'
        )
        return
      }

      setVerificationId(
        data.verification_id
      )

      setMessage(
        'Verification code sent. Check the backend terminal for the development code.'
      )

    } catch (error) {

      console.error(
        '❌ Send verification error:',
        error
      )

      setError(
        'Unable to connect to the server.'
      )

    } finally {

      setLoading(false)

    }
  }

  const verifyCode = async (e) => {

    e.preventDefault()

    setError('')
    setMessage('')

    if (code.length !== 6) {
      setError(
        'Please enter the 6-digit verification code.'
      )
      return
    }

    try {

      setLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/verification/verify',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            user_id: resetUser.user_id,
            type: 'password_reset',
            target: resetUser.target,
            code: code,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(
          data.message || 'Invalid verification code.'
        )
        return
      }

      sessionStorage.setItem(
        'passwordResetVerification',
        JSON.stringify({
          user_id: resetUser.user_id,
          verification_id: data.verification_id,
          target: resetUser.target,
        })
      )

      navigate('/forgot-password/reset')

    } catch (error) {

      console.error(
        '❌ Verification error:',
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

          <h2>Verify Your Account</h2>

          <p>
            Enter the 6-digit verification code sent to:
          </p>

          <strong>
            {resetUser.target}
          </strong>

        </div>

        <button
          type="button"
          className="account-primary-button"
          onClick={sendCode}
          disabled={loading}
        >
          {loading
            ? 'Sending...'
            : 'Send Verification Code'}
        </button>

        <form
          onSubmit={verifyCode}
          style={{ marginTop: '25px' }}
        >

          <div className="form-group">

            <label>
              Verification Code
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value.replace(/\D/g, '')
                )
              }
              required
            />

          </div>

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
                navigate('/forgot-password')
              }
            >
              Back
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading
                ? 'Verifying...'
                : 'Verify Code'}
            </button>

          </div>

        </form>

      </div>

    </section>
  )
}

export default ForgotPasswordVerify