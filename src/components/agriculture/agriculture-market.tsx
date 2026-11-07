"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon, StarIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";

import { ListingImage } from "@/components/dashboard/listing-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AgricultureMarketFilters, AgricultureMarketResult } from "@/lib/listings";
import type { AgricultureProductCategory } from "@/lib/listings";

const categoryOptions: Array<{ value: AgricultureProductCategory; en: string; bn: string }> = [
  { value: "grains", en: "Grains", bn: "শস্য" },
  { value: "vegetables", en: "Vegetables", bn: "সবজি" },
  { value: "fruits", en: "Fruits", bn: "ফল" },
  { value: "dairy", en: "Dairy", bn: "দুগ্ধজাত" },
  { value: "fish", en: "Fish", bn: "মাছ" },
  { value: "spices", en: "Spices", bn: "মসলা" },
  { value: "other", en: "Other", bn: "অন্যান্য" },
];

export function AgricultureMarket({
  routeBase,
  filters,
  result,
}: {
  routeBase: string;
  filters: AgricultureMarketFilters;
  result: AgricultureMarketResult;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const bn = locale === "bn";
  const formatMoney = (amount: string) =>
    formatter.number(Number(amount), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  function pageHref(page: number) {
    const params = new URLSearchParams();
    for (const key of ["q", "category", "district", "minPrice", "maxPrice", "sort"] as const) {
      const value = filters[key];
      if (value) params.set(key, String(value));
    }
    params.set("page", String(page));
    return `${routeBase}/market?${params.toString()}`;
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 py-8 sm:px-6">
      <Link
        href={routeBase}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("inline.back_to_agriculture_qogfrr")}
      </Link>
      <header>
        <p className="text-primary text-sm font-semibold">
          {t("inline.agriculture_marketplace_1ufcijx")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t("inline.find_farm_products_1659zjw")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {t("inline.search_listings_by_seller_category_distric_tle0d8")}
        </p>
      </header>
      <form
        action={`${routeBase}/market`}
        method="get"
        className="border-border/70 bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-7"
      >
        <div className="relative lg:col-span-2">
          <SearchIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            className="pl-9"
            name="q"
            defaultValue={filters.q}
            placeholder={t("inline.search_products_or_sellers_xino0q")}
          />
        </div>
        <select
          name="category"
          defaultValue={filters.category ?? ""}
          aria-label={t("inline.category_s1i10e")}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">{t("inline.all_categories_1fiilwv")}</option>
          {categoryOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {bn ? item.bn : item.en}
            </option>
          ))}
        </select>
        <select
          name="district"
          defaultValue={filters.district ?? ""}
          aria-label={t("inline.district_135um58")}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <option value="">{t("workflow.allDistricts")}</option>
          {result.districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <Input
          name="minPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={filters.minPrice}
          aria-label={t("inline.minimum_price_m3t2c3")}
          placeholder={t("inline.min_bdt_1qs33m3")}
        />
        <Input
          name="maxPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={filters.maxPrice}
          aria-label={t("inline.maximum_price_x46h1l")}
          placeholder={t("inline.max_bdt_1kgb5of")}
        />
        <select
          name="sort"
          defaultValue={filters.sort ?? "newest"}
          aria-label={t("inline.sort_dj8kwt")}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <option value="newest">{t("inline.newest_1g4bhr8")}</option>
          <option value="price-asc">{t("inline.price_low_to_high_186nc0k")}</option>
          <option value="price-desc">{t("inline.price_high_to_low_1lcdsbe")}</option>
        </select>
        <input type="hidden" name="page" value="1" />
        <Button type="submit" className="lg:col-span-7">
          <SearchIcon data-icon="inline-start" />
          {t("inline.search_1n7yeyu")}
        </Button>
      </form>
      {result.unavailable ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
        >
          {t("workflow.dataUnavailable")}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {formatter.number(result.total)} {t("inline.listings_17wuylw")}
          </p>
          {result.items.length === 0 ? (
            <p className="border-border text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
              {t("inline.no_published_products_match_these_filters__12lylnw")}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((listing) => (
                <Card key={listing.id} className="h-full overflow-hidden">
                  <ListingImage
                    listing={listing}
                    alt={bn ? listing.titleBn : listing.titleEn}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <CardHeader>
                    <CardTitle>{bn ? listing.titleBn : listing.titleEn}</CardTitle>
                    <CardDescription>
                      {bn ? listing.providerNameBn : listing.providerNameEn} · {listing.district} ·{" "}
                      {listing.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {bn ? listing.descriptionBn : listing.descriptionEn}
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        href={`${routeBase}/listings/${listing.id}`}
                      >
                        {t("inline.details_ccvazu")}
                      </Link>
                      <Link
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        href={`${routeBase}/providers/${listing.providerId}`}
                      >
                        {t("inline.seller_qlcxju")}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {result.totalPages > 1 && (
            <nav
              aria-label={t("inline.pagination_q63cg7")}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                aria-disabled={result.page <= 1}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  result.page <= 1 && "pointer-events-none opacity-50",
                )}
                href={pageHref(Math.max(1, result.page - 1))}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                {t("inline.previous_1rllagw")}
              </Link>
              <span className="text-muted-foreground text-sm">
                {t("inline.page_17ze4or")} {formatter.number(result.page)} /{" "}
                {formatter.number(result.totalPages)}
              </span>
              <Link
                aria-disabled={result.page >= result.totalPages}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  result.page >= result.totalPages && "pointer-events-none opacity-50",
                )}
                href={pageHref(Math.min(result.totalPages, result.page + 1))}
              >
                {t("inline.next_1vj0vil")}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
