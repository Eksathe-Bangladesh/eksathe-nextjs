import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import bnMessages from "../messages/bn.json";
import enMessages from "../messages/en.json";
import { PrismaClient } from "../src/generated/prisma/client";
import { resolveCatalogPair } from "../src/i18n/catalog-data";
import { serviceDescriptionKey, serviceTitleKey } from "../src/lib/agriculture/service-messages";
import { agricultureServiceRegistry } from "../src/lib/agriculture/service-registry";
import { sectors } from "../src/lib/sectors";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const sector of sectors) {
    const savedSector = await prisma.sector.upsert({
      where: { slug: sector.slug },
      update: {
        position: sector.id,
        icon: sector.icon,
        status: sector.status === "live" ? "LIVE" : "COMING_SOON",
      },
      create: {
        slug: sector.slug,
        position: sector.id,
        icon: sector.icon,
        status: sector.status === "live" ? "LIVE" : "COMING_SOON",
      },
    });
    await prisma.sectorTranslation.upsert({
      where: { sectorSlug_locale: { sectorSlug: savedSector.slug, locale: "en" } },
      update: { title: enMessages.sectors[sector.slug] },
      create: {
        sectorSlug: savedSector.slug,
        locale: "en",
        title: enMessages.sectors[sector.slug],
      },
    });
    await prisma.sectorTranslation.upsert({
      where: { sectorSlug_locale: { sectorSlug: savedSector.slug, locale: "bn" } },
      update: { title: bnMessages.sectors[sector.slug] },
      create: {
        sectorSlug: savedSector.slug,
        locale: "bn",
        title: bnMessages.sectors[sector.slug],
      },
    });
  }

  for (const service of agricultureServiceRegistry) {
    const title = resolveCatalogPair(serviceTitleKey(service.slug));
    const description = resolveCatalogPair(serviceDescriptionKey(service.slug));
    const serviceData = {
      slug: service.slug,
      category: service.categoryId,
      icon: service.icon,
      formVersion: service.formVersion,
    };
    await prisma.serviceDefinition.upsert({
      where: { slug: service.slug },
      update: serviceData,
      create: serviceData,
    });
    const savedService = await prisma.serviceDefinition.findUniqueOrThrow({
      where: { slug: service.slug },
      select: { id: true },
    });
    await prisma.serviceDefinitionTranslation.upsert({
      where: { serviceDefinitionId_locale: { serviceDefinitionId: savedService.id, locale: "en" } },
      update: { title: title.en, description: description.en },
      create: {
        serviceDefinitionId: savedService.id,
        locale: "en",
        title: title.en,
        description: description.en,
      },
    });
    await prisma.serviceDefinitionTranslation.upsert({
      where: { serviceDefinitionId_locale: { serviceDefinitionId: savedService.id, locale: "bn" } },
      update: { title: title.bn, description: description.bn },
      create: {
        serviceDefinitionId: savedService.id,
        locale: "bn",
        title: title.bn,
        description: description.bn,
      },
    });
  }

  const commerceCategories = [
    { slug: "food-grocery", titleBn: "খাদ্য ও মুদি", titleEn: "Food & grocery" },
    { slug: "agriculture-supplies", titleBn: "কৃষি উপকরণ", titleEn: "Agriculture supplies" },
    { slug: "apparel", titleBn: "পোশাক", titleEn: "Apparel" },
    { slug: "home-household", titleBn: "গৃহস্থালি", titleEn: "Home & household" },
    { slug: "construction-materials", titleBn: "নির্মাণসামগ্রী", titleEn: "Construction materials" },
  ];
  for (const category of commerceCategories) {
    await prisma.commerceCategory.upsert({
      where: { slug: category.slug },
      update: { titleBn: category.titleBn, titleEn: category.titleEn },
      create: category,
    });
  }

  console.log(
    `Seeded ${sectors.length} sectors, ${agricultureServiceRegistry.length} service definitions and ${commerceCategories.length} commerce categories.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
