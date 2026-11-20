import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function ForgotPasswordVerify() {
  const navigate = useNavigate()

  const [resetUser] = useState(() => {
    const storedReset = sessionStorage.getItem('passwordResetUser')
    return storedReset ? JSON.parse(storedReset) : null
  })

  const [code, setCode] = useState('')
  const [verificationId, setVerificationId] = useState(
    resetUser?.verification_id || ''
  )
  const [devOtp, setDevOtp] = useState(resetUser?.dev_otp || '')
  const [error, setError] = useState('')
  const [message, setMessage] = useState(
    resetUser?.verification_id
      ? 'A 6-digit verification code has been generated.'
      : ''
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!resetUser) {
      navigate('/forgot-password')
    }
  }, [resetUser, navigate])

  if (!resetUser) {
    return null
  }

  const sendCode = async () => {
    setError('')
    setMessage('')

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
            target: resetUser.target,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to send verification code.')
        return
      }

      setVerificationId(data.verification_id)
      setDevOtp(data.dev_otp || '')

      const updatedSession = {
        user_id: data.user_id || resetUser.user_id,
        verification_id: data.verification_id,
        target: data.target || resetUser.target,
        dev_otp: data.dev_otp || null,
      }

      sessionStorage.setItem(
        'passwordResetUser',
        JSON.stringify(updatedSession)
      )

      setMessage('A new 6-digit verification code has been generated.')
    } catch (err) {
      console.error('❌ Send verification error:', err)
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e) => {
    e.preventDefault()

    setError('')
    setMessage('')

    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code.')
      return
    }

    if (!verificationId) {
      setError('Missing verification ID. Please click Send / Resend Code first.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/users/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: resetUser.user_id,
            verification_id: verificationId,
            otp: code,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Invalid verification code.')
        return
      }

      sessionStorage.setItem(
        'passwordResetVerification',
        JSON.stringify({
          user_id: resetUser.user_id,
          verification_id: data.verification_id || verificationId,
          target: resetUser.target,
        })
      )

      navigate('/forgot-password/reset')
    } catch (err) {
      console.error('❌ Verification error:', err)
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="my-account-page">
      <div className="account-content-card edit-profile-card">
        <div className="content-heading">
          <h2>Verify Your Account</h2>

          <p>Enter the 6-digit verification code for:</p>

          <strong>{resetUser.target}</strong>
        </div>

        <button
          type="button"
          className="account-primary-button"
          onClick={sendCode}
          disabled={loading}
        >
          {loading
            ? 'Sending...'
            : verificationId
            ? 'Resend 6-Digit Code'
            : 'Send Verification Code'}
        </button>

        {devOtp && (
          <p
            style={{
              fontSize: '12.5px',
              backgroundColor: '#f3f4f6',
              padding: '8px 12px',
              borderRadius: '6px',
              marginTop: '12px',
              color: '#111827',
            }}
          >
            Test / Dev OTP: <strong>{devOtp}</strong>
          </p>
        )}

        <form onSubmit={verifyCode} style={{ marginTop: '20px' }}>
          <div className="form-group">
            <label>6-Digit Verification Code</label>

            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          {message && <p className="success-message">{message}</p>}

          {error && <p className="error-message">{error}</p>}

          <div className="edit-profile-actions">
            <button
              type="button"
              className="account-secondary-button"
              onClick={() => navigate('/forgot-password')}
            >
              Back
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ForgotPasswordVerify