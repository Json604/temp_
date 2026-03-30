# Backend & Product Flow — How Everything Connects

This document explains **what happens, where, and how** across the full application, with a focus on the backend. Read this to understand the data lifecycle from the moment a user opens the app to when results are stored in the database.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│                                                                 │
│  Next.js Frontend (localhost:3000)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Landing  │→ │ Assess   │→ │ Results  │→ │  Dashboard    │  │
│  │ page.tsx │  │ page.tsx │  │ page.tsx │  │  page.tsx     │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                     │              │               │            │
│                     ▼              │               │            │
│              ┌────────────┐       │               │            │
│              │ Calculation│       │               │            │
│              │   Engine   │       │               │            │
│              │ (client JS)│       │               │            │
│              └────────────┘       │               │            │
│                                   │               │            │
│         sessionStorage ◄──────────┴───────────────┘            │
│         (form draft + assessment cache)                        │
└────────────────────────────────┬───────────────────────────────┘
                                 │ HTTP (JSON)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND (localhost:4000)              │
│                                                                 │
│  app.ts → cors + json middleware → route handlers               │
│                                                                 │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────┐        │
│  │ /api/auth  │  │ /api/assessments│  │  /api/user   │        │
│  └─────┬──────┘  └───────┬─────────┘  └──────┬───────┘        │
│        │           requireAuth middleware      │                │
│        │          (JWT verification)   requireAuth              │
│  ┌─────▼──────┐  ┌───────▼─────────┐  ┌──────▼───────┐        │
│  │auth.service│  │assessment.service│  │ user.service │        │
│  │(bcrypt+JWT)│  │  (CRUD+authz)   │  │  (profile)   │        │
│  └─────┬──────┘  └───────┬─────────┘  └──────┬───────┘        │
│        │                 │                    │                 │
│        └─────────────────┴────────────────────┘                │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │ Prisma ORM  │                               │
│                   │  (db.ts)    │                               │
│                   └──────┬──────┘                               │
└──────────────────────────┼──────────────────────────────────────┘
                           │ TCP (SSL)
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (Neon/GCP)  │
                    └──────────────┘
```

**Key insight:** The calculation engine runs entirely in the browser. The backend never computes risk scores — it only stores and retrieves data.

---

## 2. Backend File Map

```
backend/src/
├── app.ts                          ← Entry point: creates Express, mounts routes
├── config/
│   ├── env.ts                      ← Reads .env → exports { PORT, DATABASE_URL, FRONTEND_URL, JWT_SECRET }
│   └── db.ts                       ← Creates Prisma client singleton (with PrismaPg adapter)
├── controllers/                    ← Request/response handlers (thin — delegate to services)
│   ├── auth.controller.ts          ← POST /api/auth → signup or login
│   ├── assessment.controller.ts    ← GET/POST/DELETE /api/assessments
│   └── user.controller.ts          ← GET /api/user
├── services/                       ← Business logic (where the real work happens)
│   ├── auth.service.ts             ← bcrypt hash/compare, user creation, JWT issuance
│   ├── assessment.service.ts       ← Prisma queries for assessments (ownership-verified)
│   └── user.service.ts             ← Prisma query for user profile
├── routes/                         ← Express Router definitions (URL → controller)
│   ├── auth.route.ts
│   ├── assessment.route.ts
│   └── user.route.ts
├── helpers/
│   └── email-validation.ts         ← Work-email check (blocks Gmail, Yahoo, etc.)
└── middlewares/
    ├── auth.middleware.ts           ← JWT verification (requireAuth) + token signing (signToken)
    └── error.middleware.ts          ← Global error handler
