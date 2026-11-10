"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { cacheTags } from "@/lib/cache-tags";
import { requireStaff, requireUser } from "@/lib/dal";
import { WorkflowError } from "@/lib/domain/marketplace";
import {
  reviewProviderVerification,
  submitProviderVerification,
} from "@/lib/domain/provider-verification";
import { logError } from "@/lib/logging";
import {
  providerVerificationReviewSchema,
  providerVerificationSubmissionSchema,
} from "@/lib/validations/provider-verification";
import type { WorkflowState } from "@/lib/workflow-state";

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
  if (error instanceof WorkflowError) {
    const messages = {
      notFound: "listingMissing",
      notAllowed: "permissionDenied",
      invalidState: "requestFailed",
      unavailable: "listingMissing",
      stockUnavailable: "stockUnavailable",
      bookingUnavailable: "bookingUnavailable",
      amountMismatch: "amountMismatch",
    } as const;
    return { status: "error", messageKey: messages[error.code] };
  }
  logError("provider_verification.action_failed", error);
  return { status: "error", messageKey: "requestFailed" };
}

async function run(
  operation: () => Promise<unknown>,
  messageKey: "verificationSubmitted" | "verificationReviewed",
) {
  try {
    await operation();
    revalidateLocalizedPath("/provider");
    revalidateLocalizedPath("/admin");
    revalidateTag(cacheTags.providers, "max");
    revalidateTag(cacheTags.listings, "max");
    revalidateTag(cacheTags.constructionPublic, "max");
    return { status: "success", messageKey } satisfies WorkflowState;
  } catch (error) {
    return failure(error);
  }
}

export async function submitProviderVerificationAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const user = await requireUser("/provider#construction-verification");
  let documents: unknown;
  try {
    documents = JSON.parse(value(formData, "documentsJson"));
  } catch {
    return { status: "error", messageKey: "validationError" };
  }
  const parsed = providerVerificationSubmissionSchema.safeParse({
    type: value(formData, "type"),
    applicantType: value(formData, "applicantType"),
    legalName: value(formData, "legalName"),
    businessName: value(formData, "businessName"),
    businessAddress: value(formData, "businessAddress"),
    registrationNumber: value(formData, "registrationNumber"),
    tradeLicenseNumber: value(formData, "tradeLicenseNumber"),
    taxIdentifier: value(formData, "taxIdentifier"),
    yearsExperience: value(formData, "yearsExperience"),
    teamSize: value(formData, "teamSize"),
    specializations: value(formData, "specializations"),
    materialCategories: value(formData, "materialCategories"),
    brands: value(formData, "brands"),
    serviceAreas: value(formData, "serviceAreas"),
    documents,
  });
  if (!parsed.success) return failure(parsed.error);
  return run(() => submitProviderVerification(user.id, parsed.data), "verificationSubmitted");
}

export async function reviewProviderVerificationAction(
  _state: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const parsed = providerVerificationReviewSchema.safeParse({
    applicationId: value(formData, "applicationId"),
    decision: value(formData, "decision"),
    reviewNote: value(formData, "reviewNote"),
    documentDecisions: (() => {
      try {
        return JSON.parse(value(formData, "documentDecisionsJson"));
      } catch {
        return null;
      }
    })(),
  });
  if (!parsed.success) return failure(parsed.error);
  const actor = await requireStaff("OPERATIONS", "construction");
  return run(() => reviewProviderVerification(actor.id, parsed.data), "verificationReviewed");
}
