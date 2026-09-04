*** Begin README replacement ***

# Zosavuta — Ticketing & Bus Platform

Zosavuta is a unified ticketing platform for events and intercity bus transport across Africa. This repository contains the Next.js frontend, mock data, and helper libraries used during local development.

**Contents**
- Project overview
- Features
- Tech stack
- Directory structure (key files)
- Getting started (dev + build)
- Mock data & bus module
- Bus operator tools (validation, manifest)
- Developer workflows
- Troubleshooting
- Contribution guide

---

## Project Overview
Zosavuta combines event ticketing and bus ticketing into a single experience. Users can browse events, purchase tickets, and optionally book bus transport. Operators manage buses, routes, trips, and validate tickets.

## Features
- Event ticket browsing and purchasing
- Integrated bus booking (routes, trips, seats)
- Operator dashboard (buses, trips, bookings, manifest)
- Ticket validation (QR scanning via device camera)
- Offline/mock development via local mock data and localStorage fallbacks

## Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Firebase (Firestore) — optional in local dev (mock fallbacks present)

## Important Files & Folders
- App entry & layout: [app/layout.tsx](app/layout.tsx)
- Global styles: [app/globals.css](app/globals.css)
- Bus mock data: [lib/bus/mock-data.ts](lib/bus/mock-data.ts)
- Bus types: [lib/bus/types.ts](lib/bus/types.ts)
- Bus helper library (Firestore + mock fallbacks): [lib/bus/firebase.ts](lib/bus/firebase.ts)
- Bus listing page: [app/bus/page.tsx](app/bus/page.tsx)
- Bus route detail: [app/bus/route/[id]/page.tsx](app/bus/route/[id]/page.tsx)
- Operator validation (camera scanner): [app/bus/operator/validation/page.tsx](app/bus/operator/validation/page.tsx)
- Dashboard: [app/dashboard/page.tsx](app/dashboard/page.tsx)
- My bookings: [app/my-bookings/page.tsx](app/my-bookings/page.tsx)

## Getting Started (Local Development)
Prerequisites:
- Node.js (recommended LTS)
- pnpm (if you use pnpm) or npm/yarn

Install dependencies:

```bash
pnpm install
```

Run development server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
pnpm start
```

TypeScript checks:

```bash
pnpm exec tsc --noEmit
```

## Environment & Firebase
This project uses Firebase for production data. For local development the app includes robust mock data and localStorage fallbacks. If you want to enable Firestore integration, provide Firebase config in `lib/firebase.ts` and set up appropriate security rules.

## Mock Data & Bus Module
- Mock datasets for buses, routes, trips, bookings, and tickets live at [lib/bus/mock-data.ts](lib/bus/mock-data.ts).
- Helper functions that attempt Firestore access, then fall back to mock/localStorage are in [lib/bus/firebase.ts](lib/bus/firebase.ts).
- Mock data keys are stored in localStorage under names like `zosavuta_buses`, `zosavuta_trips`, `zosavuta_bookings`, `zosavuta_tickets` so you can edit them in the browser devtools to simulate different states.

### Common mock constants
- `MOCK_ROUTES`, `MOCK_TRIPS`, `MOCK_BOOKINGS`, `MOCK_TICKETS` — used across operator and customer pages.

## Bus Pages & Operator Tools
- Bus landing (route cards): [app/bus/page.tsx](app/bus/page.tsx)
- Route detail with fallback: [app/bus/route/[id]/page.tsx](app/bus/route/[id]/page.tsx) — uses `generateStaticParams()` for mock routes in dev
- Operator layout & nav: [app/bus/operator/layout.tsx](app/bus/operator/layout.tsx)
- Operator validation: [app/bus/operator/validation/page.tsx](app/bus/operator/validation/page.tsx)
	- Supports camera QR scanning via the Web Barcode Detector API, falling back to manual input
	- Uses `MOCK_TICKETS` for local validation when Firestore is unavailable
- Operator manifest & bookings management use the helper functions in `lib/bus/firebase.ts` and `MOCK_*` datasets during local dev

## Dashboard Integration
- User dashboard originally read event `orders`; bus bookings lived separately. The dashboard now merges event `orders` and bus `bookings` (from `lib/bus/firebase.ts`) so `Total Tickets`, `Upcoming Tickets`, and Notifications include bus bookings.
- See implementation: [app/dashboard/page.tsx](app/dashboard/page.tsx)

## Tickets & Validation
- Tickets are represented by `lib/bus/types.ts` (`Ticket` interface).
- Validation endpoint/helpers are available in [lib/bus/firebase.ts](lib/bus/firebase.ts) including `validateTicket`, `getTicketsByUser`, and listeners like `onTicketValidationChange`.
- The operator validation page uses camera scanning to read ticket QR codes (uses `BarcodeDetector` when available) and validates against the mock dataset in local dev.

## Developer Workflows
- To add a new route/trip/bus locally, edit `lib/bus/mock-data.ts` or use the localStorage keys in the browser.
- To add real Firestore data, create collections `buses`, `routes`, `trips`, `bookings`, `tickets`, and ensure security rules permit your dev credentials.

### Useful commands
- Start dev server: `pnpm dev`
- Run TypeScript checks: `pnpm exec tsc --noEmit`
- Build production: `pnpm build`

## Troubleshooting
- `@import` CSS warnings: ensure `@import` rules are at the top of the stylesheet files. The app uses [app/globals.css](app/globals.css) — avoid duplicate top-level CSS files with `@import` statements.
- If pages 404 for routes like `/bus/route/route1`, ensure `generateStaticParams()` in [app/bus/route/[id]/page.tsx](app/bus/route/[id]/page.tsx) includes mock route ids or Firestore is available.
- If Firestore returns `permission-denied` in builds, use mock data or update Firebase rules for the dev project.

## Contribution
- Fork the repository, create a feature branch, make changes, run tests and build locally, then open a PR with a clear description.
- Keep mock-data changes small and include sample data for reproducible testing.

## Contact
- Project maintainers: the Zosavuta team

---

If you want, I can also:
- Add a short `CONTRIBUTING.md` with PR checklist
- Add Code of Conduct and issue templates
- Generate a smaller `README-DEV.md` focused only on local debug steps

*** End README replacement ***
