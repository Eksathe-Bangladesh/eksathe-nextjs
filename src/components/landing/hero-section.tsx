"use client";

import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";

import { EmergencyButton } from "@/components/landing/emergency-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export function HeroSection({ totalPanels }: { totalPanels: number }) {
  const formatter = useFormatter();
  const locale = useLocale();
  const t = useTranslations();

  const formattedCount = locale === "bn" ? formatter.number(totalPanels) : totalPanels.toString();

  return (
    <section className="hero-surface">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.4fr_1fr] lg:py-24">
        <div>
          <Badge variant="secondary" className="mb-4">
            {t("hero.badge")}
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {t("hero.titleLine1")}
            <br />
            <span className="text-primary">{t("hero.titleLine2")}</span>
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg">{t("hero.description")}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#panels" className={cn(buttonVariants({ size: "lg" }))}>
              {t("hero.browseServices")}
              <ArrowRightIcon />
            </Link>
            <Link href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              {t("hero.howItWorks")}
            </Link>
            <EmergencyButton />
          </div>
          <p className="text-muted-foreground mt-3 text-xs">{t("hero.emergencyNotice")}</p>
        </div>

        <div className="bg-card rounded-3xl border p-8 shadow-xl">
          <div className="text-4xl" aria-hidden>
            🌾
          </div>
          <div className="mt-2 text-5xl font-extrabold">{formattedCount}</div>
          <p className="text-muted-foreground">{t("hero.categoriesCountLabel")}</p>
          <div className="bg-border my-5 h-px" />
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{t("hero.serviceRequestsLabel")}</span>
            <strong>{t("hero.serviceRequestsValue")}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{t("hero.commissionLabel")}</span>
            <strong>{t("hero.commissionValue")}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
