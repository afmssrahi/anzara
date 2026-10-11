# Anzara - Project Status

Last updated: 2026-10-15

## Overview

Premium modest fashion e-commerce platform for Bangladesh.
Customer storefront + Admin dashboard + Express backend, all separate, all modular.

## Current Phase

**Phase 4 — Reviews, Wishlist, Content, Support** ✅ Customers can leave a verified-purchase review (auto-flagged verified, moderated before publishing), star the product with a histogram + average. Customers can build a wishlist (heart on PDP + `/account/wishlist` page), and admins get `/dashboard/reviews` to approve/reject/feature/delete. The storefront renders active homepage banners, floating WhatsApp support button (reads `social.whatsapp` from the public settings endpoint), and admins get full CRUD for banners and pages at `/dashboard/content`. Public settings endpoint exposes only `isPublic = true` rows. Next: Phase 5 (launch — GA4, SEO, sitemap, production deploy).

## Verified working

- Postgres 15 installed natively on Windows, database `anzara_dev` created
- Redis (Memurai) installed natively, responding to PING
- Prisma migration applied: 36 tables created
- Seed completed: 1 SUPER_ADMIN, 21 permissions, 4 system roles, 6 default categories, 4 collections, 10 real products with variants, 22 default settings
- Backend starts on port 4000, `/health` returns 200
- Auth: register / login (customer + admin) / me / profile / change-password / forgot+reset / OTP / logout / 2FA — all 2xx
- Catalog (public + admin): products (list/featured/by-slug, filters by category/price/size/color/inStock/search/sort/pagination), categories, collections, asset upload via `AssetProvider`
- **Phase 3 (new):**
  - Customer addresses (CRUD with default-address handling)
  - Cart: get / add / update / remove / clear, with per-line stock validation
  - Checkout: COD order placement inside one Prisma transaction — atomic stock decrement, address row create, order+items+payment+shipment create, SALE inventory rows, cart clear, confirmation email
  - Customer orders: list (paginated, status filter), get, cancel (PENDING only)
  - Admin orders: list (search, status filter, pagination), get, status transitions (state-machine enforced), shipment update, internal notes
  - Admin settings: site-setting key/value store (brand colors, contact, social, SEO)
  - State machine: `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED` + `CANCELLED` branch, plus `AWAITING_CONFIRMATION` for ambiguous payment states
  - Outbox: order confirmation email + 4 status-change emails per order (outbox `emails-outbox/*.json`)
  - Storefront pages: `/cart`, `/checkout`, `/orders`, `/orders/[id]` (with success banner via `?placed=1`)
  - Admin pages: `/dashboard/orders`, `/dashboard/orders/[id]`, `/dashboard/settings`
- **Phase 3.5 (settlement rails + coupons):**
  - `PaymentProvider` contract + `CodPaymentProvider` (free, default) — orders service delegates onPlaced/onCancelled/onDelivered to it
  - `CourierProvider` contract + `ManualCourierProvider` (admin-entered tracking) — same shape, today is a no-op passthrough
  - `GET /api/payments/methods` — public endpoint driving the storefront's payment picker
  - Checkout UI now uses the dynamic list
  - Email templates extracted to `orders/email-templates.ts`
  - **Coupons**: admin CRUD at `/dashboard/coupons`; customer apply/remove on `/cart`; atomic redeem at checkout (CouponUsage + usageCount in the same txn, auto-deactivate on limit hit)
- All 9 packages: type-check / lint / format clean
- All 3 apps: build green

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
- 12 commits pushed (last: `7e83e3a` — Phase 3)

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

### Phase 1 — Authentication (Day 4-7) — ✅ COMPLETE

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

### Phase 3 — Cart, Checkout, Orders, Settings (Day 15-21) — ✅ COMPLETE

**Backend (done):**

- [x] `modules/addresses` — customer CRUD with default-address handling; audit on create/delete
- [x] `modules/cart` — get / add / update / remove / clear, with per-line stock validation
- [x] `modules/orders` — checkout (COD) in a single Prisma transaction:
  - re-validate stock + price (re-fetched inside the txn)
  - atomic stock decrement (transactional `decrement` with `gte` guard — concurrent over-buy returns 409, no partial state)
  - create shipping + optional billing address, order, items, payment intent, shipment, status history
  - record SALE inventory transactions
  - clear cart
  - send confirmation email outbox
- [x] `modules/orders` — state machine `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED` + `CANCELLED` branch (and `AWAITING_CONFIRMATION` for ambiguous payment states); customer cancel from PENDING only
- [x] `modules/orders` — admin: list/get/status/shipment/notes; auto-advance order status when shipment dispatches or delivers; auto-mark COD payment VERIFIED on DELIVERED
- [x] `modules/orders` — status-change email at every transition
- [x] `modules/settings` — site-setting key/value store (brand, contact, social, SEO, theme); admin read+upsert with audit
- [x] `audit` helper — skip `AuditLog` rows for non-admin actions (customer trail lives in `OrderStatusChange`)
- [x] Cart totals reads `shipping.flatFee` / `shipping.freeOver` from `SiteSetting` (defaults 0 / 0)
- [x] Routes: `/api/addresses`, `/api/cart`, `/api/orders`, `/api/admin/orders`, `/api/admin/settings`
- [x] API client surfaces: `addresses`, `cart`, `orders` (customer + admin), `settings`
- [x] Validators: `createAddressSchema`, `updateAddressSchema`, `cartItemIdParamSchema`

