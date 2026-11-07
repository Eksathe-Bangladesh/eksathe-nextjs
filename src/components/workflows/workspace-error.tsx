"use client";

import { useTranslations } from "next-intl";

export function WorkspaceError() {
  const t = useTranslations();
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 text-destructive mx-auto max-w-3xl rounded-2xl border p-6 text-sm"
    >
      {t("workflow.dataUnavailable")}
    </div>
  );
}
