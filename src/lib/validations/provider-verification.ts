import { z } from "zod";

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);

export const providerVerificationTypes = ["CONTRACTOR", "SUPPLIER"] as const;
export const providerVerificationDocumentTypes = [
  "BUSINESS_REGISTRATION",
  "TRADE_LICENSE",
  "TAX_DOCUMENT",
  "PROFESSIONAL_CREDENTIAL",
  "PORTFOLIO_OR_REFERENCE",
  "SUPPLIER_AUTHORIZATION",
  "PRODUCT_CERTIFICATE",
  "WAREHOUSE_PROOF",
  "OTHER",
] as const;

const verificationDocumentSchema = z.strictObject({
  documentType: z.enum(providerVerificationDocumentTypes),
  storageKey: requiredText(500),
  filename: requiredText(120),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10_000_000),
});

export const providerVerificationSubmissionSchema = z
  .strictObject({
    type: z.enum(providerVerificationTypes),
    applicantType: z.enum(["INDIVIDUAL", "BUSINESS"]),
    legalName: requiredText(120),
    businessName: optionalText(120),
    businessAddress: requiredText(500),
    registrationNumber: optionalText(100),
    tradeLicenseNumber: optionalText(100),
    taxIdentifier: optionalText(100),
    yearsExperience: z
      .string()
      .trim()
      .regex(/^(?:|[0-9]|[1-6][0-9]|70)$/),
    teamSize: z
      .string()
      .trim()
      .regex(/^(?:|[1-9][0-9]{0,2}|1000)$/),
    specializations: optionalText(1200),
    materialCategories: optionalText(1200),
    brands: optionalText(1200),
    serviceAreas: optionalText(1200),
    documents: z.array(verificationDocumentSchema).min(1).max(8),
  })
  .superRefine((value, context) => {
    if (value.applicantType === "BUSINESS" && !value.businessName.trim()) {
      context.addIssue({
        code: "custom",
        path: ["businessName"],
        message: "Enter the registered business name.",
      });
    }
    if (
      value.applicantType === "BUSINESS" &&
      !value.registrationNumber.trim() &&
      !value.tradeLicenseNumber.trim()
    ) {
      context.addIssue({
        code: "custom",
        path: ["tradeLicenseNumber"],
        message: "Provide a registration or trade-license number.",
      });
    }
    const allowedDocumentTypes =
      value.type === "CONTRACTOR"
        ? [
            "BUSINESS_REGISTRATION",
            "TRADE_LICENSE",
            "PROFESSIONAL_CREDENTIAL",
            "PORTFOLIO_OR_REFERENCE",
          ]
        : [
            "BUSINESS_REGISTRATION",
            "TRADE_LICENSE",
            "SUPPLIER_AUTHORIZATION",
            "PRODUCT_CERTIFICATE",
            "WAREHOUSE_PROOF",
          ];
    if (!value.documents.some((document) => allowedDocumentTypes.includes(document.documentType))) {
      context.addIssue({
        code: "custom",
        path: ["documents"],
        message: "Upload at least one document relevant to this verification type.",
      });
    }
  });

export const providerVerificationReviewSchema = z.strictObject({
  applicationId: requiredText(64),
  decision: z.enum(["IN_REVIEW", "APPROVED", "CHANGES_REQUESTED", "REJECTED", "REVOKED"]),
  reviewNote: optionalText(1200),
  documentDecisions: z
    .array(
      z.strictObject({
        id: requiredText(64),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
        note: optionalText(500),
      }),
    )
    .max(8),
});

export type ProviderVerificationSubmissionInput = z.infer<
  typeof providerVerificationSubmissionSchema
>;
export type ProviderVerificationReviewInput = z.infer<typeof providerVerificationReviewSchema>;
