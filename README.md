# Personal Blog CMS

A full-stack personal Blog CMS built with **HTML, CSS, vanilla JavaScript** on the
frontend, and **Node.js/Express + MongoDB** on the backend (the backend is required
because a browser cannot talk to MongoDB directly — it exists only as a thin API layer).

## Features
- Role-based login (Admin, Editor, Writer) — JWT-based
- Create / edit / delete posts with a rich text editor (Quill.js)
- Categories and tags
- Cover image upload
- Draft → Pending Review → Published workflow (see Roles below)
- Public home feed with pagination and category filter
- Full-text search
- Likes (one per browser via localStorage)
- Comments with admin/editor approval workflow
- User management (Admin can create/delete Editor and Writer accounts)

## Roles

| Role | Can create posts | Can publish directly | Can edit/delete others' posts | Moderate comments | Manage users |
|---|---|---|---|---|---|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Writer** | ✅ | ❌ (submits for review) | ❌ (own posts only) | ❌ | ❌ |

A Writer's post goes to `pending_review` status when submitted; an Admin or
Editor then edits/publishes it from their dashboard (which shows every user's
posts, with an Author column). The very first account — created by
`createAdmin.js` — is always `admin`. That admin can then create Editor and
Writer accounts from the dashboard's **Users** tab.

## Folder structure
```
blog-cms/
├── server/              # Express + MongoDB backend
│   ├── models/          # User, Post, Comment (Mongoose schemas)
│   ├── routes/          # auth, posts, comments
│   ├── middleware/       # JWT auth guard, Multer upload
│   ├── uploads/          # uploaded cover images (served statically)
│   ├── server.js
│   └── createAdmin.js    # one-time script to create your admin user
└── public/               # plain HTML/CSS/JS frontend, served by Express
    ├── index.html         # public home feed
    ├── post.html            # single post view + comments
    ├── login.html            # admin login
    ├── admin.html             # admin dashboard (posts + comments)
    ├── editor.html             # create/edit post (Quill editor)
    ├── css/style.css
    └── js/ (api.js, home.js, post.js, login.js, admin.js, editor.js)
```

## Setup

### 1. Install dependencies
```bash
cd server
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` inside `server/` and fill in:
```
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=some_long_random_string
PORT=5000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose_a_strong_password
```

Get a free MongoDB connection string at https://www.mongodb.com/atlas — create a
free cluster, add a database user, and allow network access from your IP (or
0.0.0.0/0 for simplicity while developing).

### 3. Create your admin account (run once)
```bash
node createAdmin.js
```
This reads `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env` and creates the user
in MongoDB with a hashed password.

### 4. Run the server
```bash
npm run dev
```
Then open **http://localhost:5000** in your browser.
- Public site: `http://localhost:5000/index.html`
- Admin login: `http://localhost:5000/login.html`

## How it works
- The frontend is plain static files served directly by Express (`app.use(express.static(...))`).
- All data operations go through REST endpoints under `/api/*`.
- JWT tokens are stored in `localStorage` and sent as `Authorization: Bearer <token>`
  headers on every admin request.
- Cover images are uploaded via `multipart/form-data` using Multer, saved to
  `server/uploads/`, and served at `/uploads/<filename>`.

## API summary
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | — | Log in, get JWT |
| GET | /api/posts | — | List published posts (paginated, filterable) |
| GET | /api/posts/search?q= | — | Full-text search |
| GET | /api/posts/:slug | — | Get single post |
| GET | /api/posts/admin/all | ✅ | List all posts (draft + published) |
| POST | /api/posts | ✅ | Create post |
| PUT | /api/posts/:id | ✅ | Update post |
| DELETE | /api/posts/:id | ✅ | Delete post |
| PATCH | /api/posts/:id/like | — | Like a post |
| GET | /api/comments/post/:postId | — | Approved comments for a post |
| POST | /api/comments | — | Submit a comment (pending approval) |
| GET | /api/comments/admin/all | ✅ | All comments |
| PATCH | /api/comments/:id/approve | ✅ | Approve a comment |
| DELETE | /api/comments/:id | ✅ | Delete a comment |

## Deployment notes
- **Backend**: deploy the `server/` folder to Render or Railway (free tier). Set
  the same environment variables there.
- **Database**: MongoDB Atlas free cluster (already used in development).
- Since the frontend is served by Express itself, no separate frontend hosting
  is needed — one deployment covers everything.
- Remember to run `node createAdmin.js` once against your production database too
  (or temporarily expose a one-time setup route).

## Possible next steps
- Multi-author support
- Rich SEO meta tags / sitemap.xml / RSS feed
- Reading time estimate
- Dark mode toggle
