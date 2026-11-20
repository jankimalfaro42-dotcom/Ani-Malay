
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../App.css'
import './Crops.css'

function Crops() {
  const navigate = useNavigate()

  const [cropsProducts, setCropsProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // FETCH CROPS PRODUCTS
  useEffect(() => {
    const fetchCropsProducts = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          'https://ani-malay-production.up.railway.app/api/products'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to load crops products.'
          )
        }

        const crops = data.filter(
          (product) =>
            product.category_name?.trim().toLowerCase() === 'crops' &&
            product.status?.trim().toLowerCase() !== 'archived'
        )

        setCropsProducts(crops)
      } catch (error) {
        console.error('Error loading crops:', error)
        setError(error.message || 'Failed to load crops products.')
        setCropsProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchCropsProducts()
  }, [])

  // DYNAMIC SUBCATEGORIES
  const categories = useMemo(() => {
    const values = cropsProducts
      .map((product) => product.subcategory || product.product_type)
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean)

    return ['All', ...new Set(values)]
  }, [cropsProducts])

  // SEARCH AND CATEGORY FILTER
  const filteredProducts = useMemo(() => {
    return cropsProducts.filter((product) => {
      const productCategory =
        product.subcategory || product.product_type || ''

      const matchesCategory =
        selectedCategory === 'All' ||
        String(productCategory).trim().toLowerCase() ===
          selectedCategory.trim().toLowerCase()

      const search = searchTerm.trim().toLowerCase()

      const matchesSearch =
        !search ||
        product.product_name?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)

      return matchesCategory && matchesSearch
    })
  }, [cropsProducts, selectedCategory, searchTerm])

  // ADD TO CART
  const handleAddToCart = async (product) => {
    const savedUser = localStorage.getItem('user')

    if (!savedUser) {
      alert('Please login first.')
      navigate('/login')
      return
    }

    let user

    try {
      user = JSON.parse(savedUser)
    } catch (error) {
      console.error('User data error:', error)
      alert('Please login again.')
      navigate('/login')
      return
    }

    if (!user?.user_id) {
      alert('Please login again.')
      navigate('/login')
      return
    }

    if (Number(product.stock_quantity || 0) <= 0) {
      alert('This product is out of stock.')
      return
    }

    try {
      const response = await fetch(
        'https://ani-malay-production.up.railway.app/api/cart',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.user_id,
            product_id: product.product_id,
            quantity: 1,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to add product to cart.'
        )
      }

      alert('Product successfully added to cart!')
    } catch (error) {
      console.error('Add to cart error:', error)
      alert(error.message || 'Failed to add product to cart.')
    }
  }

  // PRODUCT IMAGE
  const getProductImage = (image) => {
    if (!image) return null

    if (image.startsWith('/uploads/')) {
      return `https://ani-malay-production.up.railway.app${image}`
    }

    return image
  }

  // PRICE FORMAT
  const formatPrice = (price) => {
    return `₱${Number(price || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // LOADING
  if (loading) {
    return (
      <main className="crops-page">
        <div className="crops-heading">
          <div>
            <h1>Crops</h1>
            <p>Loading crops products...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="crops-page">

      {/* SEARCH AND CATEGORIES */}
      <div className="crops-controls">

        <div className="crops-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search crops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="crops-categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`crops-category-btn ${
                selectedCategory === item ? 'active' : ''
              }`}
              onClick={() => setSelectedCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

      </div>

      {/* PAGE HEADING */}
      <div className="crops-heading">
        <div>
          <h1>Crops</h1>

          <p>
            Fresh agricultural crops sourced from local farmers in Malay.
          </p>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="crops-message error">
          <p>{error}</p>
        </div>
      )}

      {/* PRODUCT GRID */}
      {!error && (
        <div className="crops-grid">

          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const image = getProductImage(product.image)
              const stock = Number(product.stock_quantity || 0)

              return (
                <div
                  className="crops-card"
                  key={product.product_id}
                >

                  {/* PRODUCT IMAGE */}
                  <div className="crops-image">

                    {image ? (
                      <img
                        src={image}
                        alt={product.product_name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '45px' }}>
                        🌾
                      </div>
                    )}

                    <span>
                      {product.subcategory ||
                        product.product_type ||
                        'Crops'}
                    </span>

                  </div>

                  {/* PRODUCT INFORMATION */}
                  <div className="crops-info">

                    <div className="crops-category">
                      {product.subcategory ||
                        product.product_type ||
                        'Crops'}
                    </div>

                    <h2>{product.product_name}</h2>

                    {/* PRICE AND CART */}
                    <div className="crops-bottom">

                      <strong>
                        {formatPrice(product.price)}
                        {' / '}
                        {product.unit || 'kg'}
                      </strong>

                      <button
                        type="button"
                        className="crops-cart-btn"
                        aria-label={`Add ${product.product_name} to cart`}
                        onClick={() => handleAddToCart(product)}
                        disabled={stock <= 0}
                        title={stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      >
                        🛒
                      </button>

                    </div>

                  </div>

                </div>
              )
            })
          ) : (
            <div className="no-crops">
              <div style={{ fontSize: '40px' }}>🌾</div>

              <h3>No crops found</h3>

              <p>
                Try searching for another crop product.
              </p>
            </div>
          )}

        </div>
      )}

    </main>
  )
}

export default Crops
