"use client";

import { useTranslations } from "next-intl";

export function WorkspaceError() {
  const t = useTranslations();
  return (
    <div
      role="alert"
      className="mx-auto max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
    >
      {t("workflow.dataUnavailable")}
    </div>
  );
}
