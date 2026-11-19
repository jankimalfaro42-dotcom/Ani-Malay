
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../App.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      setLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/users/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
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

    } catch (error) {
      console.error('Login error:', error)

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
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
