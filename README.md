# Circl

A content-first social media platform. MERN stack, built for CodeAlpha internship Task 2.

Status: see [PROGRESS.md](PROGRESS.md).

## Stack
- Client: React, Vite, Redux Toolkit, React Router, axios
- Server: Node.js, Express, Mongoose
- Database: MongoDB (Atlas)
- Auth: JWT with bcrypt password hashing (via `bcryptjs`)
- Deployment: Vercel (client and server as two projects)

## Structure
```
client/   React app (src/app, features, components, pages, lib)
server/   Express API (src/config, models, controllers, routes, middleware)
          api/index.js is the Vercel serverless entry
```

## Setup
```bash
# server
cd server
cp .env.example .env      # fill MONGODB_URI and JWT_SECRET
npm install
npm run dev               # http://localhost:5000 (must be running or logins fail with 502)

# client (second terminal)
cd client
npm install
npm run dev               # http://localhost:5173, /api proxied to :5000
```

## Environment variables
| Where | Name | Purpose |
|---|---|---|
| server | `MONGODB_URI` | Atlas connection string |
| server | `JWT_SECRET` | Token signing secret |
| server | `CLIENT_URL` | Allowed CORS origin(s), comma separated, no trailing slash needed |
| server | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Signed image uploads (secret stays on the server) |
| server | `SEED_PASSWORD`, `ADMIN_PASSWORD` | Optional, used only by `npm run seed` |
| client | `VITE_API_URL` | API base, `/api` in dev, full server URL in production |

## Deployment (Vercel)
Two Vercel projects from the same GitHub repo.

**1. Database.** In MongoDB Atlas, Network Access must allow `0.0.0.0/0` (Vercel IPs change). Use a strong database password.

**2. API project** (New Project, import the repo)
- Root Directory: `server`, Framework Preset: Other, no build command.
- Environment variables: `MONGODB_URI`, `JWT_SECRET` (32+ random characters, the app refuses to start otherwise), `CLIENT_URL` (the client URL from step 3), and the three `CLOUDINARY_*` values.
- `server/vercel.json` routes `/api/*` to `api/index.js`, which exports the Express app. The Mongo connection is cached between invocations.
- Deploy, then open `https://<api-project>.vercel.app/api/health`. It should answer `{"ok":true}`.

**3. Client project**
- Root Directory: `client`, Framework Preset: Vite (build `npm run build`, output `dist`).
- Environment variable: `VITE_API_URL=https://<api-project>.vercel.app/api`.
- `client/vercel.json` adds the SPA rewrite and security headers (Content-Security-Policy, nosniff, frame denial, referrer and permissions policies). The CSP `connect-src` allows `*.vercel.app` and Cloudinary. If you use a custom API domain, add it there.
- Redeploy the API after you know the client URL so `CLIENT_URL` matches it exactly.

**4. After the first deploy.** Run `npm run seed` and `npm run make-admin -- you@example.com` from your machine with `server/.env` pointing at Atlas. Sign in, and check Alerts, Settings and the admin panel.

**Serverless notes.** Vercel functions keep no memory between cold starts, so the in-process rate limiter is best-effort (it still stops casual brute force on a warm instance). Notifications use polling for the same reason, since functions cannot hold WebSockets.

## Security
- Passwords hashed with bcrypt (cost 12); login gives one generic error and does equal work for unknown emails.
- JWT (HS256, 24h) sent in the Authorization header. Changing a password invalidates every older token. Tokens live in localStorage, so the strict CSP (no inline scripts, allow-listed hosts) is the main defence against XSS. User text is always rendered as plain text.
- Every id, cursor, tag and username is validated before it reaches a query; request bodies must be plain strings (no operator injection).
- Rate limits: credentials 20 per 15 min, writes 30 per min, polling 60 per min, global 1500 per 15 min.
- Uploads: browser posts straight to Cloudinary with a short-lived server signature; only images from our own Cloudinary account are accepted as avatars or post photos.
- Roles: admin is granted only by the `make-admin` script and re-checked on the server per request. Suspended users are locked out immediately.
- `npm audit --omit=dev` reports 0 vulnerabilities for client and server.

## Testing done
There is no unit-test suite in this submission. Verification was done against the running app:
- API requests for every endpoint, including permission and validation failures.
- A 20-step end-to-end run in headless Chrome at 375px (register, post, photo upload, like, save, reshare, quote, comment, follow, search, theme, password change, log in again, delete account).
- An automated audit of 14 routes at 375, 768, 1280 and 1440px in light and dark: no horizontal overflow, no console errors, no touch targets under 40px on mobile, and zero axe-core WCAG 2 A/AA and best-practice violations.
- The production CSP was served exactly as configured and produced no violations.

