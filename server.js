require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route – redirect to API info
app.get('/', (req, res) => {
  res.redirect('/api');
});

// API root route
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TikTok Creator Hub API',
    version: '1.0.0',
    endpoints: {
      auth: {
        signup: 'POST /api/auth/signup',
        signin: 'POST /api/auth/signin',
        me: 'GET /api/auth/me (protected)',
      },
      ideas: {
        getAll: 'GET /api/ideas (protected)',
        getOne: 'GET /api/ideas/:id (protected)',
        create: 'POST /api/ideas (protected)',
        update: 'PUT /api/ideas/:id (protected)',
        delete: 'DELETE /api/ideas/:id (protected)',
      },
      planner: {
        getCurrentWeek: 'GET /api/planner/current-week (protected)',
        assignIdea: 'POST /api/planner/assign-idea (protected)',
        updateStatus: 'PUT /api/planner/update-status (protected)',
        updateNote: 'PUT /api/planner/update-note (protected)',
      },
      health: 'GET /api/health',
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ideas', require('./routes/ideas'));
app.use('/api/planner', require('./routes/planner'));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;