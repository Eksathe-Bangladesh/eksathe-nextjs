import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { Suspense, type ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteHeaderUserFallback, SiteHeaderUserServer } from "@/components/site-header-server";
import { ThemeProvider } from "@/components/theme-provider";
import { locales } from "@/i18n/locales";
import { getPageMetadata } from "@/i18n/metadata";

import "../globals.css";
import "@fontsource/hind-siliguri/300.css";
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await getPageMetadata("home")),
    icons: { apple: "/brand/eksathe-logo.png" },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const paramLocale = await rootLocale();
  if (!hasLocale(locales, paramLocale)) notFound();
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <SiteHeader
              userSlot={
                <Suspense fallback={<SiteHeaderUserFallback />}>
                  <SiteHeaderUserServer />
                </Suspense>
              }
            />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
