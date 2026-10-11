# Anzara - Architecture Decision Log

A chronological record of significant decisions, with context and rationale.

---

## D-001: Monorepo with pnpm workspaces + Turborepo

**Date:** 2026-10-11
**Status:** Accepted
**Context:** Need to share TypeScript types, validation schemas, and Prisma client between storefront, admin, and backend. Each app must be deployable independently.

**Decision:** Use pnpm workspaces with Turborepo for build orchestration. Three apps (`storefront`, `admin`, `backend`) and five shared packages (`database`, `shared-types`, `ui`, `config`, `validators`).

**Consequences:**
- Single `pnpm install` for the whole monorepo
- Shared types are type-safe across the stack
- Each app can be deployed independently
- Slight learning curve for Turborepo caching

---

## D-002: Separate backend (Express) from frontends (Next.js)

**Date:** 2026-10-11
**Status:** Accepted
**Context:** SRS specifies Express.js backend. Next.js can host its own API routes, but the requirement is for clear separation between frontend and backend, and for the backend to be independently scalable.

**Decision:** Keep Express.js backend as a separate service. Next.js frontends (`storefront`, `admin`) call the Express API over HTTP. No Next.js API routes for business logic (only for static BFF optimizations if needed later).

**Consequences:**
- Clear separation of concerns
- Backend can be scaled independently of frontends
- Two deploys, two processes, two sets of secrets
- More network hops than BFF pattern, but easier to reason about

---

## D-003: File size cap of 150 lines per file

**Date:** 2026-10-11
**Status:** Accepted
**Context:** User requirement for clean, manageable, readable code. Long files become hard to test, refactor, and review.

**Decision:** No file may exceed 150 lines. If a file grows beyond this, it must be split. Enforced via code review and ESLint rules (warning at 150, error at 200).

**Consequences:**
- More files, but each has a single responsibility
- Easier code review (small diffs)
- Forces good decomposition
- Slight overhead when navigating between files

---

## D-004: Modular feature structure in backend

**Date:** 2026-10-11
**Status:** Accepted
**Context:** User requirement for modular architecture. Each feature should be self-contained and replaceable.

**Decision:** Backend organized as `src/modules/<feature>/`. Each module has its own `routes.ts`, `controller.ts`, `service.ts`, `repository.ts`, `validators.ts`, `index.ts`. Modules communicate only through shared `database` and `shared-types` packages — never directly between modules.

**Consequences:**
- Feature isolation
- Easy to extract a module into a microservice later
- Clear ownership boundaries
- Slight boilerplate per module (mitigated by code generators later)

---

## D-005: Brand color stored in database, editable from admin

**Date:** 2026-10-11
**Status:** Accepted
**Context:** User requirement to change brand color from dashboard without code changes.

**Decision:** Theme tokens (primary, accent, neutral colors) stored in a `site_settings` table with a `theme` group. Admin dashboard has a "Theme" settings page that writes to this table. Frontend reads theme on every page load via a small server component that injects CSS variables.

**Consequences:**
- No code deploy for color changes
- Cache theme with short TTL (60s) to avoid DB hammering
- Frontend renders with a fallback theme while loading

---

## D-006: COD as priority payment method

**Date:** 2026-10-11
**Status:** Accepted
**Context:** User stated COD is the priority. Most BD e-commerce orders are COD.

**Decision:** Build COD as a first-class payment method with its own workflow. SSLCommerz integration (cards, bKash, Nagad) is built in parallel but COD is fully functional from launch. COD orders have a special "Awaiting Confirmation" state that requires admin phone confirmation before fulfillment.

**Consequences:**
- Launch is not blocked by SSLCommerz approval
- Admin has an extra step for COD orders (intentional - reduces fake orders)
- Can add SSLCommerz without changing order flow

---

## D-007: Pluggable courier provider

**Date:** 2026-10-11
**Status:** Accepted
**Context:** User has not chosen a courier provider yet. The system must not be coupled to any specific provider.

**Decision:** Courier integration is a `CourierProvider` interface with a `ManualProvider` implementation as default. Admin can add real provider implementations later (Steadfast, Pathao, etc.) without changing order management code. Shipment tracking is stored generically (tracking number + status + history) regardless of provider.

**Consequences:**
- No blocking decision on courier
- Can launch with manual tracking
- Adding a real provider is a contained change

---

## D-008: Bilingual content (English + Bengali)

**Date:** 2026-10-11
**Status:** Accepted
**Context:** Bangladesh market. Bengali is the primary language for the majority of customers. Anzaar competitor audit showed Anzaar uses BN/AR mix.

**Decision:** All customer-facing content (product names, descriptions, UI strings) supports EN and BN. Stored as JSON columns or related `translations` tables. Default to BN if user locale is `bn`, else EN. User can toggle via header.

**Consequences:**
- Larger content entry burden (each product needs 2 names + 2 descriptions)
- Higher conversion for BN-literate customers
- Better SEO for Bengali search queries

---

## D-009: No SMS, use email + WhatsApp

**Date:** 2026-10-11
**Status:** Accepted
**Context:** User decision to skip SMS for now.

**Decision:** OTP via email (Resend). Order notifications via email + optional WhatsApp Business link. SMS can be added later as a pluggable provider without changing the notification module.

**Consequences:**
- Lower operating cost
- Customers without email can still order (OTP can be replaced by admin-issued link)
- WhatsApp Business API can be added when needed

---

## D-010: Tech stack final

**Date:** 2026-10-11
**Status:** Accepted

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 App Router + TypeScript | SSR/ISR, modern, great DX |
| Styling | Tailwind CSS + shadcn/ui | Themeable, fast |
| Backend | Express.js + TypeScript | Per SRS |
| ORM | Prisma | Type-safe, migrations |
| DB | PostgreSQL 15+ | Per SRS |
| Validation | Zod | Shared FE/BE schemas |
| Auth | JWT (access + refresh) in HttpOnly cookies | Stateless, scalable |
| Email | Resend | Modern, simple |
| Media | Cloudinary | Free tier, transformations |
| Cache | Redis (Upstash) | Sessions, rate limit |
| Search | Meilisearch | Fast, free tier (added Phase 2) |
| Errors | Sentry | Free tier |
| CI | GitHub Actions | Free |
| Hosting | Vercel (FE) + Railway (BE+DB) | TBD before launch |
