"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Link } from "@/i18n/navigation";
import type {
  AgricultureMarketFilters,
  AgricultureMarketResult,
  AgricultureProductCategory,
  ConstructionMarketFilters,
  ConstructionMarketResult,
} from "@/lib/listings";

const agricultureCategories = [
  { value: "grains", key: "grains" },
  { value: "vegetables", key: "vegetables" },
  { value: "fruits", key: "fruits" },
  { value: "dairy", key: "dairy" },
  { value: "fish", key: "fish" },
  { value: "spices", key: "spices" },
  { value: "other", key: "other" },
] as const satisfies ReadonlyArray<{
  value: AgricultureProductCategory;
  key: AgricultureProductCategory;
}>;

export function AgricultureMarketplaceFilters({
  routeBase,
  filters,
  result,
}: {
  routeBase: string;
  filters: AgricultureMarketFilters;
  result: AgricultureMarketResult;
}) {
  const t = useTranslations();
  return (
    <form action={`${routeBase}/market`} method="get" className="flex flex-col gap-4">
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field className="lg:col-span-2">
          <FieldLabel htmlFor="market-search">
            {t("agriculture.market.searchProductsOrSellers")}
          </FieldLabel>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="market-search"
              className="pl-9"
              name="q"
              defaultValue={filters.q}
              placeholder={t("agriculture.market.searchProductsOrSellers")}
            />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="market-category">{t("workflow.category")}</FieldLabel>
          <NativeSelect id="market-category" name="category" defaultValue={filters.category ?? ""}>
            <NativeSelectOption value="">{t("common.labels.allCategories")}</NativeSelectOption>
            {agricultureCategories.map(({ value, key }) => (
              <NativeSelectOption key={value} value={value}>
                {t(`agriculture.market.categories.${key}`)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="market-district">{t("workflow.district")}</FieldLabel>
          <NativeSelect id="market-district" name="district" defaultValue={filters.district ?? ""}>
            <NativeSelectOption value="">{t("workflow.allDistricts")}</NativeSelectOption>
            {result.districts.map((district) => (
              <NativeSelectOption key={district} value={district}>
                {district}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <PriceField
          id="market-min-price"
          name="minPrice"
          label={t("common.labels.minimumPrice")}
          value={filters.minPrice}
          placeholder={t("agriculture.market.minBdt")}
        />
        <PriceField
          id="market-max-price"
          name="maxPrice"
          label={t("common.labels.maximumPrice")}
          value={filters.maxPrice}
          placeholder={t("agriculture.market.maxBdt")}
        />
        <SortField label={t("agriculture.market.sort")} value={filters.sort} />
      </FieldGroup>
      <FilterActions routeBase={routeBase} />
    </form>
  );
}

export function ConstructionMarketplaceFilters({
  routeBase,
  filters,
  result,
}: {
  routeBase: string;
  filters: ConstructionMarketFilters;
  result: ConstructionMarketResult;
}) {
  const t = useTranslations();
  return (
    <form action={`${routeBase}/market`} method="get" className="flex flex-col gap-4">
      {(filters.searchTerms ?? []).map((term, index) => (
        <input key={`${term}-${index}`} type="hidden" name="term" value={term} />
      ))}
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field className="lg:col-span-2">
          <FieldLabel htmlFor="market-search">
            {t("construction.market.searchServicesMaterialsOrProviders")}
          </FieldLabel>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="market-search"
              className="pl-9"
              name="q"
              defaultValue={filters.q}
              placeholder={t("construction.market.searchPlaceholder")}
            />
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="market-type">{t("common.labels.type")}</FieldLabel>
          <NativeSelect id="market-type" name="type" defaultValue={filters.kind ?? ""}>
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
          <FieldLabel htmlFor="market-category">{t("workflow.category")}</FieldLabel>
          <NativeSelect id="market-category" name="category" defaultValue={filters.category ?? ""}>
            <NativeSelectOption value="">{t("common.labels.allCategories")}</NativeSelectOption>
            {result.categories.map((category) => (
              <NativeSelectOption key={category} value={category}>
                {category}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="market-district">{t("workflow.district")}</FieldLabel>
          <NativeSelect id="market-district" name="district" defaultValue={filters.district ?? ""}>
            <NativeSelectOption value="">{t("workflow.allDistricts")}</NativeSelectOption>
            {result.districts.map((district) => (
              <NativeSelectOption key={district} value={district}>
                {district}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <PriceField
          id="market-min-price"
          name="minPrice"
          label={t("common.labels.minimumPrice")}
          value={filters.minPrice}
        />
        <PriceField
          id="market-max-price"
          name="maxPrice"
          label={t("common.labels.maximumPrice")}
          value={filters.maxPrice}
        />
        <SortField label={t("construction.market.sortBy")} value={filters.sort} />
      </FieldGroup>
      <FilterActions routeBase={routeBase} />
    </form>
  );
}

function PriceField({
  id,
  name,
  label,
  value,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        defaultValue={value}
        placeholder={placeholder}
      />
    </Field>
  );
}

function SortField({ label, value }: { label: string; value?: string }) {
  const t = useTranslations();
  return (
    <Field>
      <FieldLabel htmlFor="market-sort">{label}</FieldLabel>
      <NativeSelect id="market-sort" name="sort" defaultValue={value ?? "newest"}>
        <NativeSelectOption value="newest">{t("common.labels.newest")}</NativeSelectOption>
        <NativeSelectOption value="price-asc">
          {t("common.labels.priceLowToHigh")}
        </NativeSelectOption>
        <NativeSelectOption value="price-desc">
          {t("common.labels.priceHighToLow")}
        </NativeSelectOption>
      </NativeSelect>
    </Field>
  );
}

function FilterActions({ routeBase }: { routeBase: string }) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit">
        <SearchIcon data-icon="inline-start" />
        {t("common.actions.search")}
      </Button>
      <Link href={`${routeBase}/market`} className={buttonVariants({ variant: "outline" })}>
        {t("marketplace.actions.clearFilters")}
      </Link>
    </div>
  );
}
