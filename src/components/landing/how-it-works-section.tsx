"use client";

import { useTranslations } from "next-intl";

export function HowItWorksSection() {
  const t = useTranslations();

  return (
    <section id="how" className="alt-surface py-14">
      <div className="mx-auto w-full max-w-7xl px-4">
        <p className="text-sm font-bold tracking-wide text-primary">{t("howItWorks.tag")}</p>
        <h2 className="text-3xl font-extrabold tracking-tight">{t("howItWorks.title")}</h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(
            t.raw("howItWorks.steps") as Array<{
              number: string;
              title: string;
              description: string;
            }>
          ).map((step) => (
            <div key={step.number} className="rounded-2xl border bg-card p-6 shadow-sm">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
