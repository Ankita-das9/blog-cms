const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/comments/post/:postId -> public, only approved comments
router.get('/post/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId, approved: true }).sort({
      createdAt: -1
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/comments -> public submit (goes to pending/unapproved)
router.post('/', async (req, res) => {
  try {
    const { post, name, email, text } = req.body;
    if (!post || !name || !text) {
      return res.status(400).json({ message: 'post, name and text are required' });
    }
    const comment = new Comment({ post, name, email, text });
    await comment.save();
    res.status(201).json({ message: 'Comment submitted, awaiting approval' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/comments/admin/all -> admin/editor only, all comments (pending + approved)
router.get('/admin/all', requireAuth, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const comments = await Comment.find().populate('post', 'title slug').sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/comments/:id/approve -> admin/editor only
router.patch('/:id/approve', requireAuth, requireRole('admin', 'editor'), async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/comments/:id -> admin/editor only
router.delete('/:id', requireAuth, requireRole('admin', 'editor'), async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
