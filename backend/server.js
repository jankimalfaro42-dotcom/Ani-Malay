require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./db')
const productRoutes = require('./routes/productRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const userRoutes = require('./routes/userRoutes')
const orderRoutes = require('./routes/orderRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const deliveryRoutes = require('./routes/deliveryRoutes')
const reviewRoutes = require('./routes/reviewRoutes')
const priceHistoryRoutes = require('./routes/priceHistoryRoutes')
const reportRoutes = require('./routes/reportRoutes')
const verificationRoutes = require('./routes/verificationRoutes')
const cartRoutes = require('./routes/cartRoutes')
const path = require('path')
const riderRoutes = require('./routes/riderRoutes')
const messageRoutes = require('./routes/messageRoutes')
const notificationRoutes = require('./routes/notificationRoutes')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Serve uploaded product images
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
)

// API routes
app.use('/api/notifications', notificationRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)
app.use('/api/payments', paymentRoutes)

app.use('/api/deliveries', deliveryRoutes)
console.log(`Delivery routes registered on port ${PORT}`)

// Temporary delivery test route
app.get('/api/deliveries-test', (req, res) => {
  res.json({
    message: 'Delivery test works!',
  })
})

app.use('/api/reviews', reviewRoutes)
app.use('/api/price-history', priceHistoryRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/riders', riderRoutes)
app.use('/api/messages', messageRoutes)

// Main test route
app.get('/', (req, res) => {
  res.json({
    message: 'Ani-Malay Backend is running!',
  })
})

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Ani-Malay Backend running on port ${PORT}`)
})