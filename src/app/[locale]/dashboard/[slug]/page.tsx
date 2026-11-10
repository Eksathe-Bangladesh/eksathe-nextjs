import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { SectorLanding } from "@/components/dashboard/sector-landing";
import { getLocaleOrDefault } from "@/i18n/locales";
import { getPublicListings } from "@/lib/listings";
import { getSector, agricultureListings, constructionListings, sectors } from "@/lib/sectors";

export function generateStaticParams() {
  return sectors.map((s) => ({ slug: s.slug }));
}

type SectorPageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: SectorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sector = getSector(slug);
  if (!sector) notFound();
  const [sectors, metadata] = await Promise.all([
    getTranslations("sectors"),
    getTranslations("metadata"),
  ]);
  return {
    title: metadata("sectorTitle", { sector: sectors(sector.slug) }),
    description: metadata("sectorDescription", { sector: sectors(sector.slug) }),
  };
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { locale: routeLocale, slug } = await params;
  const locale = getLocaleOrDefault(routeLocale);
  const sector = getSector(slug);
  if (!sector) notFound();

  if (sector.status !== "live") {
    return <SectorLanding sector={sector} listings={[]} services={[]} />;
  }

  const isAgriculture = slug === "agriculture-labor";
  const services = isAgriculture ? agricultureListings : constructionListings;
  const listingResult = await getPublicListings(slug, locale);
  return (
    <SectorLanding
      sector={sector}
      listings={listingResult.items}
      unavailable={listingResult.unavailable}
      services={[...services]}
    />
  );
}
