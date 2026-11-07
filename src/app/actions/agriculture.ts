"use server";

import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { agricultureServiceRegistry } from "@/lib/agriculture/service-registry";
import { requireStaff, requireUser } from "@/lib/dal";
import {
  createAgricultureServiceRequest,
  AgricultureRequestError,
  updateAgricultureServiceRequest,
  withdrawAgricultureServiceRequest,
} from "@/lib/domain/agriculture-requests";
import { logError } from "@/lib/logging";
import {
  parseAgricultureServiceAnswers,
  agricultureServiceRequestSchema,
} from "@/lib/validations/agriculture";
import type { WorkflowState } from "@/lib/workflow-state";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function failure(error: unknown): WorkflowState {
  if (error instanceof z.ZodError)
    return {
      status: "error",
      messageKey: "validationError",
      errors: z.flattenError(error).fieldErrors,
    };
  if (error instanceof AgricultureRequestError) {
    return {
      status: "error",
      messageKey:
        error.code === "notAllowed"
          ? "permissionDenied"
          : error.code === "invalidState"
            ? "requestFailed"
            : error.code === "unavailable"
              ? "uploadFailed"
              : "listingMissing",
    };
  }
  logError("agriculture.service_request_action_failed", error);
  return { status: "error", messageKey: "requestFailed" };
}

export async function createAgricultureServiceRequestAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const serviceSlug = value(formData, "serviceSlug");
  const submittedBase = value(formData, "routeBase");
  const routeBase = submittedBase === "/dashboard/agriculture" ? submittedBase : "/agriculture";
  const returnTo = `${routeBase}/services/${encodeURIComponent(serviceSlug)}`;
  const user = await requireUser(returnTo, true);
  const parsed = agricultureServiceRequestSchema.safeParse({
    serviceSlug,
    customerName: value(formData, "customerName"),
    phone: value(formData, "phone"),
    district: value(formData, "district"),
    details: value(formData, "details"),
    budget: value(formData, "budget"),
    diseasePhotoKey: value(formData, "diseasePhotoKey"),
    diseasePhotoContentType: value(formData, "diseasePhotoContentType") || undefined,
    diseasePhotoSizeBytes: value(formData, "diseasePhotoSizeBytes") || undefined,
  });
  if (!parsed.success) return failure(parsed.error);
  const parsedAnswers = parseAgricultureServiceAnswers(parsed.data.serviceSlug, formData);
  if (Object.keys(parsedAnswers.errors).length)
    return { status: "error", messageKey: "validationError", errors: parsedAnswers.errors };
  const service = agricultureServiceRegistry.find((item) => item.slug === parsed.data.serviceSlug);
  if (!service) return { status: "error", messageKey: "listingMissing" };

  const photoKey = parsed.data.diseasePhotoKey || "";
  const hasPhotoMetadata = Boolean(
    parsed.data.diseasePhotoContentType || parsed.data.diseasePhotoSizeBytes,
  );
  if (
    Boolean(photoKey) !== hasPhotoMetadata ||
    (photoKey && (!parsed.data.diseasePhotoContentType || !parsed.data.diseasePhotoSizeBytes))
  ) {
    return { status: "error", messageKey: "validationError" };
  }
  if (photoKey && parsed.data.serviceSlug !== "pest-control")
    return { status: "error", messageKey: "validationError" };
  try {
    const result = await createAgricultureServiceRequest({
      user,
      serviceSlug: parsed.data.serviceSlug,
      formVersion: service.formVersion,
      customerName: parsed.data.customerName,
      phone: parsed.data.phone,
      district: parsed.data.district,
      details: parsed.data.details,
      budget: parsed.data.budget,
      answers: parsedAnswers.values,
      fieldSnapshot: parsedAnswers.snapshot,
      ...(photoKey
        ? {
            photo: {
              key: photoKey,
              contentType: parsed.data.diseasePhotoContentType!,
              sizeBytes: Number(parsed.data.diseasePhotoSizeBytes),
            },
          }
        : {}),
    });
    revalidateLocalizedPath("/account");
    revalidateLocalizedPath("/admin");
    revalidateLocalizedPath(returnTo);
    return {
      status: "success",
      messageKey: "requestSent",
      entityId: String(result.id),
      referenceCode: result.referenceCode,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function updateAgricultureServiceRequestAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const actor = await requireStaff("OPERATIONS", "agriculture-labor");
  const id = value(formData, "requestId");
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)))
    return { status: "error", messageKey: "validationError" };
  const status = value(formData, "status");
  const locale = value(formData, "locale") === "bn" ? "bn" : "en";
  const parsedStatus = status
    ? z
        .enum(["NEW", "REVIEWING", "ASSIGNED", "COMPLETED", "CANCELLED", "REJECTED"])
        .safeParse(status)
    : undefined;
  if (parsedStatus && !parsedStatus.success)
    return { status: "error", messageKey: "validationError" };
  const assignedToId = value(formData, "assignedToId");
  const marketplaceRequestId = value(formData, "marketplaceRequestId");
  const publicMessage = value(formData, "publicMessage");
  const privateNote = value(formData, "privateNote");
  if (
    assignedToId.length > 64 ||
    marketplaceRequestId.length > 64 ||
    publicMessage.length > 2000 ||
    privateNote.length > 2000
  )
    return { status: "error", messageKey: "validationError" };
  try {
    await updateAgricultureServiceRequest({
      actor,
      requestId: Number(id),
      ...(parsedStatus ? { status: parsedStatus.data } : {}),
      assignedToId,
      marketplaceRequestId,
      publicMessage,
      publicLocale: locale,
      privateNote,
      privateLocale: locale,
    });
    revalidateLocalizedPath("/admin");
    revalidateLocalizedPath("/account");
    return { status: "success", messageKey: "requestSent" };
  } catch (error) {
    return failure(error);
  }
}

export async function withdrawAgricultureServiceRequestAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account");
  const id = value(formData, "requestId");
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)))
    return { status: "error", messageKey: "validationError" };
  try {
    await withdrawAgricultureServiceRequest(user.id, Number(id));
    revalidateLocalizedPath("/account");
    revalidateLocalizedPath(`/account/agriculture-requests/${id}`);
    revalidateLocalizedPath("/admin");
    return { status: "success", messageKey: "requestCancelled" };
  } catch (error) {
    return failure(error);
  }
}
