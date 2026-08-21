const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const Post = require('../models/Post');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Roles allowed to manage ANY post (not just their own)
const CAN_MANAGE_ALL = ['admin', 'editor'];

// Helper: generate a unique slug
async function generateUniqueSlug(title, existingId = null) {
  let base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let counter = 1;
  while (true) {
    const query = { slug };
    if (existingId) query._id = { $ne: existingId };
    const exists = await Post.findOne(query);
    if (!exists) return slug;
    slug = `${base}-${counter++}`;
  }
}

// GET /api/posts  -> public published posts (with pagination, category/tag filter)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 6, category, tag } = req.query;
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Post.countDocuments(filter);

    res.json({ posts, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/posts/search?q=...  -> public search (must be before /:slug)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const posts = await Post.find(
      { $text: { $search: q }, status: 'published' },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/posts/admin/all -> admin/editor see everyone's posts; writers see only their own
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    const filter = CAN_MANAGE_ALL.includes(req.user.role) ? {} : { author: req.user.id };
    const posts = await Post.find(filter).populate('author', 'username displayName role').sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/posts/:slug -> public single post
router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/posts -> create (any logged-in role), multipart/form-data with optional "coverImage" file
router.post('/', requireAuth, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, content, excerpt, category, status } = req.body;
    let { tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Writers cannot publish directly — they can only save as draft or submit for review.
    // Admins and editors can publish immediately.
    let finalStatus = 'draft';
    if (status === 'published') {
      finalStatus = CAN_MANAGE_ALL.includes(req.user.role) ? 'published' : 'pending_review';
    } else if (status === 'pending_review') {
      finalStatus = 'pending_review';
    }

    const slug = await generateUniqueSlug(title);

    const post = new Post({
      title,
      slug,
      content,
      excerpt: excerpt || content.replace(/<[^>]+>/g, '').slice(0, 150),
      category: category || 'Uncategorized',
      tags: tags || [],
      status: finalStatus,
      coverImage: req.file ? `/uploads/${req.file.filename}` : '',
      author: req.user.id
    });

    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/posts/:id -> update (admin/editor: any post. writer: only their own post)
router.put('/:id', requireAuth, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, content, excerpt, category, status } = req.body;
    let { tags } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isOwner = post.author && post.author.toString() === req.user.id;
    const canManageAll = CAN_MANAGE_ALL.includes(req.user.role);

    if (!canManageAll && !isOwner) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    if (typeof tags === 'string') {
      tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (title && title !== post.title) {
      post.slug = await generateUniqueSlug(title, post._id);
      post.title = title;
    }

    if (content !== undefined) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (category !== undefined) post.category = category;
    if (tags !== undefined) post.tags = tags;
    if (req.file) post.coverImage = `/uploads/${req.file.filename}`;

    if (status !== undefined) {
      if (status === 'published' && !canManageAll) {
        // Writers can't self-publish, even when editing an existing post
        post.status = 'pending_review';
      } else {
        post.status = status;
      }
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/posts/:id -> admin/editor: any post. writer: only their own post
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isOwner = post.author && post.author.toString() === req.user.id;
    const canManageAll = CAN_MANAGE_ALL.includes(req.user.role);

    if (!canManageAll && !isOwner) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/posts/:id/like -> public like increment
router.patch('/:id/like', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ likes: post.likes });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
