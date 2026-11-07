"use client";

import { useTranslations } from "next-intl";

export function DashboardNotice() {
  const t = useTranslations();
  return <p className="mb-6 text-sm text-muted-foreground">{t("dashboard.demoNotice")}</p>;
}
