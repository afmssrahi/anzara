# Getting Started

This guide takes you from "I just cloned the repo" to "I have all three apps
running and I can log in." It assumes you're on a Windows machine with
PowerShell. macOS / Linux users — the same commands work, just substitute
`bash` for `powershell`.

**Time to complete:** ~15 minutes, mostly waiting for `pnpm install`.

---

## 1. What you need on your machine

| Tool          | Version    | Why                             | Get it from                          |
| ------------- | ---------- | ------------------------------- | ------------------------------------ |
| Node.js       | 20 or 22   | Runs the apps                   | https://nodejs.org/                  |
| pnpm          | 9 or newer | Installs deps (faster than npm) | `npm i -g pnpm`                      |
| PostgreSQL    | 15+        | The database                    | https://www.postgresql.org/download/ |
| Git           | any        | Clones the repo                 | https://git-scm.com/                 |
| A code editor | any        | We use VS Code                  | https://code.visualstudio.com/       |

Optional but nice:

- **TablePlus** or **DBeaver** — GUI for poking at the database
- **Insomnia** or **Postman** — for testing API calls by hand (not required;
  the smoke scripts cover the same thing)

---

## 2. Get the code

```powershell
git clone <your-repo-url> anzara
cd anzara
```

---

## 3. Install dependencies

```powershell
pnpm install
```

This installs for every package and app in the monorepo. It can take 1-3
minutes the first time. Turborepo will cache subsequent runs.

---

## 4. Set up the database

You need a running PostgreSQL with a database the app can connect to.

**Easiest (local install):**

- Install PostgreSQL 15 from the link above
- Open `pgAdmin` (installed with Postgres)
- Create a database called `anzara` with owner `postgres`
- The default URL becomes: `postgresql://postgres:postgres@localhost:5432/anzara`

**Slightly fancier (Docker):**

```powershell
docker run --name anzara-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=anzara -p 5432:5432 -d postgres:15
```

That gives you the same URL as above.

---

## 5. Configure environment variables

Copy the example file:

```powershell
cp .env.example .env
```

Open `.env` in your editor. **The only thing you must change** is the
`DATABASE_URL` to match what you set up above. For the default install:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/anzara"
```

Everything else has sensible defaults for local dev. See
[`docs/ENV-VARS.md`](ENV-VARS.md) for what each variable does.

---

## 6. Run the database migrations + seed demo data

```powershell
pnpm db:migrate
pnpm db:seed
```

`migrate` creates all the tables. `seed` fills them with a demo catalog
(6 products, 4 categories, 4 collections, an admin user, a customer user, and
a handful of orders so the dashboard has something to look at).

---

## 7. Start the three apps

```powershell
pnpm dev
```

This starts all three in parallel. When the output settles, you should see
three lines like:

```
storefront:  ▲ Next.js 15     http://localhost:3000
admin:       ▲ Next.js 15     http://localhost:3001
backend:     🚀 API listening on http://localhost:4000
```

If you only want one of them, see the cheat sheet in the README.

---

## 8. Open the apps in your browser

| App            | URL                          | Log in with                             |
| -------------- | ---------------------------- | --------------------------------------- |
| **Storefront** | http://localhost:3000        | (no login — just browse)                |
| **Admin**      | http://localhost:3001        | `admin@anzara.com` / `AnzaraAdmin@2026` |
| **Backend**    | http://localhost:4000/health | (no login — returns JSON)               |

For the customer side, you can sign up through the storefront's `/register`
page, or log in as the seeded customer: `customer@anzara.com` / `Customer@2026`.

> **Important:** change these passwords before going to production. See the
> security section of [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md).

---

## 9. What to try first

Once you're in, here's a 2-minute tour of the system:

**As a customer** (storefront):

1. Land on the home page — you'll see banners, featured products, a category grid.
2. Click any product → product detail page → read reviews, see the wishlist heart.
3. Add to cart, sign in, go to `/cart`, apply the coupon `EID2026` (if it's still valid in the seed).
4. Place a cash-on-delivery order. You'll get a confirmation in the storefront
   and an email written to `emails-outbox/` (no SMTP needed in dev).

**As an admin** (admin):

1. Open the dashboard at `/dashboard` — you'll see KPIs: orders today, revenue last 30 days, pending reviews, low-stock items.
2. Click "Orders" → see the order you just placed.
3. Move it to `CONFIRMED` → customer gets a second email.
4. Click "Content" → add a banner or a CMS page. It'll appear on the storefront.

---

## 10. Verify nothing's broken

```powershell
# Type-check
pnpm type-check

# Lint
pnpm lint

# Format check
pnpm format:check

# Production build
pnpm build
```

All four should report `9/9` (or `3/3` for build) and a green "all good."
If any fail, see the troubleshooting section below.

There's also a smoke test that exercises the API end-to-end:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke-phase5.ps1
```

---

## Troubleshooting

### "Connection refused" on PostgreSQL

The app can't reach the database. Either:

- PostgreSQL isn't running. On Windows, open `services.msc` and start the
  `postgresql-x64-15` service.
- The `DATABASE_URL` in `.env` is wrong. Test with `psql "$DATABASE_URL"` (in PowerShell: `$env:DATABASE_URL = "..."; psql $env:DATABASE_URL`).

### "Port 3000 is already in use"

Another process (likely a leftover from a previous run) is on that port.
Find and kill it:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Repeat for ports 3001 and 4000 if needed.

### `pnpm install` is slow or hangs

Turborepo caches installs. If you've never run it before, give it a few
minutes. If it hangs forever, check that you can reach the npm registry
(`npm ping` works).

### The storefront / admin is empty

You're probably hitting the database but the seed didn't run. Re-run:
`pnpm db:seed`.

### The dev script keeps dying

This happens when PowerShell session ends — the pnpm child gets killed.
Use the helper scripts in `scripts/`:

```powershell
scripts\start-backend.ps1
scripts\start-storefront.ps1
scripts\start-admin.ps1
```

These start detached and survive the calling shell exiting.

### "Prettier formatting" errors

```powershell
pnpm format
```

That'll fix all the formatting automatically.

---

## Next steps

- **Non-technical?** Read [`FOR-ADMIN-USERS.md`](FOR-ADMIN-USERS.md) for a guided tour of the admin dashboard.
- **Developer?** Read [`FOR-DEVELOPERS.md`](FOR-DEVELOPERS.md) to learn the architecture and how to add features.
- **Need the API?** Read [`API.md`](API.md).
- **Ready to deploy?** Read [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md).
