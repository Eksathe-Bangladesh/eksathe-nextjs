"use client";

import { useTranslations } from "next-intl";

export function DashboardNotice() {
  const t = useTranslations();
  return <p className="text-muted-foreground mb-6 text-sm">{t("dashboard.demoNotice")}</p>;
}
