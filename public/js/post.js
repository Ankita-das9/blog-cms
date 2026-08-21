const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

const postDetail = document.getElementById('postDetail');
const commentsSection = document.getElementById('commentsSection');
const commentsList = document.getElementById('commentsList');

let currentPost = null;

function likedKey(id) {
  return `liked_${id}`;
}

async function loadPost() {
  if (!slug) {
    postDetail.innerHTML = '<p class="empty-state">No post specified.</p>';
    return;
  }
  try {
    const post = await getPostBySlug(slug);
    currentPost = post;
    renderPost(post);
    loadComments(post._id);
  } catch (err) {
    postDetail.innerHTML = `<p class="empty-state">Post not found.</p>`;
  }
}

function renderPost(post) {
  document.title = `${post.title} | My Blog`;
  const cover = post.coverImage
    ? `<img class="cover-image" src="${post.coverImage}" alt="${escapeHtml(post.title)}">`
    : '';
  const tags = (post.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
  const alreadyLiked = localStorage.getItem(likedKey(post._id));

  postDetail.innerHTML = `
    <div class="post-header">
      <span class="badge">${escapeHtml(post.category)}</span>
      <h1>${escapeHtml(post.title)}</h1>
      <div class="post-meta">
        <span>${formatDate(post.createdAt)}</span>
      </div>
    </div>
    ${cover}
    <div class="post-content">${post.content}</div>
    <div>${tags}</div>
    <button class="like-btn ${alreadyLiked ? 'liked' : ''}" id="likeBtn">
      <span id="likeIcon">${alreadyLiked ? '❤' : '🤍'}</span>
      <span id="likeCount">${post.likes || 0}</span> Likes
    </button>
  `;

  document.getElementById('likeBtn').addEventListener('click', handleLike);
  commentsSection.style.display = 'block';
}

async function handleLike() {
  if (!currentPost) return;
  if (localStorage.getItem(likedKey(currentPost._id))) return; // prevent multi-click spam

  try {
    const result = await likePost(currentPost._id);
    localStorage.setItem(likedKey(currentPost._id), '1');
    document.getElementById('likeCount').textContent = result.likes;
    document.getElementById('likeIcon').textContent = '❤';
    document.getElementById('likeBtn').classList.add('liked');
  } catch (err) {
    alert('Could not like post right now.');
  }
}

function renderComment(c) {
  return `
    <div class="comment">
      <strong>${escapeHtml(c.name)} <span class="comment-date">${formatDate(c.createdAt)}</span></strong>
      <p>${escapeHtml(c.text)}</p>
    </div>
  `;
}

async function loadComments(postId) {
  try {
    const comments = await getComments(postId);
    commentsList.innerHTML = comments.length
      ? comments.map(renderComment).join('')
      : '<p class="empty-state">No comments yet. Be the first!</p>';
  } catch (err) {
    commentsList.innerHTML = '<p class="empty-state">Could not load comments.</p>';
  }
}

document.getElementById('submitCommentBtn').addEventListener('click', async () => {
  const name = document.getElementById('commentName').value.trim();
  const email = document.getElementById('commentEmail').value.trim();
  const text = document.getElementById('commentText').value.trim();
  const msgEl = document.getElementById('commentMsg');

  if (!name || !text) {
    msgEl.textContent = 'Name and comment text are required.';
    return;
  }

  try {
    await submitComment({ post: currentPost._id, name, email, text });
    msgEl.style.color = '#2f6f4f';
    msgEl.textContent = 'Comment submitted! It will appear after approval.';
    document.getElementById('commentName').value = '';
    document.getElementById('commentEmail').value = '';
    document.getElementById('commentText').value = '';
  } catch (err) {
    msgEl.style.color = '#b1443e';
    msgEl.textContent = err.message;
  }
});

loadPost();
