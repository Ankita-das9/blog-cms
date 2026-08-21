// Guard: redirect to login if no token
if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

// Verify token is still valid on load, and keep role/displayName in sync
verifyToken()
  .then(me => {
    localStorage.setItem('role', me.role || 'writer');
    initRoleUI();
  })
  .catch(() => logout());

document.getElementById('logoutBtn').addEventListener('click', e => {
  e.preventDefault();
  logout();
});

const postsTableWrap = document.getElementById('postsTableWrap');
const commentsTableWrap = document.getElementById('commentsTableWrap');
const usersTableWrap = document.getElementById('usersTableWrap');
const tabPosts = document.getElementById('tabPosts');
const tabComments = document.getElementById('tabComments');
const tabUsers = document.getElementById('tabUsers');
const postsTab = document.getElementById('postsTab');
const commentsTab = document.getElementById('commentsTab');
const usersTab = document.getElementById('usersTab');
const roleBadgeWrap = document.getElementById('roleBadgeWrap');
const welcomeName = document.getElementById('welcomeName');

function initRoleUI() {
  const role = getRole();
  const displayName = localStorage.getItem('displayName');
  const username = localStorage.getItem('username');

  welcomeName.textContent = `— ${displayName || username} (${role})`;
  roleBadgeWrap.innerHTML = `<span class="badge">${role}</span>`;

  // Only admin/editor moderate comments
  if (!canManageAll()) {
    tabComments.style.display = 'none';
  }

  // Only admin manages users
  if (isAdmin()) {
    tabUsers.style.display = 'inline';
  }
}

function switchTab(activeTab, activeSection) {
  [tabPosts, tabComments, tabUsers].forEach(t => t.classList.remove('active'));
  [postsTab, commentsTab, usersTab].forEach(s => (s.style.display = 'none'));
  activeTab.classList.add('active');
  activeSection.style.display = 'block';
}

tabPosts.addEventListener('click', e => {
  e.preventDefault();
  switchTab(tabPosts, postsTab);
});

tabComments.addEventListener('click', e => {
  e.preventDefault();
  switchTab(tabComments, commentsTab);
  loadComments();
});

tabUsers.addEventListener('click', e => {
  e.preventDefault();
  switchTab(tabUsers, usersTab);
  loadUsers();
});

// ---------- POSTS ----------
async function loadPosts() {
  try {
    const posts = await getAllPostsAdmin();
    if (!posts.length) {
      postsTableWrap.innerHTML = '<p class="empty-state">No posts yet. Create your first one!</p>';
      return;
    }
    const showAuthorCol = canManageAll();
    postsTableWrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            ${showAuthorCol ? '<th>Author</th>' : ''}
            <th>Status</th>
            <th>Date</th>
            <th>Likes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map(p => renderPostRow(p, showAuthorCol)).join('')}
        </tbody>
      </table>
    `;

    postsTableWrap.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDelete(btn.dataset.id, btn.dataset.title));
    });
  } catch (err) {
    postsTableWrap.innerHTML = `<p class="empty-state">Failed to load posts: ${err.message}</p>`;
  }
}

function statusBadge(status) {
  if (status === 'published') return '<span class="badge">Published</span>';
  if (status === 'pending_review') return '<span class="badge draft">Pending Review</span>';
  return '<span class="badge draft">Draft</span>';
}

function renderPostRow(post, showAuthorCol) {
  const authorName = post.author
    ? escapeHtml(post.author.displayName || post.author.username)
    : '\u2014';
  return `
    <tr>
      <td>${escapeHtml(post.title)}</td>
      <td>${escapeHtml(post.category)}</td>
      ${showAuthorCol ? `<td>${authorName}</td>` : ''}
      <td>${statusBadge(post.status)}</td>
      <td>${formatDate(post.createdAt)}</td>
      <td>${post.likes || 0}</td>
      <td class="row-actions">
        <a class="btn btn-outline btn-sm" href="editor.html?id=${post._id}">Edit</a>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${post._id}" data-title="${escapeHtml(post.title)}">Delete</button>
      </td>
    </tr>
  `;
}

async function handleDelete(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    await deletePost(id);
    loadPosts();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

// ---------- COMMENTS (admin/editor only) ----------
async function loadComments() {
  commentsTableWrap.innerHTML = '<p class="empty-state">Loading comments...</p>';
  try {
    const comments = await getAllCommentsAdmin();
    if (!comments.length) {
      commentsTableWrap.innerHTML = '<p class="empty-state">No comments yet.</p>';
      return;
    }
    commentsTableWrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr><th>Post</th><th>Name</th><th>Comment</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${comments.map(renderCommentRow).join('')}
        </tbody>
      </table>
    `;

    commentsTableWrap.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => handleApprove(btn.dataset.id));
    });
    commentsTableWrap.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteComment(btn.dataset.id));
    });
  } catch (err) {
    commentsTableWrap.innerHTML = `<p class="empty-state">Failed to load comments: ${err.message}</p>`;
  }
}

