# Anzara - Project Status

Last updated: 2026-10-11

## Overview

Premium modest fashion e-commerce platform for Bangladesh.
Customer storefront + Admin dashboard + Express backend, all separate, all modular.

## Current Phase

**Phase 2 — Products (with local asset upload)** ✅ Complete. Starting Phase 3 next.

## Verified working

- Postgres 15 installed natively on Windows, database `anzara_dev` created
- Redis (Memurai) installed natively, responding to PING
- Prisma migration applied: 36 tables created
- Seed completed: 1 SUPER_ADMIN, 21 permissions, 4 system roles, 6 default categories, 4 collections, 22 default settings
- Backend starts on port 4000, `/health` returns 200
- `POST /api/auth/register` → 201 + JWT (verified end-to-end with real customer creation)
- `POST /api/auth/login` → 200 + JWT
- `GET /api/auth/me` → 200 (admin and customer)
- `PATCH /api/auth/profile` → 200 (admin and customer)
- `POST /api/auth/change-password` → 200 (admin and customer)
- `POST /api/auth/forgot-password` → 200
- `POST /api/auth/otp/request` → 200 (purpose: REGISTER / LOGIN / RESET_PASSWORD)
- `POST /api/auth/logout` → 200
- `POST /api/auth/admin/login` → 200 + admin with 21 permissions + JWT
- Storefront builds with `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/account`
- Admin app builds with real auth form + 2FA challenge step + `/dashboard` shell

## Login credentials

- **Email:** admin@anzara.com
- **Password:** AnzaraAdmin@2026
- **Change after first login**

## Database

- Type: PostgreSQL 15 (native, Windows)
- Host: localhost:5432
- User: anzara
- Password: anzara
- Database: anzara_dev
- **For production, change all credentials**

## Git

- Branch: `main` at https://github.com/afmssrahi/anzara.git
- 11 commits pushed

## Phase Status

### Phase 0 — Foundation (Day 1-3) — **COMPLETE**

- [x] Monorepo structure (pnpm workspaces + Turborepo)
- [x] Root package.json with shared scripts
- [x] `.gitignore`, `.env.example`, `README.md`
- [x] Shared TypeScript config (`tsconfig.base.json`)
- [x] Shared ESLint + Prettier config (with TypeScript parser, react-hooks)
- [x] Database package (Prisma schema, 27 models)
- [x] Initial migration applied (36 tables)
- [x] Seed (admin, permissions, categories, settings)
- [x] Docker Compose for local Postgres + Redis
- [x] CI workflow (GitHub Actions: lint, type-check, build)
- [x] Husky pre-commit hook + lint-staged
- [x] `.editorconfig` + `.vscode/settings.json` + `.vscode/extensions.json`
- [x] Turborepo cache configured (`node_modules/.cache/turbo`)
- [x] All packages type-check clean
- [x] Git initialized, commits pushed to GitHub
- [x] Apps: storefront, admin, backend all scaffolded
- [x] Packages: database, shared-types, ui, config, validators, api-client
- [x] Auth module (customer + admin + OTP) with JWT
- [x] Backend health check + register + admin login verified end-to-end
- [x] Full monorepo build green (3 apps build, 8 packages pass lint/type-check/format)
- [x] **Phase 2 catalog verified end-to-end**: public `/api/products` (list, filters, detail), `/api/categories`, `/api/collections`; admin `/api/admin/products` (list/create/delete), `/api/admin/categories`, asset upload via `AssetProvider`

### Phase 1 — Authentication (Day 4-7) — **IN PROGRESS**

**Backend (done):**

- [x] JWT auth middleware (`requireAuth`, `requireAdmin`, `requirePermission`)
- [x] Audit log helper
- [x] Rate limiting middleware (general + auth + OTP)
- [x] Cookie-based refresh tokens (httpOnly, sameSite)
- [x] Customer register, login, OTP verify, resend
- [x] Admin login (with 2FA challenge), 2FA verify, setup, disable
- [x] Forgot/reset/change password
- [x] Profile read + update
- [x] Session refresh + logout
- [x] Customer + admin stores (zundo/zustand)
- [x] API client (`@anzara/api-client`) with auth surface

