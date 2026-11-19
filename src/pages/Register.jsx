import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

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

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()

    setError('')
    setSuccess('')

    // CHECK PASSWORD
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // CHECK PASSWORD LENGTH
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        'http://localhost:5000/api/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: fullName,
            email: email,
            contact_number: contactNumber,
            address: address,
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

      // CLEAR FORM
      setFullName('')
      setEmail('')
      setContactNumber('')
      setAddress('')
      setPassword('')
      setConfirmPassword('')

      // GO TO LOGIN
      setTimeout(() => {
        navigate('/login')
      }, 1500)

    } catch (error) {
      console.error('Registration error:', error)

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
              placeholder="Enter your contact number"
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
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />
                }
              </button>

            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="form-group">
            <label>Confirm Password</label>

            <div className="password-input">

              <input
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />
                }
              </button>

            </div>
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
            {loading
              ? 'Creating Account...'
              : 'Register'}
          </button>

        </form>

        {/* LOGIN */}
        <p className="register-text">

          Already have an account?{' '}

          <a href="/login">
            Login
          </a>

        </p>

      </div>

    </section>
  )
}

export default Register