# EKsathe Bangladesh MVP Implementation Plan

## Goal

Build one responsive Next.js application with a public 13-sector directory, a shared account, and separate customer, provider, and admin workspaces. Agriculture and construction are live for the MVP; the other 11 sectors remain visible as coming soon.

## Entry points

| Route                          | Purpose                                                | Access                         |
| ------------------------------ | ------------------------------------------------------ | ------------------------------ |
| `/`                            | Platform homepage, launch sectors, and directory entry | Public                         |
| `/dashboard`                   | The 13-sector service directory                        | Public                         |
| `/dashboard/agriculture-labor` | Produce, farm-worker, and machinery services           | Public browsing                |
| `/dashboard/construction`      | Provider/material discovery and construction projects  | Public browsing                |
| `/account`                     | Orders, bookings, projects, payments, and profile      | Signed-in customer             |
| `/provider`                    | Listings, applications, quotes, jobs, and commission   | Applicant or approved provider |
| `/admin`                       | Provider approvals and scoped operations/finance       | Authorized staff               |

Ordering, quote requests, bookings, and projects require a verified email account and return the customer to the requested action after sign-in. Listing and provider pages have shareable sector URLs. Planned sectors show a consistent coming-soon page; unknown sector slugs return 404. Provider and admin links appear only when the signed-in user has access. The old `/dashboard/admin` route redirects to `/admin`.

## Shared product foundation

- Keep Next.js 16, React, PostgreSQL, Prisma 7, Better Auth, Tailwind, and shadcn. Keep one root layout and separate public, account, provider, and admin layouts.
- Define all 13 sectors in one typed registry with stable slugs, display order, Bengali and English names, icons, and rollout status. Agriculture service definitions remain distinct from top-level sectors.
- Support one customer account with multiple provider capabilities. Require admin approval for each sector capability before publishing or accepting work.
- Reuse a request, quote, order, booking, payment record, commission record, and review flow across both live sectors: request, quote, acceptance, fulfilment, completion, payment confirmation, and review.
- Snapshot accepted quantity, price, scope, schedule, and commission. Keep fulfilment and payments as separate states. Prevent duplicate quote acceptance, overselling, and conflicting worker or machine bookings.
- Customers pay providers directly. Record both parties' payment confirmation; finance staff track platform commission due and receipts. Commission defaults to 10% per sector and is recorded with the accepted order.
- Check authentication, authorization, and record ownership in server-rendered data access and every mutation. Keep privileged fields server-controlled. Add an audited first-super-admin bootstrap command; expose no public admin-creation flow.
- Use signed S3-compatible uploads and validate uploads before attaching them to products, projects, or payment records. Private documents remain access-controlled.
- Use additive Prisma migrations, idempotent seeds, and fresh Next.js data. Do not import PHP users or transactions.

## Agriculture

- Farmer profiles and storefronts with bilingual details, district, photo, product category, price/unit, quantity, and harvest availability.
- Public produce search and filters. Support buy-now requests for one listing at a time; farmers accept the terms or issue a revised quote. The parties arrange collection or transport.
- Farm-worker profiles, skills, daily rates, availability, location, and booking requests.
- Machinery hire listings with daily rates, availability, location, and operator/transport terms.
- Provide provider inventory, incoming requests, quote handling, fulfilment updates, customer order history, reviews, and payment records. Other agriculture service definitions remain unavailable for transactions during the MVP.

## Construction

- Searchable approved directories of contractors, engineers, architects, tradespeople, and material suppliers.
- Private customer projects with location, type, scope, approximate area, budget, dates, photos, and documents.
- Provider invitations and quote requests for one work package or material requirement; compare scope, price, schedule, transport charges, and provider profile.
- Accept one quote per request and link each booking or material order to its project.
- Project overview with accepted quotes, milestones, work schedule, material orders, documents, recorded expenses, and payment history. Providers post progress; customers approve milestones, changes, and handover.
- Defer automated BOQ/structural estimates, procurement automation, attendance/payroll, warranties, and full ERP features.

## Admin and launch operations

- Admin queues for provider approvals, listing moderation, requests, disputes, payment mismatches, and outstanding commission.
- Sector managers see only assigned-sector operations. Finance manages payment and commission records. Super admins manage staff access and platform settings.
- Use in-app workflow notifications, email verification, and password recovery. Add structured server logs, readiness checks, rate limiting, and database backups.
- Run a controlled provider pilot after migrations, seeds, email, and object storage work in staging.

