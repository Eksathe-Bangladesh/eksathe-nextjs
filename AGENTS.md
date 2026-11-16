<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance

### Project structure

EKsathe is a bilingual platform for agriculture, construction, and E-Commerce/B2B workflows. See `README.md` for product and setup context, and the focused guides under `docs/` for localization, demo data, storage, and operations.

- `src/app/[locale]/` — localized routes and layouts.
- `src/app/actions/` — server actions and mutation entry points.
- `src/lib/` — domain logic, data access, validation, and utilities.
- `src/components/` — shared UI and feature workspaces.
- `src/i18n/` and `messages/` — locale routing and English/Bangla catalogs.
- `prisma/` — schema, migrations, and seed scripts.
- `tests/` — end-to-end and database integration tests; unit tests also live under `src/lib/`.

Follow the established App Router, server/client component, server-action, and domain-layer patterns. Reuse the project's existing UI components and styling conventions rather than introducing a parallel system.

### Next.js

- This is a Bun-based application. Use the installed Next.js version and conventions; do not assume APIs from other Next.js releases.
- Before changing Next.js APIs or conventions, read the relevant guide in `node_modules/next/dist/docs/`. The managed block above also describes the generated agent rules.

### Security and data

- Keep authorization, ownership checks, and business rules on the server. Hiding a UI action is not authorization.
- Validate user-controlled input at the boundary and follow existing validation patterns.
- Use Prisma migrations for schema changes. Do not run destructive database commands, including `db:reset`, unless the target and data loss are understood and explicitly authorized.
- Use the isolated test database and package scripts for integration workflows. Never use production data in local fixtures.
- Keep credentials, private documents, and sensitive user data out of source control, client-visible variables, and logs. Never expose private credentials through `NEXT_PUBLIC_*`.
- Follow `docs/object-storage.md` for private file workflows and `docs/operations.md` for operational changes.

### Localization and UI

- User-facing routes are localized under `src/app/[locale]`.
- Keep message keys and interpolation arguments aligned in `messages/en.json` and `messages/bn.json`; follow `docs/i18n.md` and established next-intl patterns.
- Preserve stable service and domain identifiers. Check affected user-facing flows in both locales.
- Prefer existing components, design tokens, and interaction patterns when changing UI.

### Commands and verification

- Use Bun and the scripts defined in `package.json`; do not substitute ad hoc commands when a guarded project script exists.
- Prefer non-mutating checks. `lint:check` and `fmt:check` check without fixing files; `lint` and `fmt` may modify them.
- Run checks relevant to the change:
  - Application code: `bun run typecheck`, `bun run lint:check`, and `bun run fmt:check`.
  - Behavior or domain logic: also run relevant tests with `bun run test:unit`.
  - Database workflows: run the relevant integration tests with `bun run db:test:setup` and `bun run test:integration`.
  - User journeys: run relevant end-to-end tests with `bun run test:e2e`.
  - Changes affecting production compilation: run `bun run build`.
  - Documentation-only changes: check formatting and verify referenced paths and commands.
- Report which checks were run and any failures or unverified behavior. Do not claim checks passed unless they were run.

## Graphify

This project tracks `graphify-out/graph.json`, its Graphify knowledge graph. Other generated Graphify files are local-only and ignored; do not add or commit them.

When the user types `/graphify`, use the installed Graphify skill or instructions before doing anything else.

Rules:

- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before grep, search, or source-file reads for codebase questions. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts; read raw source only for locations identified by the graph or earlier reads.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when focused queries do not provide enough context.
- Dirty graph files are expected after hooks or incremental updates. Skip Graphify only when investigating stale/incorrect graph output or when the user explicitly requests it.
- Configure the shared hook once per clone with `git config core.hooksPath .githooks`. It runs `graphify update .` before commits that stage non-graph changes and stages only `graphify-out/graph.json`; install the Graphify CLI in the environment used for commits.
- After code changes, keep `graphify-out/graph.json` current. It is rewritten as a whole, so a large diff is expected. Set `GRAPHIFY_SKIP_HOOK=1` only to intentionally bypass the rebuild.
