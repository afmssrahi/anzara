# Anzara 🛍️

> A complete e-commerce platform for a Bangladeshi modest-fashion brand.
> Customers browse and buy on the **storefront**, staff manage everything in
> the **admin dashboard**, and a single **backend API** powers both.

This is the codebase for the whole business. It's one repo, three apps, five
shared libraries, and one database. Read this file to figure out what to open
next.

---

## What's where

```
anzara/
├── apps/
│   ├── storefront/   ← the public website (what customers see)
│   ├── admin/        ← the staff dashboard
│   └── backend/      ← the API (what the two frontends call)
│
├── packages/         ← shared code used by the apps above
│   ├── database/     ← Prisma schema + generated client
│   ├── shared-types/ ← TypeScript types (Product, Order, etc.)
│   ├── ui/           ← React components (Button, Input, …)
│   ├── config/       ← env-var validation, brand constants
│   └── validators/   ← Zod request schemas (shared by backend + forms)
│
├── docs/             ← all human-readable documentation
├── scripts/          ← power-shell helpers (start servers, smoke tests)
└── docker-compose.yml
```

When you clone this for the first time, the file you want is
[`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md). It walks you from "no
code on my machine" to "the three apps are running and I can log in".

---

## The three apps, in plain English

| App          | URL                   | Who uses it    | What it does                                |
| ------------ | --------------------- | -------------- | ------------------------------------------- |
| `storefront` | http://localhost:3000 | Customers      | Browse products, add to cart, place orders  |
| `admin`      | http://localhost:3001 | Your staff     | Manage products, orders, content, customers |
| `backend`    | http://localhost:4000 | Both frontends | The single source of truth for all data     |

The backend is the only one that talks to the database. The two frontends only
talk to the backend.

---

## Documentation map

Read in this order if you're new:

1. **[GETTING-STARTED.md](docs/GETTING-STARTED.md)** — install, configure, run locally, log in
2. **[FOR-ADMIN-USERS.md](docs/FOR-ADMIN-USERS.md)** — non-technical guide to using the admin dashboard
3. **[FOR-DEVELOPERS.md](docs/FOR-DEVELOPERS.md)** — architecture, code structure, how to add a feature, troubleshooting
4. **[API.md](docs/API.md)** — every endpoint, for backend work or API testing

Reference material (read as needed):

- **[PROJECT-STATUS.md](docs/PROJECT-STATUS.md)** — what's done, what's next, business blockers
- **[DECISIONS.md](docs/DECISIONS.md)** — why we picked what we picked
- **[ENV-VARS.md](docs/ENV-VARS.md)** — every environment variable explained
- **[PRODUCTION-CHECKLIST.md](docs/PRODUCTION-CHECKLIST.md)** — the list to run through before going live
- **[SETTLEMENTS.md](docs/SETTLEMENTS.md)** — payouts to vendors (cod settlement workflow)

---

## A 30-second tour of the customer journey

1. Visitor lands on the **storefront** home page.
2. They browse **products**, open a **product detail** page, read **reviews**.
3. They add a few items to the **cart** (saved server-side, persists on refresh).
4. They sign up / log in. They can apply a **coupon** (e.g. `EID2026`).
5. They check out: choose a saved **address** or add a new one, place a **cash-on-delivery order**.
6. They get an **order confirmation** email; an admin sees the order in the dashboard.
7. Admin moves the order through `PENDING → CONFIRMED → SHIPPED → DELIVERED`. The customer gets an email at every step.
8. Customer leaves a **review** on the product. Admin moderates it in the dashboard.
9. Visitor could have also added the product to their **wishlist** (heart icon) to come back later.

That's the whole loop. Everything else in this codebase is in service of
making that loop work reliably at scale.

---

## Tech stack

| Layer      | Choice                                   | Why                                             |
| ---------- | ---------------------------------------- | ----------------------------------------------- |
| Frontends  | Next.js 15 (App Router) + React 18       | Server components, file-based routing, fast     |
| Backend    | Express.js + TypeScript                  | Per the project spec; small, fast, well-known   |
| Database   | PostgreSQL 15 via Prisma                 | Real DB, typed queries, easy migrations         |
| Validation | Zod                                      | Same schemas reused in backend + forms          |
| Auth       | JWT access + refresh in httpOnly cookies | Stateless, works across the two frontends       |
| Styling    | Tailwind CSS                             | Fast, no naming bikeshedding                    |
| Monorepo   | pnpm workspaces + Turborepo              | Fast installs, cached builds, type-safe sharing |

---

## Common tasks (cheat sheet)

| You want to…                            | Run this                                                    |
| --------------------------------------- | ----------------------------------------------------------- |
| Install everything                      | `pnpm install`                                              |
| Run all three apps in dev               | `pnpm dev`                                                  |
| Run just the backend                    | `pnpm --filter @anzara/backend dev`                         |
| Apply a database migration              | `pnpm db:migrate`                                           |
| Open Prisma Studio (DB GUI)             | `pnpm db:studio`                                            |
| Type-check the whole monorepo           | `pnpm type-check`                                           |
| Lint                                    | `pnpm lint`                                                 |
| Format                                  | `pnpm format`                                               |
| Build for production                    | `pnpm build`                                                |
| Re-seed the database with demo data     | `pnpm db:seed`                                              |
| Run the smoke test for the latest phase | `scripts/smoke-phase5.ps1` (or 3 / 4 — pick the latest one) |

> `pnpm` runs across all packages. `pnpm --filter @anzara/backend …` only
> runs it for the backend. `pnpm -r …` runs it for every package.

---

## License

Private — All rights reserved.
