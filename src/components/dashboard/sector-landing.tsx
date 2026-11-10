"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { useMemo, useState } from "react";

import { ListingImage } from "@/components/dashboard/listing-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
import type { PublicListing } from "@/lib/listings";
import type { agricultureListings, constructionListings, SectorDefinition } from "@/lib/sectors";

type Service = (typeof agricultureListings)[number] | (typeof constructionListings)[number];

export function SectorLanding({
  sector,
  listings,
  unavailable = false,
  services,
}: {
  sector: SectorDefinition;
  listings: PublicListing[];
  unavailable?: boolean;
  services: Service[];
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const title = t(`sectors.${sector.slug}`);
  const price = (value: string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const districts = useMemo(
    () => Array.from(new Set(listings.map((listing) => listing.district))).sort(),
    [listings],
  );
  const term = query.trim().toLowerCase();
  const matches = (listing: PublicListing) => {
    const searchable =
      `${listing.title} ${listing.description} ${listing.category} ${listing.district}`.toLowerCase();
    return (!term || searchable.includes(term)) && (!district || listing.district === district);
  };

  return (
    <div className="mx-auto flex w-full max-w-360 flex-col gap-9 px-4 py-8 sm:px-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("nav.browse")}
      </Link>
      <section className="border-border/70 bg-card rounded-3xl border p-6 shadow-xs sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-5xl" aria-hidden="true">
              {sector.icon}
            </span>
            <div>
              <p className="text-primary text-xs font-semibold tracking-wide uppercase">{title}</p>
              <h1 className="text-foreground mt-1 text-3xl font-bold tracking-tight">{title}</h1>
            </div>
          </div>
          {sector.status === "live" && (
            <span className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-xs font-semibold">
              {t("nav.live")}
            </span>
          )}
        </div>
        {sector.status !== "live" ? (
          <p className="text-muted-foreground mt-6 max-w-xl text-sm leading-6">
            {t("nav.comingSoon")}
          </p>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {services.map((service) => (
              <a
                key={service.slug}
                href={`#${service.slug}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
              >
                <span aria-hidden="true">{service.icon}</span>
                {t(`marketplaceServices.${service.slug}`)}
              </a>
            ))}
            {sector.slug === "construction" && (
              <Link href="/account/projects/new" className={buttonVariants({ size: "sm" })}>
                <PlusIcon data-icon="inline-start" />
                {t("projects.actions.create")}
              </Link>
            )}
          </div>
        )}
      </section>

      {sector.status === "live" && (
        <div className="flex flex-col gap-10">
          <div className="border-border/70 bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("workflow.searchListings")}
              aria-label={t("workflow.searchListings")}
            />
            <NativeSelect
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              aria-label={t("workflow.district")}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">{t("workflow.allDistricts")}</NativeSelectOption>
              {districts.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {item}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {unavailable && (
            <p
              role="alert"
              className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
            >
              {t("workflow.dataUnavailable")}
            </p>
          )}
          {services.map((service) => {
            const serviceListings = listings.filter(
              (listing) => listing.kind === service.kind && matches(listing),
            );
            return (
              <section
                key={service.slug}
                id={service.slug}
                className="flex scroll-mt-24 flex-col gap-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-foreground text-xl font-bold">
                      {t(`marketplaceServices.${service.slug}`)}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {t("dashboard.sector.availableListings", { count: serviceListings.length })}
                    </p>
                  </div>
                </div>
                {serviceListings.length === 0 && !unavailable ? (
                  <div className="border-border bg-card/70 rounded-2xl border border-dashed px-5 py-6">
                    <p className="text-muted-foreground text-sm">{t("dashboard.sector.empty")}</p>
                    <Link
                      href="/provider"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
                    >
                      {t("dashboard.sector.applyToProvide")}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {serviceListings.map((listing) => (
                      <Link
                        key={listing.id}
                        href={`/dashboard/${sector.slug}/listings/${listing.id}`}
                        className="focus-visible:outline-primary rounded-2xl outline-offset-4 focus-visible:outline-2"
                      >
                        <Card className="hover:border-primary/40 h-full transition-colors">
                          <ListingImage
                            listing={listing}
                            alt={listing.title}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          <CardHeader>
                            <CardTitle>{listing.title}</CardTitle>
                            <CardDescription>
                              {listing.providerName} · {listing.district}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-muted-foreground line-clamp-2 text-sm">
                              {listing.description}
                            </p>
                            <div className="mt-4 flex items-center justify-between gap-2">
                              <span className="text-primary font-semibold">
                                {price(listing.unitPrice)} / {listing.unit}
                              </span>
                              <Button tabIndex={-1} size="sm" variant="outline">
                                {t("common.actions.view")}
                                <ArrowRightIcon data-icon="inline-end" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
