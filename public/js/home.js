let currentPage = 1;
let currentCategory = '';
const LIMIT = 6;

const postsContainer = document.getElementById('postsContainer');
const paginationEl = document.getElementById('pagination');
const categoryPillsEl = document.getElementById('categoryPills');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');

function renderPostCard(post) {
  const cover = post.coverImage
    ? `<img src="${post.coverImage}" alt="${escapeHtml(post.title)}">`
    : '';
  const tags = (post.tags || [])
    .map(t => `<span class="tag">#${escapeHtml(t)}</span>`)
    .join('');

  return `
    <article class="post-card">
      ${cover}
      <div class="post-card-body">
        <div class="post-meta">
          <span class="badge">${escapeHtml(post.category)}</span>
          <span>${formatDate(post.createdAt)}</span>
          <span>❤ ${post.likes || 0}</span>
        </div>
        <h2><a href="post.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h2>
        <p class="excerpt">${escapeHtml(post.excerpt)}</p>
        ${tags}
      </div>
    </article>
  `;
}

async function loadPosts(page = 1, category = '') {
  postsContainer.innerHTML = '<p class="empty-state">Loading posts...</p>';
  try {
    const data = await getPosts({ page, limit: LIMIT, category });
    currentPage = data.page;

    if (!data.posts.length) {
      postsContainer.innerHTML = '<p class="empty-state">No posts yet. Check back soon!</p>';
      paginationEl.innerHTML = '';
      return;
    }

    postsContainer.innerHTML = data.posts.map(renderPostCard).join('');
    renderPagination(data.pages, data.page);
    renderCategoryPills(data.posts);
  } catch (err) {
    postsContainer.innerHTML = `<p class="empty-state">Failed to load posts: ${err.message}</p>`;
  }
}

function renderPagination(totalPages, page) {
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }
  let html = '';
  if (page > 1) html += `<button class="btn btn-outline btn-sm" data-page="${page - 1}">Prev</button>`;
  html += `<span>Page ${page} of ${totalPages}</span>`;
  if (page < totalPages) html += `<button class="btn btn-outline btn-sm" data-page="${page + 1}">Next</button>`;
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => loadPosts(Number(btn.dataset.page), currentCategory));
  });
}

// Simple category pill list built from a broader fetch (first page results only, best-effort)
let knownCategories = new Set();
function renderCategoryPills(posts) {
  posts.forEach(p => knownCategories.add(p.category));
  const cats = ['All', ...Array.from(knownCategories)];
  categoryPillsEl.innerHTML = cats
    .map(
      c =>
        `<span class="pill ${c === (currentCategory || 'All') ? 'active' : ''}" data-cat="${c === 'All' ? '' : c}">${escapeHtml(c)}</span>`
    )
    .join('');

  categoryPillsEl.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentCategory = pill.dataset.cat;
      loadPosts(1, currentCategory);
    });
  });
}

async function runSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  postsContainer.innerHTML = '<p class="empty-state">Searching...</p>';
  paginationEl.innerHTML = '';
  clearBtn.style.display = 'inline-block';
  try {
    const results = await searchPosts(q);
    if (!results.length) {
      postsContainer.innerHTML = '<p class="empty-state">No matching posts found.</p>';
      return;
    }
    postsContainer.innerHTML = results.map(renderPostCard).join('');
  } catch (err) {
    postsContainer.innerHTML = `<p class="empty-state">Search failed: ${err.message}</p>`;
  }
}

searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') runSearch();
});
clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  loadPosts(1, currentCategory);
});

loadPosts();
