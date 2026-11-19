
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  ShoppingCart,
  Leaf,
  Beef,
  Fish,
  X,
} from 'lucide-react'
import { notify } from '../utils/notify'
import '../App.css'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [addingProduct, setAddingProduct] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [selectedOptionIds, setSelectedOptionIds] = useState({})

  const navigate = useNavigate()
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const searchKeyword = searchParams.get('search') || ''
  const urlCategory = searchParams.get('category') || ''

  // SYNC SEARCH AND CATEGORY WITH URL
  useEffect(() => {
    setSearchInput(searchKeyword)

    const validCategories = [
      'crops',
      'livestock',
      'fisheries',
    ]

    if (validCategories.includes(urlCategory.toLowerCase())) {
      const formattedCategory =
        urlCategory.charAt(0).toUpperCase() +
        urlCategory.slice(1).toLowerCase()

      setSelectedCategory(formattedCategory)
    } else {
      setSelectedCategory('All')
    }
  }, [location.search])

  // FETCH ACTIVE PRODUCTS AND QUANTITY OPTIONS
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          'http://localhost:5000/api/products?status=active'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Failed to fetch products'
          )
        }

        if (!Array.isArray(data)) {
          throw new Error('Invalid products response.')
        }

        const activeProducts = data.filter(
          (product) =>
            product.status?.toLowerCase() !== 'archived'
        )

        setProducts(activeProducts)
      } catch (err) {
        console.error('Products error:', err)
        setError(err.message || 'Failed to load products.')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // UPDATE URL WITH SEARCH AND CATEGORY
  const updateFilters = (search, category) => {
    const params = new URLSearchParams()

    if (search.trim()) {
      params.set('search', search.trim())
    }

    if (category !== 'All') {
      params.set('category', category.toLowerCase())
    }

    navigate(
      params.toString()
        ? `/products?${params.toString()}`
        : '/products'
    )
  }

  // SEARCH SUBMIT
  const handleSearch = (event) => {
    event.preventDefault()
    updateFilters(searchInput, selectedCategory)
  }

  // CATEGORY FILTER
  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    updateFilters(searchInput, category)
  }

  // FORMAT PRICE
  const formatPrice = (price) => {
    return `₱${Number(price || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // GET AVAILABLE QUANTITY OPTIONS
  const getAvailableOptions = (product) => {
    if (!Array.isArray(product.quantity_options)) {
      return []
    }

    return product.quantity_options.filter(
      (option) =>
        Number(option.is_available) === 1 &&
        Number(option.price) >= 0 &&
        Number(option.quantity_value) > 0
    )
  }

  // GET SELECTED OPTION
  const getSelectedOption = (product) => {
    const options = getAvailableOptions(product)

    if (options.length === 0) return null

    const selectedId = selectedOptionIds[product.product_id]

    return (
      options.find(
        (option) =>
          Number(option.option_id) === Number(selectedId)
      ) || options[0]
    )
  }

  // GET AVAILABLE PACKS FOR SELECTED OPTION
  const getAvailablePacks = (product, option) => {
    if (!option) return 0

    const stock = Number(product.stock_quantity) || 0
    const quantityValue = Number(option.quantity_value) || 0

    if (quantityValue <= 0) return 0

    return Math.max(
      0,
      Math.floor(stock / quantityValue)
    )
  }

  // CHANGE SELECTED OPTION
  const handleOptionChange = (productId, optionId) => {
    setSelectedOptionIds((previous) => ({
      ...previous,
      [productId]: Number(optionId),
    }))
  }

  // ADD TO CART
  const handleAddToCart = async (product) => {
    if (addingProduct === product.product_id) return

    const selectedOption = getSelectedOption(product)

    if (!selectedOption) {
      notify(
        'warning',
        'No Available Options',
        'This product currently has no available quantity options.'
      )
      return
    }

    const availablePacks = getAvailablePacks(
      product,
      selectedOption
    )

    if (availablePacks <= 0) {
      notify(
        'warning',
        'Out of Stock',
        'There is not enough stock for this quantity option.'
      )
      return
    }

    const savedUser = localStorage.getItem('user')
    const savedToken = localStorage.getItem('token')

    if (!savedUser || !savedToken) {
      notify(
        'warning',
        'Login Required',
        'Please login first before adding products to your cart.'
      )

      setTimeout(() => navigate('/login'), 1200)
      return
    }

    let user

    try {
      user = JSON.parse(savedUser)
    } catch (err) {
      console.error('User data error:', err)

      notify(
        'error',
        'Session Error',
        'Please login again.'
      )

      setTimeout(() => navigate('/login'), 1200)
      return
    }

    if (!user?.user_id) {
      notify(
        'error',
        'Account Error',
        'User information is missing. Please login again.'
      )

      setTimeout(() => navigate('/login'), 1200)
      return
    }

    if (user.role !== 'consumer') {
      notify(
        'warning',
        'Consumer Account Required',
        'Please use your consumer account to add products to your cart.'
      )
      return
    }

    try {
      setAddingProduct(product.product_id)

      const response = await fetch(
        'http://localhost:5000/api/cart',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify({
            product_id: product.product_id,
            quantity_option_id: selectedOption.option_id,
            quantity: 1,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to add product to cart'
        )
      }

      window.dispatchEvent(
        new CustomEvent('cartUpdated')
      )

      notify(
        'success',
        'Added to Cart',
        `${product.product_name} (${selectedOption.option_label}) has been added to your cart.`
      )
    } catch (err) {
      console.error('Add to cart error:', err)

      notify(
        'error',
        'Unable to Add Product',
        err.message || 'Failed to add product to cart.'
      )
    } finally {
      setAddingProduct(null)
    }
  }

  // PRODUCT IMAGE URL
  const getProductImage = (image) => {
    if (!image) return null

    if (image.startsWith('/uploads/')) {
      return `http://localhost:5000${image}`
    }

    return image
  }

  // CATEGORY OPTIONS
  const categories = [
    { name: 'All', icon: null },
    { name: 'Crops', icon: Leaf },
    { name: 'Livestock', icon: Beef },
    { name: 'Fisheries', icon: Fish },
  ]

  // FILTER PRODUCTS
  const filteredProducts = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase()

    return products.filter((product) => {
      const category = String(
        product.category_name || ''
      ).trim().toLowerCase()

      const matchesCategory =
        selectedCategory === 'All' ||
        category === selectedCategory.toLowerCase()

      const searchableText = [
        product.product_name,
        product.description,
        product.category_name,
        product.unit,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch =
        !keyword || searchableText.includes(keyword)

      return matchesCategory && matchesSearch
    })
  }, [products, selectedCategory, searchKeyword])

  return (
    <main className="all-products-page">

      {/* SEARCH AND CATEGORY AREA */}
      <section className="products-discovery">

        {/* SEARCH BAR */}
        <form
          className="products-page-search"
          onSubmit={handleSearch}
        >
          <Search
            size={19}
            strokeWidth={2}
            className="products-page-search-icon"
          />

          <input
            type="search"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder="Search agricultural products..."
            aria-label="Search agricultural products"
          />

          {searchInput && (
            <button
              type="button"
              className="products-search-clear"
              onClick={() => {
                setSearchInput('')
                updateFilters('', selectedCategory)
              }}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}

          <button
            type="submit"
            className="products-page-search-btn"
          >
            Search
          </button>
        </form>

        {/* CATEGORY FILTERS */}
        <div
          className="product-category-filters"
          aria-label="Filter products by category"
        >
          {categories.map((category) => {
            const CategoryIcon = category.icon

            return (
              <button
                key={category.name}
                type="button"
                className={
                  selectedCategory === category.name
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  handleCategoryChange(category.name)
                }
                aria-pressed={
                  selectedCategory === category.name
                }
              >
                {CategoryIcon && (
                  <CategoryIcon
                    size={17}
                    strokeWidth={2}
                  />
                )}

                {category.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="products-loading">
          Loading products...
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="no-all-products">
          <h3>Unable to load products</h3>
          <p>{error}</p>
        </div>
      )}

      {/* NO MATCHING RESULTS */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="products-no-match">
          <h3>No matching products found</h3>
          <p>
            We couldn't find any products matching "{searchKeyword}".
            Try searching for another product.
          </p>
        </div>
      )}

      {/* PRODUCT GRID */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="all-products-grid">

          {filteredProducts.map((product) => {
            const imageUrl = getProductImage(product.image)
            const stock = Number(product.stock_quantity) || 0

            const availableOptions = getAvailableOptions(product)
            const selectedOption = getSelectedOption(product)

            const availablePacks = getAvailablePacks(
              product,
              selectedOption
            )

            const isAdding =
              addingProduct === product.product_id

            const hasAvailableStock =
              availablePacks > 0

            return (
              <div
                className="all-product-card"
                key={product.product_id}
              >

                {/* PRODUCT IMAGE */}
                <div className="all-product-image">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.product_name}
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="product-placeholder">
                      Image unavailable
                    </div>
                  )}

                  {product.category_name && (
                    <span className="all-product-category">
                      {product.category_name}
                    </span>
                  )}
                </div>

                {/* PRODUCT DETAILS */}
                <div className="all-product-info">

                  <div className="all-product-category-text">
                    {product.category_name || 'Agricultural Product'}
                  </div>

                  <h2>{product.product_name}</h2>

                  {product.description && (
                    <p className="all-product-description">
                      {product.description}
                    </p>
                  )}

                  <div className="all-product-stock">
                    {stock > 0
                      ? `${stock} ${product.unit || 'units'} in stock`
                      : 'Out of stock'}
                  </div>

                  {/* QUANTITY OPTION SELECTOR */}
                  <div
                    className="all-product-option"
                    style={{
                      marginTop: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <label
                      htmlFor={`quantity-option-${product.product_id}`}
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginBottom: '6px',
                      }}
                    >
                      Choose quantity:
                    </label>

                    {availableOptions.length > 0 ? (
                      <select
                        id={`quantity-option-${product.product_id}`}
                        className="all-product-option-select"
                        value={selectedOption?.option_id || ''}
                        onChange={(event) =>
                          handleOptionChange(
                            product.product_id,
                            event.target.value
                          )
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d5ded7',
                          borderRadius: '8px',
                          background: '#fff',
                          color: '#26382d',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        {availableOptions.map((option) => (
                          <option
                            key={option.option_id}
                            value={option.option_id}
                          >
                            {option.option_label} — {formatPrice(option.price)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p
                        style={{
                          fontSize: '13px',
                          color: '#b45309',
                          margin: 0,
                        }}
                      >
                        No available quantity options
                      </p>
                    )}
                  </div>

                  {/* PRICE AND CART */}
                  <div className="all-product-bottom">
                    <strong>
                      {selectedOption
                        ? formatPrice(selectedOption.price)
                        : 'Unavailable'}
                      {selectedOption && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            fontWeight: 400,
                            marginTop: '3px',
                          }}
                        >
                          per {selectedOption.option_label}
                        </span>
                      )}
                    </strong>

                    <button
                      type="button"
                      className="all-product-cart-btn"
                      onClick={() => handleAddToCart(product)}
                      disabled={
                        !selectedOption ||
                        !hasAvailableStock ||
                        isAdding
                      }
                      aria-label={`Add ${product.product_name} to cart`}
                    >
                      {isAdding ? (
                        '...'
                      ) : (
                        <ShoppingCart
                          size={19}
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  </div>

                  {selectedOption && (
                    <p
                      style={{
                        fontSize: '12px',
                        color: '#647568',
                        marginTop: '7px',
                      }}
                    >
                      {hasAvailableStock
                        ? `${availablePacks} pack(s) available for this option`
                        : 'Not enough stock for this option'}
                    </p>
                  )}

                </div>
              </div>
            )
          })}

        </div>
      )}

    </main>
  )
}

export default Products
