"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import { useMemo, useState } from "react";

import { AgricultureCommissionCalculator } from "@/components/agriculture/agriculture-commission-calculator";
import { BrandLogo } from "@/components/brand-logo";
import { ListingImage } from "@/components/dashboard/listing-image";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EmptyState } from "@/components/workflows/empty-state";
import { Link } from "@/i18n/navigation";
import type { AgriculturePublicService } from "@/lib/agriculture/admin";
import type { AgriculturePublicInfo } from "@/lib/agriculture/publishing";
import { serviceDescriptionKey, serviceTitleKey } from "@/lib/agriculture/service-messages";
import {
  agricultureServiceCategories,
  agricultureServiceRegistry,
} from "@/lib/agriculture/service-registry";
import type { PublicListing } from "@/lib/listings";

export function AgricultureHome({
  routeBase,
  showDashboardBackLink,
  listings,
  unavailable,
  publicInfo,
  serviceCatalog,
}: {
  routeBase: string;
  showDashboardBackLink: boolean;
  listings: PublicListing[];
  unavailable: boolean;
  publicInfo: AgriculturePublicInfo;
  serviceCatalog: AgriculturePublicService[];
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const services = useMemo(
    () =>
      agricultureServiceRegistry.filter((service) => {
        const override = serviceCatalog.find((item) => item.slug === service.slug);
        const title = override?.title ?? t(serviceTitleKey(service.slug));
        const description = override?.description ?? t(serviceDescriptionKey(service.slug));
        const content = `${title} ${description} ${service.slug}`.toLocaleLowerCase();
        return (
          serviceCatalog.some((item) => item.slug === service.slug) &&
          (!normalizedQuery || content.includes(normalizedQuery)) &&
          (category === "all" || service.categoryId === category)
        );
      }),
    [serviceCatalog, normalizedQuery, category, t],
  );
  const formatMoney = (amount: string) =>
    formatter.number(Number(amount), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });

  return (
    <div className="mx-auto flex w-full max-w-360 flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12">
      {showDashboardBackLink && (
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground -mb-3 inline-flex w-fit items-center gap-2 px-2 text-sm font-medium"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("dashboard.actions.back")}
        </Link>
      )}

      <section className="border-primary/15 from-secondary/80 via-card to-card grid gap-8 overflow-hidden rounded-[2rem] border bg-linear-to-br p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-5">
            <BrandLogo />
          </div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            {t("agriculture.home.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("agriculture.home.title")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            {t("agriculture.home.description")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#marketplace" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              {t("agriculture.home.exploreMarketplace")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link href="#services" className={buttonVariants({ variant: "outline", size: "lg" })}>
              {t("home.browse")}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            {
              icon: "🌾",
              title: t("agriculture.home.farmServices"),
              count: serviceCatalog.length,
            },
            { icon: "🛒", title: t("agriculture.home.marketplace"), count: listings.length },
          ].map((item) => (
            <Card key={item.title} className="min-h-36">
              <CardContent className="flex h-full flex-col justify-between p-5">
                <span className="text-4xl" aria-hidden="true">
                  {item.icon}
                </span>
                <div>
                  <p className="text-2xl font-bold">
                    {formatter.number(item.count)}
                    {item.icon === "🌾" ? "+" : ""}
                  </p>
                  <p className="text-muted-foreground text-sm">{item.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="marketplace" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-primary text-sm font-semibold">
              {t("agriculture.home.findProductsAndProviders")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{t("agriculture.market.name")}</h2>
          </div>
          <Link
            href={`${routeBase}/market`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("agriculture.home.viewMarketplace")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
        {unavailable && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
          >
            {t("marketplace.listings.loadError")}
          </p>
        )}
        {!unavailable && listings.length === 0 ? (
          <EmptyState text={t("agriculture.home.emptyListings")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.slice(0, 3).map((listing) => (
              <Link
                key={listing.id}
                href={`${routeBase}/listings/${listing.id}`}
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
                    <p className="text-primary mt-3 font-semibold">
                      {formatMoney(listing.unitPrice)} / {listing.unit}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="services" className="flex scroll-mt-24 flex-col gap-5">
        <div>
          <p className="text-primary text-sm font-semibold">
            {formatter.number(services.length)} {t("home.agricultureServicesCount")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{t("agriculture.services.title")}</h2>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            {t("agriculture.services.description")}
          </p>
        </div>
        <div className="border-border/70 bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("agriculture.services.searchLabel")}
              aria-label={t("agriculture.services.searchLabel")}
              className="pl-9"
            />
          </div>
          <NativeSelect
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("agriculture.services.categoryLabel")}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <NativeSelectOption value="all">{t("common.labels.allCategories")}</NativeSelectOption>
            {agricultureServiceCategories.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {t(`agricultureCategories.${item.id}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {services.length === 0 ? (
          <EmptyState text={t("agriculture.services.empty")} className="rounded-2xl border p-8" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const override = serviceCatalog.find((item) => item.slug === service.slug);
              return (
                <Link
                  key={service.slug}
                  href={`${routeBase}/services/${service.slug}`}
                  className="focus-visible:outline-primary rounded-2xl outline-offset-4 focus-visible:outline-2"
                >
                  <Card className="hover:border-primary/40 h-full transition-colors">
                    <CardHeader className="flex-row items-start gap-3">
                      <span aria-hidden="true" className="text-3xl">
                        {override?.icon ?? service.icon}
                      </span>
                      <div>
                        <CardTitle className="text-base">
                          {override?.title ?? t(serviceTitleKey(service.slug))}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {override?.description ?? t(serviceDescriptionKey(service.slug))}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground flex items-center justify-between text-xs">
                      <span>
                        {formatter.number(service.fields.length)}{" "}
                        {t("agriculture.home.serviceDetails")}
                      </span>
                      <ArrowRightIcon aria-hidden="true" className="size-4" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <HowItWorksSection />
      <section
        id="commission"
        className="bg-secondary/40 grid items-center gap-6 rounded-3xl border p-5 sm:p-8 lg:grid-cols-2"
      >
        <div>
          <p className="text-primary text-sm font-semibold">
            {t("common.labels.commissionCalculator")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{t("common.labels.estimateThePlatformFee")}</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {t("agriculture.home.commissionNotice")}
          </p>
        </div>
        <AgricultureCommissionCalculator ratePercent={publicInfo.commissionRate} />
      </section>

      <section className="bg-secondary/50 rounded-3xl border p-6 sm:p-8">
        <p className="text-primary text-sm font-semibold">
          {t("agriculture.home.publicationsEyebrow")}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t("agriculture.home.publicationsTitle")}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {t("agriculture.home.publicationsDescription")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`${routeBase}/market-prices`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("agriculture.information.marketPrices")}
            </Link>
            <Link href={`${routeBase}/updates`} className={buttonVariants({ variant: "outline" })}>
              {t("common.labels.updates")}
            </Link>
          </div>
        </div>
        {publicInfo.unavailable ? (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {t("agriculture.home.publicationsUnavailable")}
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("agriculture.home.latestMarketPrices")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {publicInfo.prices.length ? (
                  publicInfo.prices.slice(0, 3).map((price) => (
                    <p key={price.id} className="text-sm">
                      <strong>{price.product}</strong> · {price.market}, {price.district} ·{" "}
                      {formatMoney(price.price)} / {price.unit}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("agriculture.information.emptyPrices")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("agriculture.home.recentUpdates")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {publicInfo.updates.length ? (
                  publicInfo.updates.slice(0, 3).map((update) => (
                    <p key={update.id} className="text-sm">
                      <strong>{update.title}</strong> ·{" "}
                      {formatter.dateTime(new Date(update.publishedAt), {
                        dateStyle: "medium",
                        timeZone: "Asia/Dhaka",
                      })}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("agriculture.home.noCurrentAgricultureUpdates")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section
        aria-labelledby="agriculture-support-heading"
        className="rounded-2xl border p-5 sm:p-6"
      >
        <h2 id="agriculture-support-heading" className="text-lg font-bold">
          {t("agriculture.support.title")}
        </h2>
        {publicInfo.unavailable ? (
          <p className="text-muted-foreground mt-2 text-sm">{t("agriculture.support.loadError")}</p>
        ) : publicInfo.support &&
          (publicInfo.support.phone ||
            publicInfo.support.email ||
            publicInfo.support.messageEn ||
            publicInfo.support.messageBn) ? (
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <p>{locale === "bn" ? publicInfo.support.messageBn : publicInfo.support.messageEn}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {publicInfo.support.phone && (
                <a
                  className="text-primary font-medium hover:underline"
                  href={`tel:${publicInfo.support.phone.replace(/[^+\d]/g, "")}`}
                >
                  {publicInfo.support.phone}
                </a>
              )}
              {publicInfo.support.email && (
                <a
                  className="text-primary font-medium hover:underline"
                  href={`mailto:${publicInfo.support.email}`}
                >
                  {publicInfo.support.email}
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">
            {t("agriculture.support.notConfigured")}
          </p>
        )}
      </section>
    </div>
  );
}
