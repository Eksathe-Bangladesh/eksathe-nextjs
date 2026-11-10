"use client";

import { useTranslations } from "next-intl";

import { BrandLogo } from "@/components/brand-logo";
import { usePathname } from "@/i18n/navigation";

export function FooterContent({ year }: { year: number }) {
  const t = useTranslations();
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <footer className="bg-card border-t py-6">
      <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm sm:flex-row">
        <div className="flex items-center gap-3">
          <BrandLogo className="size-20" />
          <span>
            © {year} {t("common.brandName")}
          </span>
        </div>
        <span>{t("footer.tagline")}</span>
      </div>
    </footer>
  );
}