## Implementation order and acceptance

1. **Plan, routes, identity, and access:** add this plan; establish the sector registry and page shells; finish email/password registration, verification, reset, and profile; secure admin routes/actions; add provider applications and sector-scoped grants. Acceptance: customers can access their own workspace and an admin can approve provider capabilities; unprivileged users cannot access admin data or actions.
2. **Shared data and transaction lifecycle:** add provider, product, request, quote, order, booking, payment, commission, review, notification, attachment, audit, and project models with safe migrations and seeds; implement validated server-side domain services and ownership checks. Acceptance: one seeded transaction completes with payment confirmation, review, and commission receipt while preserving an audit trail.
3. **Agriculture workflows:** deliver produce listings/orders, farm-worker bookings, and machinery hire. Acceptance: each workflow appears correctly in customer, provider, and admin views.
4. **Construction workflows:** deliver projects, provider/material directories, quote comparison, linked orders/bookings, milestones, documents, and payment history. Acceptance: a customer can create a project, engage a provider, approve a milestone, record payments, and confirm handover.
5. **Operations and release readiness:** complete scoped admin queues, notifications, readiness and backup operations, and provider pilot. Acceptance: the full customer, provider, operations, and finance paths work in Bangla and English on mobile and desktop.

## Verification

- Run lint, TypeScript, Prisma migration/seed, and production build checks.
- Add Bun domain tests and PostgreSQL integration tests for permissions, quote acceptance, stock and booking conflicts, payments, refunds, commission, and reviews.
- Add Playwright journeys for public sector discovery, registration/verification, the three agriculture flows, construction project/quotes, role boundaries, mobile layout, and Bangla/English switching.

## Defaults and boundaries

- Responsive web first; native Android and iOS follow after workflows stabilize.
- Bangla-first interface with English switching; preserve the green brand, Bengali font, and theme support.
- One provider profile per account with multiple approved sector capabilities; provider staff teams and multiple storefronts come later.
- Currency is BDT with decimal arithmetic and explicit units. The 10% commission excludes separately listed transport charges.
- Customers and providers arrange delivery and site visits themselves. No marketplace shopping cart, payment gateway, social feed, live chat, or provider fleet dispatch in the MVP.
- The other 11 sectors remain visible as coming soon; their service definitions are not transactable.

## Agriculture prototype restoration

Restore the agriculture prototype as a dedicated experience while keeping the current Next.js accounts, provider approvals, marketplace orders, bookings, payments, and commission records. The internal sector slug remains `agriculture-labor`.

### Agriculture routes

| Route                              | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `/agriculture`                     | Canonical agriculture homepage, without a dashboard back link |
| `/dashboard/agriculture`           | Same homepage with a back link to `/dashboard`                |
| Both prefixes + `/services/[slug]` | Shareable service details and request form                    |
| Both prefixes + `/market`          | Searchable produce and service marketplace                    |
| Both prefixes + `/listings/[id]`   | Listing details                                               |
| Both prefixes + `/providers/[id]`  | Farmer/provider storefront                                    |
| Both prefixes + `/market-prices`   | Staff-published, sourced market prices                        |
| Both prefixes + `/updates`         | Staff-published news, advice, and weather alerts              |

Use one shared agriculture module with an explicit route base. Keep that base in detail links, filters, breadcrumbs, and login return URLs. The header and homepage CTA use `/agriculture`; the agriculture sector card opens `/dashboard/agriculture`. Permanently redirect `/dashboard/agriculture-labor` and its listing/provider descendants to matching `/dashboard/agriculture` routes, preserving query parameters. Direct agriculture URLs are canonical for public pages.

The agriculture homepage restores the prototype's introduction, marketplace CTA, searchable service directory and category filters, how-it-works section, commission estimate, and published updates. Keep the project logo, Bangla/English translations, Lucide controls, and emoji fallbacks for missing photos. Support information must come from platform settings; do not use the prototype's unverified emergency number.

### Service request catalogue

Create one typed, versioned registry sourced from `includes/panel-data.php`. It defines all 30 stable slugs, bilingual descriptions and labels, category, fields, options, validation, and form version:

