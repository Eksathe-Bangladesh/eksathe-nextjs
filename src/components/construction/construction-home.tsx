"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, Building2Icon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ConstructionCommissionCalculator } from "@/components/construction/construction-commission-calculator";
import { ListingImage } from "@/components/dashboard/listing-image";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
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
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const services = useMemo(
    () =>
      constructionServiceRegistry.filter((service) => {
        const title = t(`constructionServices.${service.slug}.title` as never);
        const description = t(`constructionServices.${service.slug}.description` as never);
        const content = [title, description, service.slug, ...service.searchTerms]
          .join(" ")
          .toLocaleLowerCase();
        return (
          (!normalizedQuery || content.includes(normalizedQuery)) &&
          (category === "all" || service.group === category)
        );
      }),
    [normalizedQuery, category, t],
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
            {t("inline.construction_services_across_bangladesh")}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("inline.plan_your_build_and_find_the_right_people")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            {t("inline.find_approved_professionals_and_material_s")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`${routeBase}/market`}
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              {t("inline.explore_construction_marketplace")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="/account/projects/new?service=contractors"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {t("inline.start_a_project")}
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
                <p className="text-muted-foreground text-sm">
                  {t("inline.construction_service_areas")}
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
                <p className="text-muted-foreground text-sm">{t("inline.published_offers")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="marketplace" className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-primary text-sm font-semibold">
              {t("inline.professionals_and_materials")}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{t("inline.construction_marketplace")}</h2>
          </div>
          <Link
            href={`${routeBase}/market`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("inline.view_all_offers")}
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
            {t("inline.no_approved_construction_listings_yet_plea")}
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
            {t("inline.8_construction_service_areas")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {t("inline.what_do_you_need_for_your_project")}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            {t("inline.browse_an_approved_provider_or_create_a_pr")}
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
              placeholder={t("inline.search_construction_services")}
              aria-label={t("inline.search_construction_services")}
              className="pl-9"
            />
          </div>
          <NativeSelect
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label={t("inline.filter_by_service_area")}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <NativeSelectOption value="all">{t("inline.all_service_areas")}</NativeSelectOption>
            {constructionServiceCategories.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {t(`constructionCategories.${item.id}` as never)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {services.length === 0 ? (
          <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
            {t("inline.no_service_areas_match_your_search")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`${routeBase}/services/${service.slug}`}
                className="focus-visible:outline-primary rounded-2xl outline-offset-4 focus-visible:outline-2"
              >
                <Card className="hover:border-primary/40 h-full transition-colors">
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
                  <CardContent className="text-muted-foreground flex items-center justify-between text-xs">
                    <span>
                      {service.kind === "CONSTRUCTION_MATERIAL"
                        ? t("constructionCategories.materials")
                        : t("inline.find_professionals")}
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
          <p className="text-primary text-sm font-semibold">
            {t("inline.a_clear_way_to_organize_your_build")}
          </p>
          <h2 className="mt-1 text-2xl font-bold">{t("inline.how_construction_projects_work")}</h2>
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
                  className="bg-primary/10 flex size-10 items-center justify-center rounded-full text-xl"
                  aria-hidden="true"
                >
                  {step.icon}
                </span>
                <p className="text-primary text-xs font-semibold">{formatter.number(index + 1)}</p>
                <h3 className="font-semibold">{locale === "bn" ? step.titleBn : step.titleEn}</h3>
                <p className="text-muted-foreground text-sm leading-6">
                  {{ en: step.bodyEn, bn: step.bodyBn }[locale]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="commission"
        className="bg-secondary/40 grid items-center gap-6 rounded-3xl border p-5 sm:p-8 lg:grid-cols-2"
      >
        <div>
          <p className="text-primary text-sm font-semibold">{t("inline.commission_calculator")}</p>
          <h2 className="mt-1 text-2xl font-bold">{t("inline.estimate_the_platform_fee")}</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            {t("inline.the_estimate_uses_the_current_construction")}
          </p>
        </div>
        <ConstructionCommissionCalculator ratePercent={commissionRate} />
      </section>

      <section className="bg-card grid gap-4 rounded-3xl border p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <Building2Icon aria-hidden="true" className="text-primary mt-1 size-8 shrink-0" />
          <div>
            <h2 className="text-xl font-bold">{t("inline.keep_your_project_in_one_place")}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              {t("inline.track_providers_material_orders_project_mi")}
            </p>
          </div>
        </div>
        <Link
          href="/account/projects/new?service=contractors"
          className={buttonVariants({ size: "lg" })}
        >
          {t("inline.create_a_project")}
          <ArrowRightIcon data-icon="inline-end" />
        </Link>
      </section>
    </div>
  );
}
