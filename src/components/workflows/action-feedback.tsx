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
          ? "bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
          : "bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm"
      }
    >
      {t(`workflow.${state.messageKey}` as never)}
    </p>
  );
}