- Crop production: crop farming, seeds and seedlings, fertilizer and soil testing, pest and disease management, irrigation, and organic farming.
- Farm enterprises: livestock, poultry, fisheries, land and equipment, training and advice, and contract farming.
- Markets and supply: farm inputs, produce market, wholesale buyers, daily market prices, storage and warehouses, transport and logistics, food processing, and export support.
- Labor and machinery: farm labor, machinery hire and repair, and worker marketplace.
- Finance: farm finance and insurance claims.
- Information and community: weather alerts, disaster support, women farmers, youth agripreneurs, and community reports.

Keep common name, phone, district, and requirement details required. Prototype-specific fields and budget are optional unless a selected operation needs them. Validate counts as numbers, dates as dates, and money using decimal arithmetic. Do not treat prototype digit-length limits as maximum quantities. A crop-disease photo is optional, private, and limited to JPEG/PNG/WebP up to 5 MB. Service request submission requires a verified account and shows a reference plus customer tracking link. Existing direct purchase and booking flows stay in place for produce, workers, and machinery; those service pages also offer staff-assisted requests.

### Request operations and privacy

Extend `ServiceDefinition` and `ServiceRequest`; do not create a second request system. Store versioned structured answers with the submitted field labels and options, staff assignment, public updates, private notes, private attachments, and an optional link to a marketplace request. The marketplace link records matching only and must not create an order or payment.

Agriculture operations staff manually review and coordinate requests. Use the existing `NEW → REVIEWING → ASSIGNED → COMPLETED` progression. Customers can withdraw new or reviewing requests; staff handle cancellations after assignment. Add an agriculture intake queue filtered by service, district, date, status, and assignee. Notify customers about meaningful status changes, log mutations in the audit trail, and authorize every request and photo read by owner or agriculture staff. Enable all 30 service definitions with an additive migration; subsequent seeds must preserve staff availability settings.

### Farmer shops, marketplace, and information

- Add editable bilingual storefront name/bio, district, profile and cover photos, and a public preview.
- Add product editing and archiving for price, unit, category, availability, stock, description, and optional image. Moderate material content/photo edits and retain accepted order snapshots.
- Add prototype produce categories (vegetables, fruits, dairy, fish, spices, and other) while retaining grain listings. Support category, district, minimum/maximum price, sorting, result counts, and pagination with filters stored in the URL.
- Show product ratings, reviews, seller information, and more products by that seller. Continue to allow one review per completed order.
- Apply stock visibility only to goods; worker and machinery listings depend on schedule availability.
- Add sourced market prices with product, market, district, unit, price, observation date, and publication status. Staff review submissions before publishing and never publish customer contact details.
- Add bilingual news, advice, and weather alerts with source and publication date. Weather alerts require an expiry. Show only published, current content and honest empty states. Do not add automated external feeds in this release.

Finance, insurance, disaster, and advisory requests provide intake and coordination only; a request does not mean approval, coverage, or guaranteed assistance. Keep customer payments direct to providers and continue to record commission under the existing rules.

### Delivery increments

1. **Routes and registry:** add the shared agriculture routes, redirects, homepage, route-aware navigation, and 30-service registry. Acceptance: both entry routes share content, only the dashboard entry shows the back link, old URLs redirect, unknown service slugs return 404, and all services have stable bilingual metadata and fields.
2. **Requests and staff intake:** add specific forms, verified-account submission, private disease photos, customer tracking, agriculture staff queue, updates, and audit history. Acceptance: all 30 forms persist versioned answers and authorized users can track a request from submission through completion.
3. **Storefront and discovery:** add storefront/product management, moderation and archive behavior, URL-backed filters, ratings, and corrected stock/schedule visibility. Acceptance: edits do not change accepted order terms and all supported filters work on mobile and desktop.
4. **Publishing and integration:** add staff publishing for sourced prices/news/advice/weather, public updates, commission estimate, settings-backed support information, and translations. Acceptance: only current published records appear, sources/dates are visible, expired alerts/drafts remain private, and the full flow works in Bangla and English.

After each increment, update this plan and commit the completed change. Verify migrations/seeds, lint, typecheck, targeted integration/browser journeys, responsive layouts, and production build at completion.

### Restoration progress

