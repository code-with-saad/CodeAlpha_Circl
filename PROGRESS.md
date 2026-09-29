# Circl: Progress

CodeAlpha Full Stack Development internship, Task 2 (social media platform).

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffolding, Mongo connection, Vite, Vercel config, docs, design direction | Done |
| 1 | Design tokens, app shell, responsive nav (mobile tab bar, desktop rail) | Done, pending your review |
| 2 | Auth: register, login, JWT, bcrypt, protected routes, Redux auth slice | Done, pending your review |
| 3 | Profiles: bio, avatar, counts, user posts, edit profile | Done, pending your review |
| 4 | Posts (text + image), feed, comments | Done, pending your review |
| 5 | Likes, saved posts, follow/unfollow | Done, pending your review |
| 6 | Reshare, share, suggested profiles, trending | Done, pending your review |
| 6b | Admin panel (roles, suspend, delete, stats) and seed data | Done, pending your review |
| 7 | Notifications, settings | Done, pending your review |
| 8 | Responsive audit (375 / 768 / 1280+), a11y pass, Vercel deploy | Done, deploy needs your Vercel account |

Responsive checks at 375px, 768px and 1280px+ happen inside each phase, not at the end.

## Phase 0 log
- Vite + React client, Express server, Mongoose connection cached for serverless.
- Redux Toolkit store skeleton, React Router, axios installed.
- Vercel config for both client (SPA rewrite) and server (`api/index.js` handler).
- Verified: `GET /api/health` responds, client production build passes.
- Not yet verified: live MongoDB connection (needs a real Atlas URI in `server/.env`).


## Phase 1 log
- Tokens (light + dark, follows system), Fraunces + Instrument Sans, Phosphor icons (fill when active).
- Shell: bottom tab bar under 768px, icon rail 768px+, labelled nav + right rail 1280px+.
- Glass blur only on the mobile tab bar and topbar. Routes are stubs.
- Verified in headless Chrome at 375 (iframe), 500, 768 and 1440 widths.

## Decisions
- Feed: Following + Everyone tabs. Images: Cloudinary. Notifications: poll ~10s while the tab is visible.
- Auth: JWT in Authorization header (localStorage), short expiry, helmet, rate limiting, input validation, no tokens in URLs.

## Phase 2 log
- Server: User model, register/login/me, bcryptjs (cost 12), JWT HS256 24h, rate limit (20 per 15 min) on credential routes, string-only inputs against NoSQL injection, constant-time-ish login for unknown emails, generic login error.
- Client: authSlice (register/login/fetchMe), token in localStorage with try/catch, 401 interceptor logs out, RequireAuth guard, shared login/register page.
- Verified against live Atlas: register, duplicate, validation errors, operator-injection body, wrong password, /me with and without token.
- Screens checked at 375 (iframe), 768, 1440. Test users removed from the database.

## Phase 3 log
- Server: GET profile (email hidden from others), PATCH own profile, signed Cloudinary upload endpoint (SHA-1 signature, secret stays server-side), avatar URL restricted to our Cloudinary account.
- Client: profile page, edit profile with photo upload (JPG/PNG/WebP, 5 MB), Avatar with colour-from-username fallback, `/me` redirect, Profile nav link points at own page.
- Verified: real signed upload to Cloudinary succeeded; profile screens checked at 375 (iframe), 768, 1440.
- Follower/following counts show real data but the Follow button and the posts list arrive in Phases 4 and 5.

## Phase 4 log
- Server: Post and Comment models, cursor pagination on `_id` (stable while new posts arrive), Everyone and Following feeds (following includes your own posts), ownership checks on deletes, write rate limits, ObjectId validation on every id and cursor.
- Client: feedSlice (per-tab items, cursor, status; cleared on logout), infinite scroll, inline composer on 768px+ and a `/compose` page on mobile, photo upload before posting, post page with comments.
- Post text is rendered as plain text, so HTML in posts is displayed, never executed.
- Verified via API (create, empty, bad image, bad cursor, comment counts, permission checks) and screenshots at 375 (iframe), 768, 1440. Seed data removed.

## Phase 5 log
- Likes, saves and follows are idempotent server-side ($addToSet / $pull) so double taps and retries are safe; the UI updates optimistically and reverts on failure.
- Followers/following lists, Follow button on profiles and lists, Saved page, counts link to lists.
- Fix: a 502 on login meant the API server was not running (Vite proxy could not reach port 5000). Network and gateway errors now say "Cannot reach the server".
- Verified via API (follow twice, self-follow, feed after follow, like/unlike, save/unsave) and screenshots at 375 (iframe) and 1440. Test data removed.

## Phase 6 log
- Reshare (plain) and quote, share (Web Share API, falls back to copy link), hashtags parsed on the server and linked in the UI, trending tags (48h window), suggested people (mutual follows first), people search, Explore page, tag pages, right rail on 1280px+.
- Reshares are posts that point at the original. Deleting the original removes its reshares; undoing a reshare decrements the counter with a clamped pipeline update.

## Phase 6b log: admin and seed
- `role` and `banned` on User. Only `npm run make-admin` sets a role. `requireAdmin` runs on every admin route. Admins cannot be suspended or deleted through the panel.
- Admin panel at `/admin`: overview numbers, people (search, suspend or restore, delete), posts (delete). Reserved usernames (admin, support, ...) cannot be registered.
- Seed script is deterministic, idempotent, and reuses the sample images it uploaded earlier.
- Verified via API: trending, suggested, tag feed, bad tag, search, reshare twice, quote, undo, non-admin 403, unauthenticated 401, suspend blocks login, restore, admin protected. Screens checked at 375 (iframe), 768 and 1440.

## Phase 7 log
- Notifications for like, comment, follow, reshare, quote. Never for your own actions. Likes and follows are de-duplicated and taken back when undone. They expire after 30 days and are removed with the post or account they belong to.
- Polling: unread count every 10s while the tab is visible, paused when hidden, refreshed the moment the tab returns. Badge on the Alerts icon. The Alerts page refetches when new items arrive while it is open and keeps unread markers visible after marking read.
- Settings: theme (system, light, dark; applied before first paint so there is no flash), change password (invalidates other sessions via `passwordChangedAt`), log out, delete account (password confirmed, admins excluded).
- Shared `purgeUser` now also corrects comment counters on other people's posts. Admin delete uses it too.
- Verified via API: dedupe, undo, self-action, read, bad cursor, wrong and short password, old token rejected, new token and login work, delete with wrong and right password, admin blocked from self-delete. Screens at 375 (iframe), 768, 1440 including dark.

## Phase 8 log: audit, hardening, deploy prep
- Audit (14 routes x 4 widths, light and dark): fixed accent contrast (#C4441F to #B53B18, 4.46 to 5.19), missing page heading on Home, unnamed avatar link, invalid definition lists, duplicate landmark names, small tap targets, low-contrast login panel in dark mode. Final run: 0 overflow, 0 console errors, 0 axe violations.
- Hardening: strict CSP and security headers for the client (theme script moved to `/theme-init.js` so no inline script or hash is needed), API refuses to boot with a weak JWT secret, blanket rate limit, multi-origin CORS (verified: allowed origins pass, others get no CORS header), scroll padding so focus is never hidden behind the fixed bars, hidden username field for password managers. `npm audit`: 0 vulnerabilities.
- End-to-end run in a real mobile browser: 20 of 20 steps pass.
- Findings that were not app bugs: login limiter (429) tripped by repeated test logins, which confirms it works.
- Not done here (needs the owner): create the two Vercel projects, set env vars, rotate the shared secrets, push to GitHub.
