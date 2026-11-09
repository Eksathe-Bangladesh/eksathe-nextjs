# Construction provider verification

Phase 1 adds separate evidence-based approval for construction contractors and material suppliers.

## Approval scope and lifecycle

- `CONSTRUCTION_SERVICE` capabilities require a current `CONTRACTOR` verification.
- `CONSTRUCTION_MATERIAL` capabilities require a current `SUPPLIER` verification.
- A provider submits one application per type from the provider workspace. Business and applicant details, document metadata, version snapshots, and review decisions are stored in PostgreSQL; files are stored in the configured private S3-compatible bucket.
- Construction operations staff (or a super admin) can mark an application in review, approve it, request changes, reject it, or revoke a current approval. Approval requires every document in the current submission version to be approved.
- Resubmissions create a new immutable application-version snapshot. Review and document-decision history is retained.
- An approval expires 365 days after the approval decision. Expiration is evaluated at read and write time; no scheduled job is needed. The provider workspace presents expired approvals as expired and allows resubmission.

## Enforcement and rollout

Verification is enforced by default for public construction listings/profiles and new construction listings, stock changes, project requests, provider quotes, and quote acceptance. The existing provider-profile and capability checks remain in place.

`CONSTRUCTION_VERIFICATION_ENFORCED=false` temporarily bypasses only the construction verification check. It does not bypass provider account, capability, listing moderation, availability, or sector checks. Remove the override after rollout; an unset variable means enforcement is on.

## Private evidence access

Uploads require an active, email-verified account and a matching construction capability. The server generates a provider- and verification-type-scoped object key. Submission verifies the stored object's size, declared content type, and file signature before recording it.

Evidence download routes return short-lived signed URLs only to the owning provider or construction operations staff. Reviewer access is recorded in the activity log. Construction listing-image redirects use short-lived URLs and no-store caching so revocation or expiration is not masked by a long browser/CDN cache.

Configure `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optionally `S3_ENDPOINT` before enabling evidence uploads. The same private bucket configuration is used for other application uploads.

## Database and verification

Apply the additive migration with the normal deployment migration command, then generate the Prisma Client when developing locally:

```sh
bunx --bun prisma migrate deploy --config prisma7.config.ts
bunx --bun prisma generate --config prisma7.config.ts
```

Relevant checks:

```sh
bun test src/lib/validations/provider-verification.test.ts src/lib/construction/verification-policy.test.ts
bun run db:test:setup
bun run test:integration
bun run typecheck
bun run lint:check
```
