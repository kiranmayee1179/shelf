# Shelf Life & Expiry Reminder System

A full-stack web application for managing food/product inventory: manufacturing dates, shelf life, expiry tracking, low-stock monitoring, batch management, and automated expiry alerts. Follows **FEFO** (First Expire, First Out) dispatch logic.

- **Frontend**: React 19 + Vite, deployed to **Vercel**
- **Backend**: Express.js REST API, deployed to **Render**
- **Database**: MySQL, with an automatic in-memory fallback if no MySQL connection is available

---

## Project Structure

```text
shelf-life-reminder/              ← repo root (deploy from here)
├── client/                       # React frontend (Vercel root directory)
│   ├── public/
│   ├── src/
│   │   ├── components/           # Navbar, Sidebar, Chatbot, BatchForm, AlertCard, ErrorBoundary, DashboardCard
│   │   ├── pages/                # Login, Signup, Dashboard, Batches, BatchDetail, PreservedFoods,
│   │   │                         # ProductDetail, Alerts, Settings, Reports
│   │   ├── context/AuthContext.jsx
│   │   ├── services/             # api.js (axios instance), authService.js
│   │   ├── App.jsx                # Routes
│   │   └── main.jsx
│   ├── .env.example
│   ├── vercel.json                # SPA rewrite rules for Vercel
│   ├── vite.config.js
│   └── package.json
├── server/                       # Express backend (Render root directory)
│   ├── routes/                   # auth, batches, alerts, dashboard, process, chatbot
│   ├── middleware/auth.js        # JWT route guard
│   ├── db.js                     # MySQL pool + in-memory mock fallback
│   ├── index.js                  # App entry point
│   ├── schema.sql
│   └── .env.example
├── package.json                  # Root convenience scripts (local dev only)
└── README.md
```

> **Note:** This repo was previously nested one level too deep (`shelf-life-reminder/shelf-life-reminder/...`) and had `node_modules` and `.env` committed to git. Both are fixed in this version — see "What was wrong" at the bottom.

---

## Local Development

```bash
# from the repo root
npm run install-all   # installs both server/ and client/ dependencies
npm run dev            # runs client (port 3000) and server (port 5001) together
```

Copy the example env files first:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

The seeded demo login is:
- **Email**: `admin@example.com`
- **Password**: `admin123`

### Database fallback (important)
`server/db.js` tries to connect to MySQL using `server/.env`. If MySQL isn't reachable, it automatically falls back to a stateful in-memory mock database, pre-seeded with seed data and the demo admin account, so the app is fully usable without installing MySQL. Data in this fallback mode does **not** persist across server restarts.

---

## Deployment

### 1. Backend → Render

1. Push this repo to GitHub.
2. In Render: **New > Web Service**, connect the repo.
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment**: Node
4. Environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `JWT_SECRET` | a long random string (don't reuse the demo one) |
   | `GOOGLE_CLIENT_ID` | your Google OAuth client ID, or leave the mock value for demo |
   | `FRONTEND_URL` | your Vercel URL, e.g. `https://shelf-life-reminder.vercel.app` |
   | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | only if using an external MySQL (see below) |

   Don't set `PORT` — Render injects it automatically and `server/index.js` already reads `process.env.PORT`.
5. Deploy. Your API will be live at `https://<your-service>.onrender.com`. Confirm with `GET https://<your-service>.onrender.com/api`.

**About the database on Render:** Render does not offer a managed MySQL database (only managed PostgreSQL/Redis). You have two options:
- **Quick/demo**: leave the `DB_*` variables unset. The app runs entirely on the in-memory fallback — fully functional, but data resets on every redeploy or restart.
- **Persistent data**: provision MySQL from an external provider (e.g. Aiven, Railway, Clever Cloud, PlanetScale-compatible host) and put its host/user/password/database/port into the Render environment variables above. No code changes are needed — `db.js` already speaks plain MySQL via `mysql2`.

### 2. Frontend → Vercel

1. In Vercel: **New Project**, import the same repo.
2. Settings:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Environment variables (Vercel dashboard → Settings → Environment Variables):

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` |
   | `VITE_GOOGLE_CLIENT_ID` | your Google OAuth client ID, or leave the mock value |

4. Deploy. `client/vercel.json` already rewrites all routes to `index.html`, so refreshing on a client-side route like `/dashboard` won't 404.

### 3. Connect them

Once both are deployed, go back to Render and set `FRONTEND_URL` to your real Vercel URL (and redeploy), so the backend's CORS allows requests from it. Vercel preview deployment URLs (`*.vercel.app`) are already allowed by `server/index.js` regardless of `FRONTEND_URL`.

---

## What was wrong (summary)

1. **Runtime crash → blank page on any error**: `ErrorBoundary.jsx` referenced `process.env.NODE_ENV`, which doesn't exist in a browser/Vite bundle. Whenever the boundary tried to render its fallback UI after catching an error, it threw a second error with nowhere left to catch it, producing a fully blank page. Fixed to use `import.meta.env.MODE`.
2. **Repo nested one level too deep**: the actual GitHub repo had `client/` and `server/` inside an extra `shelf-life-reminder/` subfolder, rather than at the repo root. This makes it very easy to set the wrong "Root Directory" in Vercel/Render, which fails the build and shows a blank page or 404. This has been flattened.
3. **`node_modules` and `.env` were committed to git**: the root `.gitignore` only excluded `.netlify`, and `server/` had no `.gitignore` at all. Over 11,000 `node_modules` files (including Windows-only native binaries) were tracked. If a deploy platform reuses those committed binaries instead of installing fresh ones for its own OS, builds fail with native-binding errors. Proper `.gitignore` files have been added at the root, `client/`, and `server/`, and `.env.example` templates added so real secrets never need to be committed.
4. **CORS didn't allow Vercel domains**: `server/index.js` only allow-listed `*.netlify.app`. Added `*.vercel.app` so both production and preview Vercel deployments work.
5. **Stale Netlify config**: `netlify.toml` files (no longer relevant) removed and replaced with `client/vercel.json` for SPA routing on Vercel.
6. **No managed MySQL on Render**: documented above — the app already degrades gracefully to an in-memory store, so this isn't a code bug, but it's the reason data won't persist unless you connect an external MySQL.
