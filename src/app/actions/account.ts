"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { cacheTags } from "@/lib/cache-tags";
import { requireUser } from "@/lib/dal";
import { updateOwnProfile } from "@/lib/domain/account";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations/workflows";
import type { WorkflowState } from "@/lib/workflow-state";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

export async function updateProfileAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#profile");
  const parsed = profileSchema.safeParse({
    name: value(formData, "name"),
    phone: value(formData, "phone"),
  });
  if (!parsed.success)
    return {
      status: "error",
      messageKey: "validationError",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  try {
    await updateOwnProfile(user.id, parsed.data.name, parsed.data.phone);
    revalidateLocalizedPath("/account");
    revalidateTag(cacheTags.providers, "max");
    return { status: "success", messageKey: "profileUpdated" };
  } catch (error) {
    logError("account.profile_update_failed", error);
    return { status: "error", messageKey: "requestFailed" };
  }
}

export async function markNotificationReadAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account");
  const id = value(formData, "notificationId");
  if (!id || id.length > 64) return { status: "error", messageKey: "validationError" };
  try {
    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count !== 1) return { status: "error", messageKey: "listingMissing" };
    revalidateLocalizedPath("/account");
    revalidateLocalizedPath("/provider");
    return { status: "success", messageKey: "notificationRead" };
  } catch (error) {
    logError("account.notification_update_failed", error);
    return { status: "error", messageKey: "requestFailed" };
  }
}
