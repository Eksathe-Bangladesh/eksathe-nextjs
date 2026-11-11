# E-Commerce & B2B marketplace

The marketplace is part of the Next.js application and PostgreSQL database. It
uses the app's Better Auth sessions, Prisma client, notifications, and audit
log. No Express service or separate database is required.

## Enable the marketplace locally

Apply the additive migration and seed the built-in categories:

```powershell
bun run db:migrate
bun run db:seed
bun run dev
```

The dashboard's **E-Commerce & B2B** category links to
`/dashboard/ecommerce`. The additive migration creates `commerce_*` tables
and safely adds a nullable entity key to `audit_logs` so commerce actions can
be traced. It does not reset or rewrite existing marketplace, order, or user
data.

## Seller and administrator workflows

1. A verified account submits a seller application from **Seller workspace**.
2. Staff with ecommerce-scoped **Operations** permission review sellers and
   products at `/admin/ecommerce` (or use the E-Commerce link in the admin
   navigation). **Panels** staff manage categories; **Finance** staff manage
   coupons. Super administrators retain access to every section. Sellers can
   then create bilingual listings, manage stock and tier prices, and fulfill
   their orders.
3. Product edits are returned to moderation. Existing order item titles and
   prices remain snapshots.
4. Administrators can add/deactivate categories and create/disable coupons.
   Category and coupon changes, moderation decisions, quotes, checkout, and
   wholesale acceptance are written to `audit_logs`.

## Buyer and wholesale workflows

Buyers can search approved products, maintain a cart, wishlist, and delivery
addresses, check out across multiple sellers, and view seller-specific order
invoices. Checkout uses a PostgreSQL transaction, rechecks each product's
approved status and available stock, atomically decrements inventory, and
creates one fulfillment order per seller. Tier pricing is applied before coupon
allocation. Coupons are limited to one use per account and their global use
limits are reserved transactionally.

The public wholesale board exposes open RFQs without exposing buyer names.
Approved sellers may quote only on RFQs for their own products. Only the RFQ
owner can accept a quote; acceptance locks/rechecks stock and creates the order
in the same transaction. Buyer/seller messaging, notifications, post-delivery
reviews, and seller replies are available from the marketplace workspace.

Cash-on-delivery, mobile-wallet, and bank-transfer selections are recorded as
order payment instructions. This integration does not itself charge a payment
gateway or confirm external transfers; buyers and sellers must arrange and
confirm those payments directly.
