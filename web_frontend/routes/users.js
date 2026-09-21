const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

const ALLOWED_ROLES = ['admin', 'security'];

// GET /api/users?role=&search=&page=1&limit=10
//   role   - optional, 'admin' or 'security'
//   search - optional, matches first_name / roll_no / mobile (case-insensitive, partial)
//   page   - 1-based page number (default 1)
//   limit  - page size (default 10)
// Returns { data, total, page, limit, totalPages }
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;

    const search = (req.query.search || '').trim();
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ first_name: re }, { roll_no: re }, { mobile: re }, { designation: re }];
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 500);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users.' });
  }
});

// GET /api/users/by-roll/:roll_no
// One account looked up by its exact roll number (never includes the password
// hash). Used by the mobile app's Profile screen to show the account's current
// details straight from MongoDB rather than the copy saved at login.
router.get('/by-roll/:roll_no', async (req, res) => {
  try {
    const user = await User.findOne({ roll_no: String(req.params.roll_no).trim() }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({
      roll_no: user.roll_no,
      first_name: user.first_name,
      designation: user.designation,
      mobile: user.mobile,
      role: user.role,
      blocked: user.blocked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching user.' });
  }
});

// POST /api/users  { roll_no, password, first_name, designation, mobile, role }
// Used by the admin "Add Security" form (single account).
router.post('/', async (req, res) => {
  try {
    const { roll_no, password, first_name, designation, mobile, role } = req.body;

    if (!roll_no || !password || !first_name || !mobile || !role) {
      return res.status(400).json({ error: 'roll_no, password, first_name, mobile and role are all required.' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "role must be 'admin' or 'security'." });
    }

    const existing = await User.findOne({ roll_no: String(roll_no).trim() });
    if (existing) {
      return res.status(409).json({ error: 'That roll number already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      roll_no: String(roll_no).trim(),
      password: passwordHash,
      first_name: first_name.trim(),
      designation: designation?.trim() || 'Security Guard',
      mobile: mobile.trim(),
      role,
    });

    res.status(201).json({
      roll_no: user.roll_no,
      first_name: user.first_name,
      designation: user.designation,
      mobile: user.mobile,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating user.' });
  }
});

// POST /api/users/bulk  { users: [ { roll_no, password, first_name, designation, mobile, role }, ... ] }
// Used by the admin "Add Security" CSV bulk upload.
// Each row is validated and inserted independently - one bad row does not
// stop the rest. Returns a per-row summary so the frontend can show exactly
// what happened.
router.post('/bulk', async (req, res) => {
  try {
    const rows = Array.isArray(req.body.users) ? req.body.users : [];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'No rows to import.' });
    }
    if (rows.length > 2000) {
      return res.status(400).json({ error: 'Too many rows in one upload (max 2000).' });
    }

    const results = [];
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 so it matches the CSV line number (1 = header row)
      const { roll_no, password, first_name, designation, mobile, role } = rows[i] || {};

      if (!roll_no || !password || !first_name || !mobile || !role) {
        results.push({ row: rowNum, roll_no: roll_no || '', status: 'skipped', reason: 'Missing required field(s).' });
        continue;
      }
      if (!ALLOWED_ROLES.includes(String(role).trim())) {
        results.push({ row: rowNum, roll_no, status: 'skipped', reason: "role must be 'admin' or 'security'." });
        continue;
      }

      try {
        const existing = await User.findOne({ roll_no: String(roll_no).trim() });
        if (existing) {
          results.push({ row: rowNum, roll_no, status: 'skipped', reason: 'Roll number already exists.' });
          continue;
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        await User.create({
          roll_no: String(roll_no).trim(),
          password: passwordHash,
          first_name: String(first_name).trim(),
          designation: designation ? String(designation).trim() : 'Security Guard',
          mobile: String(mobile).trim(),
          role: String(role).trim(),
        });
        insertedCount += 1;
        results.push({ row: rowNum, roll_no, status: 'inserted' });
      } catch (rowErr) {
        results.push({ row: rowNum, roll_no, status: 'skipped', reason: rowErr.message || 'Unknown error.' });
      }
    }

    res.status(207).json({
      insertedCount,
      skippedCount: results.length - insertedCount,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during bulk import.' });
  }
});

// PUT /api/users/:id  { first_name, designation, mobile, role, password? }
// Edits an existing account. roll_no is not editable here (it's the login
// key). password is optional - leave it out to keep the current one.
router.put('/:id', async (req, res) => {
  try {
    const { first_name, designation, mobile, role, password } = req.body;

    if (!first_name || !mobile || !role) {
      return res.status(400).json({ error: 'first_name, mobile and role are required.' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "role must be 'admin' or 'security'." });
    }

    const update = {
      first_name: first_name.trim(),
      designation: designation?.trim() || 'Security Guard',
      mobile: mobile.trim(),
      role,
    };
    if (password && password.trim()) {
      update.password = await bcrypt.hash(password.trim(), 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating user.' });
  }
});

// PATCH /api/users/:id/toggle-block
// Flips the "blocked" flag. A blocked account can no longer log in
// (see routes/auth.js) but its data is kept.
router.patch('/:id/toggle-block', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.blocked = !user.blocked;
    await user.save();
    res.json({ _id: user._id, roll_no: user.roll_no, blocked: user.blocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating block status.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ deleted: true, roll_no: user.roll_no });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting user.' });
  }
});

module.exports = router;
