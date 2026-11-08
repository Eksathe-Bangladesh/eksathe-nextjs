import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { locales } from "../../src/i18n/locales";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function report(
  name: string,
  counts: Promise<Array<{ locale: string }>>,
  missingEnglish: Promise<number>,
) {
  const rows = await counts;
  const byLocale = Object.fromEntries(
    locales.map((locale) => [locale, rows.filter((row) => row.locale === locale).length]),
  );
  console.log(`${name}: ${JSON.stringify(byLocale)}, missing en: ${await missingEnglish}`);
}

async function main() {
  await report(
    "ServiceDefinition",
    prisma.serviceDefinitionTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM panels p
      WHERE NOT EXISTS (
        SELECT 1 FROM panel_translations t
        WHERE t.service_definition_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "ServiceRequestUpdate",
    prisma.serviceRequestUpdateTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM service_request_updates p
      WHERE NOT EXISTS (
        SELECT 1 FROM service_request_update_translations t
        WHERE t.request_update_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "Sector",
    prisma.sectorTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM sectors p
      WHERE NOT EXISTS (
        SELECT 1 FROM sector_translations t
        WHERE t.sector_slug = p.slug AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "ProviderProfile",
    prisma.providerProfileTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM provider_profiles p
      WHERE NOT EXISTS (
        SELECT 1 FROM provider_profile_translations t
        WHERE t.provider_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "MarketplaceListing",
    prisma.marketplaceListingTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM marketplace_listings p
      WHERE NOT EXISTS (
        SELECT 1 FROM marketplace_listing_translations t
        WHERE t.listing_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "Notification",
    prisma.notificationTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM notifications p
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_translations t
        WHERE t.notification_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "AgricultureMarketPrice",
    prisma.agricultureMarketPriceTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM agriculture_market_prices p
      WHERE NOT EXISTS (
        SELECT 1 FROM agriculture_market_price_translations t
        WHERE t.market_price_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
  await report(
    "AgricultureUpdate",
    prisma.agricultureUpdateTranslation.findMany({ select: { locale: true } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM agriculture_updates p
      WHERE NOT EXISTS (
        SELECT 1 FROM agriculture_update_translations t
        WHERE t.update_id = p.id AND t.locale = 'en'
      )
    `.then(([row]) => Number(row.count)),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
