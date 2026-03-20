const express = require('express');
const { pool } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Scope: admin sees all, coach sees own
const scopeFilter = (req) => {
  if (req.user.role === 'admin') return { where: '', params: [] };
  return { where: 'WHERE e.coach_id = $1', params: [req.user.id] };
};

// List entrepreneurs
router.get('/', authenticate, async (req, res) => {
  try {
    const { where, params } = scopeFilter(req);
    const result = await pool.query(`
      SELECT e.*, u.name AS coach_name,
        (SELECT COUNT(*) FROM sprints s WHERE s.entrepreneur_id = e.id) AS sprint_count,
        (SELECT s2.sprint_number FROM sprints s2 WHERE s2.entrepreneur_id = e.id AND s2.status = 'active' LIMIT 1) AS current_sprint
      FROM entrepreneurs e
      LEFT JOIN users u ON e.coach_id = u.id
      ${where}
      ORDER BY e.last_name, e.first_name
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single entrepreneur
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { where, params } = scopeFilter(req);
    const extra = params.length ? `AND e.id = $2` : `WHERE e.id = $1`;
    const allParams = params.length ? [...params, req.params.id] : [req.params.id];
    const result = await pool.query(`
      SELECT e.*, u.name AS coach_name, u.email AS coach_email
      FROM entrepreneurs e
      LEFT JOIN users u ON e.coach_id = u.id
      ${where} ${extra}
    `, allParams);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create entrepreneur
router.post('/', authenticate, async (req, res) => {
  const {
    first_name, last_name, email, phone, company_name, business_industry,
    timezone, cohort, niche, tags, google_drive_url, notes,
    coach_id, enrollment_date, status, is_plus
  } = req.body;

  const assignedCoach = req.user.role === 'admin' ? coach_id : req.user.id;
  try {
    const result = await pool.query(`
      INSERT INTO entrepreneurs
        (first_name, last_name, email, phone, company_name, business_industry,
         timezone, cohort, niche, tags, google_drive_url, notes,
         coach_id, enrollment_date, status, is_plus)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [first_name, last_name, email, phone, company_name, business_industry,
        timezone, cohort, niche || null, tags || [], google_drive_url, notes,
        assignedCoach, enrollment_date, status || 'Active', is_plus || false]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update entrepreneur
router.put('/:id', authenticate, async (req, res) => {
  const {
    first_name, last_name, email, phone, company_name, business_industry,
    timezone, cohort, niche, tags, google_drive_url, notes,
    coach_id, enrollment_date, status, is_plus
  } = req.body;

  try {
    if (req.user.role !== 'admin') {
      const check = await pool.query('SELECT coach_id FROM entrepreneurs WHERE id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].coach_id !== req.user.id)
        return res.status(403).json({ error: 'Access denied' });
    }
    const assignedCoach = req.user.role === 'admin' ? coach_id : req.user.id;
    const result = await pool.query(`
      UPDATE entrepreneurs SET
        first_name=$1, last_name=$2, email=$3, phone=$4, company_name=$5,
        business_industry=$6, timezone=$7, cohort=$8, niche=$9,
        tags=$10, google_drive_url=$11, notes=$12, coach_id=$13,
        enrollment_date=$14, status=$15, is_plus=$16, updated_at=NOW()
      WHERE id=$17 RETURNING *
    `, [first_name, last_name, email, phone, company_name, business_industry,
        timezone, cohort, niche || null, tags || [], google_drive_url, notes,
        assignedCoach, enrollment_date, status, is_plus || false, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete entrepreneur (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM entrepreneurs WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// Stats summary for dashboard
router.get('/meta/stats', authenticate, async (req, res) => {
  try {
    const { where, params } = scopeFilter(req);
    const prefix = params.length ? `WHERE e.coach_id = $1` : '';
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE e.status = 'Active') AS active,
        COUNT(*) FILTER (WHERE e.status = 'Offboarded') AS cancelled,
        COUNT(*) FILTER (WHERE e.status = 'Alumni') AS re_enrolled,
        COUNT(*) FILTER (WHERE e.status = 'Discontinued') AS completed,
        COUNT(*) AS total
      FROM entrepreneurs e
      ${prefix}
    `, params);
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Renewal alerts — entrepreneurs with Sprint 2 or Sprint 6 ending within 30 or 7 days
router.get('/meta/renewal-alerts', authenticate, async (req, res) => {
  try {
    const { where, params } = scopeFilter(req);
    const coachFilter = params.length ? `AND e.coach_id = $1` : '';
    const r = await pool.query(`
      SELECT
        e.id, e.first_name, e.last_name, e.email, e.company_name,
        u.name AS coach_name, u.email AS coach_email,
        s.sprint_number, s.end_date, s.id AS sprint_id,
        s.likelihood_guarantee, s.renewal_potential, s.guarantee_alert, s.renewal_notes,
        s.renewal_completed_at,
        CASE
          WHEN s.sprint_number = 2 THEN 'Shared Risk Review'
          WHEN s.sprint_number = 6 THEN 'Year-End Review'
        END AS review_type,
        (s.end_date - CURRENT_DATE) AS days_remaining
      FROM entrepreneurs e
      JOIN sprints s ON s.entrepreneur_id = e.id
        AND s.sprint_number IN (2, 6)
        AND s.end_date >= CURRENT_DATE
        AND (s.end_date - CURRENT_DATE) <= 30
      LEFT JOIN users u ON e.coach_id = u.id
      WHERE e.status = 'Active'
      ${coachFilter}
      ORDER BY s.end_date ASC
    `, params);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
