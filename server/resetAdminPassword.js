// Run once: node resetAdminPassword.js
// Resets the admin user's password to whatever is currently in ADMIN_PASSWORD in .env
// (use this if you forgot your password or changed .env after the account already existed)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  const user = await User.findOne({ username });
  if (!user) {
    console.log(`No user found with username "${username}". Run createAdmin.js instead.`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  user.password = hashed;
  user.role = 'admin';
  await user.save();

  console.log(`Password for "${username}" has been reset to match .env. Role confirmed as admin.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
