
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ShoppingCart,
  Fish,
} from 'lucide-react'

import '../App.css'
import './Fisheries.css'
import {notify} from '../utils/notify'
function Fisheries() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [fisheriesProducts, setFisheriesProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    fetch('https://ani-malay-production.up.railway.app/api/products')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch fisheries products')
        }

        return response.json()
      })
      .then((data) => {
        const databaseFisheries = data.filter(
          (product) =>
            product.category_name?.trim().toLowerCase() === 'fisheries' &&
            product.status?.toLowerCase() !== 'archived'
        )

        const products = databaseFisheries.map((product) => ({
          product_id: product.product_id,
          name: product.product_name,
          category: product.category_name || 'Fisheries',

          price:
            product.price !== null && product.price !== undefined
              ? `₱${Number(product.price).toFixed(2)} / ${product.unit || 'kg'}`
              : 'Price unavailable',

          image: product.image
            ? product.image.startsWith('/uploads/')
              ? `https://ani-malay-production.up.railway.app${product.image}`
              : product.image
            : null,

          stock_quantity: Number(product.stock_quantity) || 0,
          description: product.description || '',
        }))

        setFisheriesProducts(products)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Fisheries error:', error)
        setLoading(false)
      })
  }, [])

  // ADD TO CART
  const handleAddToCart = async (product) => {
    if (!product.product_id) {
      notify('warning', 'Product Unavailable', `${product.name} is not yet available in the database.`)
      return
    }

    const savedUser = localStorage.getItem('user')

    if (!savedUser) {
      notify('warning', 'Login Required', 'Please log in first.')
      navigate('/login')
      return
    }

    let user

    try {
      user = JSON.parse(savedUser)
    } catch (error) {
      console.error('User data error:', error)
      notify('warning', 'Session Expired', 'Please log in again.')
      navigate('/login')
      return
    }

    if (!user.user_id) {
      notify('warning', 'Login Required', 'Please log in again.')
      navigate('/login')
      return
    }

    if (product.stock_quantity <= 0) {
      notify('warning', 'Out of Stock', 'This product is currently out of stock.')
      return
    }

    try {
      const response = await fetch('https://ani-malay-production.up.railway.app/api/cart', {
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

      notify('success', 'Product Added', `${product.name} successfully added to cart!`)

    } catch (error) {
      console.error('Add to cart error:', error)
      notify('error', 'Failed to Add Product', error.message || 'Failed to add product to cart.')
    }
  }

  // CATEGORIES
  const categories = [
    'All',
    ...new Set(
      fisheriesProducts.map((product) => product.category)
    ),
  ]

  // SEARCH + CATEGORY FILTERING
  const filteredProducts = fisheriesProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesCategory =
      category === 'All' || product.category === category

    return matchesSearch && matchesCategory
  })

  // LOADING
  if (loading) {
    return (
      <main className="fisheries-page">
        <div className="fisheries-heading">
          <div>
            <h1>Fisheries</h1>
            <p>Loading fisheries products...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="fisheries-page">

      {/* SEARCH AND CATEGORIES */}
      <div className="fisheries-controls">

        <div className="fisheries-search">
          <Search size={19} strokeWidth={2} />

          <input
            type="text"
            placeholder="Search fisheries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="fisheries-categories">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`fisheries-category-btn ${
                category === item ? 'active' : ''
              }`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

      </div>

      {/* PAGE HEADING */}
      <div className="fisheries-heading">
        <div>
          <h1>Fisheries</h1>
          <p>
            Fresh and quality fish products sourced from local fishermen in Malay.
          </p>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="fisheries-grid">

        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              className="fisheries-card"
              key={product.product_id}
            >

              {/* IMAGE */}
              <div className="fisheries-image">

                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="fisheries-image-placeholder">
                    <Fish size={46} strokeWidth={1.5} />
                  </div>
                )}

                <span>{product.category}</span>

              </div>

              {/* PRODUCT INFO */}
              <div className="fisheries-info">

                <div className="fisheries-category">
                  {product.category}
                </div>

                <h2>{product.name}</h2>

                {product.description && (
                  <p>{product.description}</p>
                )}

                {/* STOCK */}
                <small>
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} in stock`
                    : 'Out of stock'}
                </small>

                {/* PRICE + CART */}
                <div className="fisheries-bottom">

                  <strong>{product.price}</strong>

                  <button
                    type="button"
                    className="fisheries-cart-btn"
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock_quantity <= 0}
                  >
                    <ShoppingCart size={19} strokeWidth={2} />
                  </button>

                </div>

              </div>

            </div>
          ))
        ) : (
          <div className="no-fisheries">
            <Fish size={40} strokeWidth={1.5} />

            <h3>No fisheries found</h3>

            <p>
              Try searching for another fisheries product.
            </p>
          </div>
        )}

      </div>

    </main>
  )
}

export default Fisheries
