import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import bnMessages from "../messages/bn.json";
import enMessages from "../messages/en.json";
import { PrismaClient } from "../src/generated/prisma/client";
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
        titleBn: bnMessages.sectors[sector.slug],
        titleEn: enMessages.sectors[sector.slug],
        icon: sector.icon,
        status: sector.status === "live" ? "LIVE" : "COMING_SOON",
      },
      create: {
        slug: sector.slug,
        position: sector.id,
        titleBn: bnMessages.sectors[sector.slug],
        titleEn: enMessages.sectors[sector.slug],
        icon: sector.icon,
        status: sector.status === "live" ? "LIVE" : "COMING_SOON",
      },
    });
    await prisma.sectorTranslation.upsert({
      where: { sectorSlug_locale: { sectorSlug: savedSector.slug, locale: "en" } },
      update: { title: enMessages.sectors[sector.slug] },
      create: { sectorSlug: savedSector.slug, locale: "en", title: enMessages.sectors[sector.slug] },
    });
    await prisma.sectorTranslation.upsert({
      where: { sectorSlug_locale: { sectorSlug: savedSector.slug, locale: "bn" } },
      update: { title: bnMessages.sectors[sector.slug] },
      create: { sectorSlug: savedSector.slug, locale: "bn", title: bnMessages.sectors[sector.slug] },
    });
  }

  for (const service of agricultureServiceRegistry) {
    const serviceData = {
      slug: service.slug,
      titleBn: service.titleBn,
      titleEn: service.titleEn,
      category: service.category,
      descriptionBn: service.descriptionBn,
      descriptionEn: service.descriptionEn,
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
      update: { title: service.titleEn, description: service.descriptionEn },
      create: {
        serviceDefinitionId: savedService.id,
        locale: "en",
        title: service.titleEn,
        description: service.descriptionEn,
      },
    });
    await prisma.serviceDefinitionTranslation.upsert({
      where: { serviceDefinitionId_locale: { serviceDefinitionId: savedService.id, locale: "bn" } },
      update: { title: service.titleBn, description: service.descriptionBn },
      create: {
        serviceDefinitionId: savedService.id,
        locale: "bn",
        title: service.titleBn,
        description: service.descriptionBn,
      },
    });
  }

  console.log(
    `Seeded ${sectors.length} sectors and ${agricultureServiceRegistry.length} service definitions.`,
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
