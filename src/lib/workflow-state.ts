import type { Messages } from "@/i18n/message-keys";

export type WorkflowMessageKey = keyof Messages["workflow"];
export type WorkflowState = {
  status: "idle" | "success" | "error";
  messageKey?: WorkflowMessageKey;
  entityId?: string;
  referenceCode?: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialWorkflowState: WorkflowState = { status: "idle" };
