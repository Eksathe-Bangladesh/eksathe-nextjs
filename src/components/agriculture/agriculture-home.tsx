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
        const title = override?.title ?? t(serviceTitleKey(service.slug) as never);
        const description =
          override?.description ?? t(serviceDescriptionKey(service.slug) as never);
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
          {t("inline.back_to_dashboard")}
        </Link>
      )}

      <section className="border-primary/15 from-secondary/80 via-card to-card grid gap-8 overflow-hidden rounded-[2rem] border bg-linear-to-br p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-5">
            <BrandLogo />
          </div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            {t("inline.agriculture_services_across_bangladesh")}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("inline.grow_find_support_and_reach_markets_togeth")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            {t("inline.find_farm_products_workers_machinery_advic")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#marketplace" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              {t("inline.explore_marketplace")}
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
              title: t("inline.farm_services"),
              count: serviceCatalog.length,
            },
            { icon: "🛒", title: t("inline.marketplace"), count: listings.length },
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
              {t("inline.find_products_and_providers")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{t("inline.agriculture_marketplace")}</h2>
          </div>
          <Link
            href={`${routeBase}/market`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("inline.view_marketplace")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
        {unavailable && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
          >
            {t("inline.marketplace_listings_could_not_be_loaded_p")}
          </p>
        )}
        {!unavailable && listings.length === 0 ? (
          <div className="text-muted-foreground rounded-2xl border border-dashed p-6 text-sm">
            {t("inline.no_published_listings_yet_please_check_bac")}
          </div>
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
          <h2 className="mt-1 text-2xl font-bold">{t("inline.what_do_you_need_help_with")}</h2>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            {t("inline.choose_a_service_to_see_its_details_and_re")}
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
              placeholder={t("panels.searchAriaLabel")}
              aria-label={t("panels.searchAriaLabel")}
              className="pl-9"
            />
          </div>
          <NativeSelect
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("panels.categoryAriaLabel")}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <NativeSelectOption value="all">{t("inline.all_categories")}</NativeSelectOption>
            {agricultureServiceCategories.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {t(`agricultureCategories.${item.id}` as never)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {services.length === 0 ? (
          <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
            {t("inline.no_services_match_your_search")}
          </p>
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
                          {override?.title ?? t(serviceTitleKey(service.slug) as never)}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {override?.description ?? t(serviceDescriptionKey(service.slug) as never)}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground flex items-center justify-between text-xs">
                      <span>
                        {formatter.number(service.fields.length)} {t("inline.service_details")}
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
          <p className="text-primary text-sm font-semibold">{t("inline.commission_calculator")}</p>
          <h2 className="mt-1 text-2xl font-bold">{t("inline.estimate_the_platform_fee")}</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {t("inline.this_estimate_uses_the_current_agriculture")}
          </p>
        </div>
        <AgricultureCommissionCalculator ratePercent={publicInfo.commissionRate} />
      </section>

      <section className="bg-secondary/50 rounded-3xl border p-6 sm:p-8">
        <p className="text-primary text-sm font-semibold">
          {t("inline.reviewed_by_the_agriculture_team")}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {t("inline.market_prices_and_agriculture_updates")}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {t("inline.market_prices_news_advice_and_weather_aler")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`${routeBase}/market-prices`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("inline.market_prices")}
            </Link>
            <Link href={`${routeBase}/updates`} className={buttonVariants({ variant: "outline" })}>
              {t("inline.updates")}
            </Link>
          </div>
        </div>
        {publicInfo.unavailable ? (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {t("inline.published_information_is_temporarily_unava")}
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("inline.latest_market_prices")}</CardTitle>
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
                    {t("inline.no_published_market_prices_yet")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("inline.recent_updates")}</CardTitle>
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
                    {t("inline.no_current_agriculture_updates")}
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
          {t("inline.agriculture_support")}
        </h2>
        {publicInfo.unavailable ? (
          <p className="text-muted-foreground mt-2 text-sm">
            {t("inline.support_information_could_not_be_loaded")}
          </p>
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
            {t("inline.support_contact_details_have_not_been_conf")}
          </p>
        )}
      </section>
    </div>
  );
}
