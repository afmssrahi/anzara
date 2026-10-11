# API Reference

The backend is a single REST API at `http://localhost:4000`. Every
endpoint is namespaced under `/api/...` (plus a few non-API endpoints
for SEO at the root: `/sitemap.xml`, `/robots.txt`, `/health`).

If you're a frontend dev, you almost certainly want the typed client
in [`packages/api-client/`](../packages/api-client) instead of calling
the API directly. This reference is for backend work, debugging, and
the occasional ad-hoc test.

---

## Conventions

### Base URL

```
http://localhost:4000   (local dev)
https://api.your-domain.com   (production)
```

### Response shape

Every response is JSON in one of two shapes:

**Success:**

```json
{
  "success": true,
  "data": <payload>
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is invalid",
    "details": { "field": "email" }
  }
}
```

### Status codes

| Code | Meaning in this API                                             |
| ---- | --------------------------------------------------------------- |
| 200  | OK (GET, PATCH)                                                 |
| 201  | Created (POST that creates a resource)                          |
| 204  | No content (rare)                                               |
| 400  | Validation failed — check `error.details`                       |
| 401  | Not logged in / token expired                                   |
| 403  | Logged in but doesn't have permission                           |
| 404  | Not found                                                       |
| 409  | Conflict (e.g. duplicate SKU)                                   |
| 422  | Business rule violation (e.g. trying to cancel a shipped order) |
| 429  | Rate limited                                                    |
| 500  | Bug. Check the backend logs.                                    |

### Auth

Three patterns, depending on the endpoint:

- **Public** — no auth needed. The storefront uses these.
- **Customer** — needs a customer access token (httpOnly cookie `accessToken`).
- **Admin** — needs an admin access token (httpOnly cookie `adminAccessToken`).
  Some admin endpoints additionally require a specific permission (e.g. `product:create`).

You usually don't set these cookies by hand — you log in via `/api/auth/login`
or `/api/auth/admin/login` and the server sets the cookies. For testing
with curl, pass `--cookie-jar cookies.txt --cookie cookies.txt` to persist
them across calls.

### Pagination

List endpoints return paginated responses:

