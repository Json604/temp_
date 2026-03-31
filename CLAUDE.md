# Lemnisca Fermentation Scale-Up Risk Predictor

## Project Overview
Web app that takes lab-scale fermentation process data and produces a
structured engineering risk assessment across 5 physical domains for
scale-up to pilot/production scale.

## Tech Stack
- Frontend: Next.js 14+ (App Router) with TypeScript
- Backend: Express.js with TypeScript
- Styling: Tailwind CSS
- Calculation engine: TypeScript (client-side, no server round-trip)
- Authentication: Custom email/password with bcrypt
- Database: PostgreSQL with Prisma ORM
- PDF generation: @react-pdf/renderer

## Key Reference
The full development specification is in `/docs/lemnisca_dev_spec.md`.
ALL calculation formulas, constants, organism defaults, scoring thresholds,
input validation rules, and UX copy are defined there.
Always refer to that file before implementing any calculation or UI element.

## Project Structure
```
/docs                           - Specifications (dev spec, PRD)
/backend                        - Express API server
  /src
    /config                     - Environment, database config
    /controllers                - Route handlers
    /middlewares                - Error handling, auth
    /routes                     - Express route definitions
    /services                   - Business logic
    /helpers                    - Email validation, utilities
    app.ts                      - Server entry point
  /prisma                       - Database schema
/frontend                       - Next.js app
  /src
    /app                        - Next.js app router pages
    /components                 - React components (form, dashboard, cards)
    /lib
      /engine                   - Calculation engine (derivations D1-D7, risks R1-R5)
      /constants                - All organism defaults, thresholds, lookup tables
      /types                    - TypeScript interfaces for inputs, results, assessments
      api.ts                    - Backend API URL helper
      store.ts                  - Client-side assessment store
```

## Rules
- British English for ALL user-facing text
- Every hardcoded constant must come from /docs/lemnisca_dev_spec.md
- Estimated values must be visually distinct (italic, different colour)
- No animations or congratulatory UI — professional instrument aesthetic
- All calculations must handle edge cases per Section 3 of the dev spec
- When installing packages, use npm (not yarn or pnpm)

## Setup
```bash
# Backend
cd backend && npm install && npx prisma generate

# Frontend
cd frontend && npm install

# Run both (in separate terminals)
cd backend && npm run dev    # → localhost:4000
cd frontend && npm run dev   # → localhost:3000
```
