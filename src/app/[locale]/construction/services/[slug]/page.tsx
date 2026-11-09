import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ConstructionServicePage } from "@/components/construction/construction-service-page";
import { localizedCanonical } from "@/i18n/metadata";
import {
  constructionServiceRegistry,
  getConstructionService,
} from "@/lib/construction/service-registry";

export function generateStaticParams() {
  return constructionServiceRegistry.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getConstructionService(slug);
  if (!service) notFound();
  const t = await getTranslations();
  return {
    title: `${t(`constructionServices.${service.slug}.title`)} | ${t("common.brandName")}`,
    alternates: { canonical: await localizedCanonical(`/construction/services/${slug}`) },
  };
}

export default async function DirectServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ConstructionServicePage slug={slug} routeBase="/construction" />;
}
