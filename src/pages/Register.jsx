import { useState, useMemo, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import '../App.css'

const API_BASE = 'https://ani-malay-production.up.railway.app/api/users'

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
    return {
      score: 1,
      label: 'Weak',
      color: '#dc2626',
      checks,
    }
  }

  if (passedCount === 2) {
    return {
      score: 2,
      label: 'Fair',
      color: '#d97706',
      checks,
    }
  }

  if (passedCount === 3) {
    return {
      score: 3,
      label: 'Good',
      color: '#2563eb',
      checks,
    }
  }

  return {
    score: 4,
    label: 'Strong',
    color: '#16a34a',
    checks,
  }
}

function Register() {
  const navigate = useNavigate()

  const [step, setStep] = useState('register') // 'register' | 'verify'

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [agreedTerms, setAgreedTerms] = useState(false)
  const [showPolicyModal, setShowPolicyModal] = useState(false)

  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [capsLockPassword, setCapsLockPassword] = useState(false)
  const [capsLockConfirm, setCapsLockConfirm] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const updateCapsLock = (e, setter) => {
    if (typeof e.getModifierState === 'function') {
      setter(e.getModifierState('CapsLock'))
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (!agreedTerms) {
      setError('Please agree to the Terms and Conditions and Privacy Policy before registering.')
      return
    }

    try {
      setLoading(true)

      const trimmedEmail = email.trim()

      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: trimmedEmail,
          contact_number: contactNumber.trim(),
          address: address.trim(),
          password: password,
          role: 'consumer',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed.')
        return
      }

      setRegisteredEmail(data.email || trimmedEmail)
      setSuccess(data.message || 'We sent a 6-digit OTP to your email.')
      setOtp('')
      setResendCooldown(60)
      setStep('verify')
    } catch (err) {
      console.error('Registration error:', err)

      setError(
        'Unable to connect to the server. Please make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')

    const cleanOtp = otp.trim()
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter a valid 6-digit OTP code.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`${API_BASE}/verify-registration-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registeredEmail,
          otp: cleanOtp,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'OTP verification failed.')
        return
      }

      setSuccess(data.message || 'Email verified successfully! Redirecting to login...')
      setFullName('')
      setEmail('')
      setContactNumber('')
      setAddress('')
      setPassword('')
      setConfirmPassword('')
      setAgreedTerms(false)

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      console.error('OTP verification error:', err)
      setError('Unable to verify OTP right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return

    setError('')
    setSuccess('')

    try {
      setResending(true)

      const response = await fetch(`${API_BASE}/resend-registration-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registeredEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to resend OTP.')
        return
      }

      setSuccess(data.message || 'A new 6-digit OTP has been sent to your email.')
      setResendCooldown(60)
    } catch (err) {
      console.error('Resend OTP error:', err)
      setError('Unable to resend OTP right now.')
    } finally {
      setResending(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        {step === 'register' ? (
          <>
            <h2>Create an Account</h2>

            <p>Register as a Consumer</p>

            <form onSubmit={handleRegister}>
              {/* FULL NAME */}
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* CONTACT */}
              <div className="form-group">
                <label>Contact Number</label>

                <input
                  type="tel"
                  placeholder="Enter your contact number (e.g. 0917...)"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                />
              </div>

              {/* ADDRESS */}
              <div className="form-group">
                <label>Address</label>

                <input
                  type="text"
                  placeholder="Enter your address here"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="form-group">
                <label>Password</label>

                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => updateCapsLock(e, setCapsLockPassword)}
                    onKeyDown={(e) => updateCapsLock(e, setCapsLockPassword)}
                    onFocus={(e) => updateCapsLock(e, setCapsLockPassword)}
                    onBlur={() => setCapsLockPassword(false)}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {capsLockPassword && (
                  <small style={{ color: '#d97706', display: 'block', marginTop: '0.3rem' }}>
                    Warning: Caps Lock is ON.
                  </small>
                )}

                {password && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Password strength:</span>
                      <strong style={{ color: strength.color }}>{strength.label}</strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '6px' }}>
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          style={{
                            height: '5px',
                            borderRadius: '999px',
                            backgroundColor: strength.score >= level ? strength.color : '#e5e7eb',
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

              {/* CONFIRM PASSWORD */}
              <div className="form-group">
                <label>Confirm Password</label>

                <div className="password-input">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyUp={(e) => updateCapsLock(e, setCapsLockConfirm)}
                    onKeyDown={(e) => updateCapsLock(e, setCapsLockConfirm)}
                    onFocus={(e) => updateCapsLock(e, setCapsLockConfirm)}
                    onBlur={() => setCapsLockConfirm(false)}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {capsLockConfirm && (
                  <small style={{ color: '#d97706', display: 'block', marginTop: '0.3rem' }}>
                    Warning: Caps Lock is ON.
                  </small>
                )}

                {confirmPassword && (
                  <small
                    style={{
                      color: password === confirmPassword ? '#16a34a' : '#dc2626',
                      display: 'block',
                      marginTop: '0.3rem',
                    }}
                  >
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </small>
                )}
              </div>

              {/* TERMS & PRIVACY AGREEMENT */}
              <div className="form-group" style={{ marginTop: '10px', marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12.5px',
                    lineHeight: 1.45,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicyModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#15803d',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: 'inherit',
                      }}
                    >
                      Terms and Conditions and Privacy Policy
                    </button>
                    .
                  </span>
                </label>
              </div>

              {/* ERROR */}
              {error && (
                <p
                  style={{
                    color: '#c0392b',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {error}
                </p>
              )}

              {/* SUCCESS */}
              {success && (
                <p
                  style={{
                    color: '#2d7752',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {success}
                </p>
              )}

              {/* REGISTER */}
              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Register'}
              </button>
            </form>

            {/* LOGIN */}
            <p className="register-text">
              Already have an account?{' '}
              <Link to="/login">
                Login
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2>Verify Your Email</h2>

            <p style={{ color: '#15803d', fontWeight: 600, marginBottom: '6px' }}>
              {success || 'We sent a 6-digit OTP to your email.'}
            </p>

            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '14px' }}>
              Enter the 6-digit code sent to <strong>{registeredEmail}</strong>. Check your inbox or Spam folder.
            </p>

            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label>6-Digit OTP Code</label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  style={{
                    letterSpacing: '6px',
                    fontSize: '18px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                  required
                />
              </div>

              {error && (
                <p
                  style={{
                    color: '#c0392b',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {error}
                </p>
              )}

              {success && (
                <p
                  style={{
                    color: '#2d7752',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {success}
                </p>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '14px',
                fontSize: '13px',
              }}
            >
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: resendCooldown > 0 ? '#6b7280' : '#15803d',
                  textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                  fontWeight: 600,
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {resending
                  ? 'Resending...'
                  : resendCooldown > 0
                  ? `Resend OTP (${resendCooldown}s)`
                  : 'Resend OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('register')
                  setError('')
                  setSuccess('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#4b5563',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Change Email
              </button>
            </div>
          </>
        )}
      </div>

      {/* TERMS AND CONDITIONS & PRIVACY POLICY MODAL */}
      {showPolicyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '22px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#15803d' }}>
              Ani-Malay Terms and Conditions & Privacy Policy
            </h3>

            <h4 style={{ marginBottom: '6px' }}>1. Terms and Conditions</h4>
            <p style={{ fontSize: '13px', lineHeight: 1.55, color: '#374151', marginTop: 0 }}>
              By registering on Ani-Malay, you agree to provide accurate and truthful personal, contact, and delivery details. You agree to use the platform lawfully for ordering agricultural products within supported areas and to honor confirmed orders and payment terms. Misuse, fraudulent activity, or account abuse may result in account suspension or deactivation.
            </p>

            <h4 style={{ marginBottom: '6px' }}>2. Privacy Policy</h4>
            <p style={{ fontSize: '13px', lineHeight: 1.55, color: '#374151', marginTop: 0 }}>
              Ani-Malay collects your full name, email address, contact number, and delivery address strictly to verify your account, process and deliver orders, provide customer notifications, and maintain platform security. Your personal information is protected and is not sold to unauthorized third parties.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '18px',
              }}
            >
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreedTerms(true)
                  setShowPolicyModal(false)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#15803d',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Register