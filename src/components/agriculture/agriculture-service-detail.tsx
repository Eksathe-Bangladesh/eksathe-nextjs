"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { ServiceRequestForm } from "@/components/agriculture/service-request-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgricultureServiceWithContent } from "@/lib/agriculture/service-registry";

export function AgricultureServiceDetail({
  service,
  routeBase,
  customer,
  emailVerified,
}: {
  service: AgricultureServiceWithContent;
  routeBase: string;
  customer: { name: string; phone: string } | null;
  emailVerified: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href={routeBase}
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("inline.all_agriculture_services_170e4nu")}
      </Link>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start">
          <span aria-hidden="true" className="text-5xl">
            {service.icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              {locale === "bn" ? service.titleBn : service.titleEn}
            </p>
            <CardTitle className="mt-1 text-3xl">
              {locale === "bn" ? service.titleBn : service.titleEn}
            </CardTitle>
            <CardDescription className="mt-3 max-w-3xl text-base leading-7">
              {locale === "bn" ? service.descriptionBn : service.descriptionEn}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm leading-6 text-muted-foreground">
            {t("inline.service_requests_are_reviewed_and_coordina_cb1lo1")}
          </p>
          <ServiceRequestForm
            service={service}
            routeBase={routeBase}
            customer={customer}
            emailVerified={emailVerified}
          />
          <div className="flex flex-wrap gap-3">
            <Link href={`${routeBase}/market`} className={buttonVariants({ variant: "outline" })}>
              {t("inline.browse_marketplace_1v4g2rg")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
