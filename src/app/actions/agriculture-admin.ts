"use server";

import { randomBytes } from "node:crypto";

import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { auth } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { requireStaff } from "@/lib/dal";
import {
  AgricultureAdminError,
  deleteAgricultureUser,
  setAgriculturePanelActive,
  updateAgriculturePanel,
  updateAgricultureUser,
} from "@/lib/domain/agriculture-admin";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import {
  agriculturePanelStatusSchema,
  agriculturePanelUpdateSchema,
  agricultureUserCreateSchema,
  agricultureUserDeleteSchema,
  agricultureUserUpdateSchema,
} from "@/lib/validations/agriculture-admin";
import type { WorkflowMessageKey, WorkflowState } from "@/lib/workflow-state";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function failure(error: unknown): WorkflowState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      messageKey: "validationError",
      errors: z.flattenError(error).fieldErrors,
    };
  }
  if (error instanceof AgricultureAdminError) {
    const messageKey: Record<AgricultureAdminError["code"], WorkflowMessageKey> = {
      accountNotFound: "agricultureAccountMissing",
      panelNotFound: "agriculturePanelMissing",
      notAllowed: "permissionDenied",
      invalidState: "agricultureAccountHasData",
    };
    return { status: "error", messageKey: messageKey[error.code] };
  }
  logError("admin.agriculture_management_action_failed", error);
  return { status: "error", messageKey: "requestFailed" };
}

async function run(operation: () => Promise<unknown>, messageKey: WorkflowMessageKey) {
  try {
    await operation();
    revalidateLocalizedPath("/admin");
    revalidateLocalizedPath("/admin/agriculture/management");
    revalidateLocalizedPath("/agriculture");
    revalidateLocalizedPath("/dashboard/agriculture");
    revalidateTag(cacheTags.agriculturePublic, "max");
    return { status: "success", messageKey } satisfies WorkflowState;
  } catch (error) {
    return failure(error);
  }
}

export async function updateAgricultureUserAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = agricultureUserUpdateSchema.safeParse({
    userId: value(formData, "userId"),
    accountType: value(formData, "accountType"),
    status: value(formData, "status"),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireStaff("USERS", "agriculture-labor");
  return run(
    () =>
      updateAgricultureUser(
        actor.id,
        parsed.data.userId,
        parsed.data.accountType,
        parsed.data.status,
      ),
    "agricultureAccountUpdated",
  );
}

export async function createAgricultureUserAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = agricultureUserCreateSchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email"),
    phone: value(formData, "phone"),
    accountType: value(formData, "accountType"),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireStaff("USERS", "agriculture-labor");
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) return { status: "error", messageKey: "agricultureAccountExists" };

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: randomBytes(32).toString("base64url"),
        phone: parsed.data.phone,
        accountType: parsed.data.accountType,
      },
      headers: await headers(),
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: result.user.id },
        data: { status: "pending", accountType: parsed.data.accountType },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "agriculture.user_created",
          entityType: "user",
          entityId: result.user.id,
        },
      });
    });
    revalidateLocalizedPath("/admin/agriculture/management");
    return { status: "success", messageKey: "agricultureAccountCreated" };
  } catch (error) {
    logError("admin.agriculture_user_create_failed", error);
    return { status: "error", messageKey: "requestFailed" };
  }
}

export async function deleteAgricultureUserAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = agricultureUserDeleteSchema.safeParse({ userId: value(formData, "userId") });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireStaff("USERS", "agriculture-labor");
  return run(
    () => deleteAgricultureUser(actor.id, parsed.data.userId),
    "agricultureAccountDeleted",
  );
}

export async function setAgriculturePanelActiveAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = agriculturePanelStatusSchema.safeParse({
    panelId: value(formData, "panelId"),
    isActive: value(formData, "isActive"),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireStaff("PANELS", "agriculture-labor");
  return run(
    () => setAgriculturePanelActive(actor.id, parsed.data.panelId, parsed.data.isActive),
    "agriculturePanelUpdated",
  );
}

export async function updateAgriculturePanelAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = agriculturePanelUpdateSchema.safeParse({
    panelId: value(formData, "panelId"),
    titleBn: value(formData, "titleBn"),
    titleEn: value(formData, "titleEn"),
    descriptionBn: value(formData, "descriptionBn"),
    descriptionEn: value(formData, "descriptionEn"),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireStaff("PANELS", "agriculture-labor");
  return run(
    () => updateAgriculturePanel(actor.id, parsed.data.panelId, parsed.data),
    "agriculturePanelUpdated",
  );
}
