const express = require('express');
const { pool } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all partners for an entrepreneur
router.get('/entrepreneur/:entrepreneurId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM entrepreneur_partners WHERE entrepreneur_id = $1 ORDER BY name',
      [req.params.entrepreneurId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a partner
router.post('/', authenticate, async (req, res) => {
  const { entrepreneur_id, name, email, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO entrepreneur_partners (entrepreneur_id, name, email, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [entrepreneur_id, name, email || null, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a partner
router.put('/:id', authenticate, async (req, res) => {
  const { name, email, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE entrepreneur_partners SET name=$1, email=$2, status=$3 WHERE id=$4 RETURNING *',
      [name, email || null, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a partner
router.delete('/:id', authenticate, async (req, res) => {
  await pool.query('DELETE FROM entrepreneur_partners WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
