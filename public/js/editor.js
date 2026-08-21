if (!isLoggedIn()) {
  window.location.href = 'login.html';
}

document.getElementById('logoutBtn').addEventListener('click', e => {
  e.preventDefault();
  logout();
});

// Build the status dropdown based on role.
// Writers cannot publish directly — they submit for review instead.
const statusSelect = document.getElementById('statusSelect');
const roleNote = document.getElementById('roleNote');

if (canManageAll()) {
  statusSelect.innerHTML = `
    <option value="draft">Draft</option>
    <option value="published">Published</option>
  `;
  roleNote.textContent = '';
} else {
  statusSelect.innerHTML = `
    <option value="draft">Draft (save privately, not visible to anyone)</option>
    <option value="pending_review">Submit for Review (an editor/admin will publish it)</option>
  `;
  roleNote.textContent = 'As a Writer, you can save drafts or submit for review. An Editor or Admin will publish your post once approved.';
}

const quill = new Quill('#quillEditor', {
  theme: 'snow',
  placeholder: 'Write your post...',
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  }
});

const params = new URLSearchParams(window.location.search);
const editingId = params.get('id');

const titleInput = document.getElementById('title');
const categoryInput = document.getElementById('category');
const tagsInput = document.getElementById('tags');
const excerptInput = document.getElementById('excerpt');
const coverImageInput = document.getElementById('coverImageInput');
const coverPreview = document.getElementById('coverPreview');
const editorMsg = document.getElementById('editorMsg');
const saveBtn = document.getElementById('saveBtn');

let existingCoverImage = '';

coverImageInput.addEventListener('change', () => {
  const file = coverImageInput.files[0];
  if (!file) return;
  coverPreview.src = URL.createObjectURL(file);
  coverPreview.style.display = 'block';
});

async function loadExistingPost() {
  document.getElementById('pageTitle').textContent = 'Edit Post';
  try {
    // Reuse admin list endpoint since it includes drafts; find matching post
    const posts = await getAllPostsAdmin();
    const post = posts.find(p => p._id === editingId);
    if (!post) {
      editorMsg.textContent = 'Post not found.';
      return;
    }
    titleInput.value = post.title;
    categoryInput.value = post.category;
    tagsInput.value = (post.tags || []).join(', ');
    excerptInput.value = post.excerpt || '';

    // If this post is pending_review and the current dropdown (built for
    // admin/editor) doesn't have that option, add it so the status is shown correctly.
    if (post.status === 'pending_review' && !statusSelect.querySelector('option[value="pending_review"]')) {
      const opt = document.createElement('option');
      opt.value = 'pending_review';
      opt.textContent = 'Pending Review';
      statusSelect.appendChild(opt);
    }
    statusSelect.value = post.status;

    quill.root.innerHTML = post.content;
    if (post.coverImage) {
      existingCoverImage = post.coverImage;
      coverPreview.src = post.coverImage;
      coverPreview.style.display = 'block';
    }
  } catch (err) {
    editorMsg.textContent = 'Failed to load post: ' + err.message;
  }
}

if (editingId) {
  loadExistingPost();
}

saveBtn.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  const content = quill.root.innerHTML.trim();
  const plainText = quill.getText().trim();

  if (!title) {
    editorMsg.textContent = 'Title is required.';
    return;
  }
  if (!plainText) {
    editorMsg.textContent = 'Content cannot be empty.';
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('category', categoryInput.value.trim() || 'Uncategorized');
  formData.append('tags', tagsInput.value.trim());
  formData.append('excerpt', excerptInput.value.trim());
  formData.append('status', statusSelect.value);
  if (coverImageInput.files[0]) {
    formData.append('coverImage', coverImageInput.files[0]);
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  editorMsg.textContent = '';

  try {
    if (editingId) {
      await updatePost(editingId, formData);
    } else {
      await createPost(formData);
    }
    window.location.href = 'admin.html';
  } catch (err) {
    editorMsg.textContent = err.message;
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Post';
  }
});
