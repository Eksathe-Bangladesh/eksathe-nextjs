"use client";

import { cn } from "cn";
import { ArrowRightIcon, Building2Icon, SproutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import { CategoryGrid } from "@/components/dashboard/category-grid";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PublicHome() {
  const t = useTranslations();

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
      <section className="grid gap-8 rounded-[2rem] border border-primary/10 bg-linear-to-br from-secondary/80 via-card to-card p-6 sm:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {t("home.eyebrow")}
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("home.title")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
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
            className="rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <SproutIcon aria-hidden="true" className="size-9 text-primary" />
                <CardTitle>{t("home.agriculture")}</CardTitle>
                <CardDescription>{t("home.agricultureDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link
            href="/construction"
            className="rounded-2xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <Building2Icon aria-hidden="true" className="size-9 text-primary" />
                <CardTitle>{t("home.construction")}</CardTitle>
                <CardDescription>{t("home.constructionDescription")}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="home-sectors">
        <div>
          <h2 id="home-sectors" className="text-2xl font-bold tracking-tight text-foreground">
            {t("home.hubTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("home.hubDescription")}</p>
        </div>
        <CategoryGrid />
      </section>
    </div>
  );
}
