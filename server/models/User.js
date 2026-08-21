const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // stored hashed
    role: {
      type: String,
      enum: ['admin', 'editor', 'writer'],
      default: 'writer'
    },
    displayName: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