- Routes/registry and request intake are implemented and committed.
- Storefront/discovery is implemented: owner storefront editing and photos, moderated product edits, soft archive, URL filters and pagination, ratings/reviews, seller links, and schedule-based visibility for booking listings.
- Storefront migration applied; its lint/typecheck, 12 unit tests, and 7 PostgreSQL integration checks passed. The marketplace was inspected in Codex's in-app browser in Bangla and English; final browser coverage is recorded below.
- Staff publishing is implemented: agriculture operations can review submitted daily market prices, link them to published sourced records, and manage bilingual news, advice, and weather alerts. Weather alerts require an expiry; drafts, future records, expired prices, and expired alerts remain hidden from public pages.
- Public `/market-prices` and `/updates` pages are available under both agriculture route prefixes with canonical direct URLs, source/date details, and honest empty/error states. The homepage shows published content, uses the configured agriculture commission rate for an integer-paisa estimate, excludes separate transport, and shows only support details saved by a super admin.
- The language provider now starts from the server request's `NEXT_LOCALE` cookie, avoiding the hydration mismatch when the visitor's saved locale differs from Bangla default.
- Publishing migration applied to the configured development database. Lint and typecheck pass; all 17 unit tests and 9 PostgreSQL integration checks pass. Codex's in-app browser confirmed both agriculture entry routes, the dashboard back link, empty public information states, the commission estimate, and Bangla/English rendering.
- Market prices remain public for seven days after observation; older records remain available to staff. Guests can preview all service fields, while verified accounts can submit requests.
- Restoration increment 4 is complete. Clean-database migrations/seeds, lint, typecheck, 17 unit tests, 9 PostgreSQL integration checks, all 9 Playwright browser checks, and the production build pass. Invalid sector/service slugs return HTTP 404, and locale selection is preserved during server rendering.

## Construction MVP completion

Complete the construction sector as a dedicated experience, reusing the accounts, provider approvals, listings, quotes, projects, orders, payments, notifications, and commission foundation. Keep the internal sector slug `construction` and provider capabilities `CONSTRUCTION_SERVICE` and `CONSTRUCTION_MATERIAL`.

### Routes and discovery

| Route                              | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `/construction`                    | Canonical construction homepage without a dashboard back link |
| `/dashboard/construction`          | Same shared homepage with a back link to `/dashboard`         |
| Both prefixes + `/services/[slug]` | Construction service details and matching listings            |
| Both prefixes + `/market`          | Searchable professional and material directory                |
| Both prefixes + `/listings/[id]`   | Listing detail and customer actions                           |
| Both prefixes + `/providers/[id]`  | Provider storefront and related listings                      |

The header and platform homepage link to `/construction`; the sector card opens `/dashboard/construction`. Preserve dashboard construction listing/provider URLs. Keep route context in navigation, filters, and login return paths; direct construction pages are canonical. The homepage should match the agriculture experience's green identity, layout rhythm, cards, typography, bilingual behavior, theme, Lucide controls, and image/emoji fallbacks. Include a construction introduction, directory, professional/material previews, project actions, how-it-works, and a configured commission estimate that excludes transport charges.

Provide eight directory entries: contractors, engineers, architects, masonry, electrical work, plumbing, painting/finishing, and building materials. Pages explain the service, link matching approved listings, and preserve a selected service into project creation. Marketplace discovery supports URL-backed search, district/category/type and price filters, sorting, counts, and pagination. Professional availability is distinct from material stock. Listing and storefront pages show ratings, reviews, seller information, and related listings, with honest empty/error states.

### Projects and engagement

Reuse the existing private construction projects and transaction system. Customers can create projects with a selected service/listing context, invite several providers to a defined work package, compare quote scope, quantities, price, transport, dates, and expiry, and accept one quote for each package. Replace free-text package matching with stable package records. Add an additive migration that backfills existing requests/orders by project and package label, and enforce a single accepted engagement per package atomically. A project may have multiple packages and material orders.

Complete project overview with accepted engagements, scheduled work, milestones, private photos and PDF documents, recorded expenses, and payment history. Keep expenses separate from payment totals. Assign milestones to an engaged construction service provider; only that provider may submit progress and the customer approves it. Material suppliers cannot submit unrelated milestones. Customer handover completes a project only after accepted orders are completed and all milestones are approved. Payment state remains separate. Accepted scope and financial snapshots are immutable; additional work requires a new package and quote, and replacement work follows cancellation agreement/resolution before a new quote. Record ownership and sector checks, notifications, and audit entries for mutations.

