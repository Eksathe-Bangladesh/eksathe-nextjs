# EKsathe Bangladesh

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.5-black?logo=nextdotjs)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.1-149eca?logo=react)](https://react.dev/)
[![Bun 1.4](https://img.shields.io/badge/Bun-1.4.4-f9f1e1?logo=bun)](https://bun.sh/)
[![Prisma 7](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma)](https://www.prisma.io/)

EKsathe is a bilingual service platform for discovering agriculture and
construction services in Bangladesh. Customers can find providers, make service
requests, manage orders and projects, and follow work through quotes, payments,
and milestones. Provider, verification, and scoped staff workspaces support the
people operating those services.

The application is available in English and Bangla. The current implementation
includes agriculture and construction browsing and workflows; see the demo guide
for the sample scenarios available locally.

## Features

- Localized English and Bangla interface, with locale-aware routing.
- Agriculture service discovery, customer requests, provider listings, market
  information, and reviewed price updates.
- Construction service and materials marketplace, contractor and supplier
  verification, project quotes, milestones, expenses, and payment records.
- Account, provider, and permission-scoped staff workspaces.
- PostgreSQL persistence through Prisma, with migrations and repeatable seed data.
- Private S3-compatible file uploads using short-lived presigned URLs.
- Authentication, input validation, rate limiting, and health/readiness checks.

## Tech stack

- [Next.js 16](https://nextjs.org/) App Router and [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/) and [Bun](https://bun.sh/)
- [Prisma 7](https://www.prisma.io/) and PostgreSQL
- [next-intl](https://next-intl.dev/) for English/Bangla localization
- [Tailwind CSS 4](https://tailwindcss.com/) and shadcn/ui components
- [Better Auth](https://www.better-auth.com/) for authentication
- Playwright, Bun test, Oxlint, and Oxfmt for testing and code quality

## Quick start

### Prerequisites

- [Bun 1.4.4](https://bun.sh/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker
  Engine with Compose
- Node.js only if required by your local tooling; project commands use Bun

### Install and configure

Clone the repository and install dependencies:

```bash
git clone https://github.com/Eksathe-Bangladesh/eksathe-nextjs.git
cd eksathe-nextjs
bun install
```

Create a local environment file:

```bash
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env`. Edit `.env` and set a unique
`BETTER_AUTH_SECRET` (at least 32 bytes). For example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The template contains local PostgreSQL credentials and URLs for the app and
isolated test database. Keep `.env` private; never commit secrets or put private
credentials in `NEXT_PUBLIC_*` variables.

### Start the application

Start PostgreSQL, apply migrations, and seed the service catalogue:

```bash
bun run db:up
bun run db:migrate
bun run db:seed
```

Then start the development server:

```bash
bun run dev
```

Open <http://localhost:3000>. In local development, verification and password
reset links are printed in the server terminal when email delivery is not
configured.

To stop the database container, run `bun run db:down`. The local database volume
is retained. **`bun run db:reset` deletes that volume and recreates the database.**

## Demo data

The optional demo seed creates local-only customer, agriculture provider,
construction provider, and scoped construction staff accounts, plus example
listings, requests, orders, and a project.

Follow [the demo data guide](docs/demo-data.md) to load it. The seed requires an
explicit opt-in and refuses production or non-local database URLs. Demo
credentials must never be used in a deployed environment.

## Configuration

See [`.env.example`](.env.example) for the full environment template. Important
settings:

| Variable                                                                            | Purpose                                                                                                                 |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                      | PostgreSQL connection string for the application.                                                                       |
| `BETTER_AUTH_SECRET`                                                                | Private authentication signing secret; use a strong unique value.                                                       |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`                                            | Canonical application origin.                                                                                           |
| `CONSTRUCTION_VERIFICATION_ENFORCED`                                                | Enforces current contractor/supplier approval for construction activity; keep enabled in production.                    |
| `RESEND_API_KEY`, `RESEND_FROM`                                                     | Optional transactional email for verification and password resets. Production requires a verified sender domain.        |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                | Optional shared storage for rate limits and auth state in multi-instance deployments.                                   |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` | Optional private S3-compatible storage for uploads. `S3_ENDPOINT` supports providers such as Cloudflare R2 or MinIO.    |
| `TEST_DATABASE_URL`                                                                 | Dedicated PostgreSQL database used by integration-test setup. Never point it at production or the application database. |

For file type/size limits, bucket CORS, and private access requirements, see
[private object storage setup](docs/object-storage.md). For shared rate limits,
readiness checks, and database backup/restore guidance, see
[operations](docs/operations.md).

## Production deployment checklist

The app needs a reachable PostgreSQL database and a Node-compatible host that
supports the Next.js production server. Before deploying:

1. Set a strong unique `BETTER_AUTH_SECRET`, production app URLs, and the
   production `DATABASE_URL` in the hosting provider's secret store.
2. Configure a verified transactional email sender. Do not use the development
   sender in production.
3. Keep construction verification enforcement enabled. Configure private
   S3-compatible storage for file workflows and shared Upstash Redis for
   rate-limiting across multiple app instances.
4. Apply committed database migrations with `bun run db:deploy` as a release
   step, then build with `bun run build` and start with `bun run start`.
5. Confirm `GET /api/health/ready` returns `200`. Configure database backups
   and regularly test restoring them.

Do not run local demo seeding or `bun run db:reset` against production. See
[operations](docs/operations.md) for health, rate-limit, and backup details.

## Development commands

| Command                   | Description                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| `bun run dev`             | Start the local Next.js development server.                                   |
| `bun run build`           | Build the production application.                                             |
| `bun run start`           | Serve a production build.                                                     |
| `bun run typecheck`       | Check TypeScript types.                                                       |
| `bun run lint:check`      | Run Oxlint without changing files.                                            |
| `bun run lint`            | Run Oxlint with automatic fixes.                                              |
| `bun run fmt:check`       | Check formatting with Oxfmt.                                                  |
| `bun run fmt`             | Format files with Oxfmt.                                                      |
| `bun run test:unit`       | Run unit tests.                                                               |
| `bun run test:e2e`        | Run Playwright end-to-end tests.                                              |
| `bun run db:status`       | Show Prisma migration status.                                                 |
| `bun run db:studio`       | Open Prisma Studio for the local database.                                    |
| `bun run admin:bootstrap` | Bootstrap an initial administrator; configure the required environment first. |

Run the standard checks before submitting a change:

```bash
bun run typecheck
bun run lint:check
bun run fmt:check
bun run test:unit
```

Run the production build for changes affecting production compilation:

```bash
bun run build
```

## Integration tests

Integration tests use a dedicated PostgreSQL database. Start and migrate the
isolated test database, then run the suite:

```bash
bun run db:test:setup
bun run test:integration
```

The bundled test container listens on port **5433** and uses temporary storage;
its data is discarded when the container stops. Tests create their own fixtures,
so demo data is not needed. For CI or a custom test database, set
`TEST_DATABASE_URL` to a dedicated database whose name contains `test` as an
underscore-separated part. The setup checks prevent using the configured
application database. Run integration tests through the package script so these
safeguards remain active.

## Project structure

```text
src/app/[locale]/   Localized routes and layouts
src/app/actions/    Server actions
src/components/     UI and feature workspaces
src/lib/            Data access, domain logic, validation, and utilities
src/i18n/           Locale routing and translation helpers
messages/           English and Bangla translation catalogs
prisma/             Schema, migrations, and seed scripts
tests/              E2E and database integration tests
docs/               Operations, localization, demo, and storage guides
graphify-out/       Tracked graph.json; generated reports and caches are local-only
```

## Contribution practices

- Follow the existing App Router, server/client component, and domain-layer
  patterns. Enforce authorization and business rules on the server; hiding a UI
  control is not an authorization check.
- Validate untrusted input at the boundary. Keep database changes in Prisma
  migrations and avoid destructive database commands unless the target and data
  loss are understood.
- Keep English and Bangla message catalogs aligned. Follow
  [the translation conventions](docs/i18n.md), preserve stable service and
  domain identifiers, and check affected pages in both locales.
- Add or update tests with behavior changes. Use the isolated test database for
  integration workflows and never put production data in local fixtures.
- Keep credentials, private documents, and user data out of source control and
  logs. Use private object storage and least-privilege credentials for deployed
  environments.
- For codebase exploration, consult the tracked Graphify graph first. After
  code changes, run `graphify update .` and include only
  `graphify-out/graph.json` with the project update.

## Further documentation

- [Local demo data and accounts](docs/demo-data.md)
- [Translation conventions](docs/i18n.md)
- [Private object storage setup](docs/object-storage.md)
- [Operations and backups](docs/operations.md)
- [Tracked Graphify graph](graphify-out/graph.json)
- [License](LICENSE)
