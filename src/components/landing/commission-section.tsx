"use client";

import { useTranslations } from "next-intl";

import { CommissionCalculator } from "@/components/landing/commission-calculator";

export function CommissionSection() {
  const t = useTranslations();

  return (
    <section
      id="commission"
      className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-14 lg:grid-cols-2"
    >
      <div>
        <p className="text-sm font-bold tracking-wide text-primary">{t("commission.tag")}</p>
        <h2 className="text-3xl font-extrabold tracking-tight">{t("commission.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("commission.description")}</p>
      </div>

      <CommissionCalculator />
    </section>
  );
}
