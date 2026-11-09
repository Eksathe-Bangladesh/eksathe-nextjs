"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon, StarIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";

import { ListingImage } from "@/components/dashboard/listing-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
    <main className="mx-auto flex w-full max-w-360 flex-col gap-7 px-4 py-8 sm:px-6">
      <Link
        href={routeBase}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("agriculture.market.backToAgriculture")}
      </Link>
      <header>
        <p className="text-primary text-sm font-semibold">
          {t("agriculture.market.name")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t("agriculture.market.findFarmProducts")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
          {t("agriculture.market.description")}
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
            placeholder={t("agriculture.market.searchProductsOrSellers")}
          />
        </div>
        <NativeSelect
          name="category"
          defaultValue={filters.category ?? ""}
          aria-label={t("workflow.category")}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="">{t("common.labels.allCategories")}</NativeSelectOption>
          {categoryOptions.map((item) => (
            <NativeSelectOption key={item.value} value={item.value}>
              {bn ? item.bn : item.en}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          name="district"
          defaultValue={filters.district ?? ""}
          aria-label={t("workflow.district")}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="">{t("workflow.allDistricts")}</NativeSelectOption>
          {result.districts.map((district) => (
            <NativeSelectOption key={district} value={district}>
              {district}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          name="minPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={filters.minPrice}
          aria-label={t("common.labels.minimumPrice")}
          placeholder={t("agriculture.market.minBdt")}
        />
        <Input
          name="maxPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={filters.maxPrice}
          aria-label={t("common.labels.maximumPrice")}
          placeholder={t("agriculture.market.maxBdt")}
        />
        <NativeSelect
          name="sort"
          defaultValue={filters.sort ?? "newest"}
          aria-label={t("agriculture.market.sort")}
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="newest">{t("common.labels.newest")}</NativeSelectOption>
          <NativeSelectOption value="price-asc">
            {t("common.labels.priceLowToHigh")}
          </NativeSelectOption>
          <NativeSelectOption value="price-desc">
            {t("common.labels.priceHighToLow")}
          </NativeSelectOption>
        </NativeSelect>
        <input type="hidden" name="page" value="1" />
        <Button type="submit" className="lg:col-span-7">
          <SearchIcon data-icon="inline-start" />
          {t("common.actions.search")}
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
            {t("marketplace.listingCount", { count: result.total })}
          </p>
          {result.items.length === 0 ? (
            <p className="border-border text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
              {t("agriculture.market.empty")}
            </p>
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
                    <CardDescription>
                      {listing.providerName} · {listing.district} ·{" "}
                      {listing.category}
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        href={`${routeBase}/listings/${listing.id}`}
                      >
                        {t("workflow.details")}
                      </Link>
                      <Link
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                        href={`${routeBase}/providers/${listing.providerId}`}
                      >
                        {t("common.labels.seller")}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {result.totalPages > 1 && (
            <nav
              aria-label={t("common.labels.pagination")}
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
                {t("common.labels.previous")}
              </Link>
              <span className="text-muted-foreground text-sm">
                {t("agriculture.market.page")} {formatter.number(result.page)} /{" "}
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
                {t("common.labels.next")}
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
