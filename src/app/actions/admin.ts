"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { cacheTags } from "@/lib/cache-tags";
import { requireStaff, requireSuperAdmin } from "@/lib/dal";
import {
  grantStaffAccess,
  markCommissionCollected,
  moderateListing,
  moderateProviderCapability,
  recordRefund,
  resolveDispute,
  revokeStaffAccess,
  updateSectorCommissionRate,
  WorkflowError,
} from "@/lib/domain/marketplace";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import {
  commissionRateSchema,
  commissionReceiptSchema,
  disputeResolutionSchema,
  moderationSchema,
  refundSchema,
  revokeStaffGrantSchema,
  staffGrantSchema,
} from "@/lib/validations/workflows";
import type { WorkflowMessageKey, WorkflowState } from "@/lib/workflow-state";

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
  logError("admin.action_failed", error);
  return { status: "error", messageKey: "requestFailed" };
}

async function run(
  operation: () => Promise<unknown>,
  messageKey: WorkflowMessageKey,
): Promise<WorkflowState> {
  try {
    await operation();
    revalidateLocalizedPath("/admin");
    revalidateLocalizedPath("/provider");
    revalidateLocalizedPath("/account");
    revalidateLocalizedPath("/dashboard/agriculture-labor");
    revalidateLocalizedPath("/dashboard/construction");
    revalidateTag(cacheTags.listings, "max");
    revalidateTag(cacheTags.providers, "max");
    revalidateTag(cacheTags.agriculturePublic, "max");
    revalidateTag(cacheTags.constructionPublic, "max");
    return { status: "success", messageKey };
  } catch (error) {
    return failure(error);
  }
}

export async function moderateProviderCapabilityAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = moderationSchema.safeParse({
    id: value(formData, "id"),
    decision: value(formData, "decision"),
  });
  if (!parsed.success || !/^\d+$/.test(parsed.data?.id ?? ""))
    return failure(parsed.success ? new Error("Invalid capability id") : parsed.error);
  const id = Number(parsed.data.id);
  const capability = await prisma.providerCapability.findUnique({
    where: { id },
    select: { sectorSlug: true },
  });
  if (!capability) return { status: "error", messageKey: "listingMissing" };
  const actor = await requireStaff("OPERATIONS", capability.sectorSlug);
  return run(
    () => moderateProviderCapability(actor.id, id, parsed.data.decision),
    "providerApproved",
  );
}

export async function moderateListingAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = moderationSchema.safeParse({
    id: value(formData, "id"),
    decision: value(formData, "decision"),
  });
  if (!parsed.success) return failure(parsed.error);
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: parsed.data.id },
    select: { sectorSlug: true },
  });
  if (!listing) return { status: "error", messageKey: "listingMissing" };
  const actor = await requireStaff("OPERATIONS", listing.sectorSlug);
  return run(
    () => moderateListing(actor.id, parsed.data.id, parsed.data.decision),
    "listingApproved",
  );
}

export async function markCommissionCollectedAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = commissionReceiptSchema.safeParse({
    commissionId: value(formData, "commissionId"),
    reference: value(formData, "reference"),
  });
  if (!parsed.success) return failure(parsed.error);
  const commission = await prisma.commissionRecord.findUnique({
    where: { id: parsed.data.commissionId },
    select: { order: { select: { request: { select: { sectorSlug: true } } } } },
  });
  if (!commission) return { status: "error", messageKey: "listingMissing" };
  const actor = await requireStaff("FINANCE", commission.order.request.sectorSlug);
  return run(
    () => markCommissionCollected(actor.id, parsed.data.commissionId, parsed.data.reference),
    "commissionCollected",
  );
}

export async function recordRefundAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = refundSchema.safeParse({
    paymentId: value(formData, "paymentId"),
    amount: value(formData, "amount"),
    reference: value(formData, "reference"),
  });
  if (!parsed.success) return failure(parsed.error);
  const payment = await prisma.paymentRecord.findUnique({
    where: { id: parsed.data.paymentId },
    select: { order: { select: { request: { select: { sectorSlug: true } } } } },
  });
  if (!payment) return { status: "error", messageKey: "listingMissing" };
  const actor = await requireStaff("FINANCE", payment.order.request.sectorSlug);
  return run(
    () => recordRefund(actor.id, parsed.data.paymentId, parsed.data.amount, parsed.data.reference),
    "refundRecorded",
  );
}

export async function resolveDisputeAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = disputeResolutionSchema.safeParse({
    orderId: value(formData, "orderId"),
    decision: value(formData, "decision"),
    note: value(formData, "note"),
  });
  if (!parsed.success) return failure(parsed.error);
  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { request: { select: { sectorSlug: true } } },
  });
  if (!order) return { status: "error", messageKey: "listingMissing" };
  const actor = await requireStaff("OPERATIONS", order.request.sectorSlug);
  return run(
    () => resolveDispute(actor.id, parsed.data.orderId, parsed.data.decision, parsed.data.note),
    "disputeResolved",
  );
}

export async function updateSectorCommissionRateAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = commissionRateSchema.safeParse({
    sectorSlug: value(formData, "sectorSlug"),
    rate: value(formData, "rate"),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireSuperAdmin();
  return run(
    () => updateSectorCommissionRate(actor.id, parsed.data.sectorSlug, parsed.data.rate),
    "commissionRateUpdated",
  );
}

export async function grantStaffAccessAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = staffGrantSchema.safeParse({
    email: value(formData, "email"),
    permission: value(formData, "permission"),
    scope: value(formData, "scope"),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireSuperAdmin();
  return run(
    () => grantStaffAccess(actor.id, parsed.data.email, parsed.data.permission, parsed.data.scope),
    "staffGranted",
  );
}

export async function revokeStaffAccessAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = revokeStaffGrantSchema.safeParse({ id: value(formData, "id") });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireSuperAdmin();
  return run(() => revokeStaffAccess(actor.id, parsed.data.id), "staffRevoked");
}
