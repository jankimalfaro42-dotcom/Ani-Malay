
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package,
  Plus,
  Pencil,
  Archive as ArchiveIcon,
  X,
  Search,
  RefreshCw,
  Star,
  ImagePlus,
  Boxes,
  AlertCircle,
  Scale,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
} from 'lucide-react'
import './Admin.css'

const API_URL = 'http://localhost:5000/api'
const SERVER_URL = 'http://localhost:5000'

const emptyForm = {
  product_name: '',
  category_id: '',
  description: '',
  price: '',
  unit: '',
  stock_quantity: '',
  image: null,
  status: 'active',
  is_featured: false,
}

const emptyOptionForm = {
  option_label: '',
  quantity_value: '',
  unit: 'kg',
  price: '',
}

function getProductId(product) {
  return product.product_id ?? product.id
}

function getImageUrl(image) {
  if (!image || typeof image !== 'string') return ''

  const imagePath = image.trim()

  if (!imagePath) return ''

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath
  }

  if (
    imagePath.startsWith('/uploads/') ||
    imagePath.startsWith('uploads/')
  ) {
    return `${SERVER_URL}/${imagePath.replace(/^\/+/, '')}`
  }

  if (
    imagePath.startsWith('/images/') ||
    imagePath.startsWith('images/')
  ) {
    return `/${imagePath.replace(/^\/+/, '')}`
  }

  return `${SERVER_URL}/${imagePath.replace(/^\/+/, '')}`
}

