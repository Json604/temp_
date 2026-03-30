# Lemnisca — Fermentation Scale-Up Risk Predictor

A web application that takes lab-scale fermentation process data and produces a structured engineering risk assessment across five physical domains for scale-up to pilot or production scale.

## Risk Domains

| Domain | What it evaluates |
|--------|-------------------|
| **Oxygen Transfer (OTR)** | Whether the target vessel can deliver sufficient kLa to meet peak oxygen demand |
| **Mixing** | How mixing time scales and whether substrate/pH gradients will form |
| **Shear Stress** | Whether impeller tip speed at the target scale exceeds organism tolerance |
| **CO₂ Accumulation** | Dissolved CO₂ buildup at the vessel bottom due to hydrostatic pressure |
| **Heat Removal** | Whether jacket cooling capacity can handle metabolic heat at scale |

Each domain produces a score: **Low**, **Moderate**, **High**, or **Critical**, plus a primary bottleneck statement with actionable guidance.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, custom CSS variables (light/dark themes) |
| Calculation engine | TypeScript, client-side (no server round-trip) |
| Backend API | Express 5, TypeScript |
| Database | PostgreSQL via Prisma ORM (with `@prisma/adapter-pg`) |
| Authentication | Email/password with bcrypt + JWT bearer tokens |
| PDF generation | `@react-pdf/renderer` |

## Project Structure

```
.
├── backend/                    # Express API server
│   ├── prisma/
│   │   └── schema.prisma       # User + Assessment models
│   ├── prisma.config.ts        # Prisma adapter config
│   └── src/
│       ├── app.ts              # Server entry point
│       ├── config/
│       │   ├── db.ts           # Prisma client singleton
│       │   └── env.ts          # Environment variables
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── assessment.controller.ts
│       │   └── user.controller.ts
│       ├── services/
│       │   ├── auth.service.ts       # Signup/login with bcrypt + JWT issuance
│       │   ├── assessment.service.ts # CRUD for assessments (ownership-verified)
│       │   └── user.service.ts       # User profile lookup
│       ├── routes/
│       │   ├── auth.route.ts         # POST /api/auth
│       │   ├── assessment.route.ts   # GET/POST /api/assessments
│       │   └── user.route.ts         # GET /api/user
│       ├── helpers/
│       │   └── email-validation.ts   # Work email gating
│       └── middlewares/
│           ├── auth.middleware.ts     # JWT verification (requireAuth)
│           └── error.middleware.ts
│
├── frontend/                   # Next.js app
│   └── src/
│       ├── app/
│       │   ├── layout.tsx      # Root layout + ThemeProvider
│       │   ├── page.tsx        # Landing page
│       │   ├── assess/         # Assessment form page
│       │   ├── results/        # Results display page
│       │   ├── dashboard/      # User dashboard (history)
│       │   └── report/         # PDF report page
│       ├── components/
│       │   ├── InputForm.tsx          # Multi-step wizard (A–E)
│       │   ├── ResultsDashboard.tsx   # Full results with domain cards
│       │   ├── EmailGateModal.tsx     # Auth modal (sign up / sign in)
│       │   ├── ThemeProvider.tsx      # Dark/light with view-transition API
│       │   ├── LivePreview.tsx        # Real-time bioreactor diagram
│       │   ├── BioreactorDiagram.tsx  # SVG vessel visualisation
│       │   ├── GeneratePdfButton.tsx  # PDF download trigger
│       │   ├── PdfReport.tsx          # @react-pdf/renderer template
│       │   ├── AnalyzingAnimation.tsx # Submission animation
│       │   └── CollapsibleSection.tsx # Expandable detail sections
│       └── lib/
│           ├── api.ts          # Backend URL helper + JWT token management
│           ├── store.ts        # Client-side state (sessionStorage-backed)
│           ├── types/index.ts  # All TypeScript interfaces
│           ├── constants/index.ts  # Organism defaults, thresholds, tables
│           └── engine/
│               ├── index.ts        # runAssessment() orchestrator
│               ├── derivations.ts  # D1–D7 derived parameters
│               ├── otr.ts          # R1: Oxygen transfer risk
│               ├── mixing.ts       # R2: Mixing risk
│               ├── shear.ts        # R3: Shear stress risk
│               ├── co2.ts          # R4: CO₂ accumulation risk
│               └── heat.ts         # R5: Heat removal risk
│
├── .env                        # Root env (DATABASE_URL, PORT, URLs)
├── CLAUDE.md                   # AI assistant project context
└── docs/                       # Dev spec and PRD
```

