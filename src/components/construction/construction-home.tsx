"use client";

import { cn } from "cn";
import { ArrowRightIcon, Building2Icon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ConstructionCommissionCalculator } from "@/components/construction/construction-commission-calculator";
import { ListingImage } from "@/components/dashboard/listing-image";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  constructionServiceCategories,
  constructionServiceRegistry,
} from "@/lib/construction/service-registry";
import type { PublicListing } from "@/lib/listings";

export function ConstructionHome({
  routeBase,
  showDashboardBackLink,
  listings,
  unavailable,
  commissionRate,
}: {
  routeBase: string;
  showDashboardBackLink: boolean;
  listings: PublicListing[];
  unavailable: boolean;
  commissionRate: string | null;
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
      constructionServiceRegistry.filter((service) => {
        const content =
          `${service.titleEn} ${service.titleBn} ${service.descriptionEn} ${service.descriptionBn} ${service.slug}`.toLocaleLowerCase();
        return (
          (!normalizedQuery || content.includes(normalizedQuery)) &&
          (category === "all" || service.group === category)
        );
      }),
    [normalizedQuery, category],
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
            {t("inline.construction_services_across_bangladesh_sgrzhm")}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("inline.plan_your_build_and_find_the_right_people_1u905pu")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t("inline.find_approved_professionals_and_material_s_1of70ek")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`${routeBase}/market`}
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              {t("inline.explore_construction_marketplace_1210lvr")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="/account/projects/new?service=contractors"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {t("inline.start_a_project_1tk0yro")}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="min-h-36">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <span className="text-4xl" aria-hidden="true">
                👷
              </span>
              <div>
                <p className="text-2xl font-bold">
                  {formatter.number(constructionServiceRegistry.length)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("inline.construction_service_areas_1fwvn52")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="min-h-36">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <span className="text-4xl" aria-hidden="true">
                🧱
              </span>
              <div>
                <p className="text-2xl font-bold">{formatter.number(listings.length)}</p>
                <p className="text-sm text-muted-foreground">
                  {t("inline.published_offers_181lve9")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="marketplace" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              {t("inline.professionals_and_materials_1d2igvn")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {t("inline.construction_marketplace_1d9og8y")}
            </h2>
          </div>
          <Link
            href={`${routeBase}/market`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("inline.view_all_offers_jpb7ai")}
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
            {t("inline.no_approved_construction_listings_yet_plea_eqf7os")}
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
            {t("inline.8_construction_service_areas_1jvofqa")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {t("inline.what_do_you_need_for_your_project_1u3al0")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("inline.browse_an_approved_provider_or_create_a_pr_kxlufj")}
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
              placeholder={t("inline.search_construction_services_1cd8gib")}
              aria-label={t("inline.search_construction_services_1cd8gib")}
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("inline.filter_by_service_area_17ejr7w")}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">{t("inline.all_service_areas_1x8orpz")}</option>
            {constructionServiceCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {t(`constructionCategories.${item.id}` as never)}
              </option>
            ))}
          </select>
        </div>
        {services.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("inline.no_service_areas_match_your_search_1n05vd6")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`${routeBase}/services/${service.slug}`}
                className="rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="flex-row items-start gap-3">
                    <span aria-hidden="true" className="text-3xl">
                      {service.icon}
                    </span>
                    <div>
                      <CardTitle className="text-base">
                        {t(`constructionServices.${service.slug}.title` as never)}
                      </CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {t(`constructionServices.${service.slug}.description` as never)}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {service.kind === "CONSTRUCTION_MATERIAL"
                        ? t("inline.materials_1i2zdwy")
                        : t("inline.find_professionals_1svymkf")}
                    </span>
                    <ArrowRightIcon aria-hidden="true" className="size-4" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="how" className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-primary">
            {t("inline.a_clear_way_to_organize_your_build_11mvr7p")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {t("inline.how_construction_projects_work_pdcpmd")}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: "📝",
              titleEn: "Describe the work",
              titleBn: "কাজের বিবরণ দিন",
              bodyEn: "Create a private project with location, scope, budget, and dates.",
              bodyBn: "অবস্থান, কাজের পরিধি, বাজেট ও তারিখ দিয়ে ব্যক্তিগত প্রকল্প তৈরি করুন।",
            },
            {
              icon: "📨",
              titleEn: "Invite providers",
              titleBn: "সেবাদাতাদের আমন্ত্রণ",
              bodyEn: "Share each work package with approved professionals or suppliers.",
              bodyBn: "প্রতিটি কাজের প্যাকেজ অনুমোদিত পেশাজীবী বা সরবরাহকারীদের পাঠান।",
            },
            {
              icon: "⚖️",
              titleEn: "Compare and agree",
              titleBn: "তুলনা করে সম্মত হন",
              bodyEn: "Review scope, price, transport, and schedule before accepting a quote.",
              bodyBn: "দরপ্রস্তাব গ্রহণের আগে কাজ, মূল্য, পরিবহন ও সময়সূচি তুলনা করুন।",
            },
            {
              icon: "✅",
              titleEn: "Track to handover",
              titleBn: "কাজ শেষ করে হস্তান্তর",
              bodyEn: "Follow milestones and payment records, then confirm completed work.",
              bodyBn: "মাইলফলক ও পেমেন্টের তথ্য দেখুন, কাজ শেষে সম্পন্ন হওয়া নিশ্চিত করুন।",
            },
          ].map((step, index) => (
            <Card key={step.titleEn}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <span
                  className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-xl"
                  aria-hidden="true"
                >
                  {step.icon}
                </span>
                <p className="text-xs font-semibold text-primary">{formatter.number(index + 1)}</p>
                <h3 className="font-semibold">{english ? step.titleEn : step.titleBn}</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {english ? step.bodyEn : step.bodyBn}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

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
            {t("inline.the_estimate_uses_the_current_construction_1fxpsqc")}
          </p>
        </div>
        <ConstructionCommissionCalculator ratePercent={commissionRate} />
      </section>

      <section className="grid gap-4 rounded-3xl border bg-card p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <Building2Icon aria-hidden="true" className="mt-1 size-8 shrink-0 text-primary" />
          <div>
            <h2 className="text-xl font-bold">
              {t("inline.keep_your_project_in_one_place_r8vy6r")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("inline.track_providers_material_orders_project_mi_fmixtg")}
            </p>
          </div>
        </div>
        <Link
          href="/account/projects/new?service=contractors"
          className={buttonVariants({ size: "lg" })}
        >
          {t("inline.create_a_project_dhtxqj")}
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </section>
    </div>
  );
}
