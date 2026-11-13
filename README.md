# LuggageStay — Hotel-based Luggage Storage MVP

A full-stack marketplace connecting travelers who need short-term luggage storage with hotels
that have spare capacity. Built as a working MVP with real auth, real booking logic, and
realistic demo data — not a static mockup.

## Stack

- **Backend:** Node.js, Express, TypeScript, Drizzle ORM, SQLite (better-sqlite3), JWT auth, `qrcode` for booking QR codes
- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4, hand-rolled shadcn-style UI primitives (Radix UI underneath)

### A note on the database layer

The original plan called for **Prisma**. Prisma's CLI downloads its query-engine binaries from
`binaries.prisma.sh` at `generate`/`migrate` time, and that domain wasn't reachable in the sandboxed
build environment this was built in (only npm/PyPI/GitHub were allowed). So this MVP uses
**Drizzle ORM** instead — same schema-first, fully type-safe experience, zero native-binary
download step, and it migrates to Postgres just as cleanly as Prisma would have. If your own
environment *can* reach Prisma's CDN, swapping back is a contained change (see
"Migrating to PostgreSQL" below) — none of the route handlers need to change either way, since
they only ever call the query builder, not raw SQL.

## Project structure

```
luggage-app/
├── backend/
│   ├── src/
│   │   ├── db/           # Drizzle schema, client, migration runner, seed script
│   │   ├── routes/        # auth, hotels, bookings, partner, admin
│   │   ├── middleware/     # JWT auth + role guard
│   │   ├── utils/         # booking code, QR generation, pricing, date helpers
│   │   └── index.ts       # Express app entrypoint
│   └── dev.db              # SQLite database file (created on first run)
└── frontend/
    └── src/
        ├── pages/          # Home/search, hotel details, booking confirmation,
        │                     my bookings, partner dashboard, admin dashboard, auth
        ├── components/ui/  # Button, Card, Input, Select, Tabs, Dialog, etc.
        ├── context/        # AuthContext (JWT stored in localStorage)
        └── api/            # Axios client
```

## Running it locally

**Requirements:** Node.js 18+ and npm.

### 1. Backend

```bash
cd backend
npm install
npm run db:migrate   # creates the SQLite schema
npm run seed          # populates realistic demo data (hotels, users, bookings)
npm run dev            # starts the API on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev   # starts the app on http://localhost:5173, proxying /api to :4000
```

Open **http://localhost:5173**.

### Demo accounts (all passwords: `password123`)

| Role | Email |
|---|---|
| Admin | `admin@luggagestay.demo` |
| Hotel partner | `partner.taj@luggagestay.demo` (and 5 others — see seed output) |
| Traveler | `aditi@traveler.demo` (and 3 others) |

The login page also has one-click buttons to autofill these.

## What's implemented and working

- **Traveler registration & login** (JWT-based)
- **Hotel search & filtering** — by city, free-text, price, rating, amenities, date availability
- **Hotel details** — images, amenities, pricing, a live 7-day availability snapshot
- **Booking flow** — date/time drop-off & pick-up, luggage quantity, notes, dynamic hourly pricing,
  transactional capacity locking across the whole stay so two travelers can never overbook the same day
- **Booking confirmation** — unique human-readable booking code (`LS-XXXXXX`) and a real QR code
  (base64 PNG, generated server-side, encoding the booking code)
- **Hotel partner dashboard** — stats, 14-day availability calendar (editable per-day capacity),
  bookings list, check-in / check-out actions that update booking status and free up capacity
- **Admin dashboard** — platform-wide stats, all users, all hotels, all bookings
- **First-time partner onboarding** — a new `HOTEL_PARTNER` signup is walked through creating
  their hotel listing before they see the dashboard

## Mocked / not wired to real external services

Per the brief, these are intentionally stubbed since no API keys were available:

- **Payments** — a "Demo payment — no real charge was made" badge shows on the confirmation page.
  No payment gateway is called. Swap in Razorpay by adding a checkout step before the
  `POST /api/bookings` call and verifying the payment server-side before creating the booking row.
- **Maps** — hotel `lat`/`lng` are stored and returned by the API, but no map tiles are rendered.
  Swap in Google Maps by dropping a `<GoogleMap>` component into `HotelDetails.tsx` and `Home.tsx`,
  keyed off the existing `lat`/`lng` fields.
- **Email & notifications** — none are sent. Booking confirmations are shown in-app only.
  To wire up email, call a provider (e.g. SendGrid/Postmark) from the `POST /api/bookings` handler
  after the transaction commits.

## Migrating to PostgreSQL later

1. In `backend/src/db/schema.ts`, swap `drizzle-orm/sqlite-core` imports for `drizzle-orm/pg-core`
   (e.g. `sqliteTable` → `pgTable`, `integer(..., {mode:"timestamp_ms"})` → `timestamp(...)`).
2. In `backend/src/db/client.ts`, swap the `better-sqlite3` driver for `drizzle-orm/postgres-js`
   (or `node-postgres`), pointed at `process.env.DATABASE_URL` (a Postgres connection string).
3. Replace `backend/src/db/migrate.ts`'s raw `CREATE TABLE` statements with `drizzle-kit generate`
   + `drizzle-kit migrate` once you're in an environment with full registry access.
4. No route file changes needed — every route uses the Drizzle query builder, not SQLite-specific SQL.

## API overview

All endpoints are under `/api`. JWT goes in `Authorization: Bearer <token>`.

- `POST /auth/register`, `POST /auth/login`
- `GET /hotels`, `GET /hotels/:id`, `GET /hotels/:id/availability`
- `POST /bookings`, `GET /bookings/mine`, `GET /bookings/:idOrCode`,
  `POST /bookings/:id/check-in`, `POST /bookings/:id/check-out`, `POST /bookings/:id/cancel`
- `GET /partner/hotel`, `POST /partner/hotel`, `PATCH /partner/hotel`,
  `GET /partner/availability`, `POST /partner/availability`,
  `GET /partner/bookings`, `GET /partner/stats`
- `GET /admin/stats`, `GET /admin/users`, `GET /admin/hotels`, `GET /admin/bookings`
