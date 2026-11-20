import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../App.css'

function Login() {
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoTaps, setLogoTaps] = useState(0)

  // Tap the Ani-Malay logo 5 times to open Admin Login
  const handleLogoTap = () => {
    const nextTap = logoTaps + 1

    setLogoTaps(nextTap)

    if (nextTap >= 5) {
      navigate('/admin/login')
    }
  }

  const checkCapsLock = (e) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'))
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    const cleanIdentifier = identifier.trim()

    if (!cleanIdentifier || !password) {
      setError('Please enter your email or mobile number and password.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/users/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identifier: cleanIdentifier,
            password: password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Login failed.')
        return
      }

      // Only consumer accounts are allowed here
      if (data.user?.role !== 'consumer') {
        setError('Please use the correct login page for your account.')
        return
      }

      // Save consumer login data
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Trigger login loading screen
      window.dispatchEvent(
        new Event('aniMalayLoginSuccess')
      )

      // Redirect consumer to homepage
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)

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
        <button
          type="button"
          onClick={handleLogoTap}
          aria-label="Ani-Malay logo"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <img
            src="/logo.jpg"
            alt="Ani-Malay Logo"
            className="auth-logo"
          />
        </button>

        <h2>Welcome to Ani-Malay</h2>

        <p>Login to your account</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email or Mobile Number</label>

            <input
              type="text"
              placeholder="Enter your email or mobile number (e.g. 0917...)"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <div className="password-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={checkCapsLock}
                onKeyDown={checkCapsLock}
                onFocus={checkCapsLock}
                onBlur={() => setCapsLockOn(false)}
                autoComplete="current-password"
                required
                style={{ width: '100%', paddingRight: '3.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {capsLockOn && (
              <small style={{ color: '#d97706', display: 'block', marginTop: '0.3rem' }}>
                Warning: Caps Lock is ON.
              </small>
            )}
          </div>

          <div className="forgot-password-link">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="register-text">
          Don't have an account?{' '}
          <Link to="/register">
            Register
          </Link>
        </p>
      </div>
    </section>
  )
}

export default Login