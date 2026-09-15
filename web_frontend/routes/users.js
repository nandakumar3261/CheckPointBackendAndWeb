const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// GET /api/users                -> all users
// GET /api/users?role=security  -> only guards
// GET /api/users?role=admin     -> only admins
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching users.' });
  }
});

// POST /api/users  { roll_no, password, first_name, designation, mobile, role }
// Used by the admin "Add Security" form.
router.post('/', async (req, res) => {
  try {
    const { roll_no, password, first_name, designation, mobile, role } = req.body;

    if (!roll_no || !password || !first_name || !mobile || !role) {
      return res.status(400).json({ error: 'roll_no, password, first_name, mobile and role are all required.' });
    }
    if (!['admin', 'security'].includes(role)) {
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

module.exports = router;
