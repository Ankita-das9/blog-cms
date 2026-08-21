// Run once: node createAdmin.js
// Creates the single admin user from ADMIN_USERNAME / ADMIN_PASSWORD in .env
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  const existing = await User.findOne({ username });
  if (existing) {
    // Upgrade an existing account created before roles existed, so it doesn't
    // silently fall back to the 'writer' default.
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`User "${username}" already existed — role upgraded to 'admin'.`);
    } else {
      console.log(`User "${username}" already exists as admin. No changes made.`);
    }
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashed, role: 'admin', displayName: 'Admin' });
  console.log(`Admin user "${username}" created successfully with role 'admin'.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
