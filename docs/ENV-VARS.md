# Environment Variables

This document lists every env var the project reads and what it's used for.
The schema is enforced by `packages/config/src/env.ts` and the app fails to
boot if a required var is missing.

> The `Zod` schema is the source of truth. If you change this doc but
> not the schema, the schema wins.

## Where each app reads `.env`

| App               | Loads                        | Notes                                  |
| ----------------- | ---------------------------- | -------------------------------------- |
| `apps/backend`    | `apps/backend/.env`          | also reads repo-root `.env` via turbo  |
| `apps/storefront` | `apps/storefront/.env.local` | only `NEXT_PUBLIC_*` exposed to client |
| `apps/admin`      | `apps/admin/.env.local`      | only `NEXT_PUBLIC_*` exposed to client |

## Core

| Var         | Required | Default                 | Notes                                                            |
| ----------- | -------- | ----------------------- | ---------------------------------------------------------------- |
| `NODE_ENV`  | no       | `development`           | `production` enables trust-proxy-aware rate limits + strict CORS |
| `APP_NAME`  | no       | `Anzara`                | shown in emails + metadata                                       |
| `APP_URL`   | no       | `http://localhost:3000` | **storefront** public URL (used for SEO canonicals, emails)      |
| `ADMIN_URL` | no       | `http://localhost:3001` | **admin** public URL                                             |
| `API_URL`   | no       | `http://localhost:4000` | **backend** public URL (used by sitemap.xml)                     |
| `PORT`      | no       | `4000`                  | backend listen port                                              |

## Database

| Var                   | Required | Default | Notes                                  |
| --------------------- | -------- | ------- | -------------------------------------- |
| `DATABASE_URL`        | yes      | —       | Postgres connection string             |
| `DATABASE_DIRECT_URL` | no       | —       | direct (non-pooled) URL for migrations |

## Auth

| Var                  | Required | Default | Notes                                    |
| -------------------- | -------- | ------- | ---------------------------------------- |
| `JWT_ACCESS_SECRET`  | yes      | —       | 64+ chars, random                        |
| `JWT_REFRESH_SECRET` | yes      | —       | 64+ chars, random, different from access |
| `JWT_ACCESS_EXPIRY`  | no       | `15m`   | e.g. `15m`, `1h`                         |
| `JWT_REFRESH_EXPIRY` | no       | `7d`    | e.g. `7d`, `30d`                         |
| `BCRYPT_ROUNDS`      | no       | `12`    | password hashing work factor             |
| `TRUST_PROXY`        | no       | `1`     | proxy hops; set to the real hop count    |

## CORS

| Var            | Required | Default             | Notes           |
| -------------- | -------- | ------------------- | --------------- |
| `CORS_ORIGINS` | no       | `APP_URL,ADMIN_URL` | comma-separated |

## Mail (transactional)

| Var             | Required | Default | Notes                         |
| --------------- | -------- | ------- | ----------------------------- |
| `SMTP_HOST`     | no       | —       | e.g. `smtp.resend.com`        |
| `SMTP_PORT`     | no       | `587`   |                               |
| `SMTP_SECURE`   | no       | `false` | `true` for port 465           |
| `SMTP_USER`     | no       | —       |                               |
| `SMTP_PASSWORD` | no       | —       |                               |
| `SMTP_FROM`     | no       | —       | `"Anzara <hello@anzara.com>"` |
| `EMAIL_ENABLED` | no       | `false` | set `true` to actually send   |

## Uploads

| Var                     | Required | Default   | Notes                           |
| ----------------------- | -------- | --------- | ------------------------------- |
| `UPLOAD_PROVIDER`       | no       | `local`   | `local` or `cloudinary`         |
| `UPLOAD_DIR`            | no       | `uploads` | local-only                      |
| `CLOUDINARY_CLOUD_NAME` | no       | —         | required if provider=cloudinary |
| `CLOUDINARY_API_KEY`    | no       | —         |                                 |
| `CLOUDINARY_API_SECRET` | no       | —         |                                 |

## Payments

| Var                      | Required | Default  | Notes                       |
| ------------------------ | -------- | -------- | --------------------------- |
| `PAYMENT_PROVIDER`       | no       | `manual` | `manual` (cash-on-delivery) |
| `PAYMENT_PUBLIC_KEY`     | no       | —        |                             |
| `PAYMENT_SECRET_KEY`     | no       | —        |                             |
| `PAYMENT_WEBHOOK_SECRET` | no       | —        |                             |

## Couriers

| Var                  | Required | Default  | Notes                             |
| -------------------- | -------- | -------- | --------------------------------- |
| `COURIER_PROVIDER`   | no       | `manual` | `manual` (no API; track in admin) |
| `COURIER_API_KEY`    | no       | —        |                                   |
| `COURIER_API_SECRET` | no       | —        |                                   |

## Storefront / Admin (Next.js)

| Var                   | Required   | Default                 | Notes                                                    |
| --------------------- | ---------- | ----------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | yes (apps) | `http://localhost:4000` | storefront + admin use this to call the API              |
| `APP_URL`             | no         | `http://localhost:3000` | duplicates `APP_URL` above; used in server-side metadata |

## Operational

| Var                 | Required | Default | Notes                               |
| ------------------- | -------- | ------- | ----------------------------------- |
| `LOG_LEVEL`         | no       | `info`  | `debug` / `info` / `warn` / `error` |
| `RATE_LIMIT_MAX`    | no       | `100`   | window size for default rate limit  |
| `RATE_LIMIT_WINDOW` | no       | `1m`    | e.g. `1m`, `15m`                    |

## Notes

- `NEXT_PUBLIC_*` is the only prefix inlined into client bundles. Keep
  secrets out of it.
- The schema does not currently allow empty strings for `DATABASE_URL`.
  Use a real connection string even in CI.
- `TRUST_PROXY=0` disables proxy-trust (rate limit sees the proxy IP).
  Only use that for local dev behind nothing.
