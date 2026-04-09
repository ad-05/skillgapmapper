# 🎯 AI-Based Skill Gap → Career Mapper


A full-stack AI-powered web application that analyzes a student's skill profile, compares it against industry-required skills using **Cosine Similarity (scikit-learn)**, and provides personalized career readiness scores, skill gap identification, and AI-driven recommendations via **Claude AI**.

---

## 🧠 How the AI Works

The system uses **Cosine Similarity** — the same technique used in recommendation systems and NLP:

1. Each user's skill ratings are encoded as a **feature vector** (e.g., `[Python=7, SQL=5, ML=8, ...]`)
2. The target career role's required skills are encoded as a second vector
3. Cosine similarity between the two vectors is computed:

```
similarity = (A · B) / (||A|| × ||B||)
```

4. The result (0–1) is multiplied by 100 to yield the **career readiness score (%)**
5. Skill-by-skill comparisons identify specific **gaps** and **strengths**

This is a **data-driven, AI-based decision support system** — not hard-coded rules.

---

## 🏗 Architecture

```
skillmapper/
├── backend/               ← Flask REST API
│   ├── app.py             ← Main application + routes + JWT auth
│   ├── career_roles.csv   ← Career role dataset (source of truth)
│   ├── skillmapper.db     ← SQLite database (auto-created on first run)
│   ├── init_db.py         ← Database initializer (optional)
│   ├── requirements.txt   ← Python dependencies
│   ├── Procfile           ← Render/Heroku deployment
│   └── render.yaml        ← Render one-click deploy config
│
└── frontend/              ← React SPA
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.jsx         ← Router + Nav + Protected routes
    │   ├── auth.js         ← Auth context + API helper functions
    │   ├── components.jsx  ← Reusable UI components
    │   ├── skillAnchors.js ← SFIA behavioral descriptors (46 skills)
    │   ├── index.css       ← Global styles (Catppuccin dark theme)
    │   └── pages/
    │       ├── AuthPage.jsx  ← Login + Register with role selection
    │       ├── Home.jsx      ← Learner dashboard + stats
    │       ├── Assess.jsx    ← Skill assessment with SFIA anchors
    │       ├── Results.jsx   ← Score + gaps + AI insights
    │       ├── History.jsx   ← Learner's past assessments
    │       ├── Mentor.jsx    ← Mentor dashboard + learner tracking
    │       └── Admin.jsx     ← Career role + user management
    └── package.json
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Recharts |
| Backend | Python 3.8+, Flask 3.0, Flask-CORS |
| AI/ML | scikit-learn (Cosine Similarity), NumPy |
| AI Insights | Claude AI (claude-sonnet-4-20250514) via backend proxy |
| Auth | JWT (custom, no external lib), PBKDF2-SHA256 password hashing |
| Database | SQLite (extendable to PostgreSQL) |
| Hosting | Render (backend), Vercel/Netlify (frontend) |

---

## 🚀 Running Locally

### Prerequisites
- Python 3.8+
- Node.js 18+

### Step 1 — Backend

```bash
cd skillmapper/backend

# Install dependencies
pip install -r requirements.txt

# Start Flask server
# (auto-creates DB and loads career_roles.csv on first run)
python app.py
```

API runs at **http://localhost:5000**

Default admin account is created automatically:
- Email: `admin@skillmapper.com`
- Password: `admin123`

> **Optional — Enable Claude AI Recommendations:**
> ```bash
> # Windows
> set ANTHROPIC_API_KEY=sk-ant-...
>
> # Mac / Linux
> export ANTHROPIC_API_KEY=sk-ant-...
> ```
> Without a key, the app still works fully — the Results page shows
> helpful static recommendations instead of live AI output.

### Step 2 — Frontend

Open a second terminal:

```bash
cd skillmapper/frontend

npm install
npm start
```

App runs at **http://localhost:3000**

> Both terminals must stay open at the same time.

### Accounts

| Role | How to get one |
|------|---------------|
| Admin | Auto-created: `admin@skillmapper.com` / `admin123` |
| Learner | Register at `/auth` — select Learner |
| Mentor | Register at `/auth` — select Mentor |

---

## 👥 Role Permissions

| Feature | Learner | Mentor | Admin |
|---------|---------|--------|-------|
| Take skill assessment | ✅ | ❌ | ❌ |
| View own results & history | ✅ | ❌ | ❌ |
| View all learner scores | ❌ | ✅ | ✅ |
| View learner improvement over time | ❌ | ✅ | ✅ |
| Add / edit / delete career roles | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |

---

## 📡 API Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | None | Register learner or mentor |
| POST | `/api/auth/login` | None | Login, returns JWT token |
| GET | `/api/auth/me` | Any | Get current user info |
| GET | `/api/roles` | None | List all career roles |
| POST | `/api/roles` | Admin | Add new career role |
| PUT | `/api/roles/:id` | Admin | Update role skills |
| DELETE | `/api/roles/:id` | Admin | Delete career role |
| POST | `/api/assess` | Learner | Submit assessment → score + gaps |
| GET | `/api/assessments/mine` | Learner | My assessment history |
| GET | `/api/assessments` | Mentor/Admin | All assessments |
| POST | `/api/ai-insights` | Learner | Get Claude AI recommendations |
| GET | `/api/stats` | Mentor/Admin | Aggregate stats |
| GET | `/api/admin/users` | Admin | List all users |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user |

---

## 🌐 Deploying to Render (Backend)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo → Render auto-detects `render.yaml`
4. Add environment variable: `ANTHROPIC_API_KEY` = your key
5. Deploy — your API gets a public HTTPS URL

Update `frontend/src/auth.js`:
```js
const BASE = "https://your-app.onrender.com";
```

---

## 🛡 Security

- Passwords hashed with **PBKDF2-SHA256** (260,000 iterations + random salt)
- JWT tokens signed with **HMAC-SHA256**, expire after 24 hours
- All inputs sanitized server-side (XSS characters stripped)
- Skill values validated to range 0–10
- Role-based access enforced on every protected endpoint
- SQL injection prevented via parameterised queries throughout
- Admin account cannot be self-registered or self-deleted

---

## 📋 Backlog Coverage

| # | User Story | Status |
|---|-----------|--------|
| L1 | Enter and update skill levels | ✅ SFIA proficiency level buttons |
| L2 | Select a target career role | ✅ Visual role card selector |
| L3 | View readiness score | ✅ Radial chart + % score |
| L4 | See missing/weak skills | ✅ Prioritised gap cards |
| L5 | Receive improvement suggestions | ✅ Claude AI + static fallback |
| M1 | View a learner's readiness score | ✅ Mentor dashboard |
| M2 | See a learner's skill gaps | ✅ Per-learner profile |
| M3 | Track updates in skill profile over time | ✅ Score progression chart + timeline |
| A1 | Add new career roles | ✅ Admin panel |
| A2 | Update required skills for a role | ✅ Admin panel |
| A3 | Remove outdated career roles | ✅ Admin panel |

---

