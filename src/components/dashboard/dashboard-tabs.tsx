"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

export function DashboardTabs() {
  const t = useTranslations();
  const pathname = usePathname();

  const tabs = [
    { label: t("dashboard.tabDashboard"), href: "/dashboard" },
    { label: t("dashboard.tabAdmin"), href: "/dashboard/admin" },
  ];

  return (
    <div className="mb-3 flex items-center gap-2">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150",
              isActive
                ? "bg-[#0b5036] text-white shadow-xs"
                : "border border-input/60 bg-card text-foreground/80 hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
