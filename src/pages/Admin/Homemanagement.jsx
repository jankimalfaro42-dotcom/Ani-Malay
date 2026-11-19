import { useState } from 'react'
import './Admin.css'

function HomeManagement() {
  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Fresh Mangoes',
      category: 'Crops',
      price: 120,
      unit: 'kg',
      stock: 'Available',
      image: '/images/mangoes.jpg',
    },
    {
      id: 2,
      name: 'Local Rice',
      category: 'Crops',
      price: 65,
      unit: 'kg',
      stock: 'Available',
      image: '/images/rice.jpg',
    },
    {
      id: 3,
      name: 'Native Chicken',
      category: 'Livestock',
      price: 280,
      unit: 'kg',
      stock: 'Available',
      image: '/images/native-chicken.jpg',
    },
    {
      id: 4,
      name: 'Fresh Fish',
      category: 'Fisheries',
      price: 220,
      unit: 'kg',
      stock: 'Available',
      image: '/images/fresh-fish.jpg',
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'Crops',
    price: '',
    unit: 'kg',
    stock: 'Available',
    image: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!formData.name || !formData.price) {
      alert('Please enter the product name and price.')
      return
    }

    if (editingProduct) {
      setProducts(
        products.map((product) =>
          product.id === editingProduct.id
            ? {
                ...product,
                ...formData,
                price: Number(formData.price),
              }
            : product
        )
      )

      alert('Product updated successfully.')
    } else {
      const newProduct = {
        id: Date.now(),
        ...formData,
        price: Number(formData.price),
      }

      setProducts([...products, newProduct])

      alert('Product added successfully.')
    }

    resetForm()
  }

  const handleEdit = (product) => {
    setEditingProduct(product)

    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      unit: product.unit,
      stock: product.stock,
      image: product.image,
    })

    setShowForm(true)
  }

  const handleDelete = (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?'
    )

    if (!confirmed) return

    setProducts(products.filter((product) => product.id !== id))

    alert('Product deleted successfully.')
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Crops',
      price: '',
      unit: 'kg',
      stock: 'Available',
      image: '',
    })

    setEditingProduct(null)
    setShowForm(false)
  }

  return (
    <div className="admin-content">
      {/* HEADER */}
      <div className="admin-page-header">
        <div>
          <h1>Home Management</h1>
          <p>Manage the featured products displayed on the Home page.</p>
        </div>

        <button
          className="admin-primary-btn"
          onClick={() => {
            setEditingProduct(null)
            setFormData({
              name: '',
              category: 'Crops',
              price: '',
              unit: 'kg',
              stock: 'Available',
              image: '',
            })
            setShowForm(true)
          }}
        >
          + Add Featured Product
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="admin-form-card">
          <h2>
            {editingProduct
              ? 'Edit Featured Product'
              : 'Add Featured Product'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                />
              </div>

              <div className="admin-form-group">
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="Crops">Crops</option>
                  <option value="Livestock">Livestock</option>
                  <option value="Fisheries">Fisheries</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label>Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter price"
                  min="0"
                />
              </div>

              <div className="admin-form-group">
                <label>Unit</label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                >
                  <option value="kg">kg</option>
                  <option value="piece">piece</option>
                  <option value="bundle">bundle</option>
                  <option value="pack">pack</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label>Status</label>
                <select
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                >
                  <option value="Available">Available</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label>Image Path</label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="/images/product.jpg"
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-primary-btn"
              >
                {editingProduct ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRODUCT TABLE */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h2>Featured Products</h2>
            <p>{products.length} product(s) currently featured.</p>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="admin-product-image"
                    />
                  </td>

                  <td>
                    <strong>{product.name}</strong>
                  </td>

                  <td>{product.category}</td>

                  <td>
                    ₱{product.price} / {product.unit}
                  </td>

                  <td>
                    <span className="admin-status">
                      {product.stock}
                    </span>
                  </td>

                  <td>
                    <div className="admin-action-buttons">
                      <button
                        className="admin-edit-btn"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>

                      <button
                        className="admin-delete-btn"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="admin-empty-state">
              <p>No featured products available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomeManagement