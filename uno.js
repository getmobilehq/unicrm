import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Handle database connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

// Generate Refresh Token
const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Routes
app.get('/', (req, res) => res.send('UniCRM API is running'));

// Courses Routes
app.get('/courses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM courses');
    res.json(rows);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Database query failed', error: err.message });
  }
});

app.post('/courses', authenticateToken, async (req, res) => {
  const { title, description, price, duration } = req.body;
  
  // Validate request body
  if (!title || !description || !price || !duration) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ message: 'Price must be a positive number' });
  }
  if (typeof duration !== 'string' || duration.trim() === '') {
    return res.status(400).json({ message: 'Duration must be a valid string' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO courses (title, description, price, duration) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, price, duration]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Database insertion error:', err);
    res.status(500).json({ message: 'Database insertion failed', error: err.message });
  }
});

// Leads Routes
app.get('/leads', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM leads');
    res.json(rows);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Database query failed', error: err.message });
  }
});

// Server Start
app.listen(port, () => {
  console.log(`UniCRM API running on port ${port}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
