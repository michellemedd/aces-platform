require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/schema');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/entrepreneurs', require('./routes/entrepreneurs'));
app.use('/api/sprints', require('./routes/sprints'));
app.use('/api/lab-calls', require('./routes/labCalls'));
app.use('/api/masterminds', require('./routes/masterminds'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/reports', require('./routes/reports'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 ACES API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  });
