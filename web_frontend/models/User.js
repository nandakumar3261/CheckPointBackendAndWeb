const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Field names match your actual data source:
 *   roll_no, password (bcrypt hash), first_name, designation, mobile, role
 *
 * "role" distinguishes admin accounts ("admin") from guard accounts
 * ("security") - both live in this one collection, matching how the
 * original app kept everyone under a single /users/ node.
 *
 * "password" holds a bcrypt hash, never plaintext.
 */
const UserSchema = new Schema(
  {
    roll_no: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    first_name: { type: String, required: true },
    designation: { type: String, default: 'Security Guard' },
    mobile: { type: String, required: true },
    role: { type: String, enum: ['admin', 'security'], required: true },
    blocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
