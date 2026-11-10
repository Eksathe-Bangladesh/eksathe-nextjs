"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export function MarketAndPolicySection() {
  const t = useTranslations();

  return (
    <section className="alt-surface py-14">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-primary text-sm font-bold tracking-wide">
            {t("home.marketUpdates.eyebrow")}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {t("home.marketUpdates.title")}
          </h2>

          <div className="bg-card mt-6 rounded-2xl border p-6 shadow-sm">
            <Badge variant="secondary">{t("home.marketUpdates.sampleBadge")}</Badge>
            <h3 className="mt-3 text-lg font-semibold">{t("home.marketUpdates.sampleTitle")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("home.marketUpdates.sampleDescription")}
            </p>
          </div>

          <div className="bg-card mt-4 rounded-2xl border p-6 shadow-sm">
            <Badge variant="outline">{t("home.marketUpdates.warningBadge")}</Badge>
            <h3 className="mt-3 text-lg font-semibold">{t("home.marketUpdates.warningTitle")}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("home.marketUpdates.warningDescription")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-primary text-sm font-bold tracking-wide">{t("home.policy.eyebrow")}</p>
          <h2 className="text-3xl font-extrabold tracking-tight">{t("home.policy.title")}</h2>

          <ul className="text-muted-foreground mt-6 space-y-3 text-sm">
            {(t.raw("home.policy.items") as string[]).map((policy) => (
              <li key={policy} className="flex gap-2">
                <span className="bg-primary mt-2 size-1.5 shrink-0 rounded-full" />
                <span>{policy}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
