
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

function AdminRoute({ children }) {
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    const verifyAdmin = async () => {
      const token = localStorage.getItem('token')

      if (!token) {
        if (isMounted) {
          setIsAdmin(false)
          setChecking(false)
        }
        return
      }

      try {
        const response = await fetch(
          'https://ani-malay-production.up.railway.app/api/users/me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')

          if (isMounted) {
            setIsAdmin(false)
            setChecking(false)
          }
          return
        }

        const data = await response.json()

        const adminVerified =
          data.user?.role === 'admin' &&
          data.user?.status === 'active'

        if (isMounted) {
          setIsAdmin(adminVerified)
          setChecking(false)
        }
      } catch (error) {
        console.error('Admin verification error:', error)

        if (isMounted) {
          setIsAdmin(false)
          setChecking(false)
        }
      }
    }

    verifyAdmin()

    return () => {
      isMounted = false
    }
  }, [])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
      }}>
        Verifying administrator access...
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default AdminRoute
