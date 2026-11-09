"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon, StarIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";

import { ListingImage } from "@/components/dashboard/listing-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
import type { ConstructionMarketFilters, ConstructionMarketResult } from "@/lib/listings";

export function ConstructionMarket({
  routeBase,
  filters,
  result,
}: {
  routeBase: string;
  filters: ConstructionMarketFilters;
  result: ConstructionMarketResult;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const bn = locale === "bn";
  const formAction = `${routeBase}/market`;
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.kind) params.set("type", filters.kind);
    if (filters.category) params.set("category", filters.category);
    if (filters.district) params.set("district", filters.district);
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.sort) params.set("sort", filters.sort);
    if (page > 1) params.set("page", String(page));
    return `${formAction}${params.size ? `?${params.toString()}` : ""}`;
  };
  const formatMoney = (value: string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3">
        <Link
          href={routeBase}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("construction.market.backToConstructionServices")}
        </Link>
        <div>
          <p className="text-primary text-sm font-semibold">
            {t("construction.market.approvedProfessionalsAndSuppliers")}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {t("construction.market.title")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            {t("construction.market.description")}
          </p>
        </div>
      </div>

      <form
        method="get"
        action={formAction}
        className="border-border/70 bg-card rounded-2xl border p-4 sm:p-5"
      >
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field className="lg:col-span-2">
            <FieldLabel htmlFor="construction-search">
              {t("construction.market.searchServicesMaterialsOrProviders")}
            </FieldLabel>
            <div className="relative">
              <SearchIcon
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                id="construction-search"
                name="q"
                defaultValue={filters.q}
                placeholder={t("construction.market.searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-type">{t("common.labels.type")}</FieldLabel>
            <NativeSelect
              id="construction-type"
              name="type"
              defaultValue={filters.kind ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">
                {t("construction.market.allConstructionListings")}
              </NativeSelectOption>
              <NativeSelectOption value="CONSTRUCTION_SERVICE">
                {t("construction.market.professionalsServices")}
              </NativeSelectOption>
              <NativeSelectOption value="CONSTRUCTION_MATERIAL">
                {t("constructionServices.building-materials.title")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-category">{t("workflow.category")}</FieldLabel>
            <NativeSelect
              id="construction-category"
              name="category"
              defaultValue={filters.category ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">{t("common.labels.allCategories")}</NativeSelectOption>
              {result.categories.map((category) => (
                <NativeSelectOption key={category} value={category}>
                  {category}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-district">{t("workflow.district")}</FieldLabel>
            <NativeSelect
              id="construction-district"
              name="district"
              defaultValue={filters.district ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">{t("workflow.allDistricts")}</NativeSelectOption>
              {result.districts.map((district) => (
                <NativeSelectOption key={district} value={district}>
                  {district}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-min-price">
              {t("common.labels.minimumPrice")}
            </FieldLabel>
            <Input
              id="construction-min-price"
              name="minPrice"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={filters.minPrice}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-max-price">
              {t("common.labels.maximumPrice")}
            </FieldLabel>
            <Input
              id="construction-max-price"
              name="maxPrice"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={filters.maxPrice}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-sort">{t("construction.market.sortBy")}</FieldLabel>
            <NativeSelect
              id="construction-sort"
              name="sort"
              defaultValue={filters.sort ?? "newest"}
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
          </Field>
        </FieldGroup>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit">
            <SearchIcon data-icon="inline-start" />
            {t("common.actions.search")}
          </Button>
          <Link href={formAction} className={buttonVariants({ variant: "outline" })}>
            {t("construction.market.clearFilters")}
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {result.unavailable
            ? t("construction.market.unavailable")
            : t("marketplace.listingCount", { count: result.total })}
        </p>
        <Link
          href="/account/projects/new?service=contractors"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("construction.market.emptyAction")}
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
        <p className="text-muted-foreground rounded-2xl border border-dashed p-8 text-center text-sm">
          {t("construction.market.empty")}
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
                      <StarIcon aria-hidden="true" className="size-4 fill-current text-amber-500" />
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
                    {t("common.labels.provider")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!result.unavailable && result.totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-3"
          aria-label={t("common.labels.pagination")}
        >
          <Link
            href={pageHref(Math.max(1, result.page - 1))}
            aria-disabled={result.page <= 1}
            tabIndex={result.page <= 1 ? -1 : undefined}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page <= 1 && "pointer-events-none opacity-50",
            )}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("common.labels.previous")}
          </Link>
          <span className="text-muted-foreground text-sm">
            {bn
              ? `পৃষ্ঠা ${result.page} / ${result.totalPages}`
              : `Page ${result.page} of ${result.totalPages}`}
          </span>
          <Link
            href={pageHref(Math.min(result.totalPages, result.page + 1))}
            aria-disabled={result.page >= result.totalPages}
            tabIndex={result.page >= result.totalPages ? -1 : undefined}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page >= result.totalPages && "pointer-events-none opacity-50",
            )}
          >
            <span>{t("common.labels.next")}</span>
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </nav>
      )}
    </main>
  );
}
