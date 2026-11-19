
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        'http://localhost:5000/api/users/admin-login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Admin login failed.')
      }

      if (!data.token || data.user?.role !== 'admin') {
        throw new Error('Administrator account verification failed.')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      window.dispatchEvent(
        new Event('aniMalayLoginSuccess')
      )

      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f3f7f4',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          padding: '35px',
          borderRadius: '18px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '65px',
              height: '65px',
              borderRadius: '50%',
              background: '#e7f2eb',
              color: '#2d7752',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 15px',
            }}
          >
            <ShieldCheck size={34} />
          </div>

          <h2 style={{ color: '#2d7752', margin: '0 0 8px' }}>
            Admin Login
          </h2>

          <p style={{ color: '#777', margin: 0, fontSize: '14px' }}>
            Authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="admin-email"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#333',
            }}
          >
            Email Address
          </label>

          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter admin email"
            autoComplete="username"
            required
            style={{
              width: '100%',
              padding: '13px',
              border: '1px solid #ddd',
              borderRadius: '9px',
              marginBottom: '20px',
              boxSizing: 'border-box',
              fontSize: '15px',
            }}
          />

          <label
            htmlFor="admin-password"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#333',
            }}
          >
            Password
          </label>

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
              style={{
                width: '100%',
                padding: '13px 45px 13px 13px',
                border: '1px solid #ddd',
                borderRadius: '9px',
                boxSizing: 'border-box',
                fontSize: '15px',
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: '#777',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <p
              role="alert"
              style={{
                color: '#c62828',
                background: '#fff0f0',
                padding: '11px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '9px',
              background: loading ? '#8aab98' : '#2d7752',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying...' : 'Login as Administrator'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '22px' }}>
          <Link
            to="/login"
            style={{
              color: '#2d7752',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Back to Consumer Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
