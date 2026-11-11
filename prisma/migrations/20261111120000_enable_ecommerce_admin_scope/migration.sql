-- Ecommerce is live in the application registry and staff grants depend on the
-- persisted sector status. Keep the database registry aligned with the app.
UPDATE "sectors"
SET "status" = 'LIVE'
WHERE "slug" = 'ecommerce-b2b'
  AND "status" = 'COMING_SOON';
