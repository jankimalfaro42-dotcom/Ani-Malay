
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Package,
  RotateCcw,
  RefreshCw,
  Search,
  X,
  PhilippinePeso,
  Boxes,
} from 'lucide-react'
import './AdminArchivedProducts.css'

const API_URL = 'https://ani-malay-production.up.railway.app/api'
const SERVER_URL = 'https://ani-malay-production.up.railway.app'

function getProductId(product) {
  return product.product_id ?? product.id
}

function getProductImage(image) {
  if (!image || typeof image !== 'string') return ''

  const imagePath = image.trim()

  if (!imagePath) return ''

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }

  if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
    return `${SERVER_URL}/${imagePath.replace(/^\/+/, '')}`
  }

  if (imagePath.startsWith('/images/') || imagePath.startsWith('images/')) {
    return `/${imagePath.replace(/^\/+/, '')}`
  }

  return `${SERVER_URL}/${imagePath.replace(/^\/+/, '')}`
}

function AdminArchivedProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [restoringId, setRestoringId] = useState(null)

  const fetchArchivedProducts = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      const response = await fetch(`${API_URL}/products`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load products')
      }

      if (!Array.isArray(data)) {
        throw new Error('Invalid products response from server')
      }

      const archivedProducts = data.filter(product => {
        const status = String(product.status || '').toLowerCase()
        return status === 'archived' || product.is_archived === 1 ||
          product.is_archived === true
      })

      setProducts(archivedProducts)
    } catch (err) {
      console.error('Error loading archived products:', err)
      setError('Failed to load archived products. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchArchivedProducts()
  }, [fetchArchivedProducts])

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    if (!search) return products

    return products.filter(product =>
      [
        product.product_name,
        product.category_name,
        product.description,
      ].some(value => String(value || '').toLowerCase().includes(search))
    )
  }, [products, searchTerm])

  const handleRestore = async product => {
    const productId = getProductId(product)

    const confirmed = window.confirm(
      `Are you sure you want to restore "${product.product_name}"?`
    )

    if (!confirmed) return

    try {
      setRestoringId(productId)

      const response = await fetch(
        `${API_URL}/products/${productId}/restore`,
        { method: 'PUT' }
      )

      const responseText = await response.text()
      let result = {}

      try {
        result = responseText ? JSON.parse(responseText) : {}
      } catch {
        console.error('Backend returned non-JSON response:', responseText)
      }

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`)
      }

      setProducts(current =>
        current.filter(item => getProductId(item) !== productId)
      )

      window.alert('Product restored successfully!')
    } catch (err) {
      console.error('Error restoring product:', err)
      window.alert(err.message || 'Failed to restore product.')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="admin-page admin-archived-content">
      <main className="admin-main">
        <section className="archived-page">

          

          <div className="archived-toolbar">
            <div className="archived-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search archived products..."
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="archived-refresh-btn"
              onClick={() => fetchArchivedProducts(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={refreshing ? 'archived-spinning' : ''}
              />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {loading && (
            <div className="archived-state">
              <RefreshCw size={30} className="archived-spinning" />
              <h3>Loading archived products...</h3>
              <p>Please wait while we retrieve your products.</p>
            </div>
          )}

          {!loading && error && (
            <div className="archived-state">
              <Archive size={34} />
              <h3>Unable to Load Products</h3>
              <p>{error}</p>
              <button
                type="button"
                className="archived-retry-btn"
                onClick={() => fetchArchivedProducts()}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="archived-state">
              {searchTerm ? <Search size={36} /> : <Archive size={36} />}
              <h3>
                {searchTerm ? 'No Matching Products' : 'No Archived Products'}
              </h3>
              <p>
                {searchTerm
                  ? 'Try searching with a different product name or category.'
                  : 'Products you archive will appear here.'}
              </p>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <>
              <div className="archived-results">
                Showing <strong>{filteredProducts.length}</strong>
                {' '}archived {filteredProducts.length === 1 ? 'product' : 'products'}
              </div>

              <div className="archived-grid">
                {filteredProducts.map(product => {
                  const productId = getProductId(product)
                  const imageUrl = getProductImage(product.image)

                  return (
                    <article className="archived-card" key={productId}>
                      <div className="archived-card-image">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.product_name}
                            onError={event => {
                              event.currentTarget.style.display = 'none'
                              event.currentTarget.nextSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}

                        <div
                          className="archived-image-placeholder"
                          style={{ display: imageUrl ? 'none' : 'flex' }}
                        >
                          <Package size={38} />
                        </div>

                        <span className="archived-status-label">
                          <Archive size={13} />
                          Archived
                        </span>
                      </div>

                      <div className="archived-card-body">
                        <div className="archived-card-title">
                          <div>
                            <h3>{product.product_name}</h3>
                            <span>{product.category_name || 'Uncategorized'}</span>
                          </div>
                        </div>

                        <p className="archived-description">
                          {product.description || 'No description available.'}
                        </p>

                        <div className="archived-card-details">
                          <div>
                            <span>Price</span>
                            <strong>
                              ₱{Number(product.price || 0).toLocaleString(
                                'en-PH',
                                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                              )}
                            </strong>
                            <small>per {product.unit || 'unit'}</small>
                          </div>

                          <div>
                            <span>Available Stock</span>
                            <strong>
                              <Boxes size={16} />
                              {product.stock_quantity ?? 0}
                            </strong>
                            <small>Units</small>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="archived-restore-btn"
                          onClick={() => handleRestore(product)}
                          disabled={restoringId === productId}
                        >
                          <RotateCcw
                            size={17}
                            className={
                              restoringId === productId
                                ? 'archived-spinning'
                                : ''
                            }
                          />
                          {restoringId === productId
                            ? 'Restoring...'
                            : 'Restore Product'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminArchivedProducts
