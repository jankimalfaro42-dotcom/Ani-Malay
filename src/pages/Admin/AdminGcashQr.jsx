import { useEffect, useState } from 'react'
import { notify } from '../../utils/notify'
import '../../App.css'

const API_URL = 'https://ani-malay-production.up.railway.app'
const LOCAL_GCASH_STORAGE_KEY = 'ani_malay_gcash_qr_config'

function getSavedGcashConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_GCASH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function AdminGcashQr() {
  const saved = getSavedGcashConfig()

  const [accountName, setAccountName] = useState(
    saved?.accountName ||
      saved?.account_name ||
      'Municipal Agriculture Office - LGU Malay'
  )
  const [accountNumber, setAccountNumber] = useState(
    saved?.accountNumber || saved?.account_number || ''
  )
  const [qrImage, setQrImage] = useState(
    saved?.qrImage || saved?.qr_image || saved?.qrUrl || saved?.qr_url || ''
  )
  const [qrFile, setQrFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const token = localStorage.getItem('token')

  useEffect(() => {
    let isMounted = true

    const fetchExistingConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/gcash-qr`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        })

        if (!res.ok) return

        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) return

        const data = await res.json()
        const payload = data?.data || data

        if (isMounted && payload && typeof payload === 'object') {
          if (payload.accountName || payload.account_name) {
            setAccountName(payload.accountName || payload.account_name)
          }
          if (payload.accountNumber || payload.account_number) {
            setAccountNumber(payload.accountNumber || payload.account_number)
          }
          const existingQr =
            payload.qrImage ||
            payload.qr_image ||
            payload.qrUrl ||
            payload.qr_url ||
            ''
          if (existingQr) {
            setQrImage(existingQr)
          }
        }
      } catch {
        // Keep localStorage / default state if backend route is not yet available
      }
    }

    fetchExistingConfig()

    return () => {
      isMounted = false
    }
  }, [token])

  const handleQrFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      notify(
        'warning',
        'File Too Large',
        'QR code image must not exceed 5 MB.'
      )
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify(
        'warning',
        'Invalid Image',
        'Please upload a JPG, PNG, or WEBP image.'
      )
      return
    }

    setQrFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setQrImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (isSaving) return

    if (!accountName.trim()) {
      notify(
        'warning',
        'Missing Account Name',
        'Please enter the LGU GCash account name.'
      )
      return
    }

    if (!accountNumber.trim()) {
      notify(
        'warning',
        'Missing GCash Number',
        'Please enter the LGU GCash mobile number.'
      )
      return
    }

    setIsSaving(true)

    const configToSave = {
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      qrImage: qrImage || '',
    }

    try {
      // Save locally so Checkout immediately displays updated QR, name, and number
      localStorage.setItem(
        LOCAL_GCASH_STORAGE_KEY,
        JSON.stringify(configToSave)
      )

      // Also attempt to sync with backend if /api/gcash-qr exists
      if (token) {
        try {
          if (qrFile) {
            const formData = new FormData()
            formData.append('account_name', configToSave.accountName)
            formData.append('account_number', configToSave.accountNumber)
            formData.append('qr_image', qrFile)

            await fetch(`${API_URL}/api/gcash-qr`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            })
          } else {
            await fetch(`${API_URL}/api/gcash-qr`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                account_name: configToSave.accountName,
                account_number: configToSave.accountNumber,
                qr_image: configToSave.qrImage,
              }),
            })
          }
        } catch {
          // Local save already succeeded
        }
      }

      notify(
        'success',
        'GCash QR Settings Saved',
        'The LGU GCash details and QR code are now updated for checkout.'
      )
    } catch (error) {
      console.error('Save GCash QR error:', error)
      notify(
        'error',
        'Save Failed',
        'Unable to save GCash QR settings.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const resolvedQrSrc = qrImage
    ? qrImage.startsWith('/uploads/')
      ? `${API_URL}${qrImage}`
      : qrImage
    : ''

  return (
    <section className="admin-gcash-page">
      <div className="admin-gcash-header">
        <span>ADMIN WORKSPACE</span>
        <h1>GCash QR Management</h1>
        <p>
          Configure the official LGU Malay GCash account name, mobile number,
          and QR code for advance shipping fee payments.
        </p>
      </div>

      <div className="admin-gcash-grid">
        <form className="admin-gcash-card" onSubmit={handleSave}>
          <h2>GCash Payment Details</h2>

          <div className="admin-gcash-field">
            <label htmlFor="gcashAccountName">LGU GCash Name</label>
            <input
              id="gcashAccountName"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., Municipal Agriculture Office - LGU Malay"
              required
            />
          </div>

          <div className="admin-gcash-field">
            <label htmlFor="gcashAccountNumber">LGU GCash Number</label>
            <input
              id="gcashAccountNumber"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g., 0917 123 4567"
              required
            />
          </div>

          <div className="admin-gcash-field">
            <label htmlFor="gcashQrUpload">Official LGU GCash QR Code</label>
            <input
              id="gcashQrUpload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleQrFileChange}
            />
            <small>
              Upload a clear JPG, PNG, or WEBP QR image (max 5 MB).
            </small>
          </div>

          <button
            type="submit"
            className="admin-gcash-save-btn"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save GCash QR Settings'}
          </button>
        </form>

        <aside className="admin-gcash-card admin-gcash-preview-card">
          <h2>Checkout Preview</h2>
          <p className="admin-gcash-preview-sub">
            Shown to consumers when they select a delivery area with a
            shipping fee.
          </p>

          <div className="admin-gcash-preview-meta">
            <p>
              <strong>GCash Name:</strong> {accountName || '—'}
            </p>
            <p>
              <strong>GCash Number:</strong> {accountNumber || '—'}
            </p>
          </div>

          <div className="admin-gcash-qr-box">
            {resolvedQrSrc ? (
              <img
                src={resolvedQrSrc}
                alt="LGU GCash QR Preview"
                className="admin-gcash-qr-img"
              />
            ) : (
              <div className="admin-gcash-qr-empty">
                No QR image uploaded yet
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

export default AdminGcashQr