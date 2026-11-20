import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

const getPasswordStrength = (pwd) => {
  if (!pwd) {
    return {
      score: 0,
      label: '',
      color: '#e5e7eb',
      checks: {
        length: false,
        upper: false,
        number: false,
        special: false,
      },
    }
  }

  const checks = {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  }

  const passedCount = Object.values(checks).filter(Boolean).length

  if (pwd.length < 6 || passedCount <= 1) {
    return { score: 1, label: 'Weak', color: '#dc2626', checks }
  }
  if (passedCount === 2) {
    return { score: 2, label: 'Fair', color: '#d97706', checks }
  }
  if (passedCount === 3) {
    return { score: 3, label: 'Good', color: '#2563eb', checks }
  }
  return { score: 4, label: 'Strong', color: '#16a34a', checks }
}

function ForgotPasswordReset() {
  const navigate = useNavigate()

  const [verification] = useState(() => {
    const storedVerification = sessionStorage.getItem(
      'passwordResetVerification'
    )
    return storedVerification ? JSON.parse(storedVerification) : null
  })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [capsLockNew, setCapsLockNew] = useState(false)
  const [capsLockConfirm, setCapsLockConfirm] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!verification) {
      navigate('/forgot-password')
    }
  }, [verification, navigate])

  const strength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword]
  )

  if (!verification) {
    return null
  }

  const updateCapsLock = (e, setter) => {
    if (typeof e.getModifierState === 'function') {
      setter(e.getModifierState('CapsLock'))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setMessage('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/users/reset-password',
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
        setError(data.message || 'Failed to reset password.')
        return
      }

      setMessage('Password reset successfully!')

      sessionStorage.removeItem('passwordResetUser')
      sessionStorage.removeItem('passwordResetVerification')

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      console.error('❌ Reset password error:', err)
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="my-account-page">
      <div className="account-content-card edit-profile-card">
        <div className="content-heading">
          <h2>Reset Password</h2>

          <p>Create a new password for your Ani-Malay account.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>

            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyUp={(e) => updateCapsLock(e, setCapsLockNew)}
              onKeyDown={(e) => updateCapsLock(e, setCapsLockNew)}
              onFocus={(e) => updateCapsLock(e, setCapsLockNew)}
              onBlur={() => setCapsLockNew(false)}
              required
            />

            {capsLockNew && (
              <small style={{ color: '#d97706', display: 'block', marginTop: '0.3rem' }}>
                Warning: Caps Lock is ON.
              </small>
            )}

            {newPassword && (
              <div style={{ marginTop: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    marginBottom: '4px',
                  }}
                >
                  <span>Password strength:</span>
                  <strong style={{ color: strength.color }}>{strength.label}</strong>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '4px',
                    marginBottom: '6px',
                  }}
                >
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      style={{
                        height: '5px',
                        borderRadius: '999px',
                        backgroundColor:
                          strength.score >= level ? strength.color : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>

                <div style={{ fontSize: '11.5px', color: '#4b5563', lineHeight: 1.45 }}>
                  <div>{strength.checks.length ? '✓' : '•'} At least 8 characters</div>
                  <div>{strength.checks.upper ? '✓' : '•'} At least 1 uppercase letter (A-Z)</div>
                  <div>{strength.checks.number ? '✓' : '•'} At least 1 number (0-9)</div>
                  <div>{strength.checks.special ? '✓' : '•'} At least 1 special symbol (!@#$)</div>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyUp={(e) => updateCapsLock(e, setCapsLockConfirm)}
              onKeyDown={(e) => updateCapsLock(e, setCapsLockConfirm)}
              onFocus={(e) => updateCapsLock(e, setCapsLockConfirm)}
              onBlur={() => setCapsLockConfirm(false)}
              required
            />

            {capsLockConfirm && (
              <small style={{ color: '#d97706', display: 'block', marginTop: '0.3rem' }}>
                Warning: Caps Lock is ON.
              </small>
            )}

            {confirmPassword && (
              <small
                style={{
                  color: newPassword === confirmPassword ? '#16a34a' : '#dc2626',
                  display: 'block',
                  marginTop: '0.3rem',
                }}
              >
                {newPassword === confirmPassword
                  ? 'Passwords match'
                  : 'New passwords do not match'}
              </small>
            )}
          </div>

          {message && <p className="success-message">{message}</p>}

          {error && <p className="error-message">{error}</p>}

          <div className="edit-profile-actions">
            <button
              type="button"
              className="account-secondary-button"
              onClick={() => navigate('/login')}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

export default ForgotPasswordReset