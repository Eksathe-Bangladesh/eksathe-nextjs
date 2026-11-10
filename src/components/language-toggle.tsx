"use client";

import { cn } from "cn";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { locales } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";

interface LanguageToggleProps {
  /** "header" = white text on dark bg (landing header)
   *  "muted"  = normal text on card bg (dashboard header) */
  variant?: "header" | "muted";
}

function getCleanPathname(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname;
  for (const loc of locales) {
    if (path === `/${loc}`) return "/";
    if (path.startsWith(`/${loc}/`)) return path.slice(loc.length + 1);
  }
  return path || "/";
}

export function LanguageToggle({ variant = "header" }: LanguageToggleProps) {
  const locale = useLocale();
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isHeader = variant === "header";

  function selectLocale(value: "en" | "bn") {
    if (pending || value === locale) return;
    if (typeof document !== "undefined") {
      document.documentElement.lang = value;
      document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const pathname = getCleanPathname();
    const queryStr = typeof window !== "undefined" ? window.location.search : "";
    const href = queryStr ? `${pathname}${queryStr}` : pathname;
    startTransition(() => {
      router.replace(href, { locale: value });
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <div
        role="group"
        aria-label={t("header.switchLanguage")}
        aria-busy={pending}
        className={cn(
          "inline-flex h-8 items-center rounded-lg border p-0.5 text-xs font-medium",
          isHeader
            ? "border-white/20 bg-white/5 text-white/80"
            : "border-input bg-muted/50 text-foreground",
        )}
      >
        <button
          type="button"
          onClick={() => selectLocale("en")}
          aria-pressed={locale === "en"}
          disabled={pending}
          className={cn(
            "rounded-md px-2 py-1 transition-all disabled:opacity-60",
            locale === "en"
              ? isHeader
                ? "bg-white font-bold text-[#0b5036] shadow-xs"
                : "bg-background font-bold text-primary shadow-xs"
              : isHeader
                ? "text-white/80 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
          )}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => selectLocale("bn")}
          aria-pressed={locale === "bn"}
          disabled={pending}
          className={cn(
            "rounded-md px-2 py-1 transition-all disabled:opacity-60",
            locale === "bn"
              ? isHeader
                ? "bg-white font-bold text-[#0b5036] shadow-xs"
                : "bg-background font-bold text-primary shadow-xs"
              : isHeader
                ? "text-white/80 hover:bg-white/10 hover:text-white"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
          )}
        >
          বাং
        </button>
      </div>
    </div>
  );
}
