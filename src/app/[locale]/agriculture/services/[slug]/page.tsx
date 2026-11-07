import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AgricultureServiceDetail } from "@/components/agriculture/agriculture-service-detail";
import { DetailPageSkeleton } from "@/components/skeletons/page-skeletons";
import { localizedCanonical } from "@/i18n/metadata";
import { getActiveAgricultureService } from "@/lib/agriculture/admin";
import { agricultureServiceRegistry } from "@/lib/agriculture/service-registry";
import { getCurrentUser } from "@/lib/dal";

export function generateStaticParams() {
  return agricultureServiceRegistry.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const registryService = agricultureServiceRegistry.find((item) => item.slug === slug);
  const serviceDefinition = await getActiveAgricultureService(slug);
  if (!registryService || !serviceDefinition) notFound();
  const service = {
    ...registryService,
    titleBn: serviceDefinition.titleBn,
    titleEn: serviceDefinition.titleEn,
    descriptionBn: serviceDefinition.descriptionBn,
    descriptionEn: serviceDefinition.descriptionEn,
    icon: serviceDefinition.icon,
  };
  const locale = await getLocale();
  const t = await getTranslations();
  return {
    title: `${locale === "bn" ? service.titleBn : service.titleEn} | ${t("common.brandName")}`,
    alternates: { canonical: await localizedCanonical(`/agriculture/services/${service.slug}`) },
  };
}

async function AgricultureServiceContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const registryService = agricultureServiceRegistry.find((item) => item.slug === slug);
  const serviceDefinition = await getActiveAgricultureService(slug);
  if (!registryService || !serviceDefinition) notFound();
  const service = {
    ...registryService,
    titleBn: serviceDefinition.titleBn,
    titleEn: serviceDefinition.titleEn,
    descriptionBn: serviceDefinition.descriptionBn,
    descriptionEn: serviceDefinition.descriptionEn,
    icon: serviceDefinition.icon,
  };
  const user = await getCurrentUser();
  const customer = user?.status === "active" ? { name: user.name, phone: user.phone } : null;
  return (
    <AgricultureServiceDetail
      service={service}
      routeBase="/agriculture"
      customer={customer}
      emailVerified={Boolean(user?.emailVerified)}
    />
  );
}

export default function AgricultureServicePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <AgricultureServiceContent params={params} />
    </Suspense>
  );
}
