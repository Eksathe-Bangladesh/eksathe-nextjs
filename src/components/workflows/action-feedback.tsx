"use client";

import { useTranslations } from "next-intl";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { WorkflowState } from "@/lib/workflow-state";

export function ActionFeedback({ state }: { state: WorkflowState }) {
  const t = useTranslations();
  if (state.status === "idle" || !state.messageKey) return null;
  return (
    <Alert
      variant={state.status === "error" ? "destructive" : "default"}
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error" ? "bg-destructive/10" : "bg-secondary text-secondary-foreground"
      }
    >
      <AlertDescription className="text-inherit">
        {t(`workflow.${state.messageKey}`)}
      </AlertDescription>
    </Alert>
  );
}