function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  // QUANTITY OPTIONS STATES
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [quantityOptions, setQuantityOptions] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [optionSaving, setOptionSaving] = useState(false)
  const [optionError, setOptionError] = useState('')
  const [editingOption, setEditingOption] = useState(null)
  const [optionForm, setOptionForm] = useState(emptyOptionForm)

  const fetchProducts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const response = await fetch(`${API_URL}/products`)

      if (!response.ok) {
        throw new Error('Unable to load products.')
      }

      const data = await response.json()

      const productList = Array.isArray(data)
        ? data
        : data.products || data.data || []

      setProducts(
        productList.filter(
          product =>
            product.status !== 'archived' && !product.is_archived
        )
      )
    } catch (err) {
      setError(err.message || 'Unable to load products.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/categories`)

      if (!response.ok) return

      const data = await response.json()

      setCategories(
        Array.isArray(data)
          ? data
          : data.categories || data.data || []
      )
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const categoryName = (
        product.category_name ||
        product.category ||
        ''
      ).toLowerCase().trim()

      const matchesCategory =
        selectedCategory === 'all' ||
        categoryName === selectedCategory

      const searchableText = [
        product.product_name,
        product.description,
        product.category_name,
        product.category,
        product.product_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return (
        matchesCategory &&
        searchableText.includes(searchTerm.toLowerCase())
      )
    })
  }, [products, selectedCategory, searchTerm])

  // ========================================
  // PRODUCT MODAL
  // ========================================

  const openAddModal = () => {
    setEditingProduct(null)

    setFormData({
      ...emptyForm,
      category_id: categories[0]?.category_id || '',
    })

    setPreviewImage('')
    setShowModal(true)
  }

  const openEditModal = product => {
    setEditingProduct(product)

    setFormData({
      product_name: product.product_name || '',
      category_id: product.category_id || '',
      description: product.description || '',
      price: product.price ?? '',
      unit: product.unit || '',
      stock_quantity: product.stock_quantity ?? '',
      image: null,
      status: product.status || 'active',
      is_featured: Boolean(
        Number(product.is_featured) || product.is_featured === true
      ),
    })

    setPreviewImage(
      getImageUrl(product.image_url || product.image)
    )

    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return

    setShowModal(false)
    setEditingProduct(null)
    setFormData(emptyForm)
    setPreviewImage('')
  }

  const handleChange = event => {
    const { name, value, type, checked, files } = event.target

    if (type === 'file') {
      const file = files?.[0]

      if (!file) return

      setFormData(previous => ({
        ...previous,
        image: file,
      }))

      setPreviewImage(URL.createObjectURL(file))
      return
    }

    setFormData(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async event => {
    event.preventDefault()

    if (!formData.product_name.trim()) {
      alert('Please enter the product name.')
      return
    }

    if (!formData.category_id) {
      alert('Please select a category.')
      return
    }

    if (formData.price === '' || Number(formData.price) < 0) {
      alert('Please enter a valid price.')
      return
    }

    if (
      formData.stock_quantity === '' ||
      Number(formData.stock_quantity) < 0
    ) {
      alert('Please enter a valid stock quantity.')
      return
    }

    if (!editingProduct && !formData.image) {
      alert('Please upload a product image.')
      return
    }

    const payload = new FormData()

    payload.append('product_name', formData.product_name.trim())
    payload.append('category_id', formData.category_id)
    payload.append('description', formData.description)
    payload.append('price', formData.price)
    payload.append('unit', formData.unit)
    payload.append('stock_quantity', formData.stock_quantity)
    payload.append('status', formData.status)
    payload.append('is_featured', formData.is_featured ? '1' : '0')

    if (formData.image) {
      payload.append('image', formData.image)
    }

    setSaving(true)

    try {
      const productId = editingProduct
        ? getProductId(editingProduct)
        : null

      const response = await fetch(
        editingProduct
          ? `${API_URL}/products/${productId}`
          : `${API_URL}/products`,
        {
          method: editingProduct ? 'PUT' : 'POST',
          body: payload,
        }
      )

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || 'Unable to save product.')
      }

      alert(
        editingProduct
          ? 'Product updated successfully!'
          : 'Product added successfully! You can now add its quantity options.'
      )

      setShowModal(false)
      setEditingProduct(null)
      setFormData(emptyForm)
      setPreviewImage('')

      await fetchProducts(true)
    } catch (err) {
      alert(err.message || 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  // ========================================
  // QUANTITY OPTIONS MANAGEMENT
  // ========================================

  const fetchQuantityOptions = async productId => {
    setOptionsLoading(true)
    setOptionError('')

    try {
      const response = await fetch(
        `${API_URL}/products/${productId}/quantity-options`
      )

      const data = await response.json().catch(() => [])

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to load quantity options.'
        )
      }

      setQuantityOptions(Array.isArray(data) ? data : [])
    } catch (err) {
      setOptionError(err.message || 'Unable to load quantity options.')
      setQuantityOptions([])
    } finally {
      setOptionsLoading(false)
    }
  }

  const openOptionsModal = async product => {
    setSelectedProduct(product)
    setQuantityOptions([])
    setOptionForm({
      ...emptyOptionForm,
      unit: product.unit === 'piece' ? 'piece' : 'kg',
    })
    setEditingOption(null)
    setOptionError('')
    setShowOptionsModal(true)

    await fetchQuantityOptions(getProductId(product))
  }

  const closeOptionsModal = () => {
    if (optionSaving) return

    setShowOptionsModal(false)
    setSelectedProduct(null)
    setQuantityOptions([])
    setEditingOption(null)
    setOptionForm(emptyOptionForm)
    setOptionError('')
  }

  const handleOptionFormChange = event => {
    const { name, value } = event.target

    setOptionForm(previous => ({
      ...previous,
      [name]: value,
    }))
  }

  const resetOptionForm = () => {
    setEditingOption(null)
    setOptionForm({
      ...emptyOptionForm,
      unit: selectedProduct?.unit === 'piece' ? 'piece' : 'kg',
    })
    setOptionError('')
  }

  const handleOptionSubmit = async event => {
    event.preventDefault()

    if (!selectedProduct) return

    const label = optionForm.option_label.trim()
    const unit = optionForm.unit.trim()
    const quantityValue = Number(optionForm.quantity_value)
    const price = Number(optionForm.price)

    if (!label || !unit) {
      setOptionError('Please enter the option label and unit.')
      return
    }

    if (
      !optionForm.quantity_value ||
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0
    ) {
      setOptionError('Please enter a valid quantity greater than zero.')
      return
    }

    if (
      optionForm.price === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setOptionError('Please enter a valid price.')
      return
    }

    const productId = getProductId(selectedProduct)

    const payload = {
      option_label: label,
      quantity_value: quantityValue,
      unit,
      price,
    }

    setOptionSaving(true)
    setOptionError('')

    try {
      const url = editingOption
        ? `${API_URL}/products/${productId}/quantity-options/${editingOption.option_id}`
        : `${API_URL}/products/${productId}/quantity-options`

      const response = await fetch(url, {
        method: editingOption ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to save quantity option.'
        )
      }

      await fetchQuantityOptions(productId)
      await fetchProducts(true)

      setEditingOption(null)
      setOptionForm({
        ...emptyOptionForm,
        unit: selectedProduct.unit === 'piece' ? 'piece' : 'kg',
      })

      alert(
        editingOption
          ? 'Quantity option updated successfully!'
          : 'Quantity option added successfully!'
      )
    } catch (err) {
      setOptionError(err.message || 'Unable to save quantity option.')
    } finally {
      setOptionSaving(false)
    }
  }

  const startEditOption = option => {
    setEditingOption(option)

    setOptionForm({
      option_label: option.option_label || '',
      quantity_value: option.quantity_value ?? '',
      unit: option.unit || 'kg',
      price: option.price ?? '',
    })

    setOptionError('')
  }

  const toggleOptionAvailability = async option => {
    if (!selectedProduct) return

    const productId = getProductId(selectedProduct)
    const currentlyAvailable = Number(option.is_available) === 1

    try {
      const response = await fetch(
        `${API_URL}/products/${productId}/quantity-options/${option.option_id}/availability`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_available: !currentlyAvailable,
          }),
        }
      )

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to update option availability.'
        )
      }

      await fetchQuantityOptions(productId)
      await fetchProducts(true)
    } catch (err) {
      alert(err.message || 'Unable to update option availability.')
    }
  }

  // ========================================
  // OTHER PRODUCT ACTIONS
  // ========================================

  const handleFeatured = async product => {
    const productId = getProductId(product)

    const currentlyFeatured = Boolean(
      Number(product.is_featured) || product.is_featured === true
    )

    try {
      const response = await fetch(
        `${API_URL}/products/${productId}/featured`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_featured: !currentlyFeatured,
          }),
        }
      )

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to update featured status.'
        )
      }

      await fetchProducts(true)
    } catch (err) {
      alert(err.message || 'Unable to update featured status.')
    }
  }

  const handleArchive = async product => {
    const productId = getProductId(product)

    if (
      !window.confirm(
        `Are you sure you want to archive "${product.product_name}"?`
      )
    ) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/products/${productId}/archive`,
        { method: 'PUT' }
      )

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || 'Unable to archive product.')
      }

      await fetchProducts(true)
    } catch (err) {
      alert(err.message || 'Unable to archive product.')
    }
  }

  // ========================================
  // HELPERS
  // ========================================

  const formatPrice = price =>
    `₱${Number(price || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const isFeatured = product =>
    Boolean(
      Number(product.is_featured) || product.is_featured === true
    )

  const getStock = product =>
    Number(product.stock_quantity || 0)

  const getCategoryName = product =>
    product.category_name || product.category || 'Uncategorized'

  const optionIsAvailable = option =>
    Number(option.is_available) === 1

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="admin-page admin-products-content">
      <main className="admin-main">

        <div className="admin-products-heading">
          <div>
            <span className="admin-products-eyebrow">
              INVENTORY MANAGEMENT
            </span>

            <h1>Products</h1>

            <p>
              Manage your agricultural products, prices, and stock.
            </p>
          </div>
        </div>

        {/* SEARCH, REFRESH AND ADD */}

        <div className="admin-products-toolbar">
          <div className="admin-products-search">
            <Search size={19} />

            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
            />

            {searchTerm && (
              <button
                type="button"
                className="admin-products-clear-search"
                onClick={() => setSearchTerm('')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="admin-products-refresh-btn"
            onClick={() => fetchProducts(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={refreshing ? 'admin-products-spinning' : ''}
            />

            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            className="admin-products-add-btn"
            onClick={openAddModal}
          >
            <Plus size={19} />
            Add Product
          </button>
        </div>

        {/* INVENTORY */}

        <section className="admin-products-panel">
          <div className="admin-products-panel-heading">
            <div>
              <span className="admin-products-eyebrow">
                PRODUCT INVENTORY
              </span>

              <h2>All Products</h2>

              <p>
                Review and update the products listed in Ani-Malay.
              </p>
            </div>

            <div className="admin-products-count">
              <Package size={19} />
              {filteredProducts.length} products
            </div>
          </div>

          {/* CATEGORY FILTERS */}

          <div className="admin-products-category-tabs">
            {['all', 'crops', 'livestock', 'fisheries'].map(category => (
              <button
                type="button"
                key={category}
                className={
                  selectedCategory === category ? 'active' : ''
                }
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all'
                  ? 'All'
                  : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {error && (
            <div className="admin-products-error">
              <AlertCircle size={19} />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => fetchProducts(true)}
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="admin-products-state">
              <RefreshCw
                size={25}
                className="admin-products-spinning"
              />
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="admin-products-state">
              <Boxes size={34} />

              <h3>No products found</h3>

              <p>
                {searchTerm
                  ? 'Try another search term.'
                  : 'There are no products in this category yet.'}
              </p>

              {!searchTerm && (
                <button
                  type="button"
                  onClick={openAddModal}
                >
                  <Plus size={17} />
                  Add Product
                </button>
              )}
            </div>
          ) : (

            <div
              className="admin-products-list"
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
                gap: '18px',
                padding: '22px',
                alignItems: 'stretch',
              }}
            >
              {filteredProducts.map(product => {
                const productImage = getImageUrl(
                  product.image_url || product.image
                )

                const stock = getStock(product)
                const featured = isFeatured(product)

                const optionCount = Array.isArray(product.quantity_options)
                  ? product.quantity_options.length
                  : 0

                return (
                  <article
                    className="admin-products-card"
                    key={getProductId(product)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      padding: '14px',
                      gap: '14px',
                      border: '1px solid #e1ebe1',
                      borderRadius: '15px',
                      background: '#fff',
                      boxShadow: '0 3px 12px rgba(30, 75, 45, 0.045)',
                    }}
                  >
                    {/* PRODUCT IMAGE */}

                    <div
                      className="admin-products-image-wrap"
                      style={{
                        width: '100%',
                        height: '175px',
                        flexShrink: 0,
                        overflow: 'hidden',
                        borderRadius: '11px',
                        background: '#f1f6f0',
                      }}
                    >
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.product_name}
                          className="admin-products-image"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={event => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="admin-products-image-placeholder">
                          <Package size={35} />
                          <span>No image</span>
                        </div>
                      )}
                    </div>

                    {/* PRODUCT DETAILS */}

                    <div
                      className="admin-products-info"
                      style={{ flex: 1, minWidth: 0 }}
                    >
                      <div className="admin-products-labels">
                        <span className="admin-products-category-label">
                          {getCategoryName(product)}
                        </span>

                        {featured && (
                          <span className="admin-products-featured-label">
                            <Star size={13} fill="currentColor" />
                            Featured
                          </span>
                        )}
                      </div>

                      <h3>{product.product_name}</h3>

                      <p className="admin-products-description">
                        {product.description ||
                          'No description provided.'}
                      </p>

                      <span className="admin-products-id">
                        Product ID: #{getProductId(product)}
                      </span>
                    </div>

                    {/* PRICE AND STOCK */}

                    <div
                      className="admin-products-numbers"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        minHeight: 'auto',
                        padding: '14px 10px',
                      }}
                    >
                      <div className="admin-products-price">
                        <span>BASE PRICE</span>
                        <strong>{formatPrice(product.price)}</strong>
                        <small>per {product.unit || 'unit'}</small>
                      </div>

                      <div className="admin-products-stock">
                        <span>AVAILABLE STOCK</span>
                        <strong>{stock}</strong>
                        <small>{product.unit || 'units'}</small>
                      </div>

                      <span
                        className={`admin-products-stock-status ${
                          stock > 0 ? 'available' : 'out'
                        }`}
                        style={{
                          gridColumn: '1 / -1',
                          justifySelf: 'center',
                        }}
                      >
                        <i />
                        {stock > 0 ? 'Available' : 'Out of Stock'}
                      </span>
                    </div>

                    {/* QUANTITY OPTIONS BUTTON */}

                    <button
                      type="button"
                      onClick={() => openOptionsModal(product)}
                      style={{
                        width: '100%',
                        minHeight: '43px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: '1px solid #c9dfcf',
                        borderRadius: '9px',
                        background: '#f1f8f2',
                        color: '#286a43',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      <Scale size={17} />
                      Manage Quantity Options
                      <span
                        style={{
                          background: '#dceee0',
                          borderRadius: '20px',
                          padding: '2px 8px',
                          fontSize: '11px',
                        }}
                      >
                        {optionCount}
                      </span>
                    </button>

                    {/* ACTION BUTTONS */}

                    <div
                      className="admin-products-card-actions"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        className="admin-products-edit-btn"
                        style={{ gridColumn: '1 / -1' }}
                        onClick={() => openEditModal(product)}
                      >
                        <Pencil size={16} />
                        Edit Stock
                      </button>

                      <button
                        type="button"
                        className="admin-products-feature-btn"
                        onClick={() => handleFeatured(product)}
                      >
                        <Star
                          size={15}
                          fill={featured ? 'currentColor' : 'none'}
                        />
                        {featured ? 'Unfeature' : 'Feature'}
                      </button>

                      <button
                        type="button"
                        className="admin-products-archive-btn"
                        onClick={() => handleArchive(product)}
                      >
                        <ArchiveIcon size={15} />
                        Archive
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* ================================== */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ================================== */}

      {showModal && (
        <div
          className="admin-products-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            className="admin-products-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-products-modal-title"
          >
            <div className="admin-products-modal-header">
              <div>
                <span className="admin-products-eyebrow">
                  INVENTORY DETAILS
                </span>

                <h2 id="admin-products-modal-title">
                  {editingProduct
                    ? 'Edit Product & Stock'
                    : 'Add Product'}
                </h2>

                <p>
                  Update product information, price, and available stock.
                </p>
              </div>

              <button
                type="button"
                className="admin-products-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-products-modal-body">

                <div className="admin-products-image-field">
                  <label>Product Image</label>

                  <div className="admin-products-image-upload">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Product preview"
                      />
                    ) : (
                      <div className="admin-products-upload-placeholder">
                        <ImagePlus size={30} />
                        <span>Upload product image</span>
                      </div>
                    )}

                    <label className="admin-products-upload-button">
                      <ImagePlus size={16} />
                      Choose Image

                      <input
                        type="file"
                        name="image"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleChange}
                      />
                    </label>
                  </div>

                  <small>Accepted formats: JPG, PNG, WEBP.</small>
                </div>

                <div className="admin-products-form-grid">
                  <div className="admin-products-field full">
                    <label htmlFor="product_name">
                      Product Name *
                    </label>

                    <input
                      id="product_name"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleChange}
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="category_id">Category *</label>

                    <select
                      id="category_id"
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select category</option>

                      {categories.map(category => (
                        <option
                          key={category.category_id}
                          value={category.category_id}
                        >
                          {category.category_name || category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="unit">Stock Unit</label>

                    <input
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      placeholder="e.g. kg, piece, bundle"
                    />
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="price">Base Price (₱) *</label>

                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="stock_quantity">
                      Available Stock *
                    </label>

                    <input
                      id="stock_quantity"
                      name="stock_quantity"
                      type="number"
                      min="0"
                      step="0.001"
                      value={formData.stock_quantity}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="admin-products-field full">
                    <label htmlFor="description">Description</label>

                    <textarea
                      id="description"
                      name="description"
                      rows="3"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Write a short product description..."
                    />
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="status">Product Status</label>

                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <label className="admin-products-featured-checkbox">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                  />

                  <span>
                    <Star size={17} />
                    Feature this product
                  </span>
                </label>
              </div>

              <div className="admin-products-modal-footer">
                <button
                  type="button"
                  className="admin-products-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-products-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingProduct
                      ? 'Save Changes'
                      : 'Add Product'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* ================================== */}
      {/* QUANTITY OPTIONS MODAL */}
      {/* ================================== */}

      {showOptionsModal && selectedProduct && (
        <div
          className="admin-products-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeOptionsModal()
            }
          }}
          style={{ zIndex: 1200 }}
        >
          <section
            className="admin-products-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quantity-options-title"
            style={{
              width: 'min(760px, 95vw)',
              maxWidth: '760px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="admin-products-modal-header">
              <div>
                <span className="admin-products-eyebrow">
                  PRODUCT PRICING
                </span>

                <h2 id="quantity-options-title">
                  Quantity Options
                </h2>

                <p>
                  {selectedProduct.product_name} — Set individual prices
                  for each quantity.
                </p>
              </div>

              <button
                type="button"
                className="admin-products-modal-close"
                onClick={closeOptionsModal}
                disabled={optionSaving}
              >
                <X size={21} />
              </button>
            </div>

            <div
              className="admin-products-modal-body"
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {/* ADD / EDIT OPTION FORM */}

              <form
                onSubmit={handleOptionSubmit}
                style={{
                  padding: 17,
                  border: '1px solid #dce9dd',
                  borderRadius: 12,
                  background: '#f8fbf7',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 15px',
                    color: '#285d3b',
                    fontSize: 16,
                  }}
                >
                  {editingOption ? 'Edit Quantity Option' : 'Add New Option'}
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                    gap: 12,
                  }}
                >
                  <div className="admin-products-field">
                    <label htmlFor="option_label">Display Label *</label>

                    <input
                      id="option_label"
                      name="option_label"
                      value={optionForm.option_label}
                      onChange={handleOptionFormChange}
                      placeholder="e.g. ¼ kilo"
                      required
                    />
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="quantity_value">
                      Quantity Value *
                    </label>

                    <input
                      id="quantity_value"
                      name="quantity_value"
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={optionForm.quantity_value}
                      onChange={handleOptionFormChange}
                      placeholder="e.g. 0.25"
                      required
                    />
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="option_unit">Unit *</label>

                    <select
                      id="option_unit"
                      name="unit"
                      value={optionForm.unit}
                      onChange={handleOptionFormChange}
                      required
                    >
                      <option value="kg">kg</option>
                      <option value="piece">piece</option>
                      <option value="pack">pack</option>
                      <option value="bundle">bundle</option>
                      <option value="bunch">bunch</option>
                      <option value="liter">liter</option>
                      <option value="dozen">dozen</option>
                    </select>
                  </div>

                  <div className="admin-products-field">
                    <label htmlFor="option_price">Price (₱) *</label>

                    <input
                      id="option_price"
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={optionForm.price}
                      onChange={handleOptionFormChange}
                      placeholder="e.g. 100"
                      required
                    />
                  </div>
                </div>

                <p
                  style={{
                    margin: '12px 0',
                    color: '#68776b',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Quantity Value is the amount deducted from product stock
                  for one pack. Make sure the unit matches the product's
                  stock unit. Enter the price manually; it will not be
                  automatically calculated.
                </p>

                {optionError && (
                  <div
                    style={{
                      padding: '10px 12px',
                      marginBottom: 12,
                      borderRadius: 8,
                      background: '#fff0ed',
                      color: '#b53b2e',
                      fontSize: 13,
                    }}
                  >
                    <AlertCircle size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    {optionError}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  {editingOption && (
                    <button
                      type="button"
                      onClick={resetOptionForm}
                      disabled={optionSaving}
                      style={{
                        padding: '10px 15px',
                        border: '1px solid #d5dfd6',
                        borderRadius: 8,
                        background: '#fff',
                        color: '#526357',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={optionSaving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      padding: '10px 17px',
                      border: 'none',
                      borderRadius: 8,
                      background: '#2d7752',
                      color: '#fff',
                      cursor: optionSaving ? 'wait' : 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    {optionSaving ? (
                      <RefreshCw size={16} />
                    ) : (
                      <Plus size={17} />
                    )}

                    {optionSaving
                      ? 'Saving...'
                      : editingOption
                        ? 'Save Option'
                        : 'Add Option'}
                  </button>
                </div>
              </form>

              {/* EXISTING OPTIONS */}

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      color: '#294d35',
                    }}
                  >
                    Existing Quantity Options
                  </h3>

                  <span
                    style={{
                      padding: '4px 9px',
                      borderRadius: 20,
                      background: '#e8f3e9',
                      color: '#2d7752',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {quantityOptions.length} options
                  </span>
                </div>

                {optionsLoading ? (
                  <div
                    style={{
                      padding: 25,
                      textAlign: 'center',
                      color: '#6d7e70',
                    }}
                  >
                    <RefreshCw
                      size={22}
                      className="admin-products-spinning"
                    />
                    <p>Loading quantity options...</p>
                  </div>
                ) : quantityOptions.length === 0 ? (
                  <div
                    style={{
                      padding: 25,
                      textAlign: 'center',
                      border: '1px dashed #cbdccb',
                      borderRadius: 10,
                      color: '#708073',
                    }}
                  >
                    <Scale size={30} />
                    <h4 style={{ margin: '9px 0 5px' }}>
                      No quantity options yet
                    </h4>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      Add your first quantity option using the form above.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 9,
                    }}
                  >
                    {quantityOptions.map(option => {
                      const available = optionIsAvailable(option)

                      return (
                        <div
                          key={option.option_id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            alignItems: 'center',
                            gap: 12,
                            padding: '13px',
                            border: '1px solid #e1e9e1',
                            borderRadius: 10,
                            background: available ? '#fff' : '#f6f6f6',
                            opacity: available ? 1 : 0.72,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: 'block',
                                color: '#2b5136',
                                fontSize: 15,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {option.option_label}
                            </strong>

                            <span
                              style={{
                                display: 'block',
                                marginTop: 4,
                                color: '#6e7b70',
                                fontSize: 12,
                              }}
                            >
                              Stock amount: {option.quantity_value} {option.unit}
                            </span>

                            <strong
                              style={{
                                display: 'block',
                                marginTop: 5,
                                color: '#2d7752',
                                fontSize: 15,
                              }}
                            >
                              {formatPrice(option.price)}
                            </strong>

                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 5,
                                padding: '3px 8px',
                                borderRadius: 20,
                                background: available ? '#e6f5e9' : '#eee',
                                color: available ? '#287342' : '#777',
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              {available ? 'AVAILABLE' : 'DISABLED'}
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              justifyContent: 'flex-end',
                              gap: 6,
                            }}
                          >
                            <button
                              type="button"
                              title="Edit option"
                              onClick={() => startEditOption(option)}
                              style={{
                                width: 36,
                                height: 36,
                                display: 'grid',
                                placeItems: 'center',
                                border: '1px solid #d8e5d9',
                                borderRadius: 8,
                                background: '#f3f8f3',
                                color: '#2d7752',
                                cursor: 'pointer',
                              }}
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              title={available ? 'Disable option' : 'Enable option'}
                              onClick={() => toggleOptionAvailability(option)}
                              style={{
                                width: 36,
                                height: 36,
                                display: 'grid',
                                placeItems: 'center',
                                border: '1px solid #d8e5d9',
                                borderRadius: 8,
                                background: '#fff',
                                color: available ? '#a15b36' : '#2d7752',
                                cursor: 'pointer',
                              }}
                            >
                              {available ? (
                                <ToggleRight size={20} />
                              ) : (
                                <ToggleLeft size={20} />
                              )}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 9,
                  background: '#fff8e9',
                  color: '#80632c',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <AlertCircle
                  size={16}
                  style={{ marginRight: 6, verticalAlign: 'middle' }}
                />
                Disabling an option hides it from buyers. Existing cart and
                order records are not deleted. Historical order prices remain
                saved in their order records.
              </div>
            </div>

            <div className="admin-products-modal-footer">
              <button
                type="button"
                className="admin-products-cancel-btn"
                onClick={closeOptionsModal}
                disabled={optionSaving}
              >
                <ArrowLeft size={15} />
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminProducts
