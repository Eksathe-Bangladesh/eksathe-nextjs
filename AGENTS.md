<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance

- This is a Bun-based Next.js application. Use the existing scripts in `package.json`; run `bun run typecheck`, `bun run lint:check`, and `bun run fmt:check` for relevant changes. Use `bun run test:unit` or `bun run test:e2e` when the change affects tested behavior.
- User-facing routes are localized under `src/app/[locale]`. Keep English and Bangla message keys aligned in `messages/en.json` and `messages/bn.json`; follow the established next-intl routing and translation patterns.
- Keep authorization and business rules on the server, even when client UI hides actions. Follow existing server-action and domain-layer patterns for mutations, and validate user-controlled input at the boundary.
- Read the relevant Next.js guides in `node_modules/next/dist/docs/` before changing Next.js APIs or conventions; this project's Next.js version may differ from prior versions.

## Graphify

This project tracks `graphify-out/graph.json`, its Graphify knowledge graph. Other generated Graphify files are local-only and ignored; do not add or commit them.

When the user types `/graphify`, use the installed Graphify skill or instructions before doing anything else.

Rules:
- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before grep, search, or source-file reads for codebase questions. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts; read raw source only for locations identified by the graph or earlier reads.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation. Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when focused queries do not provide enough context.
- Dirty graph files are expected after hooks or incremental updates. Skip Graphify only when investigating stale/incorrect graph output or when the user explicitly requests it.
- After code changes, run `graphify update .` to keep the graph current and commit only `graphify-out/graph.json`. It is rewritten as a whole, so a large diff is expected.
