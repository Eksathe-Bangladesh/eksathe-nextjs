"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { ServiceRequestForm } from "@/components/agriculture/service-request-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AgricultureServiceWithContent } from "@/lib/agriculture/service-registry";

export function AgricultureServiceDetail({
  service,
  routeBase,
  customer,
  emailVerified,
  localizedTitle,
  localizedDescription,
}: {
  service: AgricultureServiceWithContent;
  routeBase: string;
  customer: { name: string; phone: string } | null;
  emailVerified: boolean;
  localizedTitle: string;
  localizedDescription: string;
}) {
  const t = useTranslations();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href={routeBase}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("agriculture.services.all")}
      </Link>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start">
          <span aria-hidden="true" className="text-5xl">
            {service.icon}
          </span>
          <div>
            <p className="text-primary text-sm font-semibold">
              {localizedTitle}
            </p>
            <CardTitle className="mt-1 text-3xl">
              {localizedTitle}
            </CardTitle>
            <CardDescription className="mt-3 max-w-3xl text-base leading-7">
              {localizedDescription}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-muted-foreground text-sm leading-6">
            {t("agriculture.serviceDetail.coordinationNotice")}
          </p>
          <ServiceRequestForm
            service={service}
            routeBase={routeBase}
            customer={customer}
            emailVerified={emailVerified}
          />
          <div className="flex flex-wrap gap-3">
            <Link href={`${routeBase}/market`} className={buttonVariants({ variant: "outline" })}>
              {t("marketplace.actions.browse")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
