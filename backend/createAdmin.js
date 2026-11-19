const bcrypt = require('bcrypt')
const db = require('./db')

const fullName = 'Ani-Malay Administrator'
const email = 'admin@ani-malay.com'
const contactNumber = '09000000000'
const address = 'Malay, Aklan'
const password = 'Admin123!'
const role = 'admin'
const status = 'active'

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    const sql = `
      INSERT INTO users
      (full_name, email, contact_number, address, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    db.query(
      sql,
      [
        fullName,
        email,
        contactNumber,
        address,
        hashedPassword,
        role,
        status,
      ],
      (err, result) => {
        if (err) {
          console.error('❌ Failed to create admin:', err.message)
          process.exit(1)
        }

        console.log('✅ Admin account created successfully!')
        console.log('📧 Email:', email)
        console.log('🔑 Password:', password)
        console.log('👤 Role:', role)

        process.exit(0)
      }
    )
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

createAdmin()