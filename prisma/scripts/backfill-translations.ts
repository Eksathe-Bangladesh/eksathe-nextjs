import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client";
import { locales } from "../../src/i18n/locales";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const supportedLocales = new Set<string>(locales);

function assertLocale(locale: string): asserts locale is (typeof locales)[number] {
  if (!supportedLocales.has(locale)) throw new Error(`Unsupported locale: ${locale}`);
}

async function main() {
  for (const locale of locales) assertLocale(locale);

  const [services, updates, sectors, providers, listings, notifications, prices, agricultureUpdates] =
    await Promise.all([
      prisma.serviceDefinition.findMany({
        select: { id: true, titleEn: true, titleBn: true, descriptionEn: true, descriptionBn: true },
      }),
      prisma.serviceRequestUpdate.findMany({
        select: { id: true, messageEn: true, messageBn: true },
      }),
      prisma.sector.findMany({ select: { slug: true, titleEn: true, titleBn: true } }),
      prisma.providerProfile.findMany({
        select: { id: true, nameEn: true, nameBn: true, bioEn: true, bioBn: true },
      }),
      prisma.marketplaceListing.findMany({
        select: {
          id: true,
          titleEn: true,
          titleBn: true,
          descriptionEn: true,
          descriptionBn: true,
        },
      }),
      prisma.notification.findMany({
        select: { id: true, titleEn: true, titleBn: true, messageEn: true, messageBn: true },
      }),
      prisma.agricultureMarketPrice.findMany({
        select: { id: true, productEn: true, productBn: true },
      }),
      prisma.agricultureUpdate.findMany({
        select: { id: true, titleEn: true, titleBn: true, bodyEn: true, bodyBn: true },
      }),
    ]);

  for (const row of services) {
    for (const [locale, title, description] of [
      ["en", row.titleEn, row.descriptionEn],
      ["bn", row.titleBn, row.descriptionBn],
    ] as const) {
      if (title.trim() || description.trim()) {
        await prisma.serviceDefinitionTranslation.upsert({
          where: { serviceDefinitionId_locale: { serviceDefinitionId: row.id, locale } },
          update: { title, description },
          create: { serviceDefinitionId: row.id, locale, title, description },
        });
      }
    }
  }

  for (const row of updates) {
    for (const [locale, message] of [
      ["en", row.messageEn],
      ["bn", row.messageBn],
    ] as const) {
      if (message?.trim()) {
        await prisma.serviceRequestUpdateTranslation.upsert({
          where: { requestUpdateId_locale: { requestUpdateId: row.id, locale } },
          update: { message },
          create: { requestUpdateId: row.id, locale, message },
        });
      }
    }
  }

  for (const row of sectors) {
    for (const [locale, title] of [
      ["en", row.titleEn],
      ["bn", row.titleBn],
    ] as const) {
      if (title.trim()) {
        await prisma.sectorTranslation.upsert({
          where: { sectorSlug_locale: { sectorSlug: row.slug, locale } },
          update: { title },
          create: { sectorSlug: row.slug, locale, title },
        });
      }
    }
  }

  for (const row of providers) {
    for (const [locale, name, bio] of [
      ["en", row.nameEn, row.bioEn],
      ["bn", row.nameBn, row.bioBn],
    ] as const) {
      if (name.trim() || bio.trim()) {
        await prisma.providerProfileTranslation.upsert({
          where: { providerId_locale: { providerId: row.id, locale } },
          update: { name, bio },
          create: { providerId: row.id, locale, name, bio },
        });
      }
    }
  }

  for (const row of listings) {
    for (const [locale, title, description] of [
      ["en", row.titleEn, row.descriptionEn],
      ["bn", row.titleBn, row.descriptionBn],
    ] as const) {
      if (title.trim() || description.trim()) {
        await prisma.marketplaceListingTranslation.upsert({
          where: { listingId_locale: { listingId: row.id, locale } },
          update: { title, description },
          create: { listingId: row.id, locale, title, description },
        });
      }
    }
  }

  for (const row of notifications) {
    for (const [locale, title, message] of [
      ["en", row.titleEn, row.messageEn],
      ["bn", row.titleBn, row.messageBn],
    ] as const) {
      if (title?.trim() || message?.trim()) {
        await prisma.notificationTranslation.upsert({
          where: { notificationId_locale: { notificationId: row.id, locale } },
          update: { title, message },
          create: { notificationId: row.id, locale, title, message },
        });
      }
    }
  }

  for (const row of prices) {
    for (const [locale, product] of [
      ["en", row.productEn],
      ["bn", row.productBn],
    ] as const) {
      if (product.trim()) {
        await prisma.agricultureMarketPriceTranslation.upsert({
          where: { marketPriceId_locale: { marketPriceId: row.id, locale } },
          update: { product },
          create: { marketPriceId: row.id, locale, product },
        });
      }
    }
  }

  for (const row of agricultureUpdates) {
    for (const [locale, title, body] of [
      ["en", row.titleEn, row.bodyEn],
      ["bn", row.titleBn, row.bodyBn],
    ] as const) {
      if (title.trim() || body.trim()) {
        await prisma.agricultureUpdateTranslation.upsert({
          where: { updateId_locale: { updateId: row.id, locale } },
          update: { title, body },
          create: { updateId: row.id, locale, title, body },
        });
      }
    }
  }

  console.log("Translation backfill completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
