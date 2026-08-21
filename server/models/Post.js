const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true }, // HTML from Quill editor
    excerpt: { type: String, default: '' },
    category: { type: String, default: 'Uncategorized', trim: true },
    tags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published'],
      default: 'draft'
    },
    coverImage: { type: String, default: '' }, // relative path e.g. /uploads/xyz.jpg
    likes: { type: Number, default: 0 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Text index for search across title, content, tags
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Post', postSchema);