function renderCommentRow(c) {
  const postTitle = c.post ? escapeHtml(c.post.title) : '(deleted post)';
  const badge = c.approved
    ? '<span class="badge">Approved</span>'
    : '<span class="badge draft">Pending</span>';
  return `
    <tr>
      <td>${postTitle}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.text)}</td>
      <td>${badge}</td>
      <td class="row-actions">
        ${!c.approved ? `<button class="btn btn-outline btn-sm approve-btn" data-id="${c._id}">Approve</button>` : ''}
        <button class="btn btn-danger btn-sm delete-comment-btn" data-id="${c._id}">Delete</button>
      </td>
    </tr>
  `;
}

async function handleApprove(id) {
  try {
    await approveComment(id);
    loadComments();
  } catch (err) {
    alert('Failed to approve: ' + err.message);
  }
}

async function handleDeleteComment(id) {
  if (!confirm('Delete this comment?')) return;
  try {
    await deleteComment(id);
    loadComments();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

// ---------- USERS (admin only) ----------
async function loadUsers() {
  usersTableWrap.innerHTML = '<p class="empty-state">Loading users...</p>';
  try {
    const users = await getAllUsers();
    if (!users.length) {
      usersTableWrap.innerHTML = '<p class="empty-state">No users found.</p>';
      return;
    }
    const myId = JSON.parse(atob(getToken().split('.')[1])).id;
    usersTableWrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr><th>Username</th><th>Display Name</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${users.map(u => renderUserRow(u, myId)).join('')}
        </tbody>
      </table>
    `;

    usersTableWrap.querySelectorAll('.delete-user-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDeleteUser(btn.dataset.id, btn.dataset.username));
    });
  } catch (err) {
    usersTableWrap.innerHTML = `<p class="empty-state">Failed to load users: ${err.message}</p>`;
  }
}

function renderUserRow(u, myId) {
  const isSelf = u._id === myId;
  return `
    <tr>
      <td>${escapeHtml(u.username)}${isSelf ? ' (you)' : ''}</td>
      <td>${escapeHtml(u.displayName || '\u2014')}</td>
      <td><span class="badge">${u.role}</span></td>
      <td>${formatDate(u.createdAt)}</td>
      <td class="row-actions">
        ${
          isSelf
            ? ''
            : `<button class="btn btn-danger btn-sm delete-user-btn" data-id="${u._id}" data-username="${escapeHtml(u.username)}">Delete</button>`
        }
      </td>
    </tr>
  `;
}

async function handleDeleteUser(id, username) {
  if (!confirm(`Delete user "${username}"? Their existing posts will remain but show no author.`)) return;
  try {
    await deleteUser(id);
    loadUsers();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

document.getElementById('createUserBtn').addEventListener('click', async () => {
  const username = document.getElementById('newUsername').value.trim();
  const displayName = document.getElementById('newDisplayName').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;
  const userMsg = document.getElementById('userMsg');
  userMsg.textContent = '';

  if (!username || !password) {
    userMsg.textContent = 'Username and password are required.';
    return;
  }

  try {
    await registerUser({ username, password, role, displayName });
    userMsg.style.color = '#2f6f4f';
    userMsg.textContent = `User "${username}" created as ${role}.`;
    document.getElementById('newUsername').value = '';
    document.getElementById('newDisplayName').value = '';
    document.getElementById('newPassword').value = '';
    loadUsers();
  } catch (err) {
    userMsg.style.color = '#b1443e';
    userMsg.textContent = err.message;
  }
});

loadPosts();
