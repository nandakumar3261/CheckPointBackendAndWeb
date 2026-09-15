/**
 * Seeds the local MongoDB `users` collection with the two accounts
 * migrated from Firebase (/users/309 etc). Safe to re-run - it upserts
 * by username, so it won't create duplicates.
 *
 * Usage:
 *   node seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const SEED_USERS = [
  {
    username: '2758',
    password: 'Thub@2758',
    name: 'K Nandakumar',
    designation: 'Developer',
    mobile: '9000443261',
    role: 'admin',
  },
  {
    username: '309',
    password: '1234',
    name: 'D SIVA PRASAD',
    designation: 'SECURITY OFFICER',
    mobile: '9542976665',
    role: 'user',
  },
];

async function seed() {
  await connectDB();

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.findOneAndUpdate(
      { username: u.username },
      {
        username: u.username,
        passwordHash,
        name: u.name,
        designation: u.designation,
        mobile: u.mobile,
        role: u.role,
      },
      { upsert: true, new: true }
    );
    console.log(`Seeded user: ${u.username} (${u.role}) - ${u.name}`);
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
