import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, StarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { ListingImage } from "@/components/dashboard/listing-image";
import {
  AgricultureMarketplaceFilters,
  ConstructionMarketplaceFilters,
} from "@/components/marketplace/marketplace-filters";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type {
  AgricultureMarketFilters,
  AgricultureMarketResult,
  ConstructionMarketFilters,
  ConstructionMarketResult,
  PublicListing,
} from "@/lib/listings";

type AgricultureProps = {
  sector: "agriculture";
  routeBase: string;
  filters: AgricultureMarketFilters;
  result: AgricultureMarketResult;
};

type ConstructionProps = {
  sector: "construction";
  routeBase: string;
  filters: ConstructionMarketFilters;
  result: ConstructionMarketResult;
};

type MarketplaceViewProps = AgricultureProps | ConstructionProps;

function buildPageHref(
  routeBase: string,
  sector: MarketplaceViewProps["sector"],
  filters: MarketplaceViewProps["filters"],
  page: number,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (sector === "agriculture") {
    if (filters.category) params.set("category", filters.category);
  } else {
    const constructionFilters = filters as ConstructionMarketFilters;
    for (const term of constructionFilters.searchTerms ?? []) params.append("term", term);
    if (constructionFilters.kind) params.set("type", constructionFilters.kind);
    if (constructionFilters.category) params.set("category", constructionFilters.category);
  }
  if (filters.district) params.set("district", filters.district);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.sort) params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `${routeBase}/market${query ? `?${query}` : ""}`;
}

function MarketplaceListingCard({
  listing,
  routeBase,
  providerLabel,
}: {
  listing: PublicListing;
  routeBase: string;
  providerLabel: string;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const price = formatter.number(Number(listing.unitPrice), {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  });

  return (
    <Card className="group hover:border-primary/40 h-full overflow-hidden transition-colors">
      <ListingImage
        listing={listing}
        alt={listing.title}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <CardHeader>
        <CardTitle>{listing.title}</CardTitle>
        <CardDescription>
          {listing.providerName} · {listing.district} · {listing.category}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-2 text-sm">{listing.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-primary font-semibold">
            {price} / {listing.unit}
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
            {providerLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketplaceView(props: MarketplaceViewProps) {
  const t = useTranslations();
  const { sector, routeBase, filters, result } = props;
  const construction = sector === "construction";
  const title = construction
    ? t("construction.market.title")
    : t("agriculture.market.findFarmProducts");
  const description = construction
    ? t("construction.market.description")
    : t("agriculture.market.description");
  const backLabel = construction
    ? t("construction.market.backToConstructionServices")
    : t("agriculture.market.backToAgriculture");
  const eyebrow = construction
    ? t("construction.market.approvedProfessionalsAndSuppliers")
    : t("agriculture.market.name");
  const emptyMessage = construction
    ? t("construction.market.empty")
    : t("agriculture.market.empty");
  const unavailableMessage = construction
    ? t("construction.market.unavailable")
    : t("marketplace.listings.loadError");
  const providerLabel = construction ? t("common.labels.provider") : t("common.labels.seller");

  return (
    <div className="mx-auto flex w-full max-w-360 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={routeBase}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm font-medium"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>

      <header className="border-primary/15 from-secondary/80 via-card to-card rounded-3xl border bg-linear-to-br p-6 sm:p-9">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 sm:text-base">
          {description}
        </p>
      </header>

      <section
        aria-label={construction ? t("construction.market.sortBy") : t("agriculture.market.sort")}
        className="border-border/70 bg-card rounded-2xl border p-4 sm:p-5"
      >
        {construction ? (
          <ConstructionMarketplaceFilters
            routeBase={routeBase}
            filters={filters as ConstructionMarketFilters}
            result={result as ConstructionMarketResult}
          />
        ) : (
          <AgricultureMarketplaceFilters
            routeBase={routeBase}
            filters={filters as AgricultureMarketFilters}
            result={result as AgricultureMarketResult}
          />
        )}
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {result.unavailable
              ? unavailableMessage
              : t("marketplace.listingCount", { count: result.total })}
          </p>
          {construction && (
            <Link
              href="/account/projects/new?service=contractors"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("construction.market.emptyAction")}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          )}
        </div>

        {result.unavailable ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-5 text-sm"
          >
            {t("workflow.dataUnavailable")}
          </p>
        ) : result.items.length === 0 ? (
          <p className="text-muted-foreground rounded-2xl border border-dashed px-5 py-8 text-center text-sm">
            {emptyMessage}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((listing) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                routeBase={routeBase}
                providerLabel={providerLabel}
              />
            ))}
          </div>
        )}

        {!result.unavailable && result.totalPages > 1 && (
          <nav
            className="flex flex-wrap items-center justify-center gap-3"
            aria-label={t("common.labels.pagination")}
          >
            <PaginationLink
              href={buildPageHref(routeBase, sector, filters, Math.max(1, result.page - 1))}
              disabled={result.page <= 1}
              direction="previous"
            />
            <span className="text-muted-foreground text-sm">
              {t("common.labels.pageOf", { page: result.page, total: result.totalPages })}
            </span>
            <PaginationLink
              href={buildPageHref(
                routeBase,
                sector,
                filters,
                Math.min(result.totalPages, result.page + 1),
              )}
              disabled={result.page >= result.totalPages}
              direction="next"
            />
          </nav>
        )}
      </section>
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  direction,
}: {
  href: string;
  disabled: boolean;
  direction: "previous" | "next";
}) {
  const t = useTranslations();
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {direction === "previous" ? (
        <>
          <ArrowLeftIcon data-icon="inline-start" />
          {t("common.labels.previous")}
        </>
      ) : (
        <>
          {t("common.labels.next")}
          <ArrowRightIcon data-icon="inline-end" />
        </>
      )}
    </Link>
  );
}