**Storefront UI (done):**

- [x] Shared UI library (`@anzara/ui`): Button, Input, FormField, Spinner, Badge, Toast, EmptyState
- [x] i18n provider (EN + BN dictionaries, language switcher, cookie + localStorage persistence)
- [x] Layout with providers (I18nProvider, ToastProvider)
- [x] `/login` page (email + password, error handling, redirect to /account)
- [x] `/register` page (full form, password match validation, sends verification OTP, redirects to `/verify-email`)
- [x] `/verify-email` page (6-digit code input + 60s resend cooldown)
- [x] `/forgot-password` page
- [x] `/reset-password?token=...` page
- [x] `/account` page (read + edit profile, change password, sign out)
- [x] Build green

**Admin UI (done):**

- [x] Real login form wired to `POST /api/auth/admin/login` (with optional `totpCode`)
- [x] 2FA challenge step (when admin has 2FA enabled; backend returns TWO_FACTOR_REQUIRED)
- [x] Stores token + admin user, redirects to `/dashboard`
- [x] `/dashboard` page with auth-gated `AdminShell` (sidebar + topbar)
- [x] Permission-aware nav (`useAdminPermissions().has(...)` + SUPER_ADMIN bypass)
- [x] Sign out from topbar
- [x] Build green

**Still TODO in Phase 1 (low priority):**

- [ ] End-to-end manual test of every flow in a real browser (basic curl tests done)
- [ ] Audit log viewer in admin (post-MVP)
- [ ] UI copy / BN translation review

### Phase 2 — Products (Day 8-14) — ✅ COMPLETE

- [x] Admin product CRUD with variants
- [x] Asset upload via swappable `AssetProvider` (local FS now, Cloudinary later)
- [x] Customer: PLP with filters (category, price, size, color, inStock, search)
- [x] Customer: PDP with image gallery, variant picker, quantity
- [x] Categories (read-only public + admin CRUD)
- [x] Collections (read-only public + admin CRUD)
- [x] API client surfaces for products, categories, collections, uploads
- [x] Seed: 10 real products with variants, tags, featured flags
- [x] End-to-end curl verification (list, detail, create, delete)

**Asset provider contract:** `apps/backend/src/modules/assets/provider.ts` defines `AssetProvider` (upload/remove). `local-provider.ts` writes to `UPLOAD_DIR` and returns public URL. Switch to Cloudinary = new provider file + factory change. Zero call-site changes.

### Phase 3 — Cart & Checkout (Day 15-21)

- [ ] Cart with stock reservation
- [ ] Coupon system
- [ ] Checkout flow
- [ ] Order creation
- [ ] COD workflow (priority - first payment method)
- [ ] SSLCommerz integration (when credentials ready)
- [ ] Order confirmation email

### Phase 4 — Orders & Reviews (Day 22-28)

- [ ] Admin order management
- [ ] Shipment tracking
- [ ] Customer order tracking
- [ ] Verified reviews with photos
- [ ] WhatsApp support button
- [ ] Homepage content management

### Phase 5 — Launch (Day 29-35)

- [ ] GA4, GTM, Meta Pixel
- [ ] SEO (sitemap, structured data)
- [ ] Admin reports & dashboard
- [ ] Email templates
- [ ] Performance optimization
- [ ] Production deployment

## Blocked / Waiting On

- **SSLCommerz merchant account** — Apply now at sslcommerz.com. Takes 1-7 days. Blocks Phase 3 payment integration.
- **Resend API key** — Needed for email OTP delivery. Can use console transport in dev for now.
- **Brand assets** — Logo, final color palette (using #0F4C5C as default teal, changeable from admin).

## Decisions Log

See [DECISIONS.md](DECISIONS.md) for full architectural decisions.

## Next Action

Finish Phase 1: account page, forgot/reset password pages, verify-email page, admin dashboard skeleton. Then run end-to-end manual test.
