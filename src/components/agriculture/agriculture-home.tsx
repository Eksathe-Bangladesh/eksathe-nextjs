"use client";

import { cn } from "cn";
import { ArrowRightIcon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import { useMemo, useState } from "react";

import { AgricultureCommissionCalculator } from "@/components/agriculture/agriculture-commission-calculator";
import { BrandLogo } from "@/components/brand-logo";
import { ListingImage } from "@/components/dashboard/listing-image";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AgriculturePublicService } from "@/lib/agriculture/admin";
import type { AgriculturePublicInfo } from "@/lib/agriculture/publishing";
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
  const english = locale === "en";
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const services = useMemo(
    () =>
      agricultureServiceRegistry.filter((service) => {
        const override = serviceCatalog.find((item) => item.slug === service.slug);
        const content =
          `${override?.titleEn ?? service.titleEn} ${override?.titleBn ?? service.titleBn} ${override?.descriptionEn ?? service.descriptionEn} ${override?.descriptionBn ?? service.descriptionBn} ${service.slug}`.toLocaleLowerCase();
        return (
          serviceCatalog.some((item) => item.slug === service.slug) &&
          (!normalizedQuery || content.includes(normalizedQuery)) &&
          (category === "all" || service.categoryId === category)
        );
      }),
    [serviceCatalog, normalizedQuery, category],
  );
  const formatMoney = (amount: string) =>
    formatter.number(Number(amount), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-14 px-4 py-8 sm:px-6 sm:py-12">
      {showDashboardBackLink && (
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← {t("inline.back_to_dashboard_2v17ca")}
        </Link>
      )}

      <section className="grid gap-8 overflow-hidden rounded-[2rem] border border-primary/15 bg-linear-to-br from-secondary/80 via-card to-card p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-5">
            <BrandLogo />
          </div>
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {t("inline.agriculture_services_across_bangladesh_g8at01")}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("inline.grow_find_support_and_reach_markets_togeth_1er5pts")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t("inline.find_farm_products_workers_machinery_advic_uc8tlf")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#marketplace" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              {t("inline.explore_marketplace_fbjfqd")}
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
              title: t("inline.farm_services_1x1k32o"),
              count: serviceCatalog.length,
            },
            { icon: "🛒", title: t("inline.marketplace_rtfmqm"), count: listings.length },
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
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="marketplace" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              {t("inline.find_products_and_providers_1rc7kvb")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {t("inline.agriculture_marketplace_1ufcijx")}
            </h2>
          </div>
          <Link
            href={`${routeBase}/market`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("inline.view_marketplace_11lxz73")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
        {unavailable && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {t("inline.marketplace_listings_could_not_be_loaded_p_97902w")}
          </p>
        )}
        {!unavailable && listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            {t("inline.no_published_listings_yet_please_check_bac_11mj298")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.slice(0, 3).map((listing) => (
              <Link
                key={listing.id}
                href={`${routeBase}/listings/${listing.id}`}
                className="rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <ListingImage
                    listing={listing}
                    alt={english ? listing.titleEn : listing.titleBn}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <CardHeader>
                    <CardTitle>{english ? listing.titleEn : listing.titleBn}</CardTitle>
                    <CardDescription>
                      {english ? listing.providerNameEn : listing.providerNameBn} ·{" "}
                      {listing.district}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {english ? listing.descriptionEn : listing.descriptionBn}
                    </p>
                    <p className="mt-3 font-semibold text-primary">
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
          <p className="text-sm font-semibold text-primary">
            {formatter.number(services.length)} {t("home.agricultureServicesCount")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {t("inline.what_do_you_need_help_with_1h91swe")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("inline.choose_a_service_to_see_its_details_and_re_8bsvex")}
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("inline.search_services_8c7uub")}
              aria-label={t("inline.search_services_8c7uub")}
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("inline.filter_by_category_r4wwg6")}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">{t("inline.all_categories_qpnbu")}</option>
            {agricultureServiceCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`agricultureCategories.${item.id}` as never)}
              </option>
            ))}
          </select>
        </div>
        {services.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("inline.no_services_match_your_search_gb0nca")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const override = serviceCatalog.find((item) => item.slug === service.slug);
              return (
                <Link
                  key={service.slug}
                  href={`${routeBase}/services/${service.slug}`}
                  className="rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader className="flex-row items-start gap-3">
                      <span aria-hidden="true" className="text-3xl">
                        {override?.icon ?? service.icon}
                      </span>
                      <div>
                        <CardTitle className="text-base">
                          {english
                            ? (override?.titleEn ??
                              t(`agricultureServices.${service.slug}.title` as never))
                            : (override?.titleBn ??
                              t(`agricultureServices.${service.slug}.title` as never))}
                        </CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {english
                            ? (override?.descriptionEn ??
                              t(`agricultureServices.${service.slug}.description` as never))
                            : (override?.descriptionBn ??
                              t(`agricultureServices.${service.slug}.description` as never))}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatter.number(service.fields.length)}{" "}
                        {t("inline.service_details_1a6x8nu")}
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
        className="grid items-center gap-6 rounded-3xl border bg-secondary/40 p-5 sm:p-8 lg:grid-cols-2"
      >
        <div>
          <p className="text-sm font-semibold text-primary">
            {t("inline.commission_calculator_1rnx2pf")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {t("inline.estimate_the_platform_fee_uiwzmc")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("inline.this_estimate_uses_the_current_agriculture_burysh")}
          </p>
        </div>
        <AgricultureCommissionCalculator ratePercent={publicInfo.commissionRate} />
      </section>

      <section className="rounded-3xl border bg-secondary/50 p-6 sm:p-8">
        <p className="text-sm font-semibold text-primary">
          {t("inline.reviewed_by_the_agriculture_team_6bga3j")}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {t("inline.market_prices_and_agriculture_updates_ndthf")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("inline.market_prices_news_advice_and_weather_aler_sgubuu")}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`${routeBase}/market-prices`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("inline.market_prices_1ahmufv")}
            </Link>
            <Link href={`${routeBase}/updates`} className={buttonVariants({ variant: "outline" })}>
              {t("inline.updates_12jzrl0")}
            </Link>
          </div>
        </div>
        {publicInfo.unavailable ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t("inline.published_information_is_temporarily_unava_crkzxm")}
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("inline.latest_market_prices_1nl26wh")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {publicInfo.prices.length ? (
                  publicInfo.prices.slice(0, 3).map((price) => (
                    <p key={price.id} className="text-sm">
                      <strong>{english ? price.productEn : price.productBn}</strong> ·{" "}
                      {price.market}, {price.district} · {formatMoney(price.price)} / {price.unit}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("inline.no_published_market_prices_yet_9l0zbp")}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("inline.recent_updates_1jqm1ir")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {publicInfo.updates.length ? (
                  publicInfo.updates.slice(0, 3).map((update) => (
                    <p key={update.id} className="text-sm">
                      <strong>{english ? update.titleEn : update.titleBn}</strong> ·{" "}
                      {formatter.dateTime(new Date(update.publishedAt), {
                        dateStyle: "medium",
                        timeZone: "Asia/Dhaka",
                      })}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("inline.no_current_agriculture_updates_1q8ia7k")}
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
          {t("inline.agriculture_support_1yks74p")}
        </h2>
        {publicInfo.unavailable ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("inline.support_information_could_not_be_loaded_17qaam5")}
          </p>
        ) : publicInfo.support &&
          (publicInfo.support.phone ||
            publicInfo.support.email ||
            publicInfo.support.messageBn ||
            publicInfo.support.messageEn) ? (
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <p>{english ? publicInfo.support.messageEn : publicInfo.support.messageBn}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {publicInfo.support.phone && (
                <a
                  className="font-medium text-primary hover:underline"
                  href={`tel:${publicInfo.support.phone.replace(/[^+\d]/g, "")}`}
                >
                  {publicInfo.support.phone}
                </a>
              )}
              {publicInfo.support.email && (
                <a
                  className="font-medium text-primary hover:underline"
                  href={`mailto:${publicInfo.support.email}`}
                >
                  {publicInfo.support.email}
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("inline.support_contact_details_have_not_been_conf_1i3gxk5")}
          </p>
        )}
      </section>
    </div>
  );
}
