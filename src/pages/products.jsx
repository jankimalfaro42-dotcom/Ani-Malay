import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  ShoppingCart,
  Leaf,
  Beef,
  Fish,
  X,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
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

  // Floating product modal & swipeable gallery states
  const [activeProduct, setActiveProduct] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const touchStartX = useRef(null)
  const touchEndX = useRef(null)

  const navigate = useNavigate()
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const searchKeyword = searchParams.get('search') || ''
  const urlCategory = searchParams.get('category') || ''

  // SYNC SEARCH AND CATEGORY WITH URL
  useEffect(() => {
    setSearchInput(searchKeyword)

    const validCategories = ['crops', 'livestock', 'fisheries']

    if (validCategories.includes(urlCategory.toLowerCase())) {
      const formattedCategory =
        urlCategory.charAt(0).toUpperCase() +
        urlCategory.slice(1).toLowerCase()

      setSelectedCategory(formattedCategory)
    } else {
      setSelectedCategory('All')
    }
  }, [location.search])

  // CLOSE MODAL ON ESCAPE & LOCK BODY SCROLL WHEN OPEN
  useEffect(() => {
    if (!activeProduct) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveProduct(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeProduct])

  // FETCH ACTIVE PRODUCTS AND QUANTITY OPTIONS
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          'https://ani-malay-production.up.railway.app/api/products?status=active'
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch products')
        }

        if (!Array.isArray(data)) {
          throw new Error('Invalid products response.')
        }

        const activeProducts = data.filter(
          (product) => product.status?.toLowerCase() !== 'archived'
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
      params.toString() ? `/products?${params.toString()}` : '/products'
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
        (option) => Number(option.option_id) === Number(selectedId)
      ) || options[0]
    )
  }

  // GET AVAILABLE PACKS FOR SELECTED OPTION
  const getAvailablePacks = (product, option) => {
    if (!option) return 0

    const stock = Number(product.stock_quantity) || 0
    const quantityValue = Number(option.quantity_value) || 0

    if (quantityValue <= 0) return 0

    return Math.max(0, Math.floor(stock / quantityValue))
  }

  // CHANGE SELECTED OPTION
  const handleOptionChange = (productId, optionId) => {
    setSelectedOptionIds((previous) => ({
      ...previous,
      [productId]: Number(optionId),
    }))
  }

  // NORMALIZE SINGLE IMAGE URL
  const getProductImage = (image) => {
    if (!image) return null

    if (typeof image === 'object') {
      const nestedUrl = image.image_url || image.url || image.path
      return getProductImage(nestedUrl)
    }

    const cleanImage = String(image).trim()
    if (!cleanImage) return null

    if (cleanImage.startsWith('/uploads/')) {
      return `https://ani-malay-production.up.railway.app${cleanImage}`
    }

    return cleanImage
  }

  // GET ALL SWIPEABLE IMAGES FOR A PRODUCT
  const getProductImages = (product) => {
    if (!product) return []

    const rawImages = []

    if (Array.isArray(product.images)) {
      rawImages.push(...product.images)
    } else if (typeof product.images === 'string' && product.images.trim()) {
      try {
        const parsed = JSON.parse(product.images)
        if (Array.isArray(parsed)) rawImages.push(...parsed)
        else rawImages.push(...product.images.split(','))
      } catch {
        rawImages.push(...product.images.split(','))
      }
    }

    if (Array.isArray(product.gallery)) {
      rawImages.push(...product.gallery)
    }

    if (product.image) {
      rawImages.unshift(product.image)
    }

    const normalized = rawImages
      .map((item) => getProductImage(item))
      .filter(Boolean)

    // Remove duplicate URLs while preserving order
    return [...new Set(normalized)]
  }

  // OPEN FLOATING PRODUCT CARD
  const openProductModal = (product) => {
    setActiveProduct(product)
    setActiveImageIndex(0)
  }

  // SWIPE HANDLERS FOR MOBILE GALLERY
  const handleTouchStart = (e) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = (totalImages) => {
    if (!touchStartX.current || !touchEndX.current || totalImages <= 1) return

    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 40

    if (distance > minSwipeDistance) {
      setActiveImageIndex((prev) => (prev + 1) % totalImages)
    } else if (distance < -minSwipeDistance) {
      setActiveImageIndex((prev) => (prev - 1 + totalImages) % totalImages)
    }
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

    const availablePacks = getAvailablePacks(product, selectedOption)

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

      notify('error', 'Session Error', 'Please login again.')

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
        'https://ani-malay-production.up.railway.app/api/cart',
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
        throw new Error(data.message || 'Failed to add product to cart')
      }

      window.dispatchEvent(new CustomEvent('cartUpdated'))

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
      const category = String(product.category_name || '')
        .trim()
        .toLowerCase()

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

  // ACTIVE MODAL DERIVED DATA
  const modalImages = activeProduct ? getProductImages(activeProduct) : []
  const modalSelectedOption = activeProduct
    ? getSelectedOption(activeProduct)
    : null
  const modalAvailableOptions = activeProduct
    ? getAvailableOptions(activeProduct)
    : []
  const modalAvailablePacks = activeProduct
    ? getAvailablePacks(activeProduct, modalSelectedOption)
    : 0
  const modalStock = activeProduct
    ? Number(activeProduct.stock_quantity) || 0
    : 0

  return (
    <main className="all-products-page">
      {/* SEARCH AND CATEGORY AREA */}
      <section className="products-discovery">
        {/* SEARCH BAR */}
        <form className="products-page-search" onSubmit={handleSearch}>
          <Search
            size={19}
            strokeWidth={2}
            className="products-page-search-icon"
          />

          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
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

          <button type="submit" className="products-page-search-btn">
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
                className={selectedCategory === category.name ? 'active' : ''}
                onClick={() => handleCategoryChange(category.name)}
                aria-pressed={selectedCategory === category.name}
              >
                {CategoryIcon && <CategoryIcon size={17} strokeWidth={2} />}
                {category.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div className="products-loading">Loading products...</div>
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
            We couldn&apos;t find any products matching &quot;{searchKeyword}
            &quot;. Try searching for another product.
          </p>
        </div>
      )}

      {/* PRODUCT GRID */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="all-products-grid">
          {filteredProducts.map((product) => {
            const productImages = getProductImages(product)
            const imageUrl = productImages[0] || null
            const stock = Number(product.stock_quantity) || 0

            const availableOptions = getAvailableOptions(product)
            const selectedOption = getSelectedOption(product)

            const availablePacks = getAvailablePacks(product, selectedOption)

            const isAdding = addingProduct === product.product_id
            const hasAvailableStock = availablePacks > 0

            return (
              <div
                className="all-product-card"
                key={product.product_id}
                onClick={() => openProductModal(product)}
                style={{ cursor: 'pointer' }}
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

                  {productImages.length > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'rgba(18, 36, 24, 0.72)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      1/{productImages.length} photos
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
                    onClick={(event) => event.stopPropagation()}
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
                      onClick={(event) => {
                        event.stopPropagation()
                        handleAddToCart(product)
                      }}
                      disabled={
                        !selectedOption || !hasAvailableStock || isAdding
                      }
                      aria-label={`Add ${product.product_name} to cart`}
                    >
                      {isAdding ? (
                        '...'
                      ) : (
                        <ShoppingCart size={19} strokeWidth={2} />
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

      {/* FLOATING PRODUCT CARD MODAL WITH SWIPEABLE GALLERY */}
      {activeProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="floating-product-title"
          onClick={() => setActiveProduct(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(15, 29, 20, 0.58)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '22px',
              boxShadow: '0 24px 60px rgba(10, 30, 16, 0.28)',
              position: 'relative',
              animation: 'fadeIn 0.18s ease-out',
            }}
          >
            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              aria-label="Close product details"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 10,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.92)',
                color: '#1f3326',
                boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            {/* SWIPEABLE IMAGE CAROUSEL */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(modalImages.length)}
              style={{
                position: 'relative',
                width: '100%',
                height: '290px',
                background: '#f2f6f2',
                overflow: 'hidden',
                borderTopLeftRadius: '22px',
                borderTopRightRadius: '22px',
                userSelect: 'none',
              }}
            >
              {modalImages.length > 0 ? (
                <img
                  src={
                    modalImages[
                      Math.min(activeImageIndex, modalImages.length - 1)
                    ]
                  }
                  alt={`${activeProduct.product_name} preview ${
                    activeImageIndex + 1
                  }`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#647568',
                    fontSize: '14px',
                  }}
                >
                  Image unavailable
                </div>
              )}

              {activeProduct.category_name && (
                <span
                  style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    background: '#1b5e20',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: '999px',
                  }}
                >
                  {activeProduct.category_name}
                </span>
              )}

              {/* PREV / NEXT ARROWS WHEN MULTIPLE IMAGES EXIST */}
              {modalImages.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setActiveImageIndex(
                        (prev) =>
                          (prev - 1 + modalImages.length) % modalImages.length
                      )
                    }
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255,255,255,0.88)',
                      color: '#1b5e20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() =>
                      setActiveImageIndex(
                        (prev) => (prev + 1) % modalImages.length
                      )
                    }
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(255,255,255,0.88)',
                      color: '#1b5e20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* PAGINATION DOTS */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: '6px',
                      background: 'rgba(18, 36, 24, 0.45)',
                      padding: '5px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {modalImages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`View image ${idx + 1}`}
                        onClick={() => setActiveImageIndex(idx)}
                        style={{
                          width: activeImageIndex === idx ? '18px' : '7px',
                          height: '7px',
                          borderRadius: '999px',
                          border: 'none',
                          padding: 0,
                          background:
                            activeImageIndex === idx
                              ? '#ffffff'
                              : 'rgba(255,255,255,0.55)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* THUMBNAIL STRIP IF MULTIPLE IMAGES */}
            {modalImages.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '12px 20px 0',
                  overflowX: 'auto',
                }}
              >
                {modalImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      padding: 0,
                      border:
                        activeImageIndex === idx
                          ? '2px solid #1b5e20'
                          : '2px solid transparent',
                      opacity: activeImageIndex === idx ? 1 : 0.65,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* FLOATING CARD BODY */}
            <div style={{ padding: '20px 22px 24px' }}>
              <h2
                id="floating-product-title"
                style={{
                  margin: '0 0 8px',
                  fontSize: '1.35rem',
                  color: '#182b1f',
                }}
              >
                {activeProduct.product_name}
              </h2>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: modalStock > 0 ? '#1b5e20' : '#b91c1c',
                  background: modalStock > 0 ? '#eaf5ec' : '#fee2e2',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <PackageCheck size={15} />
                <span>
                  {modalStock > 0
                    ? `${modalStock} ${activeProduct.unit || 'units'} in stock`
                    : 'Out of stock'}
                </span>
              </div>

              {activeProduct.description && (
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: '14px',
                    lineHeight: 1.55,
                    color: '#485a4e',
                  }}
                >
                  {activeProduct.description}
                </p>
              )}

              {/* QUANTITY SELECTOR INSIDE MODAL */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="modal-quantity-option"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#26382d',
                    marginBottom: '6px',
                  }}
                >
                  Choose quantity option:
                </label>

                {modalAvailableOptions.length > 0 ? (
                  <select
                    id="modal-quantity-option"
                    value={modalSelectedOption?.option_id || ''}
                    onChange={(event) =>
                      handleOptionChange(
                        activeProduct.product_id,
                        event.target.value
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      border: '1px solid #cdd8d0',
                      borderRadius: '10px',
                      background: '#fff',
                      color: '#26382d',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {modalAvailableOptions.map((option) => (
                      <option key={option.option_id} value={option.option_id}>
                        {option.option_label} — {formatPrice(option.price)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p style={{ fontSize: '13px', color: '#b45309', margin: 0 }}>
                    No available quantity options
                  </p>
                )}
              </div>

              {/* MODAL PRICE & ADD TO CART */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '14px',
                  borderTop: '1px solid #e7ede8',
                }}
              >
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '1.3rem',
                      color: '#1b5e20',
                    }}
                  >
                    {modalSelectedOption
                      ? formatPrice(modalSelectedOption.price)
                      : 'Unavailable'}
                  </strong>
                  {modalSelectedOption && (
                    <span style={{ fontSize: '12px', color: '#647568' }}>
                      per {modalSelectedOption.option_label} •{' '}
                      {modalAvailablePacks > 0
                        ? `${modalAvailablePacks} pack(s) available`
                        : 'Out of stock'}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddToCart(activeProduct)}
                  disabled={
                    !modalSelectedOption ||
                    modalAvailablePacks <= 0 ||
                    addingProduct === activeProduct.product_id
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background:
                      !modalSelectedOption || modalAvailablePacks <= 0
                        ? '#9ca3af'
                        : '#1b5e20',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor:
                      !modalSelectedOption || modalAvailablePacks <= 0
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  <ShoppingCart size={18} />
                  <span>
                    {addingProduct === activeProduct.product_id
                      ? 'Adding...'
                      : 'Add to Cart'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Products