import { AgricultureMarket } from "@/components/agriculture/agriculture-market";
import { getLocaleOrDefault } from "@/i18n/locales";
import {
  getAgricultureMarketListings,
  type AgricultureMarketFilters,
  type AgricultureProductCategory,
} from "@/lib/listings";

const categories = new Set<AgricultureProductCategory>([
  "grains",
  "vegetables",
  "fruits",
  "dairy",
  "fish",
  "spices",
  "other",
]);
const sorts = new Set(["newest", "price-asc", "price-desc"]);
type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function validPrice(value: string | undefined) {
  return value && /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value) ? value : undefined;
}

export async function AgricultureMarketPage({
  params,
  routeBase,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  routeBase: string;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale: routeLocale }, query] = await Promise.all([params, searchParams]);
  const locale = getLocaleOrDefault(routeLocale);
  const rawCategory = first(query.category);
  const rawSort = first(query.sort);
  const rawPage = first(query.page);
  const filters: AgricultureMarketFilters = {
    ...(first(query.q)?.trim() ? { q: first(query.q)!.trim().slice(0, 100) } : {}),
    ...(rawCategory && categories.has(rawCategory as AgricultureProductCategory)
      ? { category: rawCategory as AgricultureProductCategory }
      : {}),
    ...(first(query.district)?.trim()
      ? { district: first(query.district)!.trim().slice(0, 80) }
      : {}),
    ...(validPrice(first(query.minPrice)) ? { minPrice: validPrice(first(query.minPrice)) } : {}),
    ...(validPrice(first(query.maxPrice)) ? { maxPrice: validPrice(first(query.maxPrice)) } : {}),
    ...(rawSort && sorts.has(rawSort) ? { sort: rawSort as AgricultureMarketFilters["sort"] } : {}),
    ...(rawPage && /^\d{1,6}$/.test(rawPage) ? { page: Math.max(1, Number(rawPage)) } : {}),
  };
  const result = await getAgricultureMarketListings(filters, locale);
  return <AgricultureMarket routeBase={routeBase} filters={filters} result={result} />;
}