**Storefront UI (done):**

- [x] PDP Add-to-cart now calls the real `cart.addItem`; redirects to `/login?return=…` if signed out
- [x] `/cart` — line items, qty edit, remove, clear, totals, link to checkout
- [x] `/checkout` — pick saved address or fill new one, customer note, place COD order, redirects to `/orders/[id]?placed=1`
- [x] `/orders` — paginated customer order list, status filter
- [x] `/orders/[id]` — order detail with status history, payment, shipment tracking, cancel button (PENDING only)

**Admin UI (done):**

- [x] `/dashboard/orders` — paginated list, search by order number / customer, status filter
- [x] `/dashboard/orders/[id]` — status transitions (state-machine enforced; disallowed moves are hidden), shipment update (status + tracking number), internal notes composer
- [x] `/dashboard/settings` — brand colors, contact, social, SEO defaults (editable, writes to `SiteSetting`)

**Verification:**

- [x] `pnpm format:check` / `lint` / `type-check` / `build` all green
- [x] `scripts/smoke-phase3.ps1` — full e2e (register → cart → checkout → admin list → status walk PENDING/CONFIRMED/PROCESSING/SHIPPED/DELIVERED → shipment tracking → note); outbox contains order confirmation + 4 status emails; final order in DELIVERED with payment auto-VERIFIED
- [x] `scripts/smoke-oversell.ps1` — stock oversell rejected with 400 + `available: 0`
- [x] `scripts/smoke-settings.ps1` — settings list/upsert/group filter

### Phase 3.5 — Payments, Couriers, Coupons (COD shipped; one-file drop-in for the rest)

- [x] `PaymentProvider` contract + `CodPaymentProvider` (free, default) — wired into the orders service
- [x] `CourierProvider` contract + `ManualCourierProvider` (free, default) — today's admin-entered tracking behavior, now behind a contract
- [x] `GET /api/payments/methods` — public endpoint that the storefront's checkout calls to render the payment picker. Today returns just COD; new methods appear automatically when added to the factory.
- [x] Checkout UI uses the dynamic list (no hard-coded "Cash on Delivery" label)
- [x] Orders service delegates payment side effects (onOrderPlaced / onOrderCancelled / onOrderDelivered) to the active provider — no inline `if (method === 'COD') …` branches
- [x] Email templates extracted to `orders/email-templates.ts`; the service is no longer 500 lines
- [x] `scripts/smoke-payments.ps1` — public methods endpoint, unsupported method rejected, COD succeeds
- [x] `scripts/smoke-cancel.ps1` — customer cancel flips payment to FAILED with reason
- [x] **Coupons** (full slice):
  - Backend `modules/coupons/` — admin CRUD + customer `POST /api/coupons/validate` (preview)
  - Cart routes: `POST /api/cart/coupon` (apply) / `DELETE /api/cart/coupon` (remove); `get cart` re-validates the attached coupon each time and silently drops it if it no longer applies
  - `orders.service.ts` redeems the coupon inside the checkout transaction (atomic `usageCount` increment + `CouponUsage` row); auto-deactivates when `usageCount` reaches `usageLimit`
  - `computeCartTotals` reads tax from `SiteSetting("tax.percent")`; tax applies on the post-discount subtotal
  - Storefront `/cart` page: promo code input, "applied coupon" pill with remove
  - Admin: `/dashboard/coupons` list (paginated, searchable, activate/deactivate, delete) + `/dashboard/coupons/create` and `/dashboard/coupons/[id]` form
  - Supports: percentage / fixed, min order, max discount cap, per-user + total usage limits, start/end dates, first-order-only, product / category restrictions
  - `scripts/smoke-coupons.ps1` — full end-to-end (admin create → list → customer validate → apply → checkout with discount → usageCount++ + auto-deactivate → depleted rejected → 2nd order without coupon OK → deactivated rejected)
