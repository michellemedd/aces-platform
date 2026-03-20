const express = require('express');
const { pool } = require('../db/schema');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { upcoming } = req.query;
    let query = `
      SELECT lc.*,
        COUNT(lca.id) FILTER (WHERE lca.attended = true) AS attended_count,
        COUNT(lca.id) AS registered_count
      FROM lab_calls lc
      LEFT JOIN lab_call_attendance lca ON lca.lab_call_id = lc.id
    `;
    if (upcoming === 'true') query += ` WHERE lc.call_date >= CURRENT_DATE`;
    query += ` GROUP BY lc.id ORDER BY lc.call_date ASC`;
    res.json((await pool.query(query)).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const call = await pool.query('SELECT * FROM lab_calls WHERE id = $1', [req.params.id]);
    if (!call.rows[0]) return res.status(404).json({ error: 'Not found' });
    const attendees = await pool.query(`
      SELECT lca.*, e.first_name, e.last_name, e.email, e.company_name, u.name AS coach_name
      FROM lab_call_attendance lca
      JOIN entrepreneurs e ON lca.entrepreneur_id = e.id
      LEFT JOIN users u ON e.coach_id = u.id
      WHERE lca.lab_call_id = $1 ORDER BY e.last_name
    `, [req.params.id]);
    res.json({ ...call.rows[0], attendees: attendees.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { call_date, day_of_week, topic, lab_type, sprint_period, execution_week, presenter, host_recorder, email_content, short_recap, meeting_url, recording_url, notes } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO lab_calls (call_date, day_of_week, topic, lab_type, sprint_period, execution_week, presenter, host_recorder, email_content, short_recap, meeting_url, recording_url, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [call_date, day_of_week, topic, lab_type, sprint_period, execution_week || null, presenter, host_recorder, email_content, short_recap, meeting_url, recording_url, notes]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { call_date, day_of_week, topic, lab_type, sprint_period, execution_week, presenter, host_recorder, email_content, short_recap, meeting_url, recording_url, notes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE lab_calls SET call_date=$1, day_of_week=$2, topic=$3, lab_type=$4, sprint_period=$5, execution_week=$6, presenter=$7, host_recorder=$8, email_content=$9, short_recap=$10, meeting_url=$11, recording_url=$12, notes=$13
      WHERE id=$14 RETURNING *
    `, [call_date, day_of_week, topic, lab_type, sprint_period, execution_week || null, presenter, host_recorder, email_content, short_recap, meeting_url, recording_url, notes, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM lab_calls WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/:id/attendance', authenticate, async (req, res) => {
  const { entrepreneur_id, attended } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO lab_call_attendance (lab_call_id, entrepreneur_id, attended) VALUES ($1,$2,$3)
      ON CONFLICT (lab_call_id, entrepreneur_id) DO UPDATE SET attended = $3 RETURNING *
    `, [req.params.id, entrepreneur_id, attended]);
    res.json(result.rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/bulk-import', authenticate, requireAdmin, async (req, res) => {
  const { calls } = req.body;
  let imported = 0, failed = 0, errors = [];
  for (const call of calls) {
    try {
      await pool.query(`
        INSERT INTO lab_calls (call_date, day_of_week, topic, lab_type, sprint_period, execution_week, presenter, host_recorder, email_content, short_recap, meeting_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [call.call_date, call.day_of_week, call.topic, call.lab_type, call.sprint_period, call.execution_week || null, call.presenter, call.host_recorder, call.email_content, call.short_recap, call.meeting_url || 'https://mrse.co/aces-zoom']);
      imported++;
    } catch (err) {
      failed++;
      errors.push(`${call.call_date} (${call.topic}): ${err.message}`);
    }
  }
  res.json({ imported, failed, errors });
});

module.exports = router;
