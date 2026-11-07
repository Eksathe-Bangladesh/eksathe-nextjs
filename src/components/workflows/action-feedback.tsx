"use client";

import { useTranslations } from "next-intl";

import type { WorkflowState } from "@/lib/workflow-state";

export function ActionFeedback({ state }: { state: WorkflowState }) {
  const t = useTranslations();
  if (state.status === "idle" || !state.messageKey) return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground"
      }
    >
      {t(`workflow.${state.messageKey}` as never)}
    </p>
  );
}
