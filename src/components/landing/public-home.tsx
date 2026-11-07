"use client";

import { cn } from "cn";
import { ArrowRightIcon, Building2Icon, SproutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { CategoryGrid } from "@/components/dashboard/category-grid";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export function PublicHome() {
  const t = useTranslations();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
      <section className="border-primary/10 from-secondary/80 via-card to-card grid gap-8 rounded-[2rem] border bg-linear-to-br p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            {t("home.eyebrow")}
          </p>
          <h1 className="text-foreground mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
            {t("home.description")}
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-7 gap-2")}>
            {t("home.browse")}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/agriculture"
            className="focus-visible:outline-primary rounded-2xl outline-offset-4 focus-visible:outline-2"
          >
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <SproutIcon aria-hidden="true" className="text-primary size-9" />
                <CardTitle>{t("home.agriculture")}</CardTitle>
                <CardDescription>{t("home.agricultureDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link
            href="/construction"
            className="focus-visible:outline-primary rounded-2xl outline-offset-4 focus-visible:outline-2"
          >
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader>
                <Building2Icon aria-hidden="true" className="text-primary size-9" />
                <CardTitle>{t("home.construction")}</CardTitle>
                <CardDescription>{t("home.constructionDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="home-sectors">
        <div>
          <h2 id="home-sectors" className="text-foreground text-2xl font-bold tracking-tight">
            {t("home.hubTitle")}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{t("home.hubDescription")}</p>
        </div>
        <CategoryGrid />
      </section>
    </div>
  );
}
