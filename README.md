# Anzara

> Premium modest fashion e-commerce platform for Bangladesh.

A modular, scalable e-commerce system built with Next.js, Express.js, TypeScript, Prisma, and PostgreSQL.

## Architecture

```
anzara/
├── apps/
│   ├── storefront/        Customer-facing website (Next.js)
│   ├── admin/             Admin dashboard (Next.js)
│   └── backend/           REST API server (Express.js)
├── packages/
│   ├── database/          Prisma schema + client
│   ├── shared-types/      TypeScript types, DTOs, enums
│   ├── ui/                Reusable React components
│   ├── config/            Env validation, constants
│   └── validators/        Zod schemas
├── docs/
│   ├── PROJECT-STATUS.md  Progress tracking
│   ├── DECISIONS.md       Architecture decision log
│   └── API.md             API documentation
└── .github/workflows/     CI
```

## Quick start

Prerequisites: Node.js 20+, pnpm 9+, PostgreSQL 15+, Redis 7+.

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Setup database
pnpm db:generate
pnpm db:migrate

# Run all apps in development
pnpm dev
```

Apps will be available at:
- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- Backend API: http://localhost:4000

## Documentation

- [Project Status](docs/PROJECT-STATUS.md) - Where we are in the build
- [Decisions Log](docs/DECISIONS.md) - Why we picked what we picked
- [API Reference](docs/API.md) - REST API endpoints

## Code conventions

- TypeScript strict mode
- No file over 150 lines
- Modular: each feature is a self-contained module
- ESLint + Prettier enforced
- Conventional commits
- Tests co-located with source

## License

Private - All rights reserved.
