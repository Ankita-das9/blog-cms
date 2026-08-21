// Central place for every backend call. Since frontend and backend are
// served from the same Express app, we can use relative paths.
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  localStorage.removeItem('displayName');
  window.location.href = 'login.html';
}

function getRole() {
  return localStorage.getItem('role') || 'writer';
}

function canManageAll() {
  return ['admin', 'editor'].includes(getRole());
}

function isAdmin() {
  return getRole() === 'admin';
}

// ---------- AUTH ----------
async function loginRequest(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

async function verifyToken() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Invalid session');
  return res.json();
}

// ---------- USER MANAGEMENT (admin only) ----------
async function getAllUsers() {
  const res = await fetch(`${API_BASE}/auth/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

async function registerUser({ username, password, role, displayName }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ username, password, role, displayName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create user');
  return data;
}

async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/auth/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete user');
  return data;
}

// ---------- POSTS (public) ----------
async function getPosts({ page = 1, limit = 6, category = '', tag = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

async function searchPosts(q) {
  const res = await fetch(`${API_BASE}/posts/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

async function getPostBySlug(slug) {
  const res = await fetch(`${API_BASE}/posts/${slug}`);
  if (!res.ok) throw new Error('Post not found');
  return res.json();
}

async function likePost(id) {
  const res = await fetch(`${API_BASE}/posts/${id}/like`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to like post');
  return res.json();
}

// ---------- POSTS (admin) ----------
async function getAllPostsAdmin() {
  const res = await fetch(`${API_BASE}/posts/admin/all`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

async function createPost(formData) {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(), // do NOT set Content-Type, browser sets multipart boundary
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create post');
  return data;
}

async function updatePost(id, formData) {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update post');
  return data;
}

async function deletePost(id) {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete post');
  return res.json();
}

// ---------- COMMENTS ----------
async function getComments(postId) {
  const res = await fetch(`${API_BASE}/comments/post/${postId}`);
  if (!res.ok) throw new Error('Failed to load comments');
  return res.json();
}

async function submitComment(payload) {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to submit comment');
  return data;
}

async function getAllCommentsAdmin() {
  const res = await fetch(`${API_BASE}/comments/admin/all`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load comments');
  return res.json();
}

async function approveComment(id) {
  const res = await fetch(`${API_BASE}/comments/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to approve comment');
  return res.json();
}

async function deleteComment(id) {
  const res = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete comment');
  return res.json();
}

// ---------- Helpers ----------
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
