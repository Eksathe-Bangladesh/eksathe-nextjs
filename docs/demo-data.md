# Local demo data

Use the demo seed to explore the implemented agriculture and construction
workflows with customer, provider, and scoped operations/finance accounts. It is
separate from the regular sector seed and uses repeatable upserts, so running it
again does not reset requests, quotes, orders, payments, notifications, provider
reviews, or project progress. It ensures the demo staff account retains its
construction grants.

## Load the records

Start the local PostgreSQL database, apply migrations and seed the service
catalogue first:

```bash
bun run db:up
bun run db:migrate
bun run db:seed
```

Then opt in to the demo seed for that command:

```bash
# PowerShell
$env:SEED_DEMO_DATA = "true"; bun run db:seed:demo

# bash
SEED_DEMO_DATA=true bun run db:seed:demo
```

The script refuses to run unless the opt-in is set, `NODE_ENV` is not
`production`, and `DATABASE_URL` points to a local loopback host. It does not
delete records. Listings, provider capabilities and sample accounts are
created only when their stable demo IDs are absent; existing workflow state is
preserved on later runs.

## Demo accounts

All four accounts use the local-only password `Demo-only-123!`.

| Workspace                                    | Email                               |
| -------------------------------------------- | ----------------------------------- |
| Customer                                     | `demo.buyer@example.com`            |
| Agriculture provider                         | `demo.farmer@example.com`           |
| Construction provider                        | `demo.builder@example.com`          |
| Construction operations and finance (scoped) | `demo.construction.ops@example.com` |

The seed creates produce, worker, machinery, material and construction service
listings, separate contractor and supplier verification approvals, and a
construction staff account with only `OPERATIONS` and `FINANCE` access to the
construction sector. The customer workspace includes an active produce order,
an agriculture quote awaiting acceptance, and a construction project with a
completed consultation, a material quote, and sample milestones. The
construction provider workspace shows the recorded consultation payment awaiting
provider confirmation; the finance queue shows its BDT 1,500 commission due.

The seed includes verification metadata but no private document files. Configure
the application's object storage to exercise private verification-document and
project-file downloads.

These credentials and records are for local development only. Do not use the
demo password or demo accounts in a deployed environment.
