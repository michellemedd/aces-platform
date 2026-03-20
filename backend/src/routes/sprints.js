const express = require('express');
const { pool } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all sprints for an entrepreneur
router.get('/entrepreneur/:entrepreneurId', authenticate, async (req, res) => {
  try {
    // Verify coach access
    if (req.user.role !== 'admin') {
      const check = await pool.query('SELECT coach_id FROM entrepreneurs WHERE id = $1', [req.params.entrepreneurId]);
      if (!check.rows[0] || check.rows[0].coach_id !== req.user.id)
        return res.status(403).json({ error: 'Access denied' });
    }
    const result = await pool.query(
      'SELECT * FROM sprints WHERE entrepreneur_id = $1 ORDER BY sprint_number',
      [req.params.entrepreneurId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create sprint
router.post('/', authenticate, async (req, res) => {
  const {
    entrepreneur_id, sprint_number, start_date, end_date,
    status, is_shared_risk, revenue, okr_file_url
  } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO sprints
        (entrepreneur_id, sprint_number, start_date, end_date, status, is_shared_risk, revenue, okr_file_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [entrepreneur_id, sprint_number, start_date, end_date,
        status || 'upcoming', is_shared_risk || false, revenue || null, okr_file_url || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update sprint
router.put('/:id', authenticate, async (req, res) => {
  const {
    sprint_number, start_date, end_date, status, is_shared_risk,
    decision_at_review, revenue, okr_file_url, okr_reviewed, okr_notes,
    likelihood_guarantee, renewal_potential, guarantee_alert, renewal_notes
  } = req.body;
  try {
    const okr_reviewed_at = okr_reviewed ? new Date() : null;
    const renewal_completed_at = (likelihood_guarantee || renewal_potential || guarantee_alert || renewal_notes) ? new Date() : null;
    const result = await pool.query(`
      UPDATE sprints SET
        sprint_number=$1, start_date=$2, end_date=$3, status=$4,
        is_shared_risk=$5, decision_at_review=$6, revenue=$7,
        okr_file_url=$8, okr_reviewed=$9, okr_reviewed_at=$10, okr_notes=$11,
        likelihood_guarantee=$12, renewal_potential=$13, guarantee_alert=$14,
        renewal_notes=$15, renewal_completed_at=$16
      WHERE id=$17 RETURNING *
    `, [sprint_number, start_date, end_date, status, is_shared_risk,
        decision_at_review || null, revenue || null, okr_file_url,
        okr_reviewed || false, okr_reviewed_at, okr_notes,
        likelihood_guarantee || null, renewal_potential || null,
        guarantee_alert || null, renewal_notes || null,
        renewal_completed_at, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Auto-generate sprints for new enrollment using fixed calendar periods
router.post('/generate', authenticate, async (req, res) => {
  const { entrepreneur_id, enrollment_start } = req.body;
  try {
    // Parse enrollment date as local date to avoid timezone shifting
    const parts = enrollment_start.split('-');
    const enrollYear = parseInt(parts[0]);
    const enrollMonth = parseInt(parts[1]) - 1; // 0-indexed
    const enrollDay = parseInt(parts[2]);

    // Fixed sprint periods: [startMonth, endMonth, lastDay]
    const SPRINT_PERIODS = [
      { startMonth: 0, endMonth: 1, endDay: 28 },   // Jan–Feb
      { startMonth: 2, endMonth: 3, endDay: 30 },   // Mar–Apr
      { startMonth: 4, endMonth: 5, endDay: 30 },   // May–Jun
      { startMonth: 6, endMonth: 7, endDay: 31 },   // Jul–Aug
      { startMonth: 8, endMonth: 9, endDay: 31 },   // Sep–Oct
      { startMonth: 10, endMonth: 11, endDay: 31 }, // Nov–Dec
    ];

    // Find the next sprint period at or after enrollment date
    // If enrolled on the 1st of a sprint start month, use that sprint
    let firstPeriodIdx = -1;
    let firstYear = enrollYear;

    for (let i = 0; i < SPRINT_PERIODS.length; i++) {
      const p = SPRINT_PERIODS[i];
      // Compare purely by month and day numbers, no Date objects
      if (enrollMonth < p.startMonth || (enrollMonth === p.startMonth && enrollDay <= 1)) {
        firstPeriodIdx = i;
        firstYear = enrollYear;
        break;
      }
      // If enrollment is within this sprint period (after day 1), use NEXT period
      if (enrollMonth <= p.endMonth) {
        firstPeriodIdx = (i + 1) % 6;
        firstYear = i === 5 ? enrollYear + 1 : enrollYear;
        break;
      }
    }

    // Fallback: enrollment is past all sprint periods this year, start Jan next year
    if (firstPeriodIdx === -1) {
      firstPeriodIdx = 0;
      firstYear = enrollYear + 1;
    }

    const sprints = [];
    for (let i = 0; i < 6; i++) {
      const periodIdx = (firstPeriodIdx + i) % 6;
      const yearOffset = Math.floor((firstPeriodIdx + i) / 6);
      const year = firstYear + yearOffset;
      const period = SPRINT_PERIODS[periodIdx];

      // Handle Feb end day — check for leap year
      let endDay = period.endDay;
      if (period.endMonth === 1) {
        // February — check leap year
        endDay = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
      }

      const startDate = `${year}-${String(period.startMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(period.endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      const isSharedRisk = i < 2;
      const status = i === 0 ? 'active' : 'upcoming';

      const r = await pool.query(`
        INSERT INTO sprints (entrepreneur_id, sprint_number, start_date, end_date, status, is_shared_risk)
        VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
      `, [entrepreneur_id, i + 1, startDate, endDate, status, isSharedRisk]);
      sprints.push(r.rows[0]);
    }
    res.status(201).json(sprints);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete sprint
router.delete('/:id', authenticate, async (req, res) => {
  await pool.query('DELETE FROM sprints WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
