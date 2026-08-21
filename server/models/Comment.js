const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    text: { type: String, required: true, trim: true },
    approved: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