```

### How a request flows through the backend

```
HTTP request
  → app.ts (cors, json parsing)
    → routes/*.ts (URL matching)
      → auth.middleware.ts (requireAuth — verify JWT, attach req.user)
        → controllers/*.ts (use req.user.email, call service, send response)
          → services/*.ts (business logic, Prisma queries, ownership checks)
            → config/db.ts (Prisma client)
              → PostgreSQL
```

**Note:** `/api/auth` and `/api/health` skip the `requireAuth` middleware. All other routes require a valid `Authorization: Bearer <token>` header.

---

## 3. Database Schema

```sql
-- User table
User {
  id              UUID        PRIMARY KEY, auto-generated
  email           String      UNIQUE — always stored lowercase
  password_hash   String      bcrypt hash (12 rounds)
  company_domain  String      extracted from email domain (e.g. "lemnisca.com")
  created_at      DateTime    auto-set on creation
}

-- Assessment table
Assessment {
  id              UUID        PRIMARY KEY, auto-generated
  user_email      String      FOREIGN KEY → User.email
  inputs          JSON        the full ProcessInputs object
  results         JSON        the full PartialAssessmentResult object
  created_at      DateTime    auto-set on creation
}
```

The `inputs` JSON stores every field the user entered (volumes, RPM, biomass, etc.). The `results` JSON stores the full risk assessment output (scores, derived parameters, flags, bottleneck).

---

## 4. Product Flows — Step by Step

### Flow A: First-time user runs an assessment (no account)

```
1. User lands on / (page.tsx)
   → Static landing page, no API calls

2. User clicks "Assess your process" → navigates to /assess
   → assess/page.tsx loads
   → Checks sessionStorage for a form draft (none for first visit)
   → Renders InputForm with default INITIAL_STATE

3. User fills form steps A → E
   → All state in React useState (InputForm.tsx)
   → Inline validation on range errors as they type
   → Required-field validation only on "Continue" click

4. User submits form
   → InputForm.handleSubmit():
     a. Validates all steps
     b. Converts FormState (strings) → ProcessInputs (typed numbers)
     c. Calls runAssessment(processInputs) — CLIENT-SIDE engine
        → derivations.ts: D1–D7 (OUR, geometry, power, Reynolds, gas velocity, driving force)
        → otr.ts, mixing.ts, shear.ts, co2.ts, heat.ts: R1–R5
        → index.ts: determinePrimaryBottleneck()
     d. Calls setAssessment({ inputs, derived, results }) → sessionStorage
     e. Saves FormState draft → sessionStorage
     f. Shows analyzing animation (3s)
     g. router.push("/results")

5. /results page loads
   → results/page.tsx:
     a. getAssessment() from memory/sessionStorage → found → shows results
     b. User is NOT logged in → shows blurred results + "Sign in to view" CTA
   → NO backend call yet (assessment not saved)

6. User clicks "Sign in to view full results"
   → EmailGateModal opens
   → User enters work email + password
   → POST /api/auth { email, password, action: "signup" }
     → auth.controller.ts → auth.service.ts
     → Validates email not in BLOCKED_DOMAINS list
     → bcrypt.hash(password, 12)
     → prisma.user.create({ email, password_hash, company_domain })
     → Signs JWT with { userId, email } (7-day expiry)
     → Returns { ok: true, user: { id, email, company_domain, token } }
   → Frontend stores email in localStorage + JWT token in localStorage
   → handleAuthSuccess():
     → POST /api/assessments/save { inputs, results }
       → Authorization: Bearer <token> header
       → requireAuth middleware verifies JWT, attaches req.user
       → assessment.controller.ts uses req.user.email (not client input)
       → prisma.assessment.create({ user_email, inputs, results })
       → Returns { id: "<uuid>" }
     → Stores assessment ID in localStorage
   → Full results now visible (unblurred)
```

### Flow B: Logged-in user runs a new assessment

```
1. User is on /dashboard or /results, clicks "New assessment"
   → clearFormDraft() removes sessionStorage draft
   → Navigates to /assess → fresh empty form

2. User fills and submits form
   → Same as Flow A steps 3–4
   → router.push("/results")

3. /results loads
   → getAssessment() → found in sessionStorage
   → User IS logged in (localStorage has email)
   → Results shown immediately (no blur)
   → Background: POST /api/assessments/save (with Bearer token)
     → Server derives email from JWT — saves to database
     → Stores returned assessment ID in localStorage
```

### Flow C: User clicks "Edit inputs" from results

```
1. User is on /results, clicks "Edit inputs"
   → router.push("/assess")

2. /assess loads
   → getFormDraft() reads FormState from sessionStorage
   → Found! Passes as initialValues to InputForm
   → Form renders pre-filled with the user's previous entries
   → User can edit and re-submit
```

### Flow D: User views a past assessment from dashboard

```
1. User is on /dashboard
   → On mount:
     → GET /api/user (Bearer token) → user profile + assessment count
     → GET /api/assessments (Bearer token) → list of all assessments
       → requireAuth extracts email from JWT
       → assessment.service.getAssessments(email)
       → prisma.assessment.findMany({ where: { user_email }, orderBy: { created_at: "desc" } })
       → Returns array of { id, inputs, results, created_at }

2. User clicks an assessment card
   → handleViewAssessment(assessment):
     a. runAssessment(assessment.inputs) — re-derives from saved inputs
     b. setAssessment({ inputs, derived, results }) → sessionStorage
     c. Converts ProcessInputs → FormState and saves as form draft
     d. Stores assessment.id in localStorage
     e. router.push("/results")

3. /results loads
   → getAssessment() → found → shows results

4. If user clicks "Edit inputs" → same as Flow C
   (form draft was saved in step 2c)
```

### Flow E: User refreshes /results page (page reload)

```
1. Browser reloads /results
   → In-memory store is gone, but sessionStorage survives
   → getAssessment() reads from sessionStorage → found → shows results

2. If sessionStorage is also cleared (e.g. new tab):
   → getAssessment() returns null
   → Falls back to localStorage "lemnisca_last_assessment_id"
   → GET /api/assessments/:id (Bearer token)
     → requireAuth verifies JWT
     → assessment.controller.ts → assessment.service.ts
     → prisma.assessment.findUnique({ where: { id } })
     → Ownership check: assessment.user_email must match req.user.email (403 if not)
     → Returns { id, inputs, results, created_at, user_email }
   → Frontend runs runAssessment(dbRecord.inputs) to rebuild derived params
   → Stores back into sessionStorage for subsequent use
```

---

## 5. What the Backend Stores vs What the Frontend Computes

| Data | Where it lives | Who creates it |
|------|---------------|----------------|
| User credentials | PostgreSQL `User` table | Backend `auth.service.ts` |
| Assessment inputs | PostgreSQL `Assessment.inputs` (JSON) | Frontend → saved via `POST /api/assessments/save` |
| Assessment results | PostgreSQL `Assessment.results` (JSON) | Frontend engine → saved via `POST /api/assessments/save` |
| Derived parameters | **Not in database** | Frontend engine (recomputed from inputs on every view) |
| Form draft (string state) | `sessionStorage` only | Frontend `InputForm` on submit |
| Current assessment cache | `sessionStorage` + in-memory | Frontend `store.ts` |
| Auth state (email) | `localStorage` | Frontend after successful auth |
| JWT token | `localStorage` | Frontend after successful auth (from server response) |
| Last assessment ID | `localStorage` | Frontend after save response |

---

## 6. API Endpoint Details

### `POST /api/auth` — No auth required

```
Body: { email: string, password: string, action: "signup" | "login" }

signup:
  → Normalise email to lowercase
  → Check not in BLOCKED_DOMAINS (email-validation.ts)
  → Check no existing user with that email
  → bcrypt.hash(password, 12)
  → prisma.user.create()
  → Sign JWT with { userId, email } (7-day expiry)
  → Return { ok: true, user: { id, email, company_domain, token } }

login:
  → Find user by email
  → bcrypt.compare(password, user.password_hash)
  → Sign JWT with { userId, email } (7-day expiry)
  → Return { ok: true, user: { id, email, company_domain, token } }

Errors: 400 (missing fields), 404 (not found), 401 (wrong password), 409 (duplicate)
```

### `GET /api/user` — Bearer token required

```
→ requireAuth extracts email from JWT
→ prisma.user.findUnique() with _count of assessments
→ Return { id, email, company_domain, created_at, assessment_count }

Errors: 401 (missing/invalid token), 404 (not found)
```

### `GET /api/assessments` — Bearer token required

```
→ requireAuth extracts email from JWT
→ prisma.assessment.findMany({ user_email, orderBy: created_at desc })
→ Return { assessments: [{ id, inputs, results, created_at }] }

Errors: 401 (missing/invalid token)
```

### `GET /api/assessments/:id` — Bearer token required

```
→ requireAuth extracts email from JWT
→ prisma.assessment.findUnique({ id })
→ Ownership check: assessment.user_email === req.user.email (403 if not)
→ Return { id, inputs, results, created_at, user_email }

Errors: 401 (missing/invalid token), 403 (not your assessment), 404 (not found)
```

### `POST /api/assessments/save` — Bearer token required

```
Body: { inputs: object, results: object }

→ requireAuth extracts email from JWT
→ Look up user by email (must exist)
→ prisma.assessment.create({ user_email, inputs, results })
→ Return { id: "<uuid>" }

Note: On failure, returns { id: null } instead of an error (non-blocking save)
Errors: 401 (missing/invalid token)
```

### `DELETE /api/assessments/:id` — Bearer token required

```
→ requireAuth extracts email from JWT
→ prisma.assessment.findUnique({ id })
→ Ownership check: assessment.user_email === req.user.email (403 if not)
→ prisma.assessment.delete({ id })
→ Return { ok: true }

Errors: 401 (missing/invalid token), 403 (not your assessment), 404 (not found)
```

### `GET /api/health` — No auth required

```
→ Return { status: "ok", timestamp: "..." }
```

---

## 7. Security Notes

| Concern | Current state |
|---------|---------------|
| **Password storage** | bcrypt with 12 salt rounds |
| **Email gating** | Personal email providers blocked (90+ domains) |
| **Auth mechanism** | JWT bearer tokens (7-day expiry) signed with `JWT_SECRET` |
| **API auth** | All data endpoints require valid JWT via `requireAuth` middleware |
| **Ownership checks** | `getAssessmentById` and `deleteAssessment` verify `user_email === req.user.email` |
| **Email derivation** | Server extracts email from JWT payload — never trusts client-sent email |
| **CORS** | Restricted to `FRONTEND_URL` only |
| **Transit encryption** | Depends on deployment (HTTPS via reverse proxy / GCP load balancer) |
| **At-rest encryption** | Depends on database provider (Cloud SQL encrypts by default) |

---

## 8. Client-Side Storage Map

```
localStorage:
  "lemnisca_work_email"          → user's email (display purposes)
  "lemnisca_auth_token"          → JWT bearer token (sent in Authorization header)
  "lemnisca_last_assessment_id"  → UUID of last saved assessment (or "saving")
  "lemnisca-theme"               → "light" | "dark"

sessionStorage:
  "lemnisca_assessment"          → JSON of { inputs, derived, results }
  "lemnisca_form_draft"          → JSON of FormState (string-based form fields)
```

---

## 9. What's NOT in the Backend (Yet)

- **No rate limiting** — endpoints have no throttling
- **No input validation on backend** — the API trusts whatever JSON the frontend sends for `inputs` and `results`
- **No admin panel** — no way to view/manage users or assessments outside the database
- **No password reset** — users who forget their password have no recovery path
