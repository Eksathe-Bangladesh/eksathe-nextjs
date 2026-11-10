"use server";

import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { requireUser } from "@/lib/dal";
import { WorkflowError } from "@/lib/domain/marketplace";
import {
  addProjectMilestone,
  attachProjectDocument,
  attachProjectPhoto,
  confirmProjectHandover,
  createConstructionProject,
  createProjectPackage,
  recordProjectExpense,
  updateProjectMilestone,
} from "@/lib/domain/projects";
import { logError } from "@/lib/logging";
import {
  attachProjectDocumentSchema,
  attachProjectPhotoSchema,
  createProjectPackageSchema,
  createProjectSchema,
  milestoneSchema,
  milestoneUpdateSchema,
  projectExpenseSchema,
  projectHandoverSchema,
} from "@/lib/validations/workflows";
import type { WorkflowMessageKey, WorkflowState } from "@/lib/workflow-state";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function fail(error: unknown): WorkflowState {
  if (error instanceof z.ZodError)
    return {
      status: "error",
      messageKey: "validationError",
      errors: z.flattenError(error).fieldErrors,
    };
  if (error instanceof WorkflowError) {
    const keys: Record<WorkflowError["code"], WorkflowMessageKey> = {
      notFound: "listingMissing",
      notAllowed: "permissionDenied",
      invalidState: "requestFailed",
      unavailable: "listingMissing",
      stockUnavailable: "stockUnavailable",
      bookingUnavailable: "bookingUnavailable",
      amountMismatch: "amountMismatch",
    };
    return { status: "error", messageKey: keys[error.code] };
  }
  logError("project.action_failed", error);
  return { status: "error", messageKey: "requestFailed" };
}

async function run<T extends { id: string }>(
  operation: () => Promise<T>,
  key: WorkflowMessageKey,
  refresh: string[],
): Promise<WorkflowState> {
  try {
    const result = await operation();
    refresh.forEach((path) => revalidateLocalizedPath(path));
    return { status: "success", messageKey: key, entityId: result.id };
  } catch (error) {
    return fail(error);
  }
}

export async function createProjectAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const serviceSlug = value(formData, "serviceSlug");
  const listingId = value(formData, "listingId");
  const next = listingId
    ? `/account/projects/new?listing=${encodeURIComponent(listingId)}`
    : serviceSlug
      ? `/account/projects/new?service=${encodeURIComponent(serviceSlug)}`
      : "/account/projects/new";
  const user = await requireUser(next);
  const rawBudget = value(formData, "budget");
  const rawStartsAt = value(formData, "startsAt");
  const rawTargetEndsAt = value(formData, "targetEndsAt");
  const parsed = createProjectSchema.safeParse({
    title: value(formData, "title"),
    projectType: value(formData, "projectType"),
    district: value(formData, "district"),
    description: value(formData, "description"),
    approximateArea: value(formData, "approximateArea"),
    ...(rawBudget ? { budget: rawBudget } : {}),
    ...(rawStartsAt ? { startsAt: rawStartsAt } : {}),
    ...(rawTargetEndsAt ? { targetEndsAt: rawTargetEndsAt } : {}),
    ...(serviceSlug ? { serviceSlug } : {}),
    ...(listingId ? { listingId } : {}),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(() => createConstructionProject(user.id, parsed.data), "projectCreated", [
    "/account",
    "/dashboard/construction",
  ]);
}

export async function addMilestoneAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#projects");
  const rawAmount = value(formData, "amount");
  const rawDueAt = value(formData, "dueAt");
  const parsed = milestoneSchema.safeParse({
    projectId: value(formData, "projectId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    assignedProviderId: value(formData, "assignedProviderId"),
    ...(rawAmount ? { amount: rawAmount } : {}),
    ...(rawDueAt ? { dueAt: rawDueAt } : {}),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(() => addProjectMilestone(user.id, parsed.data), "milestoneAdded", [
    "/account",
    "/provider",
  ]);
}

export async function createProjectPackageAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const projectId = value(formData, "projectId");
  const user = await requireUser(`/account/projects/${encodeURIComponent(projectId)}`);
  const parsed = createProjectPackageSchema.safeParse({
    projectId,
    label: value(formData, "label"),
    description: value(formData, "description"),
    kind: value(formData, "kind"),
    serviceSlug: value(formData, "serviceSlug"),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(() => createProjectPackage(user.id, parsed.data), "packageCreated", [
    "/account",
    `/account/projects/${projectId}`,
  ]);
}

export async function confirmProjectHandoverAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const projectId = value(formData, "projectId");
  const user = await requireUser(`/account/projects/${encodeURIComponent(projectId)}`);
  const parsed = projectHandoverSchema.safeParse({ projectId });
  if (!parsed.success) return fail(parsed.error);
  try {
    const result = await confirmProjectHandover(user.id, parsed.data.projectId);
    for (const path of ["/account", `/account/projects/${projectId}`, "/provider"])
      revalidateLocalizedPath(path);
    return { status: "success", messageKey: "handoverConfirmed", entityId: result.id };
  } catch (error) {
    if (error instanceof WorkflowError && error.code === "invalidState")
      return { status: "error", messageKey: "handoverBlocked" };
    return fail(error);
  }
}

export async function updateMilestoneAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#projects");
  const parsed = milestoneUpdateSchema.safeParse({
    milestoneId: value(formData, "milestoneId"),
    intent: value(formData, "intent"),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(
    () =>
      updateProjectMilestone(user.id, parsed.data.milestoneId, parsed.data.intent).then(() => ({
        id: parsed.data.milestoneId,
      })),
    parsed.data.intent === "submit" ? "milestoneSubmitted" : "milestoneApproved",
    ["/account", "/provider"],
  );
}

export async function attachProjectDocumentAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const projectId = value(formData, "projectId");
  const user = await requireUser(`/account/projects/${encodeURIComponent(projectId)}`);
  const parsed = attachProjectDocumentSchema.safeParse({
    projectId,
    storageKey: value(formData, "storageKey"),
    filename: value(formData, "filename"),
    sizeBytes: value(formData, "sizeBytes"),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(() => attachProjectDocument(user.id, parsed.data), "documentUploaded", [
    "/account",
    `/account/projects/${projectId}`,
    "/provider",
  ]);
}

export async function attachProjectPhotoAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const projectId = value(formData, "projectId");
  const user = await requireUser(`/account/projects/${encodeURIComponent(projectId)}`);
  const parsed = attachProjectPhotoSchema.safeParse({
    projectId,
    storageKey: value(formData, "storageKey"),
    filename: value(formData, "filename"),
    contentType: value(formData, "contentType"),
    sizeBytes: value(formData, "sizeBytes"),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(() => attachProjectPhoto(user.id, parsed.data), "projectPhotoUploaded", [
    "/account",
    `/account/projects/${projectId}`,
    "/provider",
  ]);
}

export async function recordProjectExpenseAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const projectId = value(formData, "projectId");
  const user = await requireUser(`/account/projects/${encodeURIComponent(projectId)}`);
  const rawDate = value(formData, "occurredAt");
  const parsed = projectExpenseSchema.safeParse({
    projectId,
    description: value(formData, "description"),
    amount: value(formData, "amount"),
    ...(rawDate ? { occurredAt: rawDate } : {}),
  });
  if (!parsed.success) return fail(parsed.error);
  return run(() => recordProjectExpense(user.id, parsed.data), "expenseRecorded", [
    "/account",
    `/account/projects/${projectId}`,
  ]);
}
