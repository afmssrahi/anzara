# Production Deployment Checklist

Use this list before pushing to a live host. The project is a three-app
Next.js monorepo (storefront, admin, backend) plus a shared Postgres DB.

## 1. Environment

- [ ] `NODE_ENV=production` in backend
- [ ] `APP_URL` is the **public** storefront URL (https)
- [ ] `ADMIN_URL` is the **public** admin URL (https)
- [ ] `API_URL` is the **public** API URL (https) — used by sitemap.xml links
- [ ] `DATABASE_URL` points to the production DB; same for `DIRECT_URL` if used
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` rotated, 64+ chars random
- [ ] `SMTP_*` set to the real transactional mail provider
- [ ] `CORS_ORIGINS` lists only the public storefront + admin origins

## 2. Database

- [ ] `pnpm --filter @anzara/database prisma migrate deploy` ran cleanly
- [ ] Seed data only if this is a fresh DB (`pnpm --filter @anzara/database seed`)
- [ ] Backups enabled on the host (managed Postgres recommended)

## 3. Build

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm type-check` (9/9 packages)
- [ ] `pnpm lint` (9/9 packages)
- [ ] `pnpm format:check`
- [ ] `pnpm build` (3 apps)
- [ ] `pnpm --filter @anzara/database prisma generate`

## 4. SEO (free with this build)

- [ ] `https://<API>/sitemap.xml` returns 200 and lists published products / categories / collections / pages
- [ ] `https://<API>/robots.txt` returns 200, points at the sitemap, and disallows `/admin/` and `/api/`
- [ ] Storefront serves Organization + WebSite JSON-LD on the root layout
- [ ] PDPs serve Product + BreadcrumbList JSON-LD (verify with Google's [Rich Results Test](https://search.google.com/test/rich-results))
- [ ] Each page has a unique `<title>` and `<meta description>` (template: `%s · Anzara`)

Submit sitemap to: Google Search Console, Bing Webmaster Tools.

## 5. Analytics (opt-in, no code change)

Analytics is driven by the `SiteSetting` model. To turn on any vendor
without a redeploy, add these to the admin → Settings page and set
`isPublic: true` on each row:

| Key                           | Example           |
| ----------------------------- | ----------------- |
| `analytics.ga4.measurementId` | `G-XXXXXXXXXX`    |
| `analytics.gtm.containerId`   | `GTM-XXXXXXX`     |
| `analytics.meta.pixelId`      | `123456789012345` |

If both GA4 and GTM are set, GTM wins (GTM is the standard pattern for
deploying GA4 from a tag manager). The Meta Pixel is independent.

Verify by viewing page source on a public route: the corresponding
`<script>` snippet should be present in `<head>`.

## 6. Backups / uptime

- [ ] Uptime monitor on `/api/health` (or `/health` on backend)
- [ ] Uptime monitor on storefront root
- [ ] Uptime monitor on admin root
- [ ] Daily DB snapshot
- [ ] Outbound SMTP sandbox tested (place a test order, verify email arrives)
- [ ] WhatsApp number verified in the floating button on storefront

## 7. Security

- [ ] All public origins are https
- [ ] `helmet` is on by default — leave it on
- [ ] `TRUST_PROXY` is set to the **exact** number of proxy hops (Render/Cloudflare/Vercel) so rate limits use real client IPs
- [ ] Rate limits in `packages/api-client` middleware still apply (`/api/auth/*` is throttled)
- [ ] Admin 2FA enabled for at least the `OWNER` role
- [ ] SMTP-from address is a real mailbox that won't get spoofed
- [ ] DB credentials are not in any env file committed to the repo

## 8. Smoke (run after deploy)

```bash
# Backend
curl -fsS https://<API>/health
curl -fsS https://<API>/sitemap.xml | head -20
curl -fsS https://<API>/robots.txt
# Storefront
curl -fsSI https://<STORE>/    # 200
curl -fsS  https://<STORE>/products | grep -o '<title>[^<]*</title>'
# Admin
curl -fsSI https://<ADMIN>/    # 200
```

Place a real test order from storefront, log into admin, confirm:

- Order appears in `/dashboard/orders`
- Status transition emails arrive
- Low-stock counter on `/dashboard` updates
- Pending reviews counter on `/dashboard` updates (log in as customer, leave a review)

## 9. Rollback

- DB: keep the previous schema tagged (`prisma migrate` is forward-only; the rollback is a forward fix in a new migration)
- Apps: redeploy the previous Docker image / commit

## 10. Post-launch

- Submit `https://<STORE>/sitemap.xml` to Google Search Console
- Set up Google Analytics / GTM conversion events for `purchase`
  (Meta Pixel tracks `PageView` automatically on init; add a `Purchase`
  event on the order-confirmation page once you have real conversions)
- Add 2FA for any new admin accounts you create