## API reference
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | no | Liveness check |
| POST | `/api/auth/register` | no | Create account `{username,email,password}`, returns `{token,user}` |
| POST | `/api/auth/login` | no | `{email,password}`, returns `{token,user}` |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/users/:username` | Bearer | Public profile, counts, `isMe`, `isFollowing` |
| PATCH | `/api/users/me` | Bearer | Update `displayName`, `bio`, `avatar` (own Cloudinary URLs only) |
| GET | `/api/users/:username/posts` | Bearer | A user's posts, `?cursor=` |
| POST | `/api/posts` | Bearer | Create post `{text, image}` (text max 500, image must be our Cloudinary URL) |
| GET | `/api/posts` | Bearer | Feed, `?feed=everyone or following&cursor=` (15 per page) |
| GET | `/api/posts/:id` | Bearer | Single post |
| DELETE | `/api/posts/:id` | Bearer | Delete own post and its comments |
| GET | `/api/posts/:id/comments` | Bearer | Comments, oldest first |
| POST | `/api/posts/:id/comments` | Bearer | Add comment `{text}` (max 300) |
| DELETE | `/api/comments/:id` | Bearer | Comment author or post owner only |
| POST/DELETE | `/api/posts/:id/like` | Bearer | Like or unlike (idempotent), returns `{liked, likesCount}` |
| POST/DELETE | `/api/posts/:id/save` | Bearer | Save or unsave |
| GET | `/api/posts/saved` | Bearer | Your saved posts |
| POST/DELETE | `/api/users/:username/follow` | Bearer | Follow or unfollow (idempotent, not yourself) |
| GET | `/api/users/:username/followers` | Bearer | Up to 100 followers |
| GET | `/api/users/:username/following` | Bearer | Up to 100 followed users |
| GET | `/api/users/suggested` | Bearer | 5 people to follow, ranked by mutual follows then popularity |
| GET | `/api/users/search?q=` | Bearer | Prefix search on username or name |
| GET | `/api/posts/trending` | Bearer | Top hashtags of the last 48h (2 x posts + likes) |
| GET | `/api/posts?tag=name` | Bearer | Posts with a hashtag |
| POST | `/api/posts/:id/reshare` | Bearer | Reshare, or quote with `{text}`. Targets the original if given a reshare |
| DELETE | `/api/posts/:id/reshare` | Bearer | Undo your reshares of that post |
| GET | `/api/admin/stats` | Admin | Totals and last-24h counts |
| GET | `/api/admin/users?q=&cursor=` | Admin | Search and page people |
| PATCH | `/api/admin/users/:id` | Admin | `{banned: true or false}` (not admins) |
| DELETE | `/api/admin/users/:id` | Admin | Delete a person and everything they posted |
| GET | `/api/admin/posts` | Admin | Recent posts, paged |
| DELETE | `/api/admin/posts/:id` | Admin | Delete any post with its comments and reshares |
| GET | `/api/notifications` | Bearer | Your notifications, `?cursor=` (30 per page) |
| GET | `/api/notifications/unread-count` | Bearer | `{count}`, polled every 10s while the tab is visible |
| POST | `/api/notifications/read` | Bearer | Mark all read |
| PATCH | `/api/users/me/password` | Bearer | `{current, next}`. Signs out other sessions, returns a fresh token |
| DELETE | `/api/users/me` | Bearer | `{password}`. Deletes the account and everything it made (not admins) |
| POST | `/api/uploads/sign` | Bearer | Signed Cloudinary upload params `{kind: avatar or post}` |

More endpoints are added per phase.

## Demo data and admin
```bash
cd server
npm run seed                          # 14 demo people, 45 posts, comments, follows, reshares, trending hashtags
npm run make-admin -- you@example.com # promote a real account to admin
```
- Every seed user logs in with `<username>@circl.local` and `circl-demo-1234` (override with `SEED_PASSWORD`). Try `maya_makes@circl.local`.
- The seed also creates `admin@circl.local`. Its password is random and printed once (set `ADMIN_PASSWORD` to choose it).
- Re-running `npm run seed` replaces the previous seed data and leaves real accounts alone.
- The admin role can only be granted with `make-admin`, never through the API. Admin routes re-check the role on the server for every request. Suspended accounts cannot log in and existing sessions stop working. Do not run the seed against a production database.
