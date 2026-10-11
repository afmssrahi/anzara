# For Admin Users

A friendly guide to the **admin dashboard** at http://localhost:3001
(or https://admin.your-domain.com in production). This is the tool your
staff uses to run the day-to-day business.

You don't need any technical background for this. If you can use a
spreadsheet and a chat app, you can use the admin.

---

## Logging in

Open http://localhost:3001 in your browser. You'll see the login form.

- **Email**: your admin email (the one you were given)
- **Password**: the password you were given
- For local development, the seeded admin is: `admin@anzara.com` / `AnzaraAdmin@2026`

> **Tip:** If your admin user has 2FA enabled, you'll also need your authenticator
> app's 6-digit code.

You'll stay logged in for a week. If you log out and back in, the
dashboard will remember where you were.

---

## The dashboard home (`/dashboard`)

This is what you see after logging in. It's the place to glance at
"how's the business doing today" without clicking anything.

| Card                  | What it means                                                   |
| --------------------- | --------------------------------------------------------------- |
| **Orders today**      | How many orders came in since midnight (UTC)                    |
| **Revenue (30 days)** | Total money taken from non-cancelled orders in the last 30 days |
| **Pending reviews**   | Customer reviews waiting for you to approve or reject           |
| **Low stock items**   | Product variants at or below their low-stock threshold          |

Below the cards, two lists:

- **Recent orders** — the last 5 orders. Click one to open it.
- **Low stock** — top 5 variants that are running out. Click a product name to edit it.

---

## Products

The bread and butter. Every item the storefront sells lives here.

**Path:** `/dashboard/products`

### What you'll see

A list of every product with: name, status (`Draft` / `Published` / `Archived`),
price, stock total, and a thumbnail. Use the search box and filters at
the top to narrow it down.

### Creating a new product

1. Click **+ New product** in the top right.
2. Fill in the basics:
   - **Name (EN, BN)** — the product name in English and Bangla.
   - **Slug** — the URL the product will live at. Auto-generated from
     the name; you can edit it. Lowercase, hyphens, no spaces. Example: `linen-eid-borka`.
   - **Category** — pick one. (Categories are managed separately at `/dashboard/categories`.)
   - **Collections** — pick any number. (Collections are managed at `/dashboard/collections`.)
   - **Base price (BDT)** — whole taka. The system stores paisa; the form does the conversion.
   - **Short description (EN, BN)** — 1-2 sentences shown in product cards.
   - **Description (EN, BN)** — the full product page body.
3. Add at least one **variant** (size, color, stock quantity, price).
4. Add at least one **image**. Drag-and-drop to reorder; the first image
   is the storefront thumbnail.
5. Set **status** to `Published` to make it visible on the storefront.
6. Click **Save**.

### Editing a product

Click any product in the list. The same form opens, pre-filled.
Make your changes and click **Save**. Changes are live immediately —
no need to "republish."

### Archiving a product

You can change status to `Archived`. Archived products are hidden from
the storefront but kept in the database (so past orders still make sense).
You can change it back to `Published` any time.

### Bulk operations

Select multiple products using the checkboxes, then choose an action from
the **Bulk actions** dropdown (Publish / Unpublish / Archive / Delete).

> **Tip:** Don't delete a product that has orders attached. Archive it instead.
> Deleting removes the record entirely; orders would then show "Unknown product."

---

## Categories

**Path:** `/dashboard/categories`

Categories are the top-level groupings the customer browses
("Abayas", "Hijabs", "Borkas", "Accessories").

- Each category has a name, a slug, and a position number (lower = shown first).
- Toggling **Active** off hides the category from the storefront without
  deleting it. Use this for "seasonal" categories you might bring back.

---

## Collections

**Path:** `/dashboard/collections`

Collections are cross-category groupings. A "Summer Picks" collection might
contain a dress from "Abayas" and a hijab from "Hijabs" and a borka from
"Borkas".

- Each collection has a name, a slug, an optional hero image, and a list
  of products in it.
- They're used on the storefront's `/collections/<slug>` pages.

---

## Orders

**Path:** `/dashboard/orders`

This is where you spend most of your day.

### The list view

Every order ever placed, newest first. You'll see:

- **Order number** — unique, e.g. `ANZ-20261012-0042`
- **Customer name** + email
- **Total** — including shipping and any discount
- **Status badge** — colored pill
- **Created at** — the date the customer placed the order

Click a row to open the order detail.

### The order detail page

Everything about that one order:

- **Customer info** — name, email, phone
- **Shipping address** — with a "copy" button
- **Line items** — what they bought, how many, the price per unit
- **Totals** — subtotal, shipping, discount, final total
- **Status history** — every status change with timestamp and who did it
- **Order notes** — internal notes (not visible to the customer)
- **Shipment** — courier, tracking number, status (added when you ship it)

### Changing an order's status

In the top right of the order detail, click **Update status** and pick one:

| Status       | When to use                                             |
| ------------ | ------------------------------------------------------- |
| `PENDING`    | Just placed; not yet confirmed                          |
| `CONFIRMED`  | You've checked stock + payment, ready to pack           |
| `PROCESSING` | Being packed right now                                  |
| `SHIPPED`    | Out the door with the courier (set tracking number too) |
| `DELIVERED`  | Customer received it                                    |
| `CANCELLED`  | Customer cancelled before shipping                      |
| `FAILED`     | Could not deliver (returned to you)                     |
| `RETURNED`   | Customer returned it after delivery                     |

> Every status change **automatically sends an email** to the customer
> (in production). In local development, the email is written to the
> `emails-outbox/` folder so you can see it without SMTP.

### Issuing a refund / cancellation

For `PENDING` orders, the customer can cancel themselves. For others, you
set the status to `CANCELLED` or `RETURNED`. The system doesn't take
payment back automatically — do that in your payment provider's dashboard
if needed.

---

## Coupons

**Path:** `/dashboard/coupons`

Discount codes. Use them for marketing campaigns ("EID2026", "FREESHIP",
etc.) or to compensate a customer for a bad experience.

### Creating a coupon

1. Click **+ New coupon**.
2. Fill in:
   - **Code** — what the customer types at checkout. Case-insensitive, no spaces.
   - **Type** — `Percentage` (% off) or `Fixed amount` (৳ off).
   - **Value** — the percentage (e.g. `10` for 10% off) or the taka amount.
   - **Minimum order** — only apply if cart is over this much.
   - **Max uses** — leave blank for unlimited, or set a number.
   - **Starts at / Ends at** — when the coupon is valid. Leave blank for "always."
   - **Per-customer limit** — usually 1.
3. Save.

### A coupon that's not working

- Check the dates — is it currently within the validity window?
- Check "max uses" — has it been redeemed too many times already?
- Check the cart total — is it over the minimum order?
- Check the customer's history — has this person already used it (if per-customer limit is 1)?

---

## Reviews

**Path:** `/dashboard/reviews`

When a customer leaves a review on a product, it shows up here as
`Pending`. You decide whether to:

- **Approve** — review appears on the product page
- **Reject** — review is hidden (kept in DB for audit)
- **Feature** — review shows up at the top of the product's reviews list
- **Delete** — review is permanently removed

Only customers who actually bought the product can leave a review
(verified-buyer). That stops fake reviews.

---

## Content

**Path:** `/dashboard/content`

Two sub-pages: **Banners** and **Pages**.

### Banners

The big images on the storefront home page. Add one with:

- Image (upload)
- Title
- Subtitle (optional)
- CTA text + link (e.g. "Shop now →" pointing to /products)
- Order (1, 2, 3 — shown left-to-right)
- Active toggle (off = hidden, kept for later)

### Pages

Custom CMS pages. Use these for "About us", "Terms & Conditions",
"Privacy Policy", "Shipping info", etc.

- Each page has English + Bangla content
- A page's URL is `/pages/<slug>`
- Toggle `Published` to make it live; unpublish to hide without deleting

---

## Settings

**Path:** `/dashboard/settings`

The place to change store-wide things that aren't products or orders.

There are several groups of settings:

- **Brand** — name, logo, primary color
- **Contact** — email, phone
- **Social** — Facebook, Instagram, WhatsApp URLs (WhatsApp drives the floating button on the storefront)
- **Analytics** — your Google Analytics 4, Google Tag Manager, and Meta Pixel IDs (when you fill these in, the corresponding tracking scripts appear on the storefront automatically — no developer needed)
- **Couriers** — manual tracking until you plug in a real provider
- **Payments** — payment methods enabled (currently cash on delivery)

> Each setting row has a **Public** toggle. Turn it on if the value
> should be sent to the storefront (e.g. WhatsApp number for the floating
> button). Turn it off for things only the admin should see (e.g. a
> future SMTP password).

---

## Common workflows

### "I just received a new order. What now?"

1. The order appears under **Orders** with status `PENDING`.
2. Check the customer's address, phone, and what they bought.
3. If everything looks right, click **Update status** → `CONFIRMED`.
   The customer gets an email.
4. Pack the order.
5. When the courier picks it up, set status to `SHIPPED` and fill in
   the **tracking number** + **courier name** in the Shipment section.
   The customer gets another email with the tracking info.
6. When delivery is confirmed, set status to `DELIVERED`.

### "A customer emailed me asking for a discount"

1. Create a single-use coupon for them: code = their name, value = 10%,
   max uses = 1, valid for 7 days.
2. Email the code back to them. They'll type it at checkout.

### "A review is spam"

1. Go to **Reviews** → find it.
2. Click **Reject** (keeps the record, hides it) or **Delete** (removes it).

### "We're running an Eid sale"

1. Create a coupon: code = `EID2026`, type = percentage, value = 15.
2. Set start/end dates around Eid.
3. Optional: create a banner on the home page linking to `/products`
   with copy like "Eid Sale — 15% off with code EID2026".
4. The day after Eid ends, deactivate the banner and disable the coupon.

---

## Things to be careful about

- **Don't delete products that have orders** — archive them instead.
  Otherwise past orders will show "Unknown product" on the customer's
  order history.
- **Change the default admin password** before anyone outside your team
  touches the system. The seeded password is for local dev only.
- **The "Public" toggle on a setting** decides whether the storefront
  sees it. Don't mark things public unless they really should be public.
- **Reviews are public the moment you approve them** — there's no draft
  state. If a review is borderline, leave it `Pending` and discuss with
  your team.

---

## Who to ask for help

- **Something on the storefront looks broken** → ask a developer, share
  the URL and a screenshot.
- **Something in the admin won't save / errors out** → ask a developer,
  share what you clicked and the error message.
- **You need a new feature** (e.g. "I want to schedule a flash sale") →
  ask a developer. This is documented in
  [`FOR-DEVELOPERS.md`](FOR-DEVELOPERS.md).
- **You're about to do something destructive in production** (delete a
  product, run a migration, change a setting everyone depends on) →
  check [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md) first.
