"use client";

import { useTranslations } from "next-intl";

import { ProviderApplicationForm } from "@/components/provider/provider-application-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ProviderApplicationEntry() {
  const t = useTranslations();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t("workflow.applyProvider")}</CardTitle>
          <CardDescription>
            {t("inline.apply_once_to_serve_customers_in_agricultu")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderApplicationForm />
        </CardContent>
      </Card>
    </div>
  );
}
