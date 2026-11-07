"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { cacheTags } from "@/lib/cache-tags";
import { requireUser, safeNextPath } from "@/lib/dal";
import {
  acceptQuote,
  archiveProviderListing,
  cancelMarketplaceRequest,
  confirmPayment,
  createMarketplaceRequest,
  createProviderListing,
  progressOrder,
  raiseDispute,
  recordPayment,
  requestOrderCancellation,
  submitQuote,
  WorkflowError,
  updateProviderListingStock,
  updateProviderListing,
  updateProviderStorefront,
  writeReview,
} from "@/lib/domain/marketplace";
import { applyForProvider } from "@/lib/domain/marketplace";
import { logError } from "@/lib/logging";
import {
  createListingSchema,
  updateListingSchema,
  archiveListingSchema,
  storefrontSchema,
  createQuoteSchema,
  createRequestSchema,
  orderCancellationSchema,
  orderIdSchema,
  paymentConfirmationSchema,
  paymentSchema,
  providerApplicationSchema,
  reviewSchema,
  stockUpdateSchema,
} from "@/lib/validations/workflows";
import type { WorkflowMessageKey, WorkflowState } from "@/lib/workflow-state";

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function values(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function failure(error: unknown, fallback: WorkflowMessageKey = "requestFailed"): WorkflowState {
  if (error instanceof z.ZodError) {
    return {
      status: "error",
      messageKey: "validationError",
      errors: z.flattenError(error).fieldErrors,
    };
  }
  if (error instanceof WorkflowError) {
    const messageKey: Record<WorkflowError["code"], WorkflowMessageKey> = {
      notFound: "listingMissing",
      notAllowed: "permissionDenied",
      invalidState: "requestFailed",
      unavailable: "listingMissing",
      stockUnavailable: "stockUnavailable",
      bookingUnavailable: "bookingUnavailable",
      amountMismatch: "amountMismatch",
    };
    return { status: "error", messageKey: messageKey[error.code] };
  }
  logError("marketplace.action_failed", error);
  return { status: "error", messageKey: fallback };
}

async function run(
  operation: () => Promise<{ id?: string } | void>,
  messageKey: WorkflowMessageKey,
  refresh: string[],
): Promise<WorkflowState> {
  try {
    const result = await operation();
    for (const path of refresh) revalidateLocalizedPath(path);
    revalidateTag(cacheTags.listings, "max");
    revalidateTag(cacheTags.providers, "max");
    return { status: "success", messageKey, entityId: result?.id };
  } catch (error) {
    return failure(error);
  }
}

export async function applyProviderAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider");
  const parsed = providerApplicationSchema.safeParse({
    nameBn: value(formData, "nameBn"),
    nameEn: value(formData, "nameEn"),
    bioBn: value(formData, "bioBn"),
    bioEn: value(formData, "bioEn"),
    district: value(formData, "district"),
    upazila: value(formData, "upazila"),
    capabilities: values(formData, "capabilities"),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () => applyForProvider(user.id, parsed.data).then((id) => ({ id })),
    "applicationSent",
    ["/provider", "/admin"],
  );
}

export async function createListingAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#listings");
  const rawAvailableFrom = value(formData, "availableFrom");
  const parsed = createListingSchema.safeParse({
    sectorSlug: value(formData, "sectorSlug"),
    kind: value(formData, "kind"),
    titleBn: value(formData, "titleBn"),
    titleEn: value(formData, "titleEn"),
    descriptionBn: value(formData, "descriptionBn"),
    descriptionEn: value(formData, "descriptionEn"),
    category: value(formData, "category"),
    district: value(formData, "district"),
    unit: value(formData, "unit"),
    unitPrice: value(formData, "unitPrice"),
    stock: value(formData, "stock"),
    ...(rawAvailableFrom ? { availableFrom: rawAvailableFrom } : {}),
    ...(value(formData, "imageKey")
      ? {
          imageKey: value(formData, "imageKey"),
          imageContentType: value(formData, "imageContentType"),
          imageSizeBytes: value(formData, "imageSizeBytes"),
        }
      : {}),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(() => createProviderListing(user.id, parsed.data), "listingSaved", [
    "/provider",
    "/agriculture",
    "/agriculture/market",
    "/dashboard/agriculture",
    "/dashboard/agriculture/market",
    "/dashboard/construction",
    "/admin",
  ]);
}

export async function updateListingAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#listings");
  const rawAvailableFrom = value(formData, "availableFrom");
  const parsed = updateListingSchema.safeParse({
    listingId: value(formData, "listingId"),
    sectorSlug: value(formData, "sectorSlug"),
    kind: value(formData, "kind"),
    titleBn: value(formData, "titleBn"),
    titleEn: value(formData, "titleEn"),
    descriptionBn: value(formData, "descriptionBn"),
    descriptionEn: value(formData, "descriptionEn"),
    category: value(formData, "category"),
    district: value(formData, "district"),
    unit: value(formData, "unit"),
    unitPrice: value(formData, "unitPrice"),
    stock: value(formData, "stock"),
    ...(rawAvailableFrom ? { availableFrom: rawAvailableFrom } : {}),
    ...(value(formData, "imageKey")
      ? {
          imageKey: value(formData, "imageKey"),
          imageContentType: value(formData, "imageContentType"),
          imageSizeBytes: value(formData, "imageSizeBytes"),
        }
      : {}),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(() => updateProviderListing(user.id, parsed.data), "listingSaved", [
    "/provider",
    "/agriculture",
    "/agriculture/market",
    "/dashboard/agriculture",
    "/dashboard/agriculture/market",
    "/dashboard/construction",
    "/admin",
  ]);
}

export async function archiveListingAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#listings");
  const parsed = archiveListingSchema.safeParse({ listingId: value(formData, "listingId") });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () => archiveProviderListing(user.id, parsed.data.listingId).then(() => undefined),
    "listingSaved",
    [
      "/provider",
      "/agriculture",
      "/agriculture/market",
      "/dashboard/agriculture",
      "/dashboard/agriculture/market",
      "/dashboard/construction",
      "/admin",
    ],
  );
}

export async function updateProviderStorefrontAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#storefront");
  const parsed = storefrontSchema.safeParse({
    nameBn: value(formData, "nameBn"),
    nameEn: value(formData, "nameEn"),
    bioBn: value(formData, "bioBn"),
    bioEn: value(formData, "bioEn"),
    district: value(formData, "district"),
    upazila: value(formData, "upazila"),
    ...(value(formData, "profileImageKey")
      ? {
          profileImageKey: value(formData, "profileImageKey"),
          profileImageContentType: value(formData, "profileImageContentType"),
          profileImageSizeBytes: value(formData, "profileImageSizeBytes"),
        }
      : {}),
    ...(value(formData, "coverImageKey")
      ? {
          coverImageKey: value(formData, "coverImageKey"),
          coverImageContentType: value(formData, "coverImageContentType"),
          coverImageSizeBytes: value(formData, "coverImageSizeBytes"),
        }
      : {}),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () => updateProviderStorefront(user.id, parsed.data).then(() => undefined),
    "profileSaved",
    ["/provider", "/agriculture", "/dashboard/agriculture"],
  );
}

export async function updateListingStockAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#listings");
  const parsed = stockUpdateSchema.safeParse({
    listingId: value(formData, "listingId"),
    stock: value(formData, "stock"),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () =>
      updateProviderListingStock(user.id, parsed.data.listingId, parsed.data.stock).then(
        () => undefined,
      ),
    "stockUpdated",
    [
      "/provider",
      "/agriculture",
      "/agriculture/market",
      "/dashboard/agriculture",
      "/dashboard/agriculture/market",
      "/dashboard/construction",
    ],
  );
}

export async function createMarketplaceRequestAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const returnTo = safeNextPath(value(formData, "returnTo"), "/dashboard");
  const user = await requireUser(returnTo);
  const rawStart = value(formData, "requestedStart");
  const rawEnd = value(formData, "requestedEnd");
  const rawProject = value(formData, "projectId");
  const rawPackageId = value(formData, "packageId");
  const parsed = createRequestSchema.safeParse({
    listingId: value(formData, "listingId"),
    quantity: value(formData, "quantity") || "1",
    district: value(formData, "district"),
    details: value(formData, "details"),
    ...(rawStart ? { requestedStart: rawStart } : {}),
    ...(rawEnd ? { requestedEnd: rawEnd } : {}),
    ...(rawProject ? { projectId: rawProject } : {}),
    ...(rawPackageId ? { packageId: rawPackageId } : {}),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(() => createMarketplaceRequest(user.id, parsed.data), "requestSent", [
    "/account",
    "/provider",
  ]);
}

export async function cancelMarketplaceRequestAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#requests");
  const parsed = orderIdSchema.safeParse({ orderId: value(formData, "requestId") });
  if (!parsed.success) return failure(parsed.error);
  return run(() => cancelMarketplaceRequest(user.id, parsed.data.orderId), "requestCancelled", [
    "/account",
    "/provider",
  ]);
}

export async function submitQuoteAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#requests");
  const rawExpiry = value(formData, "expiresAt");
  const parsed = createQuoteSchema.safeParse({
    requestId: value(formData, "requestId"),
    quantity: value(formData, "quantity"),
    unitPrice: value(formData, "unitPrice"),
    transportFee: value(formData, "transportFee") || "0",
    note: value(formData, "note"),
    ...(rawExpiry ? { expiresAt: rawExpiry } : {}),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(() => submitQuote(user.id, parsed.data), "quoteSent", ["/provider", "/account"]);
}

export async function acceptQuoteAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#requests");
  const parsed = orderIdSchema.safeParse({ orderId: value(formData, "requestId") });
  if (!parsed.success) return failure(parsed.error);
  return run(() => acceptQuote(user.id, parsed.data.orderId), "orderCreated", [
    "/account",
    "/provider",
    "/admin",
  ]);
}

export async function progressOrderAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#orders");
  const parsed = z
    .strictObject({
      orderId: z.string().trim().min(1),
      intent: z.enum(["start", "submit", "confirm"]),
    })
    .safeParse({
      orderId: value(formData, "orderId"),
      intent: value(formData, "intent"),
    });
  if (!parsed.success) return failure(parsed.error);
  const key: WorkflowMessageKey =
    parsed.data.intent === "start"
      ? "requestInProgress"
      : parsed.data.intent === "submit"
        ? "workSubmitted"
        : "orderCompleted";
  return run(() => progressOrder(user.id, parsed.data.orderId, parsed.data.intent), key, [
    "/account",
    "/provider",
    "/admin",
  ]);
}

