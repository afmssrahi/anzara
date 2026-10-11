# Anzara - Project Status

Last updated: 2026-10-11

## Overview

Premium modest fashion e-commerce platform for Bangladesh.
Customer storefront + Admin dashboard + Express backend, all separate, all modular.

## Current Phase

**Phase 0 — Foundation** (in progress)

## Verified working

- Postgres 15 installed natively on Windows, database `anzara_dev` created
- Redis (Memurai) installed natively, responding to PING
- Prisma migration applied: 36 tables created
- Seed completed: 1 SUPER_ADMIN, 21 permissions, 4 system roles, 6 default categories, 4 collections, 22 default settings
- Backend starts on port 4000, `/health` returns 200
- `POST /api/auth/register` returns JWT (verified end-to-end with real customer creation)
- `POST /api/auth/admin/login` returns SUPER_ADMIN with all 21 permissions and JWT

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

## Phase Status

### Phase 0 — Foundation (Day 1-3)
- [x] Monorepo structure (pnpm workspaces + Turborepo)
- [x] Root package.json with shared scripts
- [x] .gitignore, .env.example, README
- [x] Shared TypeScript config
- [x] Shared ESLint + Prettier config
- [x] Database package (Prisma schema)
- [ ] Docker Compose for local Postgres + Redis
- [ ] CI workflow (GitHub Actions)
- [ ] Git init + first commit
- [ ] Create apps/storefront, apps/admin, apps/backend scaffolds
- [ ] Create packages: database, shared-types, ui, config, validators

### Phase 1 — Authentication (Day 4-7)
- [ ] Customer registration, login, OTP (email)
- [ ] Admin login with 2FA
- [ ] Role + permission system
- [ ] Audit logging
- [ ] Bilingual foundation (EN + BN)
- [ ] Session management + rate limiting

### Phase 2 — Products (Day 8-14)
- [ ] Admin product CRUD with variants
- [ ] Cloudinary integration
- [ ] Customer: PLP with filters
- [ ] Customer: PDP with size guide
- [ ] Predictive search (Meilisearch)
- [ ] Wishlist
- [ ] SEO per product

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
- **GitHub repo access** — https://github.com/afmssrahi/anzara.git
- **Brand assets** — Logo, final color palette (using #0F4C5C as default teal, changeable from admin)

## Decisions Log

See [DECISIONS.md](DECISIONS.md) for full architectural decisions.

## Next Action

Continue Phase 0: create shared configs and package scaffolds.
