-- Drop legacy localized columns after translation-table backfill.
ALTER TABLE "panels"
  DROP COLUMN "description_bn",
  DROP COLUMN "description_en",
  DROP COLUMN "title_bn",
  DROP COLUMN "title_en";

ALTER TABLE "service_request_updates"
  DROP COLUMN "message_bn",
  DROP COLUMN "message_en";

ALTER TABLE "sectors"
  DROP COLUMN "title_bn",
  DROP COLUMN "title_en";

ALTER TABLE "provider_profiles"
  DROP COLUMN "bio_bn",
  DROP COLUMN "bio_en",
  DROP COLUMN "name_bn",
  DROP COLUMN "name_en";

ALTER TABLE "marketplace_listings"
  DROP COLUMN "description_bn",
  DROP COLUMN "description_en",
  DROP COLUMN "title_bn",
  DROP COLUMN "title_en";

ALTER TABLE "notifications"
  DROP COLUMN "message_bn",
  DROP COLUMN "message_en",
  DROP COLUMN "title_bn",
  DROP COLUMN "title_en";

ALTER TABLE "agriculture_market_prices"
  DROP COLUMN "product_bn",
  DROP COLUMN "product_en";

ALTER TABLE "agriculture_updates"
  DROP COLUMN "body_bn",
  DROP COLUMN "body_en",
  DROP COLUMN "title_bn",
  DROP COLUMN "title_en";
