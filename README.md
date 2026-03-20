# ACES Platform — Stage 1

Entrepreneur CRM & program management platform for the ACES coaching program.
Built with React + Node/Express + PostgreSQL, deployable on Railway.

---

## What's Included in Stage 1

- **Entrepreneur CRM** — full profiles, status tracking, tags, notes, Google Drive links
- **Sprint Tracker** — 6 × 2-month sprints, shared risk period, OKR review, revenue logging
- **Lab Calls** — Tuesday/Thursday call scheduling, attendance tracking
- **Masterminds** — quarterly event management, sessions, registrations, calendar invite tracking
- **Team Management** — coach accounts, admin roles, access control
- **Auth** — JWT-based email/password login, role-based access (admin vs coach)

---

## Project Structure

```
aces-platform/
├── backend/          ← Node.js + Express API
│   ├── src/
│   │   ├── db/schema.js      ← PostgreSQL schema + init
│   │   ├── middleware/auth.js ← JWT auth middleware
│   │   ├── routes/           ← All API routes
│   │   └── index.js          ← Server entry point
│   ├── .env.example
│   └── railway.toml
└── frontend/         ← React + Vite app
    ├── src/
    │   ├── pages/            ← Dashboard, Entrepreneurs, LabCalls, Masterminds, Team
    │   ├── components/       ← Layout, UI components, forms
    │   ├── context/          ← Auth context
    │   ├── api.js            ← API utility
    │   └── App.jsx           ← Router
    ├── .env.example
    └── railway.toml
```

---

## Deploying on Railway

### Step 1 — Create a new Railway project

Go to [railway.app](https://railway.app) → New Project.

### Step 2 — Add a PostgreSQL database

In your Railway project → Add Service → Database → PostgreSQL.
Copy the `DATABASE_URL` from the PostgreSQL service variables.

### Step 3 — Deploy the Backend

1. Add Service → GitHub Repo → select your repo → set **Root Directory** to `backend`
2. Add these environment variables in Railway:
   ```
   DATABASE_URL=<from PostgreSQL service>
   JWT_SECRET=<generate a long random string>
   NODE_ENV=production
   FRONTEND_URL=https://<your-frontend>.railway.app
   ```
3. Deploy. The API will auto-initialize the database tables on first run.

### Step 4 — Deploy the Frontend

1. Add Service → GitHub Repo → same repo → set **Root Directory** to `frontend`
2. Add this environment variable:
   ```
   VITE_API_URL=https://<your-backend>.railway.app/api
   ```
3. Deploy.

### Step 5 — Create your Admin account (first run only)

Once both services are live, make a POST request to create the first admin:

```bash
curl -X POST https://<your-backend>.railway.app/api/auth/seed-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "admin@yourcompany.com",
    "password": "your-secure-password"
  }'
```

This endpoint only works once — it's locked after the first admin exists.

### Step 6 — Log in

Visit your frontend URL → sign in with the admin credentials you just created.

---

## Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your local PostgreSQL connection
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:3001/api
npm run dev
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| GET | /api/auth/coaches | List coaches (admin) |
| POST | /api/auth/users | Create coach/admin (admin) |
| GET | /api/entrepreneurs | List entrepreneurs (coach-scoped) |
| POST | /api/entrepreneurs | Create entrepreneur |
| GET | /api/entrepreneurs/:id | Get entrepreneur detail |
| PUT | /api/entrepreneurs/:id | Update entrepreneur |
| DELETE | /api/entrepreneurs/:id | Delete (admin) |
| GET | /api/entrepreneurs/meta/stats | Dashboard stats |
| GET | /api/sprints/entrepreneur/:id | Get sprints for entrepreneur |
| POST | /api/sprints | Create sprint |
| PUT | /api/sprints/:id | Update sprint |
| POST | /api/sprints/generate | Auto-generate 6 sprints |
| GET | /api/lab-calls | List lab calls |
| POST | /api/lab-calls | Create lab call (admin) |
| POST | /api/lab-calls/:id/attendance | Mark attendance |
| GET | /api/masterminds | List masterminds |
| POST | /api/masterminds | Create mastermind (admin) |
| GET | /api/masterminds/:id | Mastermind detail + sessions + registrations |
| POST | /api/masterminds/:id/sessions | Add session |
| POST | /api/masterminds/:id/register | Register entrepreneur |

---

## Stage 2 Roadmap

The following features are planned for future stages:

- **Google Calendar integration** — auto-send calendar invites for mastermind sessions
- **Google OAuth** — sign in with Google for coaches
- **Bulk CSV import** — migrate existing Notion data
- **Email notifications** — sprint reminders, OKR review alerts
- **Re-enrollment workflow** — guided re-enrollment at year-end
- **Revenue reporting** — charts and export
- **Mobile responsive** — optimized for phones/tablets