## Prerequisites

- **Node.js** >= 18
- **npm** (not yarn or pnpm)
- **PostgreSQL** database (local or hosted — Neon, Supabase, Cloud SQL, etc.)

## Environment Variables

Create a `.env` file at the project root:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Backend
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The frontend also reads `NEXT_PUBLIC_API_URL` from `frontend/.env` if present.

## Setup & Running

```bash
# 1. Install backend dependencies and generate Prisma client
cd backend
npm install
npx prisma generate

# 2. Run database migrations (first time only)
npx prisma migrate dev --name init

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Start both servers (in separate terminals)

# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth` | No | Sign up or login (`{ email, password, action }`) — returns JWT token |
| `GET` | `/api/user` | Bearer | Fetch authenticated user's profile and assessment count |
| `GET` | `/api/assessments` | Bearer | List all assessments for the authenticated user |
| `GET` | `/api/assessments/:id` | Bearer | Fetch a single assessment (ownership verified) |
| `POST` | `/api/assessments/save` | Bearer | Save assessment (`{ inputs, results }`) — email derived from token |
| `DELETE` | `/api/assessments/:id` | Bearer | Delete an assessment (ownership verified) |
| `GET` | `/api/health` | No | Health check |

## How the Calculation Engine Works

All calculations run **client-side** in the browser — no server round-trip for the risk assessment itself. The backend is only used for auth and persisting results.

1. **Derivations (D1–D7):** From raw inputs, derive OUR, vessel geometry, power input, Reynolds number, gas velocity, and driving force for both lab and target scales.
2. **Risk scoring (R1–R5):** Each domain takes the derived parameters and scores the risk using thresholds from the dev spec.
3. **Bottleneck identification:** The five scores are compared; the highest-risk domain is identified with a natural-language statement and "what would change" guidance.

## Database Schema

```
User
  id             UUID (PK)
  email          String (unique)
  password_hash  String
  company_domain String
  created_at     DateTime

Assessment
  id             UUID (PK)
  user_email     String (FK → User.email)
  inputs         JSON
  results        JSON
  created_at     DateTime
```

## Authentication Flow

1. Users can run assessments **without** signing in — results are shown with a blurred overlay prompting sign-up.
2. Sign-up requires a **work email** (personal providers like Gmail, Yahoo, Outlook are blocked).
3. Passwords are hashed with **bcrypt** (12 salt rounds).
4. On successful login/signup, the server issues a **JWT** (7-day expiry) signed with `JWT_SECRET`.
5. The frontend stores the token in `localStorage` and sends it as `Authorization: Bearer <token>` on all protected API calls.
6. All protected endpoints verify the token via `requireAuth` middleware — the user's email is derived from the token payload, never from client input.

## Theme System

The app supports light and dark modes with a custom **view-transition** toggle:

- **Dark → Light (sunrise):** New theme expands outward in a circle from the toggle button.
- **Light → Dark (sunset):** Old theme collapses inward toward the toggle button.

Themes are controlled by CSS custom properties defined in `globals.css`, toggled via the `dark`/`light` class on `<html>`.

## Scripts

### Backend

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/app.ts` | Start dev server with hot reload |
| `build` | `prisma generate && tsc` | Generate Prisma client + compile TS |
| `start` | `node dist/app.js` | Run production build |

### Frontend

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start Next.js dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |

