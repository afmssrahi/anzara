# For Developers

This is the guide for engineers working on the codebase. It assumes you've
read [`GETTING-STARTED.md`](GETTING-STARTED.md) and have the three apps
running locally.

---

## Architecture in one diagram

```
┌──────────────────┐   ┌──────────────────┐
│  storefront      │   │  admin           │
│  (Next.js)       │   │  (Next.js)       │
│  localhost:3000  │   │  localhost:3001  │
└────────┬─────────┘   └────────┬─────────┘
         │                       │
         │  HTTP (JSON)          │
         │  via @anzara/api-client
         │                       │
         └───────────┬───────────┘
                     ▼
            ┌──────────────────┐
            │  backend         │
            │  (Express.js)    │
            │  localhost:4000  │
            └────────┬─────────┘
                     │ Prisma
                     ▼
            ┌──────────────────┐
            │  PostgreSQL      │
            └──────────────────┘
```

Three independent processes. They share **types and validation schemas** but
nothing else. The backend owns the database; the two frontends never touch
it directly.

---

## The monorepo layout (what's in each folder)

```
apps/
  backend/
    src/
      modules/         ← one folder per feature (auth, products, cart, …)
        auth/
          routes.ts    ← HTTP layer (URLs, middleware, validation)
          controller.ts← request → response
          service.ts   ← business logic
          repository.ts← DB queries
          validators.ts← Zod request schemas
        products/…     ← same pattern
        cart/…         ← same pattern
        ...
      middleware/      ← auth, rate limit, error handling
      lib/             ← response helpers, async wrapper
      app.ts           ← Express setup
      routes.ts        ← top-level router (mounts each module)
      server.ts        ← the actual `node` entry point

  storefront/  (Next.js App Router)
    src/
      app/             ← file-based routes
        page.tsx       ← /
        products/      ← /products, /products/[slug]
        cart/          ← /cart
        checkout/      ← /checkout
        account/       ← /account, /account/wishlist, …
        orders/        ← /orders, /orders/[id]
        (auth)/        ← /login, /register, /forgot-password, …
      components/      ← React components (used in routes)
      lib/
        api.ts         ← thin re-export of @anzara/api-client

  admin/  (Next.js App Router)
    src/
      app/
        page.tsx       ← / (redirects to /dashboard)
        dashboard/     ← /dashboard + every section (products, orders, …)
      components/      ← admin-only UI
      lib/
        api.ts         ← thin re-export of @anzara/api-client
        auth-store.ts  ← zustand store for the admin auth state

packages/
  database/             ← prisma/schema.prisma + generated client
  shared-types/         ← TypeScript types (Product, Order, etc.)
  ui/                   ← reusable React components (Button, Input, …)
  config/               ← env validation, brand constants
  validators/           ← Zod schemas (shared between backend + forms)
  api-client/           ← typed wrapper around the backend HTTP API
```

---

## The "one feature, one folder" rule

Every feature in the backend lives in `apps/backend/src/modules/<feature>/`
and looks like this:

```
modules/<feature>/
  routes.ts         ← defines the URLs, attaches middleware, calls controllers
  controller.ts     ← thin: parses the request, calls the service, formats the response
  service.ts        ← business logic (no req/res objects, no DB queries)
  repository.ts     ← Prisma queries (no req/res, no business logic)
  validators.ts     ← Zod schemas for request bodies / params / queries
  index.ts          ← re-exports the public bits (the router, the service)
```

**The rule that matters most:** a controller never queries the database
directly. It calls the service. The service calls the repository. This keeps
each layer testable and replaceable.

A new feature should add one folder in `modules/`, one line in
`routes.ts` (to mount the router), and that's it.

---

## How a request flows

Take `GET /api/products` as an example:

1. **Express** receives the request in `app.ts`.
2. **Middleware** runs: `requestLogger`, `cors`, `helmet`, etc.
3. **Top-level router** (`routes.ts`) sees `/api/products` and forwards to
   `productsRouter`.
4. **`products/routes.ts`** matches `GET /` and runs the `validate()` Zod
   middleware, then hands off to `productsController.list`.
5. **`productsController.list`** is a 3-liner: it calls
   `productsService.list(filters)`, then sends the result.
6. **`productsService.list`** turns the validated filters into a Prisma
   `where` clause, calls `productsRepository.list`.
7. **`productsRepository.list`** is a 2-line Prisma query.

That's the whole pipeline. If you ever need to add a step (e.g. "also
include the customer's wishlist status"), you do it in the service.

---

## "I want to add a feature" — the recipe

Let's say you want to add a "loyalty points" feature where customers earn
points for each order. Here's exactly what you touch:

### 1. Database

Add a `LoyaltyPoint` model to `packages/database/prisma/schema.prisma`:

```prisma
model LoyaltyPoint {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  orderId   String?
  order     Order?   @relation(fields: [orderId], references: [id])
  points    Int
  reason    String
  createdAt DateTime @default(now())
}
```

Then run: `pnpm db:migrate -- --name add_loyalty_points`.

### 2. Shared types (optional, only if the frontend needs to read them)

Add to `packages/shared-types/src/loyalty.ts`:

```typescript
export interface LoyaltyPoint {
  id: string;
  userId: string;
  orderId: string | null;
  points: number;
  reason: string;
  createdAt: string;
}
```

Export it from `packages/shared-types/src/index.ts`.

### 3. Backend module

Create `apps/backend/src/modules/loyalty/`:

- `repository.ts` — `prisma.loyaltyPoint.findMany`, `prisma.loyaltyPoint.create`
- `service.ts` — `getBalance(userId)`, `awardPoints(userId, orderId, points)`
- `controller.ts` — `async getBalance(req, res) { sendSuccess(res, await service.getBalance(req.user.id)) }`
- `routes.ts` — `loyaltyRouter.get('/balance', requireAuth, …)`
- `index.ts` — `export { loyaltyRouter } from './routes'`

Mount in `apps/backend/src/routes.ts`:

```typescript
apiRouter.use('/loyalty', loyaltyRouter);
```

### 4. Wire it into the order flow

In `apps/backend/src/modules/orders/service.ts`, after a successful order
placement, call `loyaltyService.awardPoints(userId, orderId, points)`.

### 5. API client

Add a `loyalty.ts` file in `packages/api-client/src/` with a `createLoyaltyClient`
factory, following the pattern in `packages/api-client/src/wishlist.ts`.

Export from `packages/api-client/src/index.ts`.

### 6. Frontend (storefront)

In `apps/storefront/src/lib/api.ts`, instantiate the client:

```typescript
export const loyalty = createLoyaltyClient({ api });
```

Use it in a page or component:

```typescript
const balance = await loyalty.getBalance();
```

### 7. Verify

```powershell
pnpm type-check
pnpm lint
pnpm build
```

You're done. The whole feature in 5-6 files.

---

## Conventions

### TypeScript

- `strict: true` everywhere. No `any` unless it's truly unknown and you
  comment why.
- Prefer `unknown` over `any` for inputs.
- Use `interface` for object shapes, `type` for unions/aliases.

### File size

- Aim for < 150 lines per file. If a file is bigger, split it.
- One responsibility per file. If a file's name has "and" in it, split it.

### Validation

- All request input is validated with Zod via the `validate()` middleware.
- Schemas live in `validators.ts` next to the route. Reuse them from forms
  in the frontend (parse the same schema on the client too).

### Errors

- All controllers throw, they don't manually `res.status(400).json(...)`.
- The global `errorHandler` middleware turns thrown errors into the
  standard `{ success: false, error: { code, message, details } }` shape.

### Money

- All money is stored as **integer paisa** (1 BDT = 100 paisa). Never floats.
- Format with the shared `formatBDT` helper from `@anzara/ui`.

### Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- One logical change per commit. Don't mix a refactor with a feature.
- Push to `main` after every commit. CI runs on every push.

### Code style

- Prettier + ESLint are enforced. Run `pnpm format` before committing.
- The repo's default quote style is single quotes for TS/TSX.

---

## The "swappable provider" pattern

Every paid / external dependency in this app is hidden behind a tiny
interface. The default implementation is free and in-process. Swapping to a
paid alternative is a **one-file change** in a `factory.ts`.

| Concern      | Free default             | Easy upgrade path         |
| ------------ | ------------------------ | ------------------------- |
| Email        | Local file outbox        | Resend, SES, Postmark     |
| Search       | Postgres ILIKE           | Meilisearch, Algolia      |
| Image upload | Local disk               | Cloudinary, S3            |
| Errors       | JSON to stdout           | Sentry                    |
| Payment      | Cash on delivery         | SSLCommerz, Stripe, bKash |
| Couriers     | Manual tracking in admin | Pathao, Steadfast, RedX   |

If you ever need to add a new concern (say, SMS), follow the same pattern:

1. Define an interface in `<concern>/provider.ts`.
2. Write the free default.
3. Write a `factory.ts` that picks an implementation based on env vars.
4. Use the factory everywhere; never import a concrete provider.

---

## Testing

The project doesn't have unit tests yet (it's on the roadmap). The
substitute is the **smoke test scripts** in `scripts/`:

- `smoke-phase3.ps1` — cart, checkout, orders
- `smoke-phase4.ps1` — reviews, wishlist, content, WhatsApp
- `smoke-phase5.ps1` — SEO, analytics, dashboard

Each script is a sequence of HTTP calls that exercise the happy path of
that phase's features. They exit non-zero on first failure. Run them after
every meaningful change.

### Try it in the browser — Swagger UI

For ad-hoc exploration of any endpoint, open the **live Swagger UI**:

```
http://localhost:4000/api/docs
```

- **70 operations** across 24 tags, all generated from `@openapi` JSDoc
  comments above each route declaration.
- Use the **Authorize** button (or just hit any login endpoint first) to
  set the cookies; subsequent "Try it out" calls will send them
  automatically.
- The raw spec is at `http://localhost:4000/api/docs.json` (handy for
  importing into Postman, Insomnia, or generating client SDKs).
- `/api/docs` is **disabled in production** for security — it's a dev
  tool, not a public API portal.

If you add a new route, add a `@openapi` JSDoc block right above the
declaration and the spec updates on the next restart. The base schema
catalog lives in `apps/backend/src/docs/openapi.ts`; add new reusable
schemas there so endpoints can `$ref` them.

---

## Useful things to know

### How authentication works

1. Customer logs in via `POST /api/auth/login` → backend returns two
   httpOnly cookies: `accessToken` (15 min) and `refreshToken` (7 days).
2. The frontend's `@anzara/api-client` sends both cookies automatically
   (CORS configured for the two frontends).
3. When the access token expires, the client calls
   `POST /api/auth/refresh` to get a new one. The user never sees this.

Admin auth is the same pattern but separate routes (`/api/auth/admin/login`)
and separate cookies (`adminAccessToken`, `adminRefreshToken`).

### How admin permissions work

Every admin user has a `roleId`. Each role has a set of `permissionKey`s
(e.g. `product:create`, `order:view`). Routes use `requirePermission('product:create')`
middleware; the user gets a 403 if their role doesn't have it. The seeded
admin user has the `OWNER` role which has all permissions.

### How money works at the boundary

- DB stores `Int` paisa.
- API returns `{ amount: number, currency: 'BDT' }` (`Money` type).
- The frontend displays via `formatBDT(amount)` which divides by 100 and
  uses `Intl.NumberFormat` with the Bengali locale.
- Input forms take a whole-taka value, multiply by 100 on submit.

### How images work

- Uploaded via `POST /api/assets` (admin only). Returns `{ url, publicId }`.
- Stored on local disk at `/uploads/` by default.
- Product images are a many-to-many-ish relation: each `Product` has many
  `ProductImage` rows with `position` for ordering.
- The store renders them via `next/image` with `sizes` set per layout.

---

## Common debugging recipes

**"The backend says 500 on a route I just changed"**
Check the terminal where `pnpm dev` is running — the error stack is printed
there. The frontend only sees `{"success": false, "error": {"code": "INTERNAL_ERROR"}}`.

**"My new endpoint isn't found (404)"**

- Did you add it to the module's `routes.ts`? (`router.get(...)` etc.)
- Did you mount the module's router in `apps/backend/src/routes.ts`?
  (`apiRouter.use('/namespace', namespaceRouter)`)
- Did you restart the backend? (`tsx watch` should do it automatically, but
  sometimes the watcher dies. Check the terminal.)

**"I get 401 even though I just logged in"**
The auth cookies are httpOnly, so the browser shows them in DevTools →
Application → Cookies. If they're missing, check CORS — the backend
must be configured to send them for the storefront's origin.

**"Prisma client doesn't see my new model"**
After editing `schema.prisma`, run `pnpm db:generate` (or `pnpm --filter
@anzara/database prisma generate`). TypeScript won't see the new types
until you do.

**"The storefront or admin won't build"**
Run `pnpm type-check` to see which file broke. Usually it's a missing
import or a type you forgot to add to `shared-types`.

**"A module's seed isn't loading"**
The seed runs from `packages/database/prisma/seed.ts`. If you added a new
field to a seeded model, you may need to add it to the seed too.

---

## What to read next

- [`API.md`](API.md) — every endpoint
- [`DECISIONS.md`](DECISIONS.md) — the "why" behind the architecture
- [`PROJECT-STATUS.md`](PROJECT-STATUS.md) — what's built, what's next
