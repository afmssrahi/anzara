# Settlements — adding payment + courier providers

When a merchant account lands (SSLCommerz, Pathao, Steadfast, RedX), this
is the exact change set. No service / controller / UI / schema work is
required — every settlement rail is hidden behind a one-file contract +
factory entry.

> **Why a one-file drop-in matters:** while you don't have a merchant
> account, the app must still work end-to-end. The "manual" / "cod"
> defaults let you ship Phase 3 today without paying anyone. Adding
> SSLCommerz tomorrow is a half-day, not a refactor.

---

## 1. Payment provider (SSLCommerz / bKash / Nagad / Card)

### File to add: `apps/backend/src/modules/payments/sslcommerz-provider.ts`

```ts
import type { Prisma } from '@prisma/client';
import { getEnv } from '@anzara/config';
import { BadRequestError } from '../../lib/errors';
import type { PaymentProvider, PaymentMethodContext } from './provider';

export const sslcommerzProvider: PaymentProvider = {
  id: 'sslcommerz',
  validateMethod() {
    /* nothing extra */
  },
  async onOrderPlaced(ctx, tx) {
    // Open an SSLCommerz session, persist the gateway transactionId on
    // the Payment row so the success/fail callbacks can match it.
    const env = getEnv();
    const session = await fetch('https://sandbox.sslcommerz.com/gwprocess/v4/api.php', {
      method: 'POST',
      // ... build form body from env + ctx ...
    }).then((r) => r.json());
    if (session.status !== 'SUCCESS') {
      throw new BadRequestError('Payment gateway unavailable');
    }
    await tx.payment.update({
      where: { id: ctx.paymentId },
      data: { transactionId: session.sessionkey, status: 'AWAITING_REDIRECT' },
    });
  },
  async onOrderCancelled(ctx, reason) {
    // Tell SSLCommerz to void the session.
  },
  async onOrderDelivered(ctx, tx) {
    // Mark VERIFIED; or trigger refund if the customer returned the goods.
  },
};
```

### File to edit: `apps/backend/src/modules/payments/factory.ts`

```ts
import { sslcommerzProvider } from './sslcommerz-provider';

export const ENABLED_PAYMENT_METHODS = ['COD', 'SSLCOMMERZ'] as const;

const REGISTRY = {
  COD: codPaymentProvider,
  SSLCOMMERZ: sslcommerzProvider, // ← one line
};
```

### File to edit: `apps/backend/src/modules/payments/routes.ts`

```ts
const LABEL = {
  COD: 'Cash on Delivery',
  SSLCOMMERZ: 'Online payment (cards / bKash / Nagad / Rocket)',
};
```

### File to edit: `packages/shared-types/src/order.ts`

```ts
export type PaymentMethod = 'COD' | 'SSLCOMMERZ'; // already includes the rest
```

### Env to add (apps/backend):

```
SSLCOMMERZ_STORE_ID=…
SSLCOMMERZ_STORE_PASSWORD=…
SSLCOMMERZ_IS_LIVE=false   # sandbox first
```

### What happens automatically

- Storefront's `/checkout` page calls `GET /api/payments/methods` and
  renders the new radio button — zero UI change.
- Orders service calls `getPaymentProvider('SSLCOMMERZ')` at placement
  time; the provider opens a session inside the same transaction.
- `Payment` row gets a `transactionId` that the success/fail callbacks
  can match on.
- Adding `SSLCOMMERZ` to `ENABLED_PAYMENT_METHODS` is the only flip that
  exposes the method to the storefront.

### Tests to add

- `scripts/smoke-sslcommerz.ps1` (mirrors `smoke-payments.ps1`):
  - GET `/api/payments/methods` now returns 2 methods.
  - POST `/api/orders` with `SSLCOMMERZ` returns 201 with
    `payment.transactionId` set.

---

## 2. Courier provider (Pathao / Steadfast / RedX)

### File to add: `apps/backend/src/modules/couriers/pathao-provider.ts`

```ts
import { getEnv } from '@anzara/config';
import type { CourierProvider, DispatchContext, DispatchResult } from './provider';

export const pathaoProvider: CourierProvider = {
  id: 'pathao',
  label: 'Pathao',
  async dispatchOrder(ctx, { notes }): Promise<DispatchResult> {
    const env = getEnv();
    // 1. Get an auth token from the Pathao merchant API
    // 2. POST /aladdin/api/v1/orders with the shipment details
    // 3. Return { trackingNumber: consignment_id, externalId: order_id }
    return { trackingNumber: '…', externalId: '…' };
  },
  async cancelDispatch(_ctx, _reason) {
    // Call the Pathao cancel endpoint
  },
};
```

### File to edit: `apps/backend/src/modules/couriers/factory.ts`

```ts
import { pathaoProvider } from './pathao-provider';

export const ENABLED_COURIER_PROVIDERS = ['manual', 'pathao'] as const;

const REGISTRY = {
  manual: manualCourierProvider,
  pathao: pathaoProvider, // ← one line
};
```

### Env to add (apps/backend):

```
PATHAO_CLIENT_ID=…
PATHAO_CLIENT_SECRET=…
PATHAO_BASE_URL=https://api-hermes.pathao.com  # or production URL
```

### What happens automatically

- Admin order detail "Provider" dropdown reads
  `listCourierProviders()` and shows the new option.
- When admin sets the shipment to SHIPPED, the order service calls the
  selected provider's `dispatchOrder`; on success the returned
  `trackingNumber` is persisted to the Shipment row and a ShipmentEvent
  is appended.
- Webhook routes for Pathao status updates land in the same
  `couriers/` module (a thin Express router).

### Tests to add

- `scripts/smoke-pathao.ps1`:
  - Provider list returns `['manual', 'pathao']`.
  - Mock-mode dispatch (env flag) returns a fake tracking number and
    persists it to the Shipment row.

---

## 3. Tracking webhook + reconciliation

`apps/backend/src/modules/couriers/webhooks.ts` is a thin router that
maps gateway callbacks onto `OrderStatusChange` + `ShipmentEvent`. Each
provider implements its own signature verification. The contract is
small:

```ts
// POST /api/couriers/webhooks/pathao
//   body: { consignment_id, status, event_time }
//   -> resolves to { orderId, shipmentId } via the external_id column
//   -> inserts a ShipmentEvent + auto-advances the order status
```

This is a new file in the same module; no other code changes.

---

## 4. What is NOT needed for any of the above

- No DB migration.
- No `package.json` change (HTTP calls use the standard `fetch`).
- No UI work — the storefront / admin renders whatever the registry
  returns.
- No new env var prefix conventions — each provider reads its own
  config from the env via `getEnv()`.

---

## 5. The complete list of files involved for the next provider drop-in

For **any** new payment or courier provider, this is the entire diff:

1. **New file** in `apps/backend/src/modules/{payments,couriers}/`
2. **One line** in `apps/backend/src/modules/{payments,couriers}/factory.ts`
3. **One label entry** in `apps/backend/src/modules/{payments,couriers}/routes.ts`
4. **Env vars** in `apps/backend/.env.example`
5. **One new smoke script** in `scripts/`

That's the whole change. The orders module never grows; the storefront
and admin never grow; the schema never changes.
