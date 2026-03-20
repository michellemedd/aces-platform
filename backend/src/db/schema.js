const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'coach' CHECK (role IN ('admin', 'coach')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS entrepreneurs (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        company_name VARCHAR(255),
        business_industry VARCHAR(255),
        timezone VARCHAR(100),
        program_tier VARCHAR(100),
        cohort VARCHAR(100),
        niche TEXT,
        tags TEXT[],
        google_drive_url TEXT,
        notes TEXT,
        coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'ECA', 'On Break', 'Coaching Only', 'Coaching Lite', 'Offboarded', 'Alumni', 'Discontinued', 'MIA')),
        is_plus BOOLEAN DEFAULT FALSE,
        enrollment_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS entrepreneur_partners (
        id SERIAL PRIMARY KEY,
        entrepreneur_id INTEGER REFERENCES entrepreneurs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sprints (
        id SERIAL PRIMARY KEY,
        entrepreneur_id INTEGER REFERENCES entrepreneurs(id) ON DELETE CASCADE,
        sprint_number INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'shared_risk_review', 'completed', 'cancelled')),
        is_shared_risk BOOLEAN DEFAULT FALSE,
        decision_at_review VARCHAR(20) CHECK (decision_at_review IN ('continue', 'cancel', NULL)),
        revenue NUMERIC(12,2),
        okr_file_url TEXT,
        okr_reviewed BOOLEAN DEFAULT FALSE,
        okr_reviewed_at TIMESTAMP,
        okr_notes TEXT,
        likelihood_guarantee VARCHAR(50) CHECK (likelihood_guarantee IN ('Met', 'Very Likely', 'Unlikely', 'Not Sure', 'N/A', NULL)),
        renewal_potential VARCHAR(100) CHECK (renewal_potential IN ('Renewed on Guarantee', 'Renewed 2yr', 'Renewed 1y CO', 'Renewed 1yr', 'Confirmed Coaching Only', 'Not renewing / continuing', 'Confirmed Full ACES Renewal', 'Potential Coaching Only', 'Low Potential', 'Medium Potential', 'High Potential', 'New Continuing', 'Just Renewed', NULL)),
        guarantee_alert VARCHAR(50) CHECK (guarantee_alert IN ('New', 'Qualifies', 'Questionable', 'Met', 'Not Eligible', 'Waived', '$4K Shared Risk', NULL)),
        renewal_notes TEXT,
        renewal_completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lab_calls (
        id SERIAL PRIMARY KEY,
        call_date DATE NOT NULL,
        call_time TIME DEFAULT '11:00:00',
        day_of_week VARCHAR(10) CHECK (day_of_week IN ('Tuesday', 'Thursday')),
        topic VARCHAR(500),
        lab_type VARCHAR(50) CHECK (lab_type IN ('Sprint Kickoff', 'Momentum', 'Community', 'No Labs', 'Other')),
        sprint_period VARCHAR(20),
        execution_week INTEGER,
        presenter VARCHAR(255),
        host_recorder VARCHAR(255),
        email_content TEXT,
        short_recap TEXT,
        meeting_url TEXT,
        recording_url TEXT,
        notes TEXT,
        google_calendar_event_id VARCHAR(255),
        calendar_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lab_call_attendance (
        id SERIAL PRIMARY KEY,
        lab_call_id INTEGER REFERENCES lab_calls(id) ON DELETE CASCADE,
        entrepreneur_id INTEGER REFERENCES entrepreneurs(id) ON DELETE CASCADE,
        attended BOOLEAN DEFAULT FALSE,
        UNIQUE(lab_call_id, entrepreneur_id)
      );

      CREATE TABLE IF NOT EXISTS masterminds (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS mastermind_sessions (
        id SERIAL PRIMARY KEY,
        mastermind_id INTEGER REFERENCES masterminds(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        description TEXT,
        google_calendar_event_id VARCHAR(255),
        google_meet_url TEXT
      );

      CREATE TABLE IF NOT EXISTS mastermind_registrations (
        id SERIAL PRIMARY KEY,
        mastermind_id INTEGER REFERENCES masterminds(id) ON DELETE CASCADE,
        entrepreneur_id INTEGER REFERENCES entrepreneurs(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(mastermind_id, entrepreneur_id)
      );

      CREATE TABLE IF NOT EXISTS mastermind_session_attendees (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES mastermind_sessions(id) ON DELETE CASCADE,
        entrepreneur_id INTEGER REFERENCES entrepreneurs(id) ON DELETE CASCADE,
        calendar_invite_sent BOOLEAN DEFAULT FALSE,
        UNIQUE(session_id, entrepreneur_id)
      );
    `);
    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
