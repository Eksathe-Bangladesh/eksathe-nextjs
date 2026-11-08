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
          {t("inline.back_to_construction_services_12dfzks")}
        </Link>
        <div>
          <p className="text-primary text-sm font-semibold">
            {t("inline.approved_professionals_and_suppliers_ufbjni")}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {t("inline.find_construction_services_and_materials_1xpkogy")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            {t("inline.browse_by_work_type_location_and_price_cre_1oeikx0")}
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
              {t("inline.search_services_materials_or_providers_1wdv6r7")}
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
                placeholder={t("inline.e_g_bricks_engineer_dhaka_1mej99m")}
                className="pl-9"
              />
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-type">{t("inline.type_nja194")}</FieldLabel>
            <NativeSelect
              id="construction-type"
              name="type"
              defaultValue={filters.kind ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">
                {t("inline.all_construction_listings_12pacdx")}
              </NativeSelectOption>
              <NativeSelectOption value="CONSTRUCTION_SERVICE">
                {t("inline.professionals_services_bc0tiy")}
              </NativeSelectOption>
              <NativeSelectOption value="CONSTRUCTION_MATERIAL">
                {t("inline.building_materials_j98vuw")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-category">{t("inline.category_nstxaj")}</FieldLabel>
            <NativeSelect
              id="construction-category"
              name="category"
              defaultValue={filters.category ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">{t("inline.all_categories_qpnbu")}</NativeSelectOption>
              {result.categories.map((category) => (
                <NativeSelectOption key={category} value={category}>
                  {category}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-district">{t("inline.district_135um58")}</FieldLabel>
            <NativeSelect
              id="construction-district"
              name="district"
              defaultValue={filters.district ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="">{t("inline.all_districts_1tgqg9q")}</NativeSelectOption>
              {result.districts.map((district) => (
                <NativeSelectOption key={district} value={district}>
                  {district}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="construction-min-price">
              {t("inline.minimum_price_m0j9b")}
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
              {t("inline.maximum_price_1emjoux")}
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
            <FieldLabel htmlFor="construction-sort">{t("inline.sort_by_18j78x6")}</FieldLabel>
            <NativeSelect
              id="construction-sort"
              name="sort"
              defaultValue={filters.sort ?? "newest"}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              <NativeSelectOption value="newest">{t("inline.newest_j0ladc")}</NativeSelectOption>
              <NativeSelectOption value="price-asc">
                {t("inline.price_low_to_high_katpc0")}
              </NativeSelectOption>
              <NativeSelectOption value="price-desc">
                {t("inline.price_high_to_low_arcd6i")}
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        </FieldGroup>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="submit">
            <SearchIcon data-icon="inline-start" />
            {t("inline.search_1n7yeyu")}
          </Button>
          <Link href={formAction} className={buttonVariants({ variant: "outline" })}>
            {t("inline.clear_filters_uzkp5g")}
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {result.unavailable
            ? t("inline.listings_are_temporarily_unavailable_m2brmt")
            : `${formatter.number(result.total)} ${t("inline.listings_17wuylw")}`}
        </p>
        <Link
          href="/account/projects/new?service=contractors"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("inline.create_a_project_to_request_quotes_uk9x33")}
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
          {t("inline.no_approved_listings_match_these_filters_a_m7cahq")}
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
                    {t("inline.details_ccvazu")}
                  </Link>
                  <Link
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    href={`${routeBase}/providers/${listing.providerId}`}
                  >
                    {t("inline.provider_1jmkj9t")}
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
          aria-label={t("inline.pagination_q63cg7")}
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
            {t("inline.previous_1rllagw")}
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
            <span>{t("inline.next_1vj0vil")}</span>
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </nav>
      )}
    </main>
  );
}
