import {
  useNavigate,
  useSearchParams,
  Navigate,
} from 'react-router-dom'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  UserRound,
  Bell,
  Package,
  MapPin,
  Settings,
  ShieldCheck,
  FileText,
  LogOut,
  ChevronRight,
  Wallet,
  Truck,
  Star,
  House,
  ShoppingBag,
  ShoppingCart,
  Camera,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  MapPinned,
  LoaderCircle,
} from 'lucide-react'

import '../App.css'
import './MyAccount.css'

const API_URL = 'https://ani-malay-production.up.railway.app'

const DELIVERY_AREAS = [
  { value: 'malay_mainland', label: 'Malay (Mainland)', fee: 0 },
  { value: 'boracay', label: 'Boracay Island', fee: 100 },
  { value: 'buruanga', label: 'Buruanga', fee: 200 },
  { value: 'tangalan', label: 'Tangalan', fee: 200 },
  { value: 'numancia', label: 'Numancia', fee: 200 },
  { value: 'lezo', label: 'Lezo', fee: 200 },
  { value: 'new_washington', label: 'New Washington', fee: 200 },
  { value: 'kalibo', label: 'Kalibo', fee: 200 },
]

const ADDRESS_LABELS = [
  'Home',
  'Work',
  'Hotel',
  'Business',
  'Other',
]

const EMPTY_ADDRESS = {
  recipient_name: '',
  contact_number: '',
  address_label: 'Home',
  delivery_area: '',
  complete_address: '',
  landmark: '',
  is_default: false,
}

function ProfileAvatar({ fullName, photoUrl, large = false, onError }) {
  return (
    <div className={`account-avatar ${large ? 'large' : ''}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${fullName}'s profile`}
          onError={onError}
        />
      ) : (
        <span>
          {fullName?.charAt(0)?.toUpperCase() || '👤'}
        </span>
      )}
    </div>
  )
}

