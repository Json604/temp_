# Lemnisca Fermentation Scale-Up Risk Predictor

## Project Overview
Web app that takes lab-scale fermentation process data and produces a 
structured engineering risk assessment across 5 physical domains for 
scale-up to pilot/production scale.

## Tech Stack
- Frontend: Next.js 14+ (App Router) with TypeScript
- Styling: Tailwind CSS
- Calculation engine: TypeScript (client-side, no server round-trip)
- Authentication: NextAuth.js with email magic link
- Database: PostgreSQL with Prisma ORM
- PDF generation: @react-pdf/renderer
- Deployment: Vercel

## Key Reference
The full development specification is in `/docs/lemnisca_dev_spec.md`.
ALL calculation formulas, constants, organism defaults, scoring thresholds,
input validation rules, and UX copy are defined there.
Always refer to that file before implementing any calculation or UI element.

## Project Structure
```
/docs              - Specifications (dev spec, PRD)
/src/lib/engine    - Calculation engine (derivations D1-D7, risks R1-R5)
/src/lib/constants - All organism defaults, thresholds, lookup tables
/src/lib/types     - TypeScript interfaces for inputs, results, assessments
/src/app           - Next.js app router pages
/src/components    - React components (form, dashboard, cards)
/prisma            - Database schema
```

## Rules
- British English for ALL user-facing text
- Every hardcoded constant must come from /docs/lemnisca_dev_spec.md
- Estimated values must be visually distinct (italic, different colour)
- No animations or congratulatory UI — professional instrument aesthetic
- All calculations must handle edge cases per Section 3 of the dev spec
- When installing packages, use npm (not yarn or pnpm)

## Setup Script
After cloning, run:
```bash
npm install
```