import { useState, useMemo } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
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

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [capsLockPassword, setCapsLockPassword] = useState(false)
  const [capsLockConfirm, setCapsLockConfirm] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])

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

    try {
      setLoading(true)

      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            contact_number: contactNumber.trim(),
            address: address.trim(),
            password: password,
            role: 'consumer',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Registration failed.')
        return
      }

      setSuccess('Account created successfully!')

      setFullName('')
      setEmail('')
      setContactNumber('')
      setAddress('')
      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      console.error('Registration error:', err)

      setError(
        'Unable to connect to the server. Please make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
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
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* LOGIN */}
        <p className="register-text">
          Already have an account?{' '}
          <Link to="/login">
            Login
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Register