function MyAccount() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const photoInputRef = useRef(null)

  const storedUser = localStorage.getItem('user')
  let initialUser = null
  if (storedUser) {
    try {
      initialUser = JSON.parse(storedUser)
    } catch (error) {
      console.error('Stored user parse error:', error)
      initialUser = null
    }
  }

  const [currentUser, setCurrentUser] = useState(initialUser)

  const currentSection = searchParams.get('section') || 'profile'

  // PROFILE PICTURE
  const [accountProfilePicture, setProfilePicture] = useState(
    initialUser?.profile_picture || ''
  )
  const [imgLoadFailed, setImgLoadFailed] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoMessage, setPhotoMessage] = useState('')
  const [photoError, setPhotoError] = useState(false)

  // SAVED ADDRESSES
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [addressMessage, setAddressMessage] = useState('')
  const [addressError, setAddressError] = useState(false)

  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS)
  const [savingAddress, setSavingAddress] = useState(false)

  // ACCOUNT NOTIFICATIONS
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [notificationError, setNotificationError] = useState('')

  // LOGOUT CONFIRMATION MODAL
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const getToken = () => localStorage.getItem('token')

  // SYNC LATEST USER PROFILE FROM BACKEND ON MOUNT
  useEffect(() => {
    const syncLatestUser = async () => {
      const token = getToken()
      if (!token) return

      try {
        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) return

        const data = await response.json()
        if (data?.user) {
          setCurrentUser(data.user)
          setProfilePicture(data.user.profile_picture || '')
          setImgLoadFailed(false)
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      } catch (error) {
        console.error('Failed to sync user profile:', error)
      }
    }

    syncLatestUser()
  }, [])

  // FETCH NOTIFICATIONS FOR ACCOUNT SECTION
  const fetchAccountNotifications = useCallback(async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      setNotificationError('Please log in again to view notifications.')
      setNotifications([])
      return
    }

    setLoadingNotifications(true)
    setNotificationError('')

    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load notifications.')
      }

      setNotifications(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Account notifications error:', error)
      setNotificationError(
        error.message || 'Unable to load notifications.'
      )
    } finally {
      setLoadingNotifications(false)
    }
  }, [])

  useEffect(() => {
    if (currentSection === 'notifications') {
      const timeoutId = window.setTimeout(fetchAccountNotifications, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [currentSection, fetchAccountNotifications])

  // FETCH SAVED ADDRESSES
  const fetchAddresses = useCallback(async () => {
    const token = localStorage.getItem('token')

    if (!token) {
      setAddressError(true)
      setAddressMessage('Please log in again to view your addresses.')
      return
    }

    setLoadingAddresses(true)
    setAddressMessage('')
    setAddressError(false)

    try {
      const response = await fetch(
        `${API_URL}/api/users/me/addresses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to load saved addresses.'
        )
      }

      setAddresses(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Fetch addresses error:', error)
      setAddressError(true)
      setAddressMessage(
        error.message || 'Unable to load saved addresses.'
      )
    } finally {
      setLoadingAddresses(false)
    }
  }, [])

  useEffect(() => {
    if (currentSection === 'addresses') {
      const timeoutId = window.setTimeout(fetchAddresses, 0)
      return () => window.clearTimeout(timeoutId)
    }
  }, [currentSection, fetchAddresses])

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  const photoUrl =
    accountProfilePicture && !imgLoadFailed
      ? accountProfilePicture.startsWith('http') ||
        accountProfilePicture.startsWith('data:')
        ? accountProfilePicture
        : `${API_URL}${accountProfilePicture}`
      : ''

  // LOGOUT
  const handleConfirmLogout = () => {
    setShowLogoutModal(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  // SECTION NAVIGATION
  const changeSection = (section) => {
    navigate(`/my-account?section=${section}`)
  }

  // PROFILE PICTURE UPLOAD
  const handlePhotoSelection = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    setPhotoMessage('')
    setPhotoError(false)

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      setPhotoError(true)
      setPhotoMessage('Please choose a JPG, PNG, or WEBP image.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(true)
      setPhotoMessage('Image must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    const token = getToken()

    if (!token) {
      setPhotoError(true)
      setPhotoMessage('Please log in again before uploading.')
      event.target.value = ''
      return
    }

    const formData = new FormData()
    formData.append('profile_picture', file)

    setUploadingPhoto(true)
    setPhotoMessage('Uploading your photo...')

    try {
      const response = await fetch(
        `${API_URL}/api/users/me/profile-picture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload photo.')
      }

      const updatedPicture = data.profile_picture

      setProfilePicture(updatedPicture)
      setImgLoadFailed(false)

      const updatedUser = {
        ...currentUser,
        profile_picture: updatedPicture,
      }

      setCurrentUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))

      setPhotoError(false)
      setPhotoMessage('Profile picture updated successfully!')
    } catch (error) {
      console.error('Profile picture upload error:', error)

      setPhotoError(true)
      setPhotoMessage(
        error.message || 'Unable to upload photo. Please try again.'
      )
    } finally {
      setUploadingPhoto(false)
      event.target.value = ''
    }
  }

  const handleNotificationClick = async (notification) => {
    const token = getToken()

    if (token && Number(notification.is_read) === 0) {
      try {
        await fetch(
          `${API_URL}/api/notifications/${notification.notification_id}/read`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        setNotifications((prev) =>
          prev.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: 1 }
              : item
          )
        )
      } catch (error) {
        console.error('Mark notification read error:', error)
      }
    }

    navigate('/orders')
  }

  // ADDRESS FORM
  const handleAddressInput = (event) => {
    const { name, value, type, checked } = event.target

    setAddressForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const openAddAddressForm = () => {
    setEditingAddressId(null)

    setAddressForm({
      ...EMPTY_ADDRESS,
      recipient_name: currentUser.full_name || '',
      contact_number: currentUser.contact_number || '',
      is_default: addresses.length === 0,
    })

    setAddressMessage('')
    setAddressError(false)
    setShowAddressForm(true)
  }

  const openEditAddressForm = (address) => {
    setEditingAddressId(address.address_id)

    setAddressForm({
      recipient_name: address.recipient_name || '',
      contact_number: address.contact_number || '',
      address_label: address.address_label || 'Home',
      delivery_area: address.delivery_area || '',
      complete_address: address.complete_address || '',
      landmark: address.landmark || '',
      is_default: Boolean(Number(address.is_default)),
    })

    setAddressMessage('')
    setAddressError(false)
    setShowAddressForm(true)
  }

  const closeAddressForm = () => {
    setShowAddressForm(false)
    setEditingAddressId(null)
    setAddressForm(EMPTY_ADDRESS)
  }

  // SAVE / UPDATE ADDRESS
  const handleAddressSubmit = async (event) => {
    event.preventDefault()

    const token = getToken()

    if (!token) {
      setAddressError(true)
      setAddressMessage('Please log in again before saving an address.')
      return
    }

    if (
      !addressForm.recipient_name.trim() ||
      !addressForm.contact_number.trim() ||
      !addressForm.address_label ||
      !addressForm.delivery_area ||
      !addressForm.complete_address.trim()
    ) {
      setAddressError(true)
      setAddressMessage('Please complete all required fields.')
      return
    }

    const payload = {
      recipient_name: addressForm.recipient_name.trim(),
      contact_number: addressForm.contact_number.trim(),
      address_label: addressForm.address_label,
      delivery_area: addressForm.delivery_area,
      complete_address: addressForm.complete_address.trim(),
      landmark: addressForm.landmark.trim(),
      is_default: addressForm.is_default,
    }

    setSavingAddress(true)
    setAddressMessage('')
    setAddressError(false)

    try {
      const isEditing = Boolean(editingAddressId)

      const url = isEditing
        ? `${API_URL}/api/users/me/addresses/${editingAddressId}`
        : `${API_URL}/api/users/me/addresses`

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to save delivery address.'
        )
      }

      closeAddressForm()
      await fetchAddresses()

      setAddressError(false)
      setAddressMessage(
        isEditing
          ? 'Delivery address updated successfully.'
          : 'Delivery address saved successfully.'
      )
    } catch (error) {
      console.error('Save address error:', error)
      setAddressError(true)
      setAddressMessage(
        error.message || 'Unable to save delivery address.'
      )
    } finally {
      setSavingAddress(false)
    }
  }

  // SET DEFAULT ADDRESS
  const handleSetDefault = async (addressId) => {
    const token = getToken()

    if (!token) {
      setAddressError(true)
      setAddressMessage('Please log in again.')
      return
    }

    try {
      setAddressMessage('')
      setAddressError(false)

      const response = await fetch(
        `${API_URL}/api/users/me/addresses/${addressId}/default`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to update default address.'
        )
      }

      await fetchAddresses()

      setAddressMessage('Default delivery address updated successfully.')
    } catch (error) {
      console.error('Set default address error:', error)
      setAddressError(true)
      setAddressMessage(
        error.message || 'Unable to update default address.'
      )
    }
  }

  // DELETE ADDRESS
  const handleDeleteAddress = async (addressId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this saved delivery address?'
    )

    if (!confirmed) return

    const token = getToken()

    if (!token) {
      setAddressError(true)
      setAddressMessage('Please log in again.')
      return
    }

    try {
      setAddressMessage('')
      setAddressError(false)

      const response = await fetch(
        `${API_URL}/api/users/me/addresses/${addressId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to delete saved address.'
        )
      }

      await fetchAddresses()

      setAddressMessage('Delivery address deleted successfully.')
    } catch (error) {
      console.error('Delete address error:', error)
      setAddressError(true)
      setAddressMessage(
        error.message || 'Unable to delete saved address.'
      )
    }
  }

  // ACCOUNT MENU
  const accountItems = [
    {
      id: 'profile',
      icon: UserRound,
      title: 'My Profile',
      description: 'Personal information',
    },
    {
      id: 'addresses',
      icon: MapPin,
      title: 'My Addresses',
      description: 'Manage delivery addresses',
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Order updates and alerts',
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Settings',
      description: 'Account preferences',
    },
    {
      id: 'security',
      icon: ShieldCheck,
      title: 'Security',
      description: 'Password and account security',
    },
    {
      id: 'terms-privacy',
      icon: FileText,
      title: 'Terms & Privacy',
      description: 'Terms and conditions and privacy policy',
    },
  ]

  const sectionTitles = {
    profile: 'My Profile',
    purchases: 'My Purchases',
    addresses: 'My Addresses',
    notifications: 'Notifications',
    settings: 'Settings',
    security: 'Security',
    'terms-privacy': 'Terms & Privacy',
  }

  const isDashboard = currentSection === 'profile'

  const getAreaLabel = (areaValue) => {
    return (
      DELIVERY_AREAS.find((area) => area.value === areaValue)?.label ||
      areaValue
    )
  }

  const getAddressIcon = (label) => {
    if (label === 'Home') return House
    if (label === 'Hotel') return MapPinned
    if (label === 'Work' || label === 'Business') return ShoppingBag
    return MapPin
  }

  return (
    <section className="my-account-page">
      <div className="my-account-container">

        {/* INNER PAGE HEADER */}
        {!isDashboard && (
          <div className="account-inner-header">
            <button
              type="button"
              className="account-back-button"
              onClick={() => changeSection('profile')}
            >
              <ArrowLeft size={19} />
              <span>My Account</span>
            </button>

            <h1>{sectionTitles[currentSection] || 'My Account'}</h1>
          </div>
        )}

        {/* DASHBOARD */}
        {isDashboard && (
          <>
            <div className="account-welcome-card">
              <div className="account-welcome-info">
                <ProfileAvatar
                  fullName={currentUser.full_name}
                  photoUrl={photoUrl}
                  large
                  onError={() => setImgLoadFailed(true)}
                />

                <div className="account-welcome-text">
                  <span className="account-greeting">Welcome back!</span>
                  <h1>{currentUser.full_name}</h1>
                  <span className="account-role">
                    {currentUser.role === 'admin'
                      ? 'Administrator Account'
                      : 'Consumer Account'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="account-profile-arrow"
                onClick={() => changeSection('profile')}
                aria-label="View profile"
              >
                <ChevronRight size={23} />
              </button>
            </div>

            {/* MY PURCHASES */}
            <section className="account-section">
              <div className="account-section-heading">
                <div>
                  <h2>My Purchases</h2>
                  <p>Track and manage your orders</p>
                </div>

                <button
                  type="button"
                  className="account-view-all"
                  onClick={() => navigate('/orders')}
                >
                  View All
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="account-purchase-card">
                <button
                  type="button"
                  onClick={() => navigate('/orders?status=pending')}
                >
                  <span className="purchase-icon">
                    <Wallet size={23} />
                  </span>
                  <strong>To Pay</strong>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/orders?status=processing')}
                >
                  <span className="purchase-icon">
                    <Package size={23} />
                  </span>
                  <strong>To Process</strong>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/orders?status=out_for_delivery')}
                >
                  <span className="purchase-icon">
                    <Truck size={23} />
                  </span>
                  <strong>To Receive</strong>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/orders?status=completed')}
                >
                  <span className="purchase-icon">
                    <Star size={23} />
                  </span>
                  <strong>Completed</strong>
                </button>
              </div>
            </section>

            {/* ACCOUNT MANAGEMENT */}
            <section className="account-section">
              <div className="account-section-heading">
                <div>
                  <h2>Account Management</h2>
                  <p>Manage your personal account</p>
                </div>
              </div>

              <div className="account-management-card">
                {accountItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      type="button"
                      className="account-management-item"
                      key={item.id}
                      onClick={() => changeSection(item.id)}
                    >
                      <span className="account-management-icon">
                        <Icon size={21} />
                      </span>

                      <span className="account-management-details">
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                      </span>

                      <ChevronRight
                        className="account-item-chevron"
                        size={19}
                      />
                    </button>
                  )
                })}

                <button
                  type="button"
                  className="account-management-item account-logout-item"
                  onClick={() => setShowLogoutModal(true)}
                >
                  <span className="account-management-icon">
                    <LogOut size={21} />
                  </span>

                  <span className="account-management-details">
                    <strong>Logout</strong>
                    <small>Sign out of your account</small>
                  </span>

                  <ChevronRight
                    className="account-item-chevron"
                    size={19}
                  />
                </button>
              </div>
            </section>
          </>
        )}

        {/* MY PROFILE */}
        {currentSection === 'profile' && (
          <section className="account-content-card account-profile-details">
            <div className="account-content-heading">
              <div>
                <h2>Personal Information</h2>
                <p>Your account details</p>
              </div>

              <button
                type="button"
                className="account-edit-button"
                onClick={() => navigate('/my-account/edit-profile')}
              >
                Edit Profile
              </button>
            </div>

            <div className="account-profile-photo">
              <ProfileAvatar
                fullName={currentUser.full_name}
                photoUrl={photoUrl}
                large
                onError={() => setImgLoadFailed(true)}
              />

              <div>
                <h3>Profile Picture</h3>
                <p>Personalize your Ani-Malay account.</p>
                <span>JPG, PNG, or WEBP · Maximum 5 MB</span>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelection}
                  hidden
                />

                <button
                  type="button"
                  className="account-photo-button"
                  disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera size={16} />
                  {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                </button>

                {photoMessage && (
                  <p
                    className={`account-photo-message ${
                      photoError ? 'error' : ''
                    }`}
                    role="status"
                  >
                    {photoMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="account-information-list">
              <div>
                <span>Full Name</span>
                <strong>{currentUser.full_name || 'Not provided'}</strong>
              </div>

              <div>
                <span>Email Address</span>
                <strong>{currentUser.email || 'Not provided'}</strong>
              </div>

              <div>
                <span>Contact Number</span>
                <strong>{currentUser.contact_number || 'Not provided'}</strong>
              </div>

              <div>
                <span>Address</span>
                <strong>{currentUser.address || 'Not provided'}</strong>
              </div>

              <div>
                <span>Account Type</span>
                <strong>
                  {currentUser.role === 'admin' ? 'Administrator' : 'Consumer'}
                </strong>
              </div>
            </div>
          </section>
        )}

        {/* MY PURCHASES */}
        {currentSection === 'purchases' && (
          <section className="account-content-card">
            <div className="account-content-heading">
              <div>
                <h2>My Purchases</h2>
                <p>View and manage your current orders.</p>
              </div>
            </div>

            <div className="account-purchase-card inner-purchase-card">
              <button onClick={() => navigate('/orders?status=pending')}>
                <span className="purchase-icon">
                  <Wallet size={23} />
                </span>
                <strong>To Pay</strong>
              </button>

              <button onClick={() => navigate('/orders?status=processing')}>
                <span className="purchase-icon">
                  <Package size={23} />
                </span>
                <strong>To Process</strong>
              </button>

              <button onClick={() => navigate('/orders?status=out_for_delivery')}>
                <span className="purchase-icon">
                  <Truck size={23} />
                </span>
                <strong>To Receive</strong>
              </button>

              <button onClick={() => navigate('/orders?status=completed')}>
                <span className="purchase-icon">
                  <Star size={23} />
                </span>
                <strong>Completed</strong>
              </button>
            </div>

            <button
              type="button"
              className="account-main-button"
              onClick={() => navigate('/orders')}
            >
              View All Orders
            </button>
          </section>
        )}

        {/* MY ADDRESSES */}
        {currentSection === 'addresses' && (
          <section className="account-content-card account-addresses-section">

            <div className="account-content-heading">
              <div>
                <h2>My Delivery Addresses</h2>
                <p>
                  Save your home, workplace, hotel, or other delivery
                  locations.
                </p>
              </div>

              {!showAddressForm && (
                <button
                  type="button"
                  className="account-edit-button"
                  onClick={openAddAddressForm}
                >
                  <Plus size={17} />
                  Add Address
                </button>
              )}
            </div>

            {/* ADDRESS MESSAGE */}
            {addressMessage && (
              <div
                className={`address-feedback ${
                  addressError ? 'error' : 'success'
                }`}
                role="status"
              >
                {addressError ? (
                  <X size={17} />
                ) : (
                  <Check size={17} />
                )}

                <span>{addressMessage}</span>
              </div>
            )}

            {/* ADD / EDIT FORM */}
            {showAddressForm && (
              <form
                className="saved-address-form"
                onSubmit={handleAddressSubmit}
              >
                <div className="saved-address-form-heading">
                  <div>
                    <h3>
                      {editingAddressId
                        ? 'Edit Delivery Address'
                        : 'Add New Address'}
                    </h3>

                    <p>
                      Enter the recipient and delivery information.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="address-close-button"
                    onClick={closeAddressForm}
                    aria-label="Close address form"
                    disabled={savingAddress}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="saved-address-form-grid">

                  <label className="saved-address-field">
                    <span>Recipient Full Name *</span>

                    <input
                      type="text"
                      name="recipient_name"
                      value={addressForm.recipient_name}
                      onChange={handleAddressInput}
                      placeholder="Enter recipient's full name"
                      maxLength={100}
                      required
                    />
                  </label>

                  <label className="saved-address-field">
                    <span>Mobile Number *</span>

                    <input
                      type="tel"
                      name="contact_number"
                      value={addressForm.contact_number}
                      onChange={handleAddressInput}
                      placeholder="09XXXXXXXXX"
                      maxLength={20}
                      required
                    />
                  </label>

                  <label className="saved-address-field">
                    <span>Address Label *</span>

                    <select
                      name="address_label"
                      value={addressForm.address_label}
                      onChange={handleAddressInput}
                      required
                    >
                      {ADDRESS_LABELS.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="saved-address-field">
                    <span>Delivery Area *</span>

                    <select
                      name="delivery_area"
                      value={addressForm.delivery_area}
                      onChange={handleAddressInput}
                      required
                    >
                      <option value="">Select delivery area</option>

                      {DELIVERY_AREAS.map((area) => (
                        <option key={area.value} value={area.value}>
                          {area.label} — ₱{area.fee} delivery fee
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="saved-address-field full">
                    <span>Complete Address *</span>

                    <textarea
                      name="complete_address"
                      value={addressForm.complete_address}
                      onChange={handleAddressInput}
                      placeholder="House number, street, barangay, municipality, province..."
                      rows={3}
                      maxLength={255}
                      required
                    />
                  </label>

                  <label className="saved-address-field full">
                    <span>Landmark (Optional)</span>

                    <input
                      type="text"
                      name="landmark"
                      value={addressForm.landmark}
                      onChange={handleAddressInput}
                      placeholder="Example: Near the town plaza"
                      maxLength={255}
                    />
                  </label>

                </div>

                <label className="saved-address-default-option">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={addressForm.is_default}
                    onChange={handleAddressInput}
                  />

                  <span>
                    <strong>Set as default address</strong>
                    <small>
                      Use this address automatically for future orders.
                    </small>
                  </span>
                </label>

                <div className="saved-address-form-actions">
                  <button
                    type="button"
                    className="address-cancel-button"
                    onClick={closeAddressForm}
                    disabled={savingAddress}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="address-save-button"
                    disabled={savingAddress}
                  >
                    {savingAddress ? (
                      <>
                        <LoaderCircle size={17} className="address-spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={17} />
                        {editingAddressId ? 'Save Changes' : 'Save Address'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ADDRESS LOADING */}
            {loadingAddresses && (
              <div className="address-loading-state">
                <LoaderCircle size={30} className="address-spinner" />
                <p>Loading your saved addresses...</p>
              </div>
            )}

            {/* ADDRESS LIST */}
            {!loadingAddresses && addresses.length > 0 && (
              <div className="saved-address-list">
                {addresses.map((address) => {
                  const AddressIcon = getAddressIcon(address.address_label)

                  const isDefault = Number(address.is_default) === 1

                  return (
                    <article
                      className={`saved-address-card ${
                        isDefault ? 'default-address' : ''
                      }`}
                      key={address.address_id}
                    >
                      <div className="saved-address-card-top">
                        <div className="saved-address-title">
                          <span className="saved-address-icon">
                            <AddressIcon size={21} />
                          </span>

                          <div>
                            <h3>{address.address_label}</h3>

                            <span className="saved-address-recipient">
                              {address.recipient_name}
                            </span>
                          </div>
                        </div>

                        {isDefault && (
                          <span className="default-address-badge">
                            <Check size={13} />
                            Default
                          </span>
                        )}
                      </div>

                      <div className="saved-address-details">
                        <p>
                          <strong>Mobile:</strong>{' '}
                          {address.contact_number}
                        </p>

                        <p>
                          <strong>Area:</strong>{' '}
                          {getAreaLabel(address.delivery_area)}
                        </p>

                        <p>
                          <strong>Address:</strong>{' '}
                          {address.complete_address}
                        </p>

                        {address.landmark && (
                          <p>
                            <strong>Landmark:</strong>{' '}
                            {address.landmark}
                          </p>
                        )}
                      </div>

                      <div className="saved-address-card-actions">
                        {!isDefault && (
                          <button
                            type="button"
                            className="address-default-button"
                            onClick={() =>
                              handleSetDefault(address.address_id)
                            }
                          >
                            <Check size={15} />
                            Set as Default
                          </button>
                        )}

                        <button
                          type="button"
                          className="address-action-button"
                          onClick={() => openEditAddressForm(address)}
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="address-delete-button"
                          onClick={() =>
                            handleDeleteAddress(address.address_id)
                          }
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {/* EMPTY STATE */}
            {!loadingAddresses &&
              addresses.length === 0 &&
              !showAddressForm &&
              !addressError && (
                <div className="account-empty-state">
                  <MapPin size={35} />

                  <h3>No Saved Addresses Yet</h3>

                  <p>
                    Add your home, work, hotel, or business address
                    to make your next checkout faster.
                  </p>

                  <button
                    type="button"
                    className="address-save-button"
                    onClick={openAddAddressForm}
                  >
                    <Plus size={17} />
                    Add Your First Address
                  </button>
                </div>
              )}

            {/* RETRY */}
            {!loadingAddresses && addressError && addresses.length === 0 && (
              <div className="account-empty-state">
                <MapPin size={35} />

                <h3>Unable to Load Addresses</h3>

                <p>Please check your connection and try again.</p>

                <button
                  type="button"
                  className="address-save-button"
                  onClick={fetchAddresses}
                >
                  Try Again
                </button>
              </div>
            )}

          </section>
        )}

        {/* NOTIFICATIONS */}
        {currentSection === 'notifications' && (
          <section className="account-content-card">
            <div className="account-content-heading">
              <div>
                <h2>Notifications</h2>
                <p>Stay updated with your Ani-Malay orders.</p>
              </div>
            </div>

            {loadingNotifications && (
              <div className="account-empty-state">
                <LoaderCircle size={30} className="address-spinner" />
                <p>Loading your notifications...</p>
              </div>
            )}

            {!loadingNotifications && notificationError && (
              <div className="account-empty-state">
                <Bell size={35} />
                <h3>Unable to Load Notifications</h3>
                <p>{notificationError}</p>
                <button
                  type="button"
                  className="address-save-button"
                  onClick={fetchAccountNotifications}
                >
                  Try Again
                </button>
              </div>
            )}

            {!loadingNotifications &&
              !notificationError &&
              notifications.length === 0 && (
                <div className="account-empty-state">
                  <Bell size={35} />
                  <h3>No Notifications Yet</h3>
                  <p>
                    Order confirmations and delivery updates will appear here.
                  </p>
                </div>
              )}

            {!loadingNotifications &&
              !notificationError &&
              notifications.length > 0 && (
                <div className="account-notifications-list">
                  {notifications.map((notification) => {
                    const isUnread = Number(notification.is_read) === 0
                    return (
                      <button
                        type="button"
                        key={notification.notification_id}
                        className={`account-notification-item ${
                          isUnread ? 'unread' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div>
                          <strong>{notification.title}</strong>
                          <p>{notification.message}</p>
                          <span>
                            {new Date(
                              notification.created_at
                            ).toLocaleString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
          </section>
        )}

        {/* SETTINGS */}
        {currentSection === 'settings' && (
          <section className="account-content-card">
            <div className="account-content-heading">
              <div>
                <h2>Settings</h2>
                <p>Manage your Ani-Malay account preferences.</p>
              </div>
            </div>

            <div className="account-empty-state">
              <Settings size={35} />
              <h3>Account Settings</h3>
              <p>Your account preferences will be available here.</p>
            </div>
          </section>
        )}

        {/* SECURITY */}
        {currentSection === 'security' && (
          <section className="account-content-card">
            <div className="account-content-heading">
              <div>
                <h2>Security</h2>
                <p>Manage your account password and security.</p>
              </div>
            </div>

            <div className="account-security-list">
              <button
                type="button"
                onClick={() => navigate('/change-password')}
              >
                <ShieldCheck size={22} />

                <span>
                  <strong>Change Password</strong>
                  <small>Change your current account password.</small>
                </span>

                <ChevronRight size={19} />
              </button>

              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
              >
                <ShieldCheck size={22} />

                <span>
                  <strong>Forgot Password</strong>
                  <small>
                    Reset your password if you cannot remember it.
                  </small>
                </span>

                <ChevronRight size={19} />
              </button>
            </div>
          </section>
        )}

        {/* TERMS & PRIVACY */}
        {currentSection === 'terms-privacy' && (
          <section className="account-content-card">
            <div className="account-content-heading">
              <div>
                <h2>Terms & Conditions and Privacy Policy</h2>
                <p>Platform rules and how we protect your personal information.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#15803d', fontSize: '16px' }}>
                  1. Terms and Conditions
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '13.5px', lineHeight: 1.6, color: '#374151' }}>
                  By using <strong>Ani-Malay</strong>, you agree to provide accurate personal, contact, and delivery information for agricultural product orders within supported areas in and around the Municipality of Malay.
                </p>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.6, color: '#374151' }}>
                  <li>Ensure your contact number and delivery address are accurate so orders can be delivered smoothly.</li>
                  <li>Honor confirmed orders and payment terms upon delivery or checkout.</li>
                  <li>Avoid fraudulent orders, false information, or unauthorized use of the platform.</li>
                </ul>
              </div>

              <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginTop: 0, marginBottom: '8px', color: '#15803d', fontSize: '16px' }}>
                  2. Privacy Policy
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '13.5px', lineHeight: 1.6, color: '#374151' }}>
                  We value your privacy and handle your personal data in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).
                </p>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.6, color: '#374151' }}>
                  <li><strong>Data Collected:</strong> Full name, email address, mobile contact number, delivery addresses, and order details.</li>
                  <li><strong>How It Is Used:</strong> For email OTP account verification, order fulfillment, delivery updates, and customer support.</li>
                  <li><strong>Data Protection:</strong> Passwords are hashed and your information is never sold to unauthorized third parties.</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* INVALID SECTION */}
        {!accountItems.some((item) => item.id === currentSection) &&
          !['purchases'].includes(currentSection) && (
            <section className="account-content-card">
              <h2>Page Not Found</h2>

              <button
                type="button"
                className="account-main-button"
                onClick={() => changeSection('profile')}
              >
                Back to My Account
              </button>
            </section>
          )}

      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div
          className="logout-modal-backdrop"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="logout-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Log out of your account?</h3>
            <p>Are you sure you want to log out of Ani-Malay?</p>

            <div className="logout-modal-actions">
              <button
                type="button"
                className="logout-cancel-btn"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="logout-confirm-btn"
                onClick={handleConfirmLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="account-bottom-nav">
        <button type="button" onClick={() => navigate('/')}>
          <House size={21} />
          <span>Home</span>
        </button>

        <button type="button" onClick={() => navigate('/products')}>
          <ShoppingBag size={21} />
          <span>Products</span>
        </button>

        <button type="button" onClick={() => navigate('/cart')}>
          <ShoppingCart size={21} />
          <span>Cart</span>
        </button>

        <button type="button" className="active">
          <UserRound size={21} />
          <span>Account</span>
        </button>
      </nav>
    </section>
  )
}

export default MyAccount