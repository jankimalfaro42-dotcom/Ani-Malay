
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Wheat,
  Beef,
  Fish,
  ShoppingBag,
  Leaf,
  Package,
  ShoppingCart,
  UsersRound,
  ShieldCheck,
  Truck,
  Sprout,
} from 'lucide-react'

import '../App.css'
import './HomeRedesign.css'

function Home() {
  const navigate = useNavigate()

  const [featuredProducts, setFeaturedProducts] = useState([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // FETCH FEATURED PRODUCTS
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch(
          'http://localhost:5000/api/products'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to load featured products'
          )
        }

        if (!Array.isArray(data)) {
          throw new Error('Invalid products response.')
        }

        const featured = data.filter(
          (product) =>
            product.status?.toLowerCase() !== 'archived' &&
            Number(product.is_featured) === 1
        )

        setFeaturedProducts(featured)
      } catch (error) {
        console.error('Error loading featured products:', error)
        setFeaturedProducts([])
      } finally {
        setLoadingFeatured(false)
      }
    }

    fetchFeaturedProducts()
  }, [])

  // GLOBAL PRODUCT SEARCH
  const handleSearch = (event) => {
    event.preventDefault()

    const search = searchTerm.trim()

    if (!search) {
      navigate('/products')
      return
    }

    navigate(`/products?search=${encodeURIComponent(search)}`)
  }

  // CATEGORY NAVIGATION
  const handleCategoryChange = (category) => {
    if (category === 'all') {
      navigate('/products')
      return
    }

    navigate(`/products?category=${encodeURIComponent(category)}`)
  }

  // ADD FEATURED PRODUCT TO CART
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

    const stock = Number(product.stock_quantity || 0)

    if (stock <= 0) {
      alert('This product is out of stock.')
      return
    }

    try {
      const response = await fetch(
        'http://localhost:5000/api/cart',
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

      window.dispatchEvent(new Event('cartUpdated'))

      alert(
        `${product.product_name} successfully added to cart!`
      )
    } catch (error) {
      console.error('Add to cart error:', error)

      alert(
        error.message || 'Failed to add product to cart.'
      )
    }
  }

  // PRODUCT IMAGE
  const getProductImage = (image) => {
    if (!image) return null

    if (image.startsWith('/uploads/')) {
      return `http://localhost:5000${image}`
    }

    return image
  }

  return (
    <main className="home-page">

      {/* HERO SECTION */}
      <section className="hero-home">

        <div
          className="hero-image"
          role="img"
          aria-label="Municipal Hall of Malay, Aklan"
        />

        <div className="hero-overlay" />

        <div className="hero-content">

          <h1>
            SUPPORT LOCAL.
            <br />
            SUSTAIN <span>MALAY.</span>
          </h1>

          <div className="hero-buttons">

            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate('/products')}
            >
              <ShoppingBag size={19} strokeWidth={2} />
              Shop Local Products
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate('/about')}
            >
              <Leaf size={18} strokeWidth={2} />
              Learn About Ani-Malay
            </button>

          </div>
        </div>
      </section>

      {/* SEARCH AND CATEGORY CHIPS */}
      <section className="home-discovery-section">

        <form
          className="home-search-form"
          onSubmit={handleSearch}
        >
          <Search
            size={20}
            strokeWidth={2}
            className="home-search-icon"
          />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search crops, livestock, fisheries..."
            aria-label="Search agricultural products"
          />

          <button type="submit">
            Search
          </button>
        </form>

        <div
          className="home-category-chips"
          aria-label="Product categories"
        >
          <button
            type="button"
            className="active"
            onClick={() => handleCategoryChange('all')}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('crops')}
          >
            <Wheat size={17} strokeWidth={2} />
            Crops
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('livestock')}
          >
            <Beef size={17} strokeWidth={2} />
            Livestock
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('fisheries')}
          >
            <Fish size={17} strokeWidth={2} />
            Fisheries
          </button>
        </div>
      </section>

      {/* HOW ANI-MALAY WORKS */}
      <section className="how-home-section">

        <div className="section-heading-center">

          <h2>How Ani-Malay Works</h2>

          <p>
            Getting local agricultural products is simple
            with these four steps.
          </p>

        </div>

        <div className="how-home-grid">

          <div className="how-home-item">
            <div className="how-number">01</div>
            <h3>Browse Products</h3>
            <p>
              Explore available crops, livestock, and fisheries products.
            </p>
          </div>

          <div className="how-home-item">
            <div className="how-number">02</div>
            <h3>Add to Cart</h3>
            <p>
              Choose your preferred products and quantities.
            </p>
          </div>

          <div className="how-home-item">
            <div className="how-number">03</div>
            <h3>Place Your Order</h3>
            <p>
              Review your order and complete the checkout process.
            </p>
          </div>

          <div className="how-home-item">
            <div className="how-number">04</div>
            <h3>Receive Your Order</h3>
            <p>
              Receive your purchases through LGU-managed delivery.
            </p>
          </div>

        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="featured-section">

        <div className="featured-heading">

          <div>
            <h2>Featured Products</h2>
            <p>Discover selected agricultural products from Malay.</p>
          </div>

          <button
            type="button"
            className="view-all-btn"
            onClick={() => navigate('/products')}
          >
            View All Products →
          </button>

        </div>

        {loadingFeatured && (
          <div className="featured-grid">
            <div className="featured-card">
              <div className="featured-info">
                <p>Loading featured products...</p>
              </div>
            </div>
          </div>
        )}

        {!loadingFeatured && featuredProducts.length === 0 && (
          <div className="featured-card">
            <div className="featured-info">
              <h3>No Featured Products</h3>
              <p>
                Featured products will appear here when
                selected by the LGU Admin.
              </p>
            </div>
          </div>
        )}

        {!loadingFeatured && featuredProducts.length > 0 && (
          <div className="featured-grid">

            {featuredProducts.map((product) => {
              const image = getProductImage(product.image)
              const stock = Number(product.stock_quantity || 0)

              return (
                <div
                  className="featured-card"
                  key={product.product_id}
                >

                  <div className="featured-image">

                    {image ? (
                      <img
                        src={image}
                        alt={product.product_name}
                        className="featured-product-image"
                      />
                    ) : (
                      <div
                        className="featured-product-image featured-product-placeholder"
                        aria-label="No product image"
                      >
                        <Package
                          size={42}
                          strokeWidth={1.6}
                        />
                      </div>
                    )}

                    <span className="featured-tag">
                      Featured
                    </span>

                  </div>

                  <div className="featured-info">

                    <span className="featured-category">
                      {product.category_name || 'Agricultural Product'}
                    </span>

                    <h3>{product.product_name}</h3>

                    <div className="featured-bottom">

                      <div>
                        <strong>
                          ₱{Number(product.price || 0).toFixed(2)}
                          {' / '}
                          {product.unit || 'kg'}
                        </strong>

                        <small
                          className={
                            stock > 0
                              ? 'stock-available'
                              : 'stock-empty'
                          }
                        >
                          <span className="stock-status-dot" />
                          {stock > 0 ? 'Available' : 'Out of Stock'}
                        </small>
                      </div>

                      <button
                        type="button"
                        className="featured-cart-btn"
                        aria-label={`Add ${product.product_name} to cart`}
                        onClick={() => handleAddToCart(product)}
                        disabled={stock <= 0}
                        title={
                          stock <= 0 ? 'Out of Stock' : 'Add to Cart'
                        }
                      >
                        <ShoppingCart
                          size={19}
                          strokeWidth={2}
                        />
                      </button>

                    </div>
                  </div>
                </div>
              )
            })}

          </div>
        )}
      </section>

      {/* BROWSE CATEGORIES */}
      <section className="categories-home-section">

        <div className="section-heading-center">

          <span className="section-label">
            EXPLORE ANI-MALAY
          </span>

          <h2>Explore Our Product Categories</h2>

          <p>
            Find locally sourced agricultural products
            from the Municipality of Malay.
          </p>

        </div>

        <div className="home-category-grid">

          <button
            type="button"
            className="home-category-card"
            onClick={() => navigate('/products?category=crops')}
          >
            <span>
              <Wheat size={34} strokeWidth={1.8} />
            </span>

            <div>
              <h3>Crops</h3>
              <p>
                Explore locally sourced crops and farm produce.
              </p>
            </div>
          </button>

          <button
            type="button"
            className="home-category-card"
            onClick={() => navigate('/products?category=livestock')}
          >
            <span>
              <Beef size={34} strokeWidth={1.8} />
            </span>

            <div>
              <h3>Livestock</h3>
              <p>
                Discover available livestock and related products.
              </p>
            </div>
          </button>

          <button
            type="button"
            className="home-category-card"
            onClick={() => navigate('/products?category=fisheries')}
          >
            <span>
              <Fish size={34} strokeWidth={1.8} />
            </span>

            <div>
              <h3>Fisheries</h3>
              <p>
                Browse fresh fish and locally sourced seafood.
              </p>
            </div>
          </button>

        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">

        <div className="feature-item">
          <div className="feature-icon">
            <UsersRound size={27} strokeWidth={1.8} />
          </div>

          <div className="feature-text">
            <h3>Support Local Farmers</h3>
            <p>
              Helping local farmers and producers reach more consumers.
            </p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <ShieldCheck size={27} strokeWidth={1.8} />
          </div>

          <div className="feature-text">
            <h3>Quality You Can Trust</h3>
            <p>
              Carefully selected agricultural products from local suppliers.
            </p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <Truck size={27} strokeWidth={1.8} />
          </div>

          <div className="feature-text">
            <h3>Convenient Delivery</h3>
            <p>
              Have your orders delivered through LGU Malay's delivery service.
            </p>
          </div>
        </div>

        <div className="feature-item">
          <div className="feature-icon">
            <Sprout size={27} strokeWidth={1.8} />
          </div>

          <div className="feature-text">
            <h3>Growing Together</h3>
            <p>
              Supporting local agriculture and building a stronger community.
            </p>
          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="home-footer">

        <div className="home-footer-brand">
          <p>
            LGU Malay Agricultural Marketplace
          </p>
        </div>

        <p className="home-footer-copy">
          Supporting Local Agriculture. Sustaining Malay.
        </p>

      </footer>

    </main>
  )
}

export default Home
