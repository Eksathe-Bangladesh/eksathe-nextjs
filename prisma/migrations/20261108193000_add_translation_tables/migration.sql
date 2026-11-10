CREATE TABLE "panel_translations" (
    "service_definition_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "panel_translations_pkey" PRIMARY KEY ("service_definition_id", "locale"),
    CONSTRAINT "panel_translations_service_definition_id_fkey"
      FOREIGN KEY ("service_definition_id") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "panel_translations_locale_idx" ON "panel_translations"("locale");

CREATE TABLE "service_request_update_translations" (
    "request_update_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    CONSTRAINT "service_request_update_translations_pkey" PRIMARY KEY ("request_update_id", "locale"),
    CONSTRAINT "service_request_update_translations_request_update_id_fkey"
      FOREIGN KEY ("request_update_id") REFERENCES "service_request_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "service_request_update_translations_locale_idx"
  ON "service_request_update_translations"("locale");

CREATE TABLE "sector_translations" (
    "sector_slug" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "sector_translations_pkey" PRIMARY KEY ("sector_slug", "locale"),
    CONSTRAINT "sector_translations_sector_slug_fkey"
      FOREIGN KEY ("sector_slug") REFERENCES "sectors"("slug") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sector_translations_locale_idx" ON "sector_translations"("locale");

CREATE TABLE "provider_profile_translations" (
    "provider_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    CONSTRAINT "provider_profile_translations_pkey" PRIMARY KEY ("provider_id", "locale"),
    CONSTRAINT "provider_profile_translations_provider_id_fkey"
      FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "provider_profile_translations_locale_idx"
  ON "provider_profile_translations"("locale");

CREATE TABLE "marketplace_listing_translations" (
    "listing_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "marketplace_listing_translations_pkey" PRIMARY KEY ("listing_id", "locale"),
    CONSTRAINT "marketplace_listing_translations_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "marketplace_listing_translations_locale_idx"
  ON "marketplace_listing_translations"("locale");

CREATE TABLE "notification_translations" (
    "notification_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    CONSTRAINT "notification_translations_pkey" PRIMARY KEY ("notification_id", "locale"),
    CONSTRAINT "notification_translations_notification_id_fkey"
      FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notification_translations_locale_idx" ON "notification_translations"("locale");

CREATE TABLE "agriculture_market_price_translations" (
    "market_price_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    CONSTRAINT "agriculture_market_price_translations_pkey" PRIMARY KEY ("market_price_id", "locale"),
    CONSTRAINT "agriculture_market_price_translations_market_price_id_fkey"
      FOREIGN KEY ("market_price_id") REFERENCES "agriculture_market_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "agriculture_market_price_translations_locale_idx"
  ON "agriculture_market_price_translations"("locale");

CREATE TABLE "agriculture_update_translations" (
    "update_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    CONSTRAINT "agriculture_update_translations_pkey" PRIMARY KEY ("update_id", "locale"),
    CONSTRAINT "agriculture_update_translations_update_id_fkey"
      FOREIGN KEY ("update_id") REFERENCES "agriculture_updates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "agriculture_update_translations_locale_idx"
  ON "agriculture_update_translations"("locale");
