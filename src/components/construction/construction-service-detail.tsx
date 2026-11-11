"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, MapPinIcon, StarIcon } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";

import { ListingImage } from "@/components/dashboard/listing-image";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyContent } from "@/components/ui/empty";
import { EmptyState } from "@/components/workflows/empty-state";
import { Link } from "@/i18n/navigation";
import type { ConstructionService } from "@/lib/construction/service-registry";
import type { ConstructionMarketResult } from "@/lib/listings";

export function ConstructionServiceDetail({
  service,
  routeBase,
  result,
}: {
  service: ConstructionService;
  routeBase: string;
  result: ConstructionMarketResult;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const projectHref = `/account/projects/new?service=${encodeURIComponent(service.slug)}`;
  const marketParams = new URLSearchParams({ type: service.kind });
  for (const term of service.searchTerms) marketParams.append("term", term);
  const formatMoney = (amount: string) =>
    formatter.number(Number(amount), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={routeBase}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("construction.serviceDetail.allConstructionServices")}
      </Link>
      <section className="border-primary/15 from-secondary/80 via-card to-card grid gap-6 rounded-[2rem] border bg-linear-to-br p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span aria-hidden="true" className="text-5xl">
            {service.icon}
          </span>
          <p className="text-primary mt-4 text-sm font-semibold">
            {t("construction.serviceDetail.label")}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {t(`constructionServices.${service.slug}.title`)}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-7">
            {t(`constructionServices.${service.slug}.description`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={projectHref} className={buttonVariants({ size: "lg" })}>
            {t("construction.serviceDetail.createAProjectForThisService")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
          <Link
            href={`${routeBase}/market?${marketParams}`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t("marketplace.actions.browse")}
          </Link>
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-primary text-sm font-semibold">
              {t("construction.serviceDetail.approvedConstructionListings")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {t("construction.serviceDetail.listingsFor", {
                service: t(`constructionServices.${service.slug}.title`).toLocaleLowerCase(),
              })}
            </h2>
          </div>
          <Link
            href={`${routeBase}/market?${marketParams}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("construction.serviceDetail.viewAllResults")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
        {result.unavailable ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-5 text-sm"
          >
            {t("workflow.dataUnavailable")}
          </p>
        ) : result.items.length === 0 ? (
          <EmptyState
            text={t("construction.serviceDetail.empty")}
            className="rounded-2xl border p-7"
            action={
              <EmptyContent>
                <Link href={projectHref} className={cn(buttonVariants({ variant: "outline" }))}>
                  {t("projects.actions.create")}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </EmptyContent>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((listing) => (
              <Card key={listing.id} className="h-full overflow-hidden">
                <ListingImage
                  listing={listing}
                  alt={listing.title}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <CardHeader>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon aria-hidden="true" className="size-4" />
                      {listing.district}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{listing.category}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {listing.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-primary font-semibold">
                      {formatMoney(listing.unitPrice)} / {listing.unit}
                    </span>
                    {listing.averageRating !== null && (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <StarIcon
                          aria-hidden="true"
                          className="size-4 fill-current text-amber-500"
                        />
                        {listing.averageRating.toFixed(1)} ({listing.reviewCount})
                      </span>
                    )}
                  </div>
                  <Link
                    href={`${routeBase}/listings/${listing.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
                  >
                    {t("workflow.details")}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
