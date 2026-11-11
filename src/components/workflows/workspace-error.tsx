"use client";

import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function WorkspaceError() {
  const t = useTranslations();
  return (
    <Alert
      variant="destructive"
      role="alert"
      className="bg-destructive/5 border-destructive/30 mx-auto max-w-3xl rounded-2xl p-6"
    >
      <AlertDescription className="text-destructive">
        {t("workflow.dataUnavailable")}
      </AlertDescription>
    </Alert>
  );
}
