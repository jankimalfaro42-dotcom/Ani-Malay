const express = require('express')
const router = express.Router()
const db = require('../db')
// ===============================
// GET ALL CATEGORIES
// ===============================
router.get('/', (req, res) => {
  const { search, status } = req.query
  let sql = `
    SELECT
      category_id,
      category_name,
      status
    FROM categories
    WHERE 1 = 1
  `
  const values = []
  // SEARCH
  if (search) {
    sql +=  `AND category_name LIKE ?`
    values.push(`%${search}%`)
  }
  // FILTER BY STATUS
  if (status) {
    sql +=  `AND status = ?`
    values.push(status)
  }
  sql +=  `ORDER BY category_id DESC`
  db.query(sql, values, (err, results) => {
    if (err) {
      console.error('❌ Error fetching categories:', err)
      return res.status(500).json({
        message: 'Failed to fetch categories',
      })
    }
    res.json(results)
  })
})
// ===============================
// CREATE CATEGORY
// ===============================
router.post('/', (req, res) => {
  const { category_name } = req.body
  const sql = `
    INSERT INTO categories (category_name, status)
    VALUES (?, 'active')
  `
  db.query(sql, [category_name], (err, result) => {
    if (err) {
      console.error('❌ Error adding category:', err)
      return res.status(500).json({
        message: 'Failed to add category',
      })
    }
    res.status(201).json({
      message: 'Category added successfully',
      category_id: result.insertId,
    })
  })
})
// ===============================
// UPDATE CATEGORY
// ===============================
router.put('/:id', (req, res) => {
  const { id } = req.params
  const { category_name } = req.body
  const sql = `
    UPDATE categories
    SET category_name = ?
    WHERE category_id = ?
  `
  db.query(sql, [category_name, id], (err, result) => {
    if (err) {
      console.error('❌ Error updating category:', err)
      return res.status(500).json({
        message: 'Failed to update category',
      })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Category not found',
      })
    }
    res.json({
      message: 'Category updated successfully',
    })
  })
})
// ===============================
// ARCHIVE CATEGORY
// ===============================
router.put('/:id/archive', (req, res) => {
  const { id } = req.params
  const sql = `
    UPDATE categories
    SET status = 'archived'
    WHERE category_id = ?
  `
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Error archiving category:', err)
      return res.status(500).json({
        message: 'Failed to archive category',
      })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Category not found',
      })
    }
    res.json({
      message: 'Category archived successfully',
    })
  })
})
module.exports = router

