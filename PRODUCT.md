# EKsathe Bangladesh

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Customers in Bangladesh are the primary audience: people discovering providers,
requesting agriculture or construction services, purchasing goods, and following
their work or orders. Prioritize their journeys in future product decisions.

Providers, contractors, suppliers, sellers, verification teams, and
permission-scoped staff use supporting business and operational workspaces.

## Product Purpose

EKsathe is a bilingual service and marketplace platform for agriculture,
construction, and E-Commerce & B2B in Bangladesh. It lets customers discover
offerings, request services, manage orders and projects, and follow quotes,
payment records, and milestones.

Success metrics remain undecided.

## Positioning

The product combines service workflows and an E-Commerce & B2B marketplace.
A distinct competitive positioning or exclusive mechanism has not been confirmed;
do not invent one.

## Operating Context

- Agriculture customers discover services and providers, submit requests, and
  consult market information with reviewed price updates.
- Construction customers create projects and work items for services or
  materials, invite providers, review quotes, and accept quotes to create orders.
- Payment recording and confirmation are separate from order progress.
  Construction-service milestones are submitted by providers for customer
  approval. Project owners can record expenses and attach files or photos.
- E-Commerce & B2B supports seller onboarding, product moderation, checkout,
  wholesale requests for quotation (RFQs), messaging, and administration.

## Capabilities and Constraints

- Preserve the existing agriculture, construction, and E-Commerce & B2B domains
  and their stable service and domain identifiers.
- Keep authorization, ownership checks, verification rules, and business rules
  on the server. Hidden controls do not provide authorization.
- Keep private documents and uploads private; use short-lived presigned URLs
  for S3-compatible storage workflows.
- Preserve the established Next.js App Router, server-action, domain-layer,
  Prisma/PostgreSQL, and Bun project patterns.
- Demo scenarios are local-only fixtures, not evidence of live adoption.
- These capabilities were confirmed from `README.md`; this record does not
  establish production availability or deployment readiness.

## Brand Commitments

Preserve the EKsathe Bangladesh name and existing logo asset at
`public/brand/eksathe-logo.png`. No additional voice or aesthetic commitment
has been confirmed.

## Evidence on Hand

- `README.md`: product scope, capabilities, construction workflow, and setup.
- `docs/demo-data.md`: local agriculture and construction demonstration scenarios.
- `docs/i18n.md`: English/Bangla localization conventions.
- `docs/object-storage.md` and `docs/operations.md`: private file and operational
  constraints.
- Existing application routes and workspaces are implementation evidence, not
  testimonials, customer counts, performance benchmarks, or market claims.

## Product Principles

- Prioritize customer discovery, requests, purchases, and progress tracking.
- Maintain English and Bangla parity across affected journeys.
- Keep customer, provider, seller, and staff responsibilities explicit.
- Preserve the distinction between work progress, milestone approval, and
  payment confirmation.
- Protect private information and enforce permissions on the server.

## Accessibility & Inclusion

English and Bangla support are product requirements. Keep message keys and
interpolation arguments aligned, use locale-aware routes, and verify affected
journeys in both languages.

Additional product-specific accessibility requirements remain undecided; no
certification or conformance claim has been established.
