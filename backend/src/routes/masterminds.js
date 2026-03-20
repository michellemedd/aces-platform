const express = require('express');
const { pool } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// List masterminds
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*,
        COUNT(DISTINCT mr.entrepreneur_id) AS registrations
      FROM masterminds m
      LEFT JOIN mastermind_registrations mr ON mr.mastermind_id = m.id
      GROUP BY m.id
      ORDER BY m.start_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single mastermind with sessions and registrations
router.get('/:id', authenticate, async (req, res) => {
  try {
    const mm = await pool.query('SELECT * FROM masterminds WHERE id = $1', [req.params.id]);
    if (!mm.rows[0]) return res.status(404).json({ error: 'Not found' });

    const sessions = await pool.query(`
      SELECT ms.*,
        COUNT(msa.entrepreneur_id) AS attendee_count
      FROM mastermind_sessions ms
      LEFT JOIN mastermind_session_attendees msa ON msa.session_id = ms.id
      WHERE ms.mastermind_id = $1
      GROUP BY ms.id
      ORDER BY ms.session_date, ms.start_time
    `, [req.params.id]);

    const registrations = await pool.query(`
      SELECT mr.*, e.first_name, e.last_name, e.email, e.company_name, u.name AS coach_name
      FROM mastermind_registrations mr
      JOIN entrepreneurs e ON mr.entrepreneur_id = e.id
      LEFT JOIN users u ON e.coach_id = u.id
      WHERE mr.mastermind_id = $1
      ORDER BY e.last_name
    `, [req.params.id]);

    res.json({ ...mm.rows[0], sessions: sessions.rows, registrations: registrations.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create mastermind (admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, start_date, end_date, description } = req.body;
  const result = await pool.query(
    'INSERT INTO masterminds (name, start_date, end_date, description) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, start_date, end_date, description]
  );
  res.status(201).json(result.rows[0]);
});

// Update mastermind
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, start_date, end_date, description, status } = req.body;
  const result = await pool.query(
    'UPDATE masterminds SET name=$1, start_date=$2, end_date=$3, description=$4, status=$5 WHERE id=$6 RETURNING *',
    [name, start_date, end_date, description, status, req.params.id]
  );
  res.json(result.rows[0]);
});

// Delete mastermind
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM masterminds WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Add session to mastermind
router.post('/:id/sessions', authenticate, requireAdmin, async (req, res) => {
  const { title, session_date, start_time, end_time, description, google_meet_url } = req.body;
  const result = await pool.query(
    'INSERT INTO mastermind_sessions (mastermind_id, title, session_date, start_time, end_time, description, google_meet_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [req.params.id, title, session_date, start_time, end_time, description, google_meet_url]
  );
  res.status(201).json(result.rows[0]);
});

// Register entrepreneur for mastermind
router.post('/:id/register', authenticate, async (req, res) => {
  const { entrepreneur_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO mastermind_registrations (mastermind_id, entrepreneur_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *',
      [req.params.id, entrepreneur_id]
    );
    res.json(result.rows[0] || { message: 'Already registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove registration
router.delete('/:id/register/:entrepreneurId', authenticate, requireAdmin, async (req, res) => {
  await pool.query(
    'DELETE FROM mastermind_registrations WHERE mastermind_id=$1 AND entrepreneur_id=$2',
    [req.params.id, req.params.entrepreneurId]
  );
  res.json({ success: true });
});

// Add entrepreneur to session
router.post('/sessions/:sessionId/attendees', authenticate, async (req, res) => {
  const { entrepreneur_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO mastermind_session_attendees (session_id, entrepreneur_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *',
      [req.params.sessionId, entrepreneur_id]
    );
    res.json(result.rows[0] || { message: 'Already added' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark calendar invite sent
router.put('/sessions/:sessionId/attendees/:entrepreneurId/invite', authenticate, async (req, res) => {
  const result = await pool.query(
    'UPDATE mastermind_session_attendees SET calendar_invite_sent=true WHERE session_id=$1 AND entrepreneur_id=$2 RETURNING *',
    [req.params.sessionId, req.params.entrepreneurId]
  );
  res.json(result.rows[0]);
});

// Get session attendees
router.get('/sessions/:sessionId/attendees', authenticate, async (req, res) => {
  const result = await pool.query(`
    SELECT msa.*, e.first_name, e.last_name, e.email, e.company_name, u.name AS coach_name
    FROM mastermind_session_attendees msa
    JOIN entrepreneurs e ON msa.entrepreneur_id = e.id
    LEFT JOIN users u ON e.coach_id = u.id
    WHERE msa.session_id = $1
    ORDER BY e.last_name
  `, [req.params.sessionId]);
  res.json(result.rows);
});

module.exports = router;
