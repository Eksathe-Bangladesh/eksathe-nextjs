"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { sectors } from "@/lib/sectors";

export function CategoryGrid() {
  const t = useTranslations();
  const categories = sectors;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) => {
      const haystack = `${t(`sectors.${cat.slug}`)} ${cat.slug} ${cat.id}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [categories, query, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Filter (subtle, aligned right/left) */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("nav.search")}
            className="bg-card/80 h-9 pr-8 pl-9 text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <span className="text-muted-foreground hidden text-xs sm:inline">
          {t("dashboard.categoryGrid.resultCount", { count: filtered.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <p className="text-muted-foreground text-sm">{t("nav.noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((cat) => {
            const label = t(`sectors.${cat.slug}`);
            return (
              <Link
                key={cat.id}
                href={
                  cat.slug === "agriculture-labor"
                    ? "/dashboard/agriculture"
                    : `/dashboard/${cat.slug}`
                }
                className="group border-border/70 bg-card hover:border-primary/40 relative flex flex-col items-center justify-between rounded-2xl border p-5 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:translate-y-0"
              >
                <div className="flex flex-1 flex-col items-center justify-center pt-1 pb-3">
                  <div className="transition-transform duration-200 group-hover:scale-105">
                    <span className="text-4xl leading-none" aria-hidden="true">
                      {cat.icon}
                    </span>
                  </div>
                  <h3 className="text-foreground mt-3 text-sm leading-tight font-semibold">
                    {label}
                  </h3>
                </div>
                <span className="text-muted-foreground/70 text-xs font-medium tabular-nums">
                  {cat.id}
                </span>
                <span className="bg-muted text-muted-foreground mt-2 rounded-full px-2.5 py-1 text-[0.7rem] font-medium">
                  {cat.status === "live" ? t("nav.live") : t("home.comingSoon")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
