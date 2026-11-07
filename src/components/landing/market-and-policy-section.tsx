"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export function MarketAndPolicySection() {
  const t = useTranslations();

  return (
    <section className="alt-surface py-14">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-sm font-bold tracking-wide text-primary">
            {t("marketAndPolicy.marketTag")}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {t("marketAndPolicy.marketTitle")}
          </h2>

          <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
            <Badge variant="secondary">{t("marketAndPolicy.feedSampleBadge")}</Badge>
            <h3 className="mt-3 text-lg font-semibold">{t("marketAndPolicy.feedSampleTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("marketAndPolicy.feedSampleDescription")}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border bg-card p-6 shadow-sm">
            <Badge variant="outline">{t("marketAndPolicy.feedWarningBadge")}</Badge>
            <h3 className="mt-3 text-lg font-semibold">{t("marketAndPolicy.feedWarningTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("marketAndPolicy.feedWarningDescription")}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-bold tracking-wide text-primary">
            {t("marketAndPolicy.policyTag")}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {t("marketAndPolicy.policyTitle")}
          </h2>

          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            {(t.raw("marketAndPolicy.policies") as string[]).map((policy) => (
              <li key={policy} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{policy}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
