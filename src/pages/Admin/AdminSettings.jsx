
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import './AdminSettings.css'

function AdminSettings() {
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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

    if (currentPassword === newPassword) {
      setError('New password must be different from your current password.')
      return
    }

    const token = localStorage.getItem('token')

    if (!token) {
      setError('Please log in again.')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/users/admin/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Unable to change password.')
        return
      }

      setMessage('Admin password changed successfully!')

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-settings-page">
      <div className="admin-settings-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your administrator account security.</p>
        </div>
      </div>

      <div className="admin-settings-card">
        <div className="admin-settings-card-heading">
          <div className="admin-settings-icon">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h3>Change Password</h3>
            <p>Update your password to keep your account secure.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-settings-field">
            <label>Current Password</label>
            <div className="admin-settings-input">
              <Lock size={18} />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="admin-settings-field">
            <label>New Password</label>
            <div className="admin-settings-input">
              <Lock size={18} />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="admin-settings-field">
            <label>Confirm New Password</label>
            <div className="admin-settings-input">
              <Lock size={18} />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p className="admin-settings-hint">
            Your new password must contain at least 8 characters.
          </p>

          {error && <p className="admin-settings-error">{error}</p>}
          {message && <p className="admin-settings-success">{message}</p>}

          <button
            type="submit"
            className="admin-settings-save"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminSettings
