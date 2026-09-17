/**
 * Aditya Security Guard - Web app server
 *
 * Serves the static HTML/CSS/JS dashboard AND now connects to a local
 * MongoDB instance for authentication, user (admin/guard) management, and
 * duty places (main places + sub-places).
 *
 * Everything else (assignments, QR scans, uploaded images, duty status)
 * still runs on the static mock data in public/js/data.js - only login,
 * "Add/Get Security", and "Add Duty Places" are backed by MongoDB for now.
 *
 * Ports are intentionally separate:
 *   - Web server:  PORT in .env (default 3000)
 *   - MongoDB:     part of MONGO_URI in .env (default 27017, MongoDB's
 *                  standard port) - it is a completely separate process.
 *
 * First-time setup:
 *   1. Make sure a local MongoDB server is running (see README.md)
 *   2. cp .env.example .env   (adjust PORT / MONGO_* if needed)
 *   3. npm install
 *   4. Create the first admin user directly in mongosh (see README.md
 *      "Creating the first admin user") - use `npm run hash` to get a
 *      bcrypt hash for your chosen password first.
 *   5. npm start
 *   6. Log in as that admin, then use "Add Security" in the web app to
 *      create every other admin/guard account from here on.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dutyPlaceRoutes = require('./routes/dutyPlaces');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/duty-places', dutyPlaceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'MongoDB (see /api/health/db for connection state)' });
});

// Any /api/* path that didn't match a route above gets a JSON 404 instead
// of Express's default HTML error page. Without this, a typo'd endpoint or
// an old server process missing a newly-added route returns HTML, and the
// frontend's res.json() call fails with a confusing
// "Unexpected token '<', <!DOCTYPE..." error instead of a clear message.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No API route: ${req.method} ${req.originalUrl}` });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Final safety net: turn any uncaught error into JSON instead of Express's
// default HTML error page, so the frontend always gets parseable JSON back.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Aditya Security Guard web app running at http://localhost:${PORT}`);
  });
});
