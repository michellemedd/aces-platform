const express = require('express');
const { pool } = require('../db/schema');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Renewal Assessment Report
router.get('/renewal', authenticate, async (req, res) => {
  try {
    const coachFilter = req.user.role !== 'admin' ? `AND e.coach_id = ${req.user.id}` : '';

    const result = await pool.query(`
      SELECT
        e.id AS entrepreneur_id,
        e.first_name, e.last_name, e.email, e.company_name,
        e.status AS entrepreneur_status,
        u.name AS coach_name,
        -- Shared risk sprint (sprint 2)
        s2.id AS sprint2_id,
        s2.end_date AS shared_risk_end_date,
        s2.likelihood_guarantee AS sr_likelihood_guarantee,
        s2.renewal_potential AS sr_renewal_potential,
        s2.guarantee_alert AS sr_guarantee_alert,
        s2.renewal_notes AS sr_renewal_notes,
        s2.renewal_completed_at AS sr_completed_at,
        s2.revenue AS sr_revenue,
        -- Year end sprint (sprint 6)
        s6.id AS sprint6_id,
        s6.end_date AS year_end_date,
        s6.likelihood_guarantee AS ye_likelihood_guarantee,
        s6.renewal_potential AS ye_renewal_potential,
        s6.guarantee_alert AS ye_guarantee_alert,
        s6.renewal_notes AS ye_renewal_notes,
        s6.renewal_completed_at AS ye_completed_at,
        s6.revenue AS ye_revenue,
        -- Total revenue across all sprints
        (SELECT COALESCE(SUM(s.revenue), 0) FROM sprints s WHERE s.entrepreneur_id = e.id) AS total_revenue
      FROM entrepreneurs e
      LEFT JOIN users u ON e.coach_id = u.id
      LEFT JOIN sprints s2 ON s2.entrepreneur_id = e.id AND s2.sprint_number = 2
      LEFT JOIN sprints s6 ON s6.entrepreneur_id = e.id AND s6.sprint_number = 6
      WHERE 1=1 ${coachFilter}
      ORDER BY e.last_name, e.first_name
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
