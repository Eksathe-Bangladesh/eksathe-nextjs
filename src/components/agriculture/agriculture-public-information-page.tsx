"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AgriculturePublicInfo } from "@/lib/agriculture/publishing";
import { AGRICULTURE_MARKET_PRICE_FRESHNESS_DAYS } from "@/lib/agriculture/publishing-constants";

export function AgriculturePublicInformationPage({
  info,
  routeBase,
  section,
}: {
  info: AgriculturePublicInfo;
  routeBase: string;
  section: "prices" | "updates";
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const date = (value: string) =>
    formatter.dateTime(new Date(value), {
      dateStyle: "medium",
      timeZone: "Asia/Dhaka",
    });
  const price = (value: string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const isPrices = section === "prices";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-12">
      <Link href={routeBase} className="text-primary w-fit text-sm font-medium hover:underline">
        {t("inline.back_to_all_agriculture_services")}
      </Link>
      <header>
        <p className="text-primary text-sm font-semibold">
          {t("inline.verified_agriculture_information")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {isPrices
            ? t("inline.market_prices")
            : t("inline.news_advice_and_alerts")}
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
          {isPrices
            ? {
                en: `Prices include their market, district, unit, observation date, and source. Only prices observed within the last ${AGRICULTURE_MARKET_PRICE_FRESHNESS_DAYS} days are shown.`,
                bn: `প্রতিটি দামে বাজার, জেলা, একক, পর্যবেক্ষণের তারিখ ও তথ্যসূত্র রয়েছে। গত ${AGRICULTURE_MARKET_PRICE_FRESHNESS_DAYS} দিনের মধ্যে পর্যবেক্ষিত দামই দেখানো হয়।`,
              }[locale]
            : t("inline.agriculture_news_practical_advice_and_curr")}
        </p>
      </header>

      {info.unavailable ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
        >
          {t("inline.this_information_is_temporarily_unavailabl")}
        </p>
      ) : isPrices ? (
        info.prices.length === 0 ? (
          <Empty text={t("inline.no_published_market_prices_yet")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {info.prices.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.product}</CardTitle>
                  <CardDescription>
                    {item.market} · {item.district}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="text-primary text-xl font-bold">
                    {price(item.price)} / {item.unit}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("inline.observed")}: {date(item.observedAt)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("inline.source")}: {item.source}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : info.updates.length === 0 ? (
        <Empty text={t("inline.no_current_updates_or_alerts")} />
      ) : (
        <div className="flex flex-col gap-4">
          {info.updates.map((item) => {
            const title = item.title;
            const body = item.body;
            const kind =
              item.kind === "NEWS"
                ? t("inline.news")
                : item.kind === "ADVICE"
                  ? t("inline.advice")
                  : t("inline.weather_alert");
            return (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.kind === "WEATHER_ALERT" ? "destructive" : "secondary"}>
                      {kind}
                    </Badge>
                    <CardDescription>
                      {t("inline.published")}: {date(item.publishedAt)}
                    </CardDescription>
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm leading-6 whitespace-pre-line">{body}</p>
                  <p className="text-muted-foreground text-sm">
                    {t("inline.source")}: {item.source}
                    {item.expiresAt
                      ? ` · ${t("inline.expires")}: ${date(item.expiresAt)}`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="text-muted-foreground p-8 text-sm">{text}</CardContent>
    </Card>
  );
}