Extend private R2 upload/download access to project photos while retaining PDF documents and project authorization checks. Provider and construction operations views should surface only records their permissions allow.

### Delivery increments

1. **Header reversal and navigation:** revert the prototype-specific header navigation, restore its mobile navigation assertion, and record the construction plan here. Acceptance: initial platform header uses the normal dashboard/agriculture/construction links.
2. **Construction experience:** add shared canonical/dashboard routes, homepage, service directory, marketplace discovery, and route-aware detail/storefront pages. Acceptance: both entry routes share content; only the dashboard entry shows the back link; filters, pagination, direct links, login return, missing images, and unknown routes behave correctly.
3. **Project workflow:** add stable work packages with backfill, competing invitations, atomic quote acceptance, assigned milestones, project photos, and final handover. Acceptance: one accepted quote per package and customers can track separate professional/material work to completion with private records.
4. **Operations and launch:** connect provider/admin views, seed representative demo data idempotently, and complete acceptance coverage. Acceptance: permissions prevent unrelated access; payments, commission, audits, and notifications agree with accepted transaction snapshots; agriculture flows continue to work.

After each increment, update this plan and commit the completed change. Verify clean-database migrations/seeds, lint, typecheck, targeted unit/integration tests, Playwright and Codex browser journeys, and a production build. Keep direct customer-to-provider payments and existing commission rules. Defer construction news publishing, large staff-assisted service catalogues, BOQ/structural estimates, payroll, warranties, and construction ERP.

### Construction progress

- Increment 1 complete: reversed commit `29dcf05`; restored the prior initial-page header and removed the prototype-specific mobile menu assertion.
- Increment 2 complete: added shared `/construction` and `/dashboard/construction` homepages, eight service detail pages, URL-backed construction marketplace filters, and direct/dashboard listing and provider detail routes. The homepage and platform header use `/construction`; the sector hub retains `/dashboard/construction`.
- Construction discovery now uses the configured sector commission rate, preserves route context through project CTAs and detail links, distinguishes professional availability from material stock, and uses the shared listing and provider reviews with emoji image fallbacks. All text uses Hind Siliguri as requested.
- Listing photo cards now sit flush with the card's top edge, and the dashboard search icon stays crisp because the field no longer blurs content behind its translucent background.
- Increment 2 checks passed: lint, typecheck, 17 unit tests, and 12 Playwright journeys. Next's default Turbopack build could not spawn parser workers in this Windows environment; `bunx next build --webpack` completed successfully.
- Increment 3 complete: added stable project packages and a backfill for legacy requests/orders, scoped milestone assignment, private project photos in R2, project-specific quote invitations, customer handover, and cancellation/re-engagement while preserving canceled order history. A partial unique database index allows at most one non-cancelled order per package.
- Construction service/listing context now survives sign-in into project creation. Customers can compare package quotes, keep separate material and service engagements, record project expenses apart from payments, and confirm handover only after active orders and milestones are complete.
- Increment 3 checks passed: clean test-database migrations, schema validation, lint, typecheck, 17 unit tests, 10 PostgreSQL integration tests, 13 Playwright journeys in installed Edge, and a webpack production build that prerendered 48 routes/pages. The development app remains running at `http://localhost:3000`.
- Increment 4 complete: added a local construction operations/finance account limited to the construction sector, contractor and supplier verification records for the demo provider, an auditable completed consultation, a pending payment confirmation, and a due commission. Updated the demo seed to the current translation relations and made repeated runs preserve existing user, capability, verification, transaction, notification, and project state. `docs/demo-data.md` lists the new account and notes private files are not bundled.
- Increment 4 acceptance checks passed: real staff grants restrict operations and finance workspaces to their assigned sector; payment, commission, notification, and audit records are checked against accepted transaction snapshots; agriculture transaction flows remain covered. The demo seed ran twice against the isolated migrated test database. Final checks passed: lint, typecheck, 49 unit tests, 12 PostgreSQL integration tests, and a webpack production build using the migrated test database.
- Browser verification was attempted against both the existing development server and a production preview using the isolated test database. Seven of 15 Playwright checks passed in each run; the remaining failures are existing fixture/copy/layout expectations outside this increment's changed UI. The default Playwright web server could not start while the existing Next development process was running.