```json
{
  "items": [...],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

Query params: `?page=1&limit=20&sort=-createdAt`.

### Money

All amounts in **integer paisa**. 1 BDT = 100 paisa. So 1500 = ৳15.00.
The response shape is always `{ "amount": 1500, "currency": "BDT" }`.

---

## Endpoints

The list is grouped by the same namespaces the URL uses. Click a group
to expand it.

---

### Health & SEO

| Method | Path           | Auth   | Purpose                                 |
| ------ | -------------- | ------ | --------------------------------------- |
| GET    | `/health`      | public | Liveness check. Returns `{status:"ok"}` |
| GET    | `/sitemap.xml` | public | XML sitemap for search engines          |
| GET    | `/robots.txt`  | public | Robots policy                           |

`/sitemap.xml` lists every published product, active category, active
collection, and published CMS page. `/robots.txt` points at the sitemap
and (in production only) disallows `/admin/` and `/api/`.

---

### Auth — `/api/auth`

| Method | Path                        | Auth     | Purpose                             |
| ------ | --------------------------- | -------- | ----------------------------------- |
| POST   | `/api/auth/register`        | public   | Create a customer account           |
| POST   | `/api/auth/login`           | public   | Customer login                      |
| POST   | `/api/auth/admin/login`     | public   | Admin login                         |
| POST   | `/api/auth/refresh`         | any      | Exchange refresh token for new pair |
| POST   | `/api/auth/logout`          | any      | Clear cookies                       |
| GET    | `/api/auth/me`              | customer | Get the current customer profile    |
| PATCH  | `/api/auth/profile`         | customer | Update name / phone / email prefs   |
| POST   | `/api/auth/change-password` | customer | Change password                     |
| POST   | `/api/auth/forgot-password` | public   | Request a password reset email      |
| POST   | `/api/auth/reset-password`  | public   | Submit new password with token      |
| POST   | `/api/auth/otp/request`     | public   | Request a phone OTP                 |
| POST   | `/api/auth/otp/verify`      | public   | Verify a phone OTP                  |
| POST   | `/api/auth/2fa/setup`       | admin    | Generate a 2FA TOTP secret          |
| POST   | `/api/auth/2fa/enable`      | admin    | Enable 2FA after verifying a code   |
| POST   | `/api/auth/2fa/disable`     | admin    | Disable 2FA                         |

**Request bodies** (selected):

`POST /api/auth/register`:

```json
{
  "email": "rashida@example.com",
  "password": "Hunter2!aaa",
  "firstName": "Rashida",
  "lastName": "Khan",
  "phone": "+8801712345678"
}
```

`POST /api/auth/login`:

```json
{ "email": "rashida@example.com", "password": "Hunter2!aaa" }
```

`POST /api/auth/admin/login`:

```json
{ "email": "admin@anzara.com", "password": "AnzaraAdmin@2026", "totp": "123456" }
```

(`totp` is required only if 2FA is enabled for the user.)

---

### Products — `/api/products`

| Method | Path                     | Auth   | Purpose                               |
| ------ | ------------------------ | ------ | ------------------------------------- |
| GET    | `/api/products`          | public | List products (paginated, filterable) |
| GET    | `/api/products/featured` | public | Featured products                     |
| GET    | `/api/products/:slug`    | public | Get one product by slug               |

**Query params for `GET /api/products`:**

| Param          | Type     | Notes                                   |
| -------------- | -------- | --------------------------------------- |
| `page`         | number   | Default 1                               |
| `limit`        | number   | Default 20, max 100                     |
| `sort`         | string   | `name`, `-name`, `-createdAt` (default) |
| `status`       | string   | `DRAFT` / `PUBLISHED` / `ARCHIVED`      |
| `categoryId`   | string   |                                         |
| `collectionId` | string   |                                         |
| `inStock`      | boolean  | Only show products with stock > 0       |
| `minPrice`     | number   | paisa                                   |
| `maxPrice`     | number   | paisa                                   |
| `sizes`        | string[] | e.g. `?sizes=M&sizes=L`                 |
| `colors`       | string[] | e.g. `?colors=Black&colors=Beige`       |
| `search`       | string   | Search name / description / tags        |
| `isFeatured`   | boolean  |                                         |

**Example:**

```bash
curl 'http://localhost:4000/api/products?categoryId=abayas&inStock=true&sort=-createdAt&limit=12'
```

---

### Categories — `/api/categories`

| Method | Path                    | Auth   | Purpose                  |
| ------ | ----------------------- | ------ | ------------------------ |
| GET    | `/api/categories`       | public | List active categories   |
| GET    | `/api/categories/:slug` | public | Get one category by slug |

---

### Collections — `/api/collections`

| Method | Path                     | Auth   | Purpose                    |
| ------ | ------------------------ | ------ | -------------------------- |
| GET    | `/api/collections`       | public | List active collections    |
| GET    | `/api/collections/:slug` | public | Get one collection by slug |

---

### Reviews — `/api/reviews`

| Method | Path                                       | Auth     | Purpose                               |
| ------ | ------------------------------------------ | -------- | ------------------------------------- |
| GET    | `/api/reviews/products/:productId`         | public   | List approved reviews for a product   |
| GET    | `/api/reviews/products/:productId/summary` | public   | Average rating + count for a product  |
| POST   | `/api/reviews`                             | customer | Create a review (verified-buyer only) |
| PATCH  | `/api/reviews/:id`                         | customer | Update your own review                |
| DELETE | `/api/reviews/:id`                         | customer | Delete your own review                |

**`POST /api/reviews` body:**

```json
{
  "productId": "ckxxx...",
  "rating": 5,
  "title": "Beautiful fabric",
  "comment": "The cotton is soft and the color is exactly as shown.",
  "images": ["https://..."]
}
```

> You can only review products you've actually ordered. The server checks this.

---

### Content (public) — `/api/content`

| Method | Path                       | Auth   | Purpose                                       |
| ------ | -------------------------- | ------ | --------------------------------------------- |
| GET    | `/api/content/banners`     | public | List currently-active banners (time-windowed) |
| GET    | `/api/content/pages/:slug` | public | Get one published page by slug                |

---

### Public settings — `/api/settings` and `/api/public/settings`

| Method | Path                   | Auth   | Purpose                                                  |
| ------ | ---------------------- | ------ | -------------------------------------------------------- |
| GET    | `/api/settings/public` | public | Public site settings (brand, social, contact, analytics) |

> The exact path may be `/api/public/settings` or `/api/settings/public`
> depending on the version. Either way, only `isPublic=true` rows are returned.

The response is a flat object of key/value pairs:

```json
{
  "brand.name": "Anzara",
  "brand.primaryColor": "#0F4C5C",
  "social.whatsapp": "+8801711111111",
  "contact.email": "hello@anzara.com",
  "analytics.ga4.measurementId": "G-XXXXX"
}
```

---

### Cart — `/api/cart`

| Method | Path                      | Auth     | Purpose                   |
| ------ | ------------------------- | -------- | ------------------------- |
| GET    | `/api/cart`               | customer | Get the current cart      |
| POST   | `/api/cart/items`         | customer | Add a variant to the cart |
| PATCH  | `/api/cart/items/:itemId` | customer | Update quantity           |
| DELETE | `/api/cart/items/:itemId` | customer | Remove one item           |
| DELETE | `/api/cart`               | customer | Clear the cart            |
| POST   | `/api/cart/coupon`        | customer | Apply a coupon code       |
| DELETE | `/api/cart/coupon`        | customer | Remove the applied coupon |

**`POST /api/cart/items` body:**

```json
{
  "variantId": "ckxxx...",
  "quantity": 2
}
```

> Stock is reserved when you add an item and held for 15 minutes
> (`CART_RESERVATION_MINUTES`). If the cart sits idle longer than that,
> the stock is released and the cart might show "out of stock" on refresh.

---

### Addresses — `/api/addresses`

| Method | Path                 | Auth     | Purpose             |
| ------ | -------------------- | -------- | ------------------- |
| GET    | `/api/addresses`     | customer | List your addresses |
| GET    | `/api/addresses/:id` | customer | Get one address     |
| POST   | `/api/addresses`     | customer | Create an address   |
| PATCH  | `/api/addresses/:id` | customer | Update an address   |
| DELETE | `/api/addresses/:id` | customer | Delete an address   |

**`POST /api/addresses` body:**

```json
{
  "label": "Home",
  "fullName": "Rashida Khan",
  "phone": "+8801712345678",
  "addressLine1": "House 12, Road 7",
  "addressLine2": "Block C",
  "city": "Dhaka",
  "district": "Dhaka",
  "division": "Dhaka",
  "postalCode": "1207",
  "country": "BD",
  "isDefault": true
}
```

---

### Orders — `/api/orders`

| Method | Path                     | Auth     | Purpose                            |
| ------ | ------------------------ | -------- | ---------------------------------- |
| POST   | `/api/orders`            | customer | Place an order (from your cart)    |
| GET    | `/api/orders`            | customer | List your own orders               |
| GET    | `/api/orders/:id`        | customer | Get one of your orders             |
| POST   | `/api/orders/:id/cancel` | customer | Cancel your own order (if PENDING) |

**`POST /api/orders` body:**

```json
{
  "addressId": "ckxxx...",
  "paymentMethod": "COD",
  "notes": "Please call before delivery"
}
```

The server reads the current cart, snapshots the items + prices, decrements
stock, and applies any coupon. The response is the created `Order` with
`orderNumber` and the cart is cleared.

---

### Wishlist — `/api/wishlist`

| Method | Path                             | Auth     | Purpose                                                         |
| ------ | -------------------------------- | -------- | --------------------------------------------------------------- |
| GET    | `/api/wishlist`                  | customer | Your wishlist                                                   |
| POST   | `/api/wishlist/items`            | customer | Add a product                                                   |
| DELETE | `/api/wishlist/items/:productId` | customer | Remove a product                                                |
| GET    | `/api/wishlist/items/:productId` | customer | Check if a product is in your wishlist (used by the heart icon) |

**`POST /api/wishlist/items` body:**

```json
{ "productId": "ckxxx..." }
```

> Adding a product that's already in your wishlist is a no-op (idempotent).

---

### Coupons (customer) — `/api/coupons`

| Method | Path                    | Auth     | Purpose                                |
| ------ | ----------------------- | -------- | -------------------------------------- |
| POST   | `/api/coupons/validate` | customer | Check if a code is valid for your cart |

**`POST /api/coupons/validate` body:**

```json
{
  "code": "EID2026",
  "cartTotal": 450000
}
```

**Response:**

```json
{
  "valid": true,
  "coupon": {
    "code": "EID2026",
    "type": "PERCENTAGE",
    "value": 15
  },
  "discount": 67500
}
```

---

### Payments — `/api/payments`

| Method | Path                    | Auth   | Purpose                                 |
| ------ | ----------------------- | ------ | --------------------------------------- |
| GET    | `/api/payments/methods` | public | List enabled payment methods + currency |

**Response:**

```json
{
  "methods": [{ "id": "COD", "label": "Cash on Delivery", "provider": "cod" }],
  "currency": "BDT"
}
```

> When SSLCommez is configured, additional methods appear here automatically.

---

### Assets — `/api/assets`

| Method | Path          | Auth  | Purpose                                    |
| ------ | ------------- | ----- | ------------------------------------------ |
| POST   | `/api/assets` | admin | Upload an image. Returns `{url, publicId}` |

`POST /api/assets` is a `multipart/form-data` upload with one `file` field.
Local default: stored under `/uploads/` on the backend. Cloudinary when
configured.

---

### Admin — `/api/admin/*`

Every admin endpoint requires a logged-in admin. Some need a specific
permission (e.g. `product:create`); a 403 means the role doesn't have it.

#### Products — `/api/admin/products`

| Method | Path                      | Permission       | Purpose                         |
| ------ | ------------------------- | ---------------- | ------------------------------- |
| GET    | `/api/admin/products`     | `product:view`   | List all (incl drafts/archived) |
| GET    | `/api/admin/products/:id` | `product:view`   | Get one                         |
| POST   | `/api/admin/products`     | `product:create` | Create                          |
| PATCH  | `/api/admin/products/:id` | `product:update` | Update                          |
| DELETE | `/api/admin/products/:id` | `product:delete` | Delete (use with care)          |

**`POST /api/admin/products` body (abridged):**

```json
{
  "slug": "new-product",
  "name": { "en": "New Product", "bn": "নতুন পণ্য" },
  "description": { "en": "...", "bn": "..." },
  "basePrice": { "amount": 150000, "currency": "BDT" },
  "categoryId": "ckxxx...",
  "collectionIds": ["ckxxx..."],
  "images": [{ "url": "https://...", "alt": "front", "position": 0 }],
  "variants": [
    {
      "sku": "ANZ-NEW-M",
      "size": "M",
      "color": "Beige",
      "price": 150000,
      "stockQuantity": 12,
      "lowStockThreshold": 3
    }
  ],
  "status": "PUBLISHED",
  "isFeatured": false
}
```

#### Categories — `/api/admin/categories`

| Method | Path                        | Permission | Purpose  |
| ------ | --------------------------- | ---------- | -------- |
| GET    | `/api/admin/categories`     | (admin)    | List all |
| POST   | `/api/admin/categories`     | (admin)    | Create   |
| PATCH  | `/api/admin/categories/:id` | (admin)    | Update   |
| DELETE | `/api/admin/categories/:id` | (admin)    | Delete   |

#### Collections — `/api/admin/collections`

| Method | Path                         | Permission | Purpose  |
| ------ | ---------------------------- | ---------- | -------- |
| GET    | `/api/admin/collections`     | (admin)    | List all |
| POST   | `/api/admin/collections`     | (admin)    | Create   |
| PATCH  | `/api/admin/collections/:id` | (admin)    | Update   |
| DELETE | `/api/admin/collections/:id` | (admin)    | Delete   |

#### Orders — `/api/admin/orders`

| Method | Path                             | Permission     | Purpose                              |
| ------ | -------------------------------- | -------------- | ------------------------------------ |
| GET    | `/api/admin/orders`              | `order:view`   | List all orders                      |
| GET    | `/api/admin/orders/:id`          | `order:view`   | Get one                              |
| PATCH  | `/api/admin/orders/:id/status`   | `order:update` | Change status (sends customer email) |
| PATCH  | `/api/admin/orders/:id/shipment` | `order:update` | Set courier + tracking number        |
| POST   | `/api/admin/orders/:id/notes`    | `order:update` | Add an internal note                 |

**`PATCH /api/admin/orders/:id/status` body:**

```json
{
  "status": "SHIPPED",
  "reason": "Out for delivery"
}
```

#### Coupons — `/api/admin/coupons`

| Method | Path                     | Permission      | Purpose |
| ------ | ------------------------ | --------------- | ------- |
| GET    | `/api/admin/coupons`     | `coupon:view`   | List    |
| GET    | `/api/admin/coupons/:id` | `coupon:view`   | Get one |
| POST   | `/api/admin/coupons`     | `coupon:manage` | Create  |
| PATCH  | `/api/admin/coupons/:id` | `coupon:manage` | Update  |
| DELETE | `/api/admin/coupons/:id` | `coupon:manage` | Delete  |

#### Reviews — `/api/admin/reviews`

| Method | Path                              | Permission        | Purpose                           |
| ------ | --------------------------------- | ----------------- | --------------------------------- |
| GET    | `/api/admin/reviews`              | `review:moderate` | List all (with `?status=pending`) |
| PATCH  | `/api/admin/reviews/:id/moderate` | `review:moderate` | Approve / reject / feature        |
| DELETE | `/api/admin/reviews/:id`          | `review:moderate` | Delete                            |

**`PATCH /api/admin/reviews/:id/moderate` body:**

```json
{ "isApproved": true, "isFeatured": true }
```

#### Content — `/api/admin/content`

| Method | Path                             | Permission | Purpose            |
| ------ | -------------------------------- | ---------- | ------------------ |
| GET    | `/api/admin/content/banners`     | (admin)    | List all banners   |
| POST   | `/api/admin/content/banners`     | (admin)    | Create a banner    |
| GET    | `/api/admin/content/banners/:id` | (admin)    | Get one banner     |
| PATCH  | `/api/admin/content/banners/:id` | (admin)    | Update a banner    |
| DELETE | `/api/admin/content/banners/:id` | (admin)    | Delete a banner    |
| GET    | `/api/admin/content/pages`       | (admin)    | List all CMS pages |
| POST   | `/api/admin/content/pages`       | (admin)    | Create a page      |
| GET    | `/api/admin/content/pages/:id`   | (admin)    | Get one page       |
| PATCH  | `/api/admin/content/pages/:id`   | (admin)    | Update a page      |
| DELETE | `/api/admin/content/pages/:id`   | (admin)    | Delete a page      |

#### Settings — `/api/admin/settings`

| Method | Path                  | Permission        | Purpose                     |
| ------ | --------------------- | ----------------- | --------------------------- |
| GET    | `/api/admin/settings` | `settings:view`   | List all settings           |
| PUT    | `/api/admin/settings` | `settings:update` | Upsert one or many settings |

**`PUT /api/admin/settings` body:**

```json
{
  "items": [
    { "key": "social.whatsapp", "value": "+8801711111111", "isPublic": true },
    { "key": "analytics.ga4.measurementId", "value": "G-XXXXX", "isPublic": true }
  ]
}
```

#### Dashboard — `/api/admin/dashboard`

| Method | Path                   | Permission    | Purpose                        |
| ------ | ---------------------- | ------------- | ------------------------------ |
| GET    | `/api/admin/dashboard` | `report:view` | Today's KPIs + recent activity |

**Response:**

```json
{
  "ordersToday": 24,
  "revenueLast30Days": { "total": 2450500, "count": 22 },
  "pendingReviews": 4,
  "lowStockCount": 5,
  "lowStockItems": [ { "variantId": "...", "sku": "...", "stockQuantity": 1, "lowStockThreshold": 3, "product": {...} } ],
  "recentOrders": [ {...} ]
}
```

---

## Error codes

| Code               | HTTP | When                                         |
| ------------------ | ---- | -------------------------------------------- |
| `VALIDATION_ERROR` | 400  | Zod schema failed (check `details.field`)    |
| `UNAUTHORIZED`     | 401  | No / bad / expired token                     |
| `FORBIDDEN`        | 403  | Logged in but not allowed                    |
| `NOT_FOUND`        | 404  | URL or resource not found                    |
| `CONFLICT`         | 409  | e.g. duplicate email, duplicate SKU          |
| `UNPROCESSABLE`    | 422  | Business rule (e.g. cancel a shipped order)  |
| `RATE_LIMITED`     | 429  | Too many requests — slow down                |
| `INTERNAL_ERROR`   | 500  | Server-side bug. Backend logs have the stack |

---

## Tips for testing

### Using the smoke test scripts

The `scripts/smoke-phase*.ps1` files exercise the API end-to-end. Run one
and it walks through the happy path of that phase's features. Exits
non-zero on first failure.

### Using curl with cookies

```bash
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@anzara.com","password":"Customer@2026"}'

# Subsequent calls automatically send the cookies
curl -b cookies.txt http://localhost:4000/api/cart
```

### Using the typed client

If you have a Node REPL and the project is installed:

```typescript
import { products, auth, cart } from '@anzara/api-client';

const { customer } = await auth.login({
  email: 'customer@anzara.com',
  password: 'Customer@2026',
});
const myCart = await cart.get();
```

---

## Versioning

There is no API version in the URL today. Breaking changes are called out
in commit messages and the [changelog](CHANGELOG.md) (when one exists).
The frontend and backend are deployed together, so they're always in sync.
