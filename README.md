# Circl

Circl is a content-first social media platform where people share short posts and photos, follow each other, and keep up with what their circle is doing. It is a full-stack MERN application, fully responsive from phones to wide desktops, with a light and dark theme.

Built as **Task 2** of the CodeAlpha Full Stack Development internship.

Build progress and phase notes are in [PROGRESS.md](PROGRESS.md).

## Features

**Accounts**
- Register and log in with email and password (JWT sessions, bcrypt hashing)
- Change password (signs out other devices) and delete your account
- Light, dark or system theme

**Profiles**
- Avatar, display name and bio
- Follower and following counts with browsable lists
- Each profile shows that person's posts

**Posts**
- Text posts (up to 500 characters) with an optional photo
- Comments, likes and saved posts
- Reshare a post, or quote it with your own words
- Share a post with the device share sheet or by copying its link
- `#hashtags` become links to a tag page

**Discovery**
- Home feed with two tabs: Everyone and Following
- Suggested people, based on who your friends already follow
- Trending hashtags from the last 48 hours
- Explore page with people search

**Notifications**
- Alerts for likes, comments, follows, reshares and quotes
- Unread badge that updates on its own while the app is open

**Admin dashboard** (admin accounts only, with its own sidebar and phone tab bar)
- Lands here straight after an admin logs in
- Analytics: key numbers with period-over-period change, an interactive activity chart (7, 30 or 90 days), content mix, top posts, top creators, popular hashtags and newest people
- Reports queue: people can flag posts and profiles; admins dismiss, remove the post or suspend the person
- People and content management with search and filters, an audit trail of admin actions, and CSV exports (people, posts, reports, daily activity)

**Interface**
- Bottom tab bar and account menu on phones, icon rail on tablets, labelled sidebar from 1024px and a suggestions column from 1280px
- Report a post or profile from the flag button
- Toast messages for feedback and in-app confirmation dialogs (no browser popups)
- Keyboard accessible, screen-reader friendly, meets WCAG 2 AA contrast

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Redux Toolkit, React Router, axios |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB Atlas |
| Auth | JSON Web Tokens, bcrypt (`bcryptjs`) |
| Images | Cloudinary (signed direct uploads) |
| Hosting | Vercel (client and API as two projects) |

## Project structure

```
client/   React app
          src/app         Redux store
          src/features    auth, feed and notification state
          src/components  shared UI (posts, composer, toasts, layout)
          src/pages       one file per screen
          src/admin       admin dashboard: layout, charts and pages
          src/lib         API client, helpers
server/   Express API
          src/models      User, Post, Comment, Notification, Report, AdminLog
          src/controllers request handlers
          src/routes      route definitions
          src/middleware  auth, rate limits
          api/index.js    Vercel serverless entry
          scripts/        seed data and admin tools
```

## Installation

### Prerequisites
- Node.js 20 or newer
- A MongoDB Atlas cluster (free tier works). Allow your IP under Network Access.
- A Cloudinary account (free tier works) for image uploads

### 1. Get the code
```bash
git clone <your-repo-url>
cd CodeAlpha_Circl
```

### 2. Set up the server
```bash
cd server
npm install
cp .env.example .env
```
Fill in `server/.env`:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | A random string of 32 or more characters |
| `CLIENT_URL` | Where the client runs, `http://localhost:5173` locally |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |

Start it:
```bash
npm run dev        # http://localhost:5000
```

### 3. Set up the client
In a second terminal:
```bash
cd client
npm install
npm run dev        # http://localhost:5173
```
The dev server forwards `/api` requests to the API on port 5000, so keep both terminals running. If the API is stopped, logging in fails with a 502 error.

### 4. Add demo data (optional)
```bash
cd server
npm run seed
```
This fills the app with sample people, posts, comments, follows and hashtags so it does not open empty. The demo login details are printed in the terminal when it finishes. Running it again replaces the previous demo data and leaves real accounts alone. Do not run it against a production database.

### 5. Create an admin (optional)
Register a normal account in the app, then promote it:
```bash
cd server
npm run make-admin -- you@example.com
```
An "Admin" entry then appears in the sidebar (desktop) or the account menu (phone).

## Scripts

| Where | Command | What it does |
|---|---|---|
| client | `npm run dev` | Start the dev server |
| client | `npm run build` | Production build into `dist` |
| client | `npm run lint` | Lint the code |
| server | `npm run dev` | Start the API with auto-restart |
| server | `npm start` | Start the API |
| server | `npm run seed` | Load demo data |
| server | `npm run make-admin -- <email>` | Grant the admin role |

## Deployment (Vercel)

Deploy the API and the client as two Vercel projects from the same repository.

1. **Database.** In Atlas, allow `0.0.0.0/0` under Network Access (Vercel addresses change) and use a strong database password.
2. **API project.** Root Directory `server`, Framework Preset Other. Add the six server environment variables from above. Deploy and check that `https://<api-project>.vercel.app/api/health` answers `{"ok":true}`.
3. **Client project.** Root Directory `client`, Framework Preset Vite. Add `VITE_API_URL=https://<api-project>.vercel.app/api`. Deploy.
4. **Connect them.** Set `CLIENT_URL` on the API project to the client's address (several addresses can be separated with commas) and redeploy the API.
5. If you use a custom API domain, add it to `connect-src` in `client/vercel.json`.

Vercel functions do not keep memory between requests and cannot hold open connections, so notifications use polling, and the rate limiter works per running instance.

## Security overview
- Passwords are hashed with bcrypt; login errors never reveal whether an email exists
- Sessions expire after 24 hours, and changing a password ends all older sessions
- Strict Content-Security-Policy and security headers on the client
- All input is validated on the server, and user text is only ever rendered as plain text
- Rate limits on login, writes and polling
- Image uploads are signed by the server and restricted to your own Cloudinary account
- Admin access is granted only by a server-side script and checked on every request

## Quality checks
There is no unit-test suite in this submission. The app was verified by running it:
- Every API route exercised, including permission and validation failures
- A 20-step end-to-end run in a real mobile browser (sign up, post, photo upload, like, save, reshare, comment, follow, search, theme, password change, account deletion)
- An automated audit of 14 screens at 375, 768, 1280 and 1440 pixels in light and dark: no horizontal scrolling, no console errors, and zero accessibility violations

## Author
Built by Saad as part of the CodeAlpha Full Stack Development internship.
