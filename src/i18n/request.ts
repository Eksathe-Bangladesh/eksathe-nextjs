import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";

import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const paramLocale = locale ?? (await rootLocale());
  if (!paramLocale || !hasLocale(routing.locales, paramLocale)) {
    notFound();
  }

  return {
    locale: paramLocale,
    messages: (await import(`../../messages/${paramLocale}.json`)).default,
    timeZone: "Asia/Dhaka",
  };
});
