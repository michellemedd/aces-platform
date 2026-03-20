const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
  res.json(result.rows[0]);
});

// List all coaches (admin only)
router.get('/coaches', authenticate, requireAdmin, async (req, res) => {
  const result = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY name");
  res.json(result.rows);
});

// Create coach/admin (admin only)
router.post('/users', authenticate, requireAdmin, async (req, res) => {
  const { name, email, password, role = 'coach' } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// Update user
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, email, role, password } = req.body;
  try {
    let query, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET name=$1, email=$2, role=$3, password_hash=$4 WHERE id=$5 RETURNING id, name, email, role';
      params = [name, email, role, hash, req.params.id];
    } else {
      query = 'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING id, name, email, role';
      params = [name, email, role, req.params.id];
    }
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Seed admin (first-run only)
router.post('/seed-admin', async (req, res) => {
  try {
    const existing = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Admin already exists' });
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role",
      [name, email, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