export async function requestOrderCancellationAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#orders");
  const parsed = orderCancellationSchema.safeParse({
    orderId: value(formData, "orderId"),
    reason: value(formData, "reason"),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () => requestOrderCancellation(user.id, parsed.data.orderId, parsed.data.reason),
    "cancellationRequested",
    ["/account", "/provider", "/admin"],
  );
}

export async function recordPaymentAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#orders");
  const parsed = paymentSchema.safeParse({
    orderId: value(formData, "orderId"),
    amount: value(formData, "amount"),
    method: value(formData, "method"),
    reference: value(formData, "reference"),
    ...(value(formData, "receiptKey")
      ? {
          receiptKey: value(formData, "receiptKey"),
          receiptContentType: value(formData, "receiptContentType"),
          receiptSizeBytes: value(formData, "receiptSizeBytes"),
        }
      : {}),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(() => recordPayment(user.id, parsed.data), "paymentRecorded", [
    "/account",
    "/provider",
    "/admin",
  ]);
}

export async function confirmPaymentAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#orders");
  const parsed = paymentConfirmationSchema.safeParse({
    orderId: value(formData, "orderId"),
    paymentId: value(formData, "paymentId"),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () => confirmPayment(user.id, parsed.data.orderId, parsed.data.paymentId),
    "paymentConfirmed",
    ["/account", "/provider", "/admin"],
  );
}

export async function reviewOrderAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#orders");
  const parsed = reviewSchema.safeParse({
    orderId: value(formData, "orderId"),
    rating: value(formData, "rating"),
    comment: value(formData, "comment"),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () =>
      writeReview(
        user.id,
        parsed.data.orderId,
        Number(parsed.data.rating),
        parsed.data.comment,
      ).then(() => undefined),
    "reviewSaved",
    ["/account", "/dashboard/agriculture-labor", "/dashboard/construction"],
  );
}

export async function raiseDisputeAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/account#orders");
  const parsed = orderCancellationSchema.safeParse({
    orderId: value(formData, "orderId"),
    reason: value(formData, "reason"),
  });
  if (!parsed.success) return failure(parsed.error);
  return run(
    () => raiseDispute(user.id, parsed.data.orderId, parsed.data.reason),
    "disputeRaised",
    ["/account", "/provider", "/admin"],
  );
}
