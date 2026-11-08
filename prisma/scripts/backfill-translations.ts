import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const statements = [
  `INSERT INTO service_definition_translations ("service_definition_id", locale, title, description)
   SELECT id, 'en', "title_en", "description_en" FROM service_definitions
   WHERE trim("title_en") <> '' OR trim("description_en") <> ''
   ON CONFLICT ("service_definition_id", locale) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description`,
  `INSERT INTO service_definition_translations ("service_definition_id", locale, title, description)
   SELECT id, 'bn', "title_bn", "description_bn" FROM service_definitions
   WHERE trim("title_bn") <> '' OR trim("description_bn") <> ''
   ON CONFLICT ("service_definition_id", locale) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description`,
  `INSERT INTO service_request_update_translations ("request_update_id", locale, message)
   SELECT id, 'en', "message_en" FROM service_request_updates WHERE trim("message_en") <> ''
   ON CONFLICT ("request_update_id", locale) DO UPDATE SET message = EXCLUDED.message`,
  `INSERT INTO service_request_update_translations ("request_update_id", locale, message)
   SELECT id, 'bn', "message_bn" FROM service_request_updates WHERE trim("message_bn") <> ''
   ON CONFLICT ("request_update_id", locale) DO UPDATE SET message = EXCLUDED.message`,
  `INSERT INTO sector_translations ("sector_slug", locale, title)
   SELECT slug, 'en', "title_en" FROM sectors WHERE trim("title_en") <> ''
   ON CONFLICT ("sector_slug", locale) DO UPDATE SET title = EXCLUDED.title`,
  `INSERT INTO sector_translations ("sector_slug", locale, title)
   SELECT slug, 'bn', "title_bn" FROM sectors WHERE trim("title_bn") <> ''
   ON CONFLICT ("sector_slug", locale) DO UPDATE SET title = EXCLUDED.title`,
  `INSERT INTO provider_profile_translations ("provider_id", locale, name, bio)
   SELECT id, 'en', "name_en", "bio_en" FROM provider_profiles
   WHERE trim("name_en") <> '' OR trim("bio_en") <> ''
   ON CONFLICT ("provider_id", locale) DO UPDATE SET name = EXCLUDED.name, bio = EXCLUDED.bio`,
  `INSERT INTO provider_profile_translations ("provider_id", locale, name, bio)
   SELECT id, 'bn', "name_bn", "bio_bn" FROM provider_profiles
   WHERE trim("name_bn") <> '' OR trim("bio_bn") <> ''
   ON CONFLICT ("provider_id", locale) DO UPDATE SET name = EXCLUDED.name, bio = EXCLUDED.bio`,
  `INSERT INTO marketplace_listing_translations ("listing_id", locale, title, description)
   SELECT id, 'en', "title_en", "description_en" FROM marketplace_listings
   WHERE trim("title_en") <> '' OR trim("description_en") <> ''
   ON CONFLICT ("listing_id", locale) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description`,
  `INSERT INTO marketplace_listing_translations ("listing_id", locale, title, description)
   SELECT id, 'bn', "title_bn", "description_bn" FROM marketplace_listings
   WHERE trim("title_bn") <> '' OR trim("description_bn") <> ''
   ON CONFLICT ("listing_id", locale) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description`,
  `INSERT INTO notification_translations ("notification_id", locale, title, message)
   SELECT id, 'en', "title_en", "message_en" FROM notifications
   WHERE trim("title_en") <> '' OR trim("message_en") <> ''
   ON CONFLICT ("notification_id", locale) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message`,
  `INSERT INTO notification_translations ("notification_id", locale, title, message)
   SELECT id, 'bn', "title_bn", "message_bn" FROM notifications
   WHERE trim("title_bn") <> '' OR trim("message_bn") <> ''
   ON CONFLICT ("notification_id", locale) DO UPDATE SET title = EXCLUDED.title, message = EXCLUDED.message`,
  `INSERT INTO agriculture_market_price_translations ("market_price_id", locale, product)
   SELECT id, 'en', "product_en" FROM agriculture_market_prices WHERE trim("product_en") <> ''
   ON CONFLICT ("market_price_id", locale) DO UPDATE SET product = EXCLUDED.product`,
  `INSERT INTO agriculture_market_price_translations ("market_price_id", locale, product)
   SELECT id, 'bn', "product_bn" FROM agriculture_market_prices WHERE trim("product_bn") <> ''
   ON CONFLICT ("market_price_id", locale) DO UPDATE SET product = EXCLUDED.product`,
  `INSERT INTO agriculture_update_translations ("update_id", locale, title, body)
   SELECT id, 'en', "title_en", "body_en" FROM agriculture_updates
   WHERE trim("title_en") <> '' OR trim("body_en") <> ''
   ON CONFLICT ("update_id", locale) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body`,
  `INSERT INTO agriculture_update_translations ("update_id", locale, title, body)
   SELECT id, 'bn', "title_bn", "body_bn" FROM agriculture_updates
   WHERE trim("title_bn") <> '' OR trim("body_bn") <> ''
   ON CONFLICT ("update_id", locale) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body`,
] as const;

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const statement of statements) await tx.$executeRawUnsafe(statement);
  });
  console.log("Translation backfill completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
