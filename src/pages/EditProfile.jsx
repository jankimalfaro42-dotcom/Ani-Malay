import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function EditProfile() {

  const navigate = useNavigate()

  const storedUser = localStorage.getItem('user')
  const user = storedUser ? JSON.parse(storedUser) : null

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [contactNumber, setContactNumber] = useState(user?.contact_number || '')
  const [address, setAddress] = useState(user?.address || '')

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  const handleSubmit = async (e) => {

    e.preventDefault()

    setMessage('')
    setError('')

    try {

      setLoading(true)

      const response = await fetch(
        `http://localhost:5000/api/users/${user.user_id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            contact_number: contactNumber.trim(),
            address: address.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Failed to update profile.')
        return
      }

      const updatedUser = {
        ...user,
        full_name: fullName.trim(),
        email: email.trim(),
        contact_number: contactNumber.trim(),
        address: address.trim(),
      }

      localStorage.setItem(
        'user',
        JSON.stringify(updatedUser)
      )

      setMessage('Profile updated successfully!')

    } catch (error) {

      console.error('❌ Update profile error:', error)

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

          <h2>Edit Profile</h2>

          <p>
            Update your personal information.
          </p>

        </div>


        <form onSubmit={handleSubmit}>

          <div className="edit-profile-grid">

            <div className="form-group">

              <label>Full Name</label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

            </div>


            <div className="form-group">

              <label>Email Address</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

            </div>


            <div className="form-group">

              <label>Contact Number</label>

              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />

            </div>


            <div className="form-group">

              <label>Address</label>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />

            </div>

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
                navigate('/my-account')
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="account-primary-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

          </div>

        </form>

      </div>

    </section>
  )
}

export default EditProfile
