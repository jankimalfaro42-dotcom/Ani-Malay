
const express = require('express')
const router = express.Router()
const db = require('../db')

// GET ALL RIDERS
router.get('/', (req, res) => {
  const sql = `
    SELECT
      rider_id,
      full_name,
      contact_number,
      status,
      created_at
    FROM riders
    ORDER BY full_name ASC
  `

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching riders:', err)
      return res.status(500).json({
        message: 'Failed to fetch riders',
      })
    }

    res.json(results)
  })
})

// CREATE RIDER
router.post('/', (req, res) => {
  const { full_name, contact_number } = req.body

  if (
    !full_name ||
    !full_name.trim() ||
    !contact_number ||
    !contact_number.trim()
  ) {
    return res.status(400).json({
      message: 'Rider name and contact number are required',
    })
  }

  const sql = `
    INSERT INTO riders (full_name, contact_number)
    VALUES (?, ?)
  `

  db.query(
    sql,
    [full_name.trim(), contact_number.trim()],
    (err, result) => {
      if (err) {
        console.error('Error creating rider:', err)
        return res.status(500).json({
          message: 'Failed to create rider',
        })
      }

      res.status(201).json({
        message: 'Rider created successfully',
        rider_id: result.insertId,
      })
    }
  )
})

module.exports = router