
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import '../App.css'
import './Livestock.css'

function Livestock() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [livestockProducts, setLivestockProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  // FETCH LIVESTOCK PRODUCTS
  useEffect(() => {
    fetch('http://localhost:5000/api/products?status=active')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch livestock products')
        }

        return response.json()
      })
      .then((data) => {
        const filtered = data.filter(
          (product) =>
            product.category_name?.trim().toLowerCase() === 'livestock' &&
            product.status?.toLowerCase() !== 'archived'
        )

        setLivestockProducts(filtered)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Livestock error:', error)
        setLoading(false)
      })
  }, [])

  // ADD TO CART
  const handleAddToCart = async (product) => {
    const savedUser = localStorage.getItem('user')

    if (!savedUser) {
      alert('Please login first before adding products to your cart.')
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

    if (!user.user_id) {
      alert('User information is missing. Please login again.')
      navigate('/login')
      return
    }

    if (Number(product.stock_quantity) <= 0) {
      alert('This product is out of stock.')
      return
    }

    try {
      const response = await fetch('http://localhost:5000/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.user_id,
          product_id: product.product_id,
          quantity: 1,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add product to cart')
      }

      alert('Product added to cart successfully!')
    } catch (error) {
      console.error('Add to cart error:', error)
      alert(error.message || 'Failed to add product to cart.')
    }
  }

  // CATEGORIES
  const categories = [
    'All',
    ...new Set(
      livestockProducts.map((product) => product.category_name)
    ),
  ]

  // SEARCH AND CATEGORY FILTER
  const filteredProducts = livestockProducts.filter((product) => {
    const matchesSearch = product.product_name
      ?.toLowerCase()
      .includes(search.toLowerCase())

    const matchesCategory =
      category === 'All' || product.category_name === category

    return matchesSearch && matchesCategory
  })

  // LOADING
  if (loading) {
    return (
      <main className="livestock-page">
        <div className="livestock-heading">
          <div>
            <h1>Livestock</h1>
            <p>Loading livestock products...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="livestock-page">

      {/* SEARCH AND CATEGORIES */}
      <div className="livestock-controls">

        <div className="livestock-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search livestock..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="livestock-categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`livestock-category-btn ${
                category === item ? 'active' : ''
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

      </div>
      {/* PRODUCT GRID */}
      <div className="livestock-grid">

        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              className="livestock-card"
              key={product.product_id}
            >

              {/* PRODUCT IMAGE */}
              <div className="livestock-image">

                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.product_name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '45px' }}>
                    🐄
                  </div>
                )}

                <span>
                  {product.category_name}
                </span>

              </div>

              {/* PRODUCT INFORMATION */}
              <div className="livestock-info">

                <div className="livestock-category">
                  {product.category_name}
                </div>

                <h2>
                  {product.product_name}
                </h2>

                {/* PRICE AND CART */}
                <div className="livestock-bottom">

                  <strong>
                    ₱{Number(product.price).toFixed(2)}
                    {' / '}
                    {product.unit}
                  </strong>

                  <button
                    type="button"
                    className="livestock-cart-btn"
                    aria-label={`Add ${product.product_name} to cart`}
                    onClick={() => handleAddToCart(product)}
                    disabled={Number(product.stock_quantity) <= 0}
                    title={
                      Number(product.stock_quantity) <= 0
                        ? 'Out of stock'
                        : 'Add to cart'
                    }
                  >
                    🛒
                  </button>

                </div>

              </div>

            </div>
          ))
        ) : (
          <div className="no-livestock">

            <div style={{ fontSize: '40px' }}>
              🐄
            </div>

            <h3>No livestock found</h3>

            <p>
              Try searching for another livestock product.
            </p>

          </div>
        )}

      </div>

    </main>
  )
}

export default Livestock