- **Phase 4 (reviews + wishlist + content + support):**
  - **Reviews**: customer `POST /api/reviews` requires a non-cancelled order containing the product; new review is auto-verified (buyer) and held for moderation. Admin `PATCH /api/admin/reviews/:id/moderate` toggles `isApproved` / `isFeatured` / `isVerified`. Public list + summary (avg + per-star breakdown) only return approved reviews.
  - **Wishlist**: `POST /api/wishlist/items` is idempotent; `GET /api/wishlist/items/:productId` is a fast check; `DELETE` removes. Storefront heart on every product image (PDP + grids), `/account/wishlist` page for the full list.
  - **Content**: `Banner` and `Page` models fully CRUD'd from `/dashboard/content`. Public `GET /api/content/banners` returns active banners (position-ordered, time-windowed); `GET /api/content/pages/:slug` returns a published page. Storefront renders banners on `/` and shows the WhatsApp button from the public settings endpoint.
  - **Public settings**: `GET /api/settings` returns only `isPublic = true` rows; `social.whatsapp` is the seed-defined public key. No auth, no leak of internal settings.
  - `scripts/smoke-phase4.ps1` — reviews (purchase-gated, pending-vs-public, moderation, non-buyer rejected) + wishlist (add/list/check/remove) + content (admin CRUD → public visibility) + public settings (contains `social.whatsapp`)
- [ ] `SslCommerzPaymentProvider` (paid) — env keys already reserved; see `docs/SETTLEMENTS.md` for the exact 4-step drop-in
- [ ] `PathaoCourierProvider` / `SteadfastCourierProvider` / `RedxCourierProvider` (paid) — see `docs/SETTLEMENTS.md`
- [ ] `RETURN_REQUESTED → RETURNED → REFUNDED` transitions (state-machine stub already there)

### Phase 4 — Reviews, Support, Content (Day 22-28)

- [x] Verified reviews with photos (`images: string[]` accepted, displayed as thumbnails)
- [x] Wishlist (heart on PDP + `/account/wishlist` page; backend uses `WishlistItem` table)
- [x] WhatsApp support button (floating; reads `social.whatsapp` from the public settings endpoint)
- [x] Homepage content management (admin CRUD for `Banner` + `Page` rows at `/dashboard/content`; storefront renders active banners on `/`)

### Phase 5 — Launch (Day 29-35)

- [ ] GA4, GTM, Meta Pixel
- [ ] SEO (sitemap, structured data)
- [ ] Admin reports & dashboard
- [ ] Email templates
- [ ] Performance optimization
- [ ] Production deployment

## Blocked / Waiting On

- **SSLCommerz merchant account** — Apply at sslcommerz.com. Takes 1-7 days. Blocks Phase 3.5 online payment integration. COD is the priority and works without this.
- **Pathao/Steadfast/RedX merchant accounts** — Courier partners. Need accounts before Phase 3.5.
- **Brand assets** — Logo, final color palette (using #0F4C5C as default teal, changeable from admin).

## Service Architecture — Provider Contracts (all free, swappable)

Every paid or SaaS dependency is hidden behind a tiny interface. The default
implementation is free and in-process; swapping to a paid alternative is a
one-file change (the factory). No call site, controller, UI, or schema needs
to change.

| Concern      | Free default (today)                             | Optional adapter (later)                                                            | Contract file                                          |
| ------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Email        | `FileEmailProvider` → local JSON                 | `ResendEmailProvider` (HTTP)                                                        | `apps/backend/src/modules/email/provider.ts`           |
| Search       | `PostgresSearchProvider` (ILIKE)                 | Meilisearch / Algolia / Typesense                                                   | `apps/backend/src/modules/search/provider.ts`          |
| Asset upload | `LocalAssetProvider` → disk                      | Cloudinary / S3 / R2                                                                | `apps/backend/src/modules/assets/provider.ts`          |
| Error track  | `PinoErrorReporter` → stdout JSON                | Sentry / Bugsnag / Rollbar                                                          | `apps/backend/src/modules/error-reporting/provider.ts` |
| Payment      | `CodPaymentProvider` (free, COD only)            | `SslCommerzPaymentProvider` (paid)                                                  | `apps/backend/src/modules/payments/provider.ts`        |
| Courier      | `ManualCourierProvider` (admin-entered tracking) | `PathaoCourierProvider` / `SteadfastCourierProvider` / `RedxCourierProvider` (paid) | `apps/backend/src/modules/couriers/provider.ts`        |

**Email today:** No third-party setup required. Every email is written to
`./emails-outbox/<timestamp>__<tag>__<to>.json` (gitignored). OTP codes are
visible on disk in dev. Set `RESEND_API_KEY=...` to flip to real email —
zero code changes; the factory picks the right impl at startup.

**Search today:** Postgres-native (slug + tags, case-insensitive). Zero
extra process. Up to a few thousand SKUs, perfectly fine.

**Errors today:** Structured JSON to stdout, ready for the host's log
collector (CloudWatch, Loki, Datadog free tier, etc).

**Why this matters:** We're not paying anyone a single taka to operate the
app until it makes money. Adding Sentry or Meilisearch later is one
factory line, not a refactor.

## Decisions Log

See [DECISIONS.md](DECISIONS.md) for full architectural decisions.

## Next Action

Phase 4 done. Reviews (verified, moderated, public summary), wishlist, content
CRUD (banners + pages), and the WhatsApp support button are all live. The
storefront reads brand colors and social handles from a new public settings
endpoint. Next: Phase 5 — launch (GA4 / GTM / Meta Pixel, SEO sitemap,
production deploy).
