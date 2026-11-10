import { z } from "zod";

import { agricultureListings, constructionListings } from "@/lib/sectors";
import {
  providerVerificationDocumentTypes,
  providerVerificationTypes,
} from "@/lib/validations/provider-verification";

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const quantity = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/)
  .refine((value) => Number(value) > 0);
const stockAmount = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/);
const money = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/);
const optionalDate = z.iso.date().optional();

export const capabilityOptions = [
  ...agricultureListings.map((service) => `${"agriculture-labor"}:${service.kind}`),
  ...constructionListings.map((service) => `${"construction"}:${service.kind}`),
] as const;

export const providerApplicationSchema = z.strictObject({
  nameBn: requiredText(100),
  nameEn: requiredText(100),
  bioBn: text(1200),
  bioEn: text(1200),
  district: requiredText(80),
  upazila: text(80),
  capabilities: z.array(z.enum(capabilityOptions)).min(1).max(capabilityOptions.length),
});

export const profileSchema = z.strictObject({
  name: requiredText(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ ()-]{7,30}$/),
});

const listingFields = {
  sectorSlug: z.enum(["agriculture-labor", "construction"]),
  kind: z.enum(["PRODUCE", "WORKER", "MACHINERY", "CONSTRUCTION_MATERIAL", "CONSTRUCTION_SERVICE"]),
  titleBn: requiredText(120),
  titleEn: requiredText(120),
  descriptionBn: text(2000),
  descriptionEn: text(2000),
  category: requiredText(80),
  district: requiredText(80),
  unit: requiredText(30),
  unitPrice: money.refine((value) => Number(value) > 0),
  stock: stockAmount,
  availableFrom: optionalDate,
  imageKey: text(240).optional(),
  imageContentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  imageSizeBytes: z
    .string()
    .regex(/^\d{1,8}$/)
    .optional(),
};

function validateListing(
  value: z.infer<z.ZodObject<typeof listingFields>>,
  context: z.RefinementCtx,
) {
  if (["PRODUCE", "CONSTRUCTION_MATERIAL"].includes(value.kind) && Number(value.stock) <= 0) {
    context.addIssue({
      code: "custom",
      path: ["stock"],
      message: "Goods must have stock greater than zero.",
    });
  }
  const imageFields = [value.imageKey, value.imageContentType, value.imageSizeBytes].filter(
    Boolean,
  ).length;
  if (imageFields !== 0 && imageFields !== 3)
    context.addIssue({
      code: "custom",
      path: ["imageKey"],
      message: "Upload all image details together.",
    });
  if (value.imageSizeBytes && Number(value.imageSizeBytes) > 5_000_000)
    context.addIssue({ code: "custom", path: ["imageSizeBytes"], message: "Image is too large." });
}

export const createListingSchema = z.strictObject(listingFields).superRefine(validateListing);
export const updateListingSchema = z
  .strictObject({ ...listingFields, listingId: requiredText(64) })
  .superRefine(validateListing);
export const archiveListingSchema = z.strictObject({ listingId: requiredText(64) });

const storefrontFields = {
  nameBn: requiredText(100),
  nameEn: requiredText(100),
  bioBn: text(1200),
  bioEn: text(1200),
  district: requiredText(80),
  upazila: text(80),
  profileImageKey: text(240).optional(),
  profileImageContentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  profileImageSizeBytes: z
    .string()
    .regex(/^\d{1,8}$/)
    .optional(),
  coverImageKey: text(240).optional(),
  coverImageContentType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  coverImageSizeBytes: z
    .string()
    .regex(/^\d{1,8}$/)
    .optional(),
};
export const storefrontSchema = z.strictObject(storefrontFields).superRefine((value, context) => {
  for (const prefix of ["profileImage", "coverImage"] as const) {
    const values = [
      value[`${prefix}Key`],
      value[`${prefix}ContentType`],
      value[`${prefix}SizeBytes`],
    ];
    const count = values.filter(Boolean).length;
    if (count !== 0 && count !== 3)
      context.addIssue({
        code: "custom",
        path: [`${prefix}Key`],
        message: "Upload all image details together.",
      });
    if (value[`${prefix}SizeBytes`] && Number(value[`${prefix}SizeBytes`]) > 5_000_000)
      context.addIssue({
        code: "custom",
        path: [`${prefix}SizeBytes`],
        message: "Image is too large.",
      });
  }
});

export const createRequestSchema = z
  .strictObject({
    listingId: requiredText(64),
    quantity,
    district: requiredText(80),
    details: text(2000),
    requestedStart: optionalDate,
    requestedEnd: optionalDate,
    projectId: text(64).optional(),
    packageId: text(64).optional(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.projectId) !== Boolean(value.packageId))
      context.addIssue({
        code: "custom",
        path: ["packageId"],
        message: "Project invitations need a work package.",
      });
    if (Boolean(value.requestedStart) !== Boolean(value.requestedEnd)) {
      context.addIssue({
        code: "custom",
        path: ["requestedEnd"],
        message: "Provide both booking dates.",
      });
    }
    if (value.requestedStart && value.requestedEnd && value.requestedEnd <= value.requestedStart) {
      context.addIssue({
        code: "custom",
        path: ["requestedEnd"],
        message: "The end date must be after the start date.",
      });
    }
  });

export const uploadPresignSchema = z.discriminatedUnion("purpose", [
  z.strictObject({
    purpose: z.literal("provider-verification-document"),
    verificationType: z.enum(providerVerificationTypes),
    documentType: z.enum(providerVerificationDocumentTypes),
    contentType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(10_000_000),
  }),
  z.strictObject({
    purpose: z.literal("listing-image"),
    sectorSlug: z.enum(["agriculture-labor", "construction"]),
    kind: z.enum([
      "PRODUCE",
      "WORKER",
      "MACHINERY",
      "CONSTRUCTION_MATERIAL",
      "CONSTRUCTION_SERVICE",
    ]),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(5_000_000),
  }),
  z.strictObject({
    purpose: z.literal("provider-storefront-image"),
    imageType: z.enum(["profile", "cover"]),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(5_000_000),
  }),
  z.strictObject({
    purpose: z.literal("project-document"),
    projectId: requiredText(64),
    contentType: z.literal("application/pdf"),
    sizeBytes: z.number().int().positive().max(10_000_000),
  }),
  z.strictObject({
    purpose: z.literal("project-photo"),
    projectId: requiredText(64),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(5_000_000),
  }),
  z.strictObject({
    purpose: z.literal("payment-receipt"),
    orderId: requiredText(64),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
    sizeBytes: z.number().int().positive().max(10_000_000),
  }),
  z.strictObject({
    purpose: z.literal("crop-disease-photo"),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive().max(5_000_000),
  }),
]);

export const attachProjectDocumentSchema = z.strictObject({
  projectId: requiredText(64),
  storageKey: requiredText(240),
  filename: requiredText(120),
  sizeBytes: z
    .string()
    .regex(/^\d{1,8}$/)
    .refine((value) => Number(value) > 0 && Number(value) <= 10_000_000),
});

export const attachProjectPhotoSchema = z.strictObject({
  projectId: requiredText(64),
  storageKey: requiredText(240),
  filename: requiredText(120),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z
    .string()
    .regex(/^\d{1,8}$/)
    .refine((value) => Number(value) > 0 && Number(value) <= 5_000_000),
});

export const createQuoteSchema = z.strictObject({
  requestId: requiredText(64),
  quantity,
  unitPrice: money.refine((value) => Number(value) > 0),
  transportFee: money,
  note: text(1200),
  expiresAt: optionalDate,
});

export const createProjectSchema = z
  .strictObject({
    title: requiredText(120),
    projectType: requiredText(80),
    district: requiredText(80),
    description: requiredText(4000),
    approximateArea: text(80),
    budget: money.optional(),
    startsAt: optionalDate,
    targetEndsAt: optionalDate,
    serviceSlug: text(80).optional(),
    listingId: text(64).optional(),
  })
  .superRefine((value, context) => {
    if (value.serviceSlug && value.listingId)
      context.addIssue({
        code: "custom",
        path: ["listingId"],
        message: "Choose a service or a listing to start the project.",
      });
    if (value.startsAt && value.targetEndsAt && value.targetEndsAt < value.startsAt) {
      context.addIssue({
        code: "custom",
        path: ["targetEndsAt"],
        message: "The target date must follow the start date.",
      });
    }
  });

export const createProjectPackageSchema = z.strictObject({
  projectId: requiredText(64),
  label: requiredText(120),
  description: text(1200),
  kind: z.enum(["CONSTRUCTION_SERVICE", "CONSTRUCTION_MATERIAL"]).optional(),
  serviceSlug: text(80).optional(),
});

export const projectHandoverSchema = z.strictObject({ projectId: requiredText(64) });

export const projectExpenseSchema = z.strictObject({
  projectId: requiredText(64),
  description: requiredText(240),
  amount: money.refine((value) => Number(value) > 0),
  occurredAt: optionalDate,
});

export const milestoneSchema = z.strictObject({
  projectId: requiredText(64),
  title: requiredText(120),
  description: text(1200),
  assignedProviderId: requiredText(64),
  amount: money.optional(),
  dueAt: optionalDate,
});

export const milestoneUpdateSchema = z.strictObject({
  milestoneId: requiredText(64),
  intent: z.enum(["submit", "approve"]),
});

export const orderIdSchema = z.strictObject({ orderId: requiredText(64) });

export const paymentSchema = z
  .strictObject({
    orderId: requiredText(64),
    amount: money.refine((value) => Number(value) > 0),
    method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"]),
    reference: text(120),
    receiptKey: text(240).optional(),
    receiptContentType: z
      .enum(["image/jpeg", "image/png", "image/webp", "application/pdf"])
      .optional(),
    receiptSizeBytes: z
      .string()
      .regex(/^\d{1,8}$/)
      .optional(),
  })
  .superRefine((value, context) => {
    const fields = [value.receiptKey, value.receiptContentType, value.receiptSizeBytes].filter(
      Boolean,
    ).length;
    if (fields !== 0 && fields !== 3)
      context.addIssue({
        code: "custom",
        path: ["receiptKey"],
        message: "Upload all receipt details together.",
      });
    if (value.receiptSizeBytes && Number(value.receiptSizeBytes) > 10_000_000)
      context.addIssue({
        code: "custom",
        path: ["receiptSizeBytes"],
        message: "Receipt is too large.",
      });
  });

export const paymentConfirmationSchema = z.strictObject({
  orderId: requiredText(64),
  paymentId: requiredText(64),
});

export const reviewSchema = z.strictObject({
  orderId: requiredText(64),
  rating: z.string().regex(/^[1-5]$/),
  comment: text(1200),
});

export const orderCancellationSchema = z.strictObject({
  orderId: requiredText(64),
  reason: requiredText(1000),
});

export const moderationSchema = z.strictObject({
  id: requiredText(64),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export const commissionReceiptSchema = z.strictObject({
  commissionId: requiredText(64),
  reference: text(120),
});

export const refundSchema = z.strictObject({
  paymentId: requiredText(64),
  amount: money.refine((value) => Number(value) > 0),
  reference: text(120),
});

export const disputeResolutionSchema = z.strictObject({
  orderId: requiredText(64),
  decision: z.enum(["COMPLETE", "CANCEL"]),
  note: text(1000),
});

export const staffGrantSchema = z.strictObject({
  email: z
    .string()
    .trim()
    .pipe(z.email())
    .transform((email) => email.toLowerCase()),
  permission: z.enum(["OPERATIONS", "FINANCE", "USERS", "PANELS", "REPORTS"]),
  scope: z
    .string()
    .refine(
      (value) => value === "global" || value === "agriculture-labor" || value === "construction",
    ),
});

export const revokeStaffGrantSchema = z.strictObject({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const commissionRateSchema = z.strictObject({
  sectorSlug: z.enum(["agriculture-labor", "construction"]),
  rate: z
    .string()
    .regex(/^(?:0|[1-9]\d?)(?:\.\d{1,2})?$/)
    .refine((value) => Number(value) <= 100),
});

export const stockUpdateSchema = z.strictObject({
  listingId: requiredText(64),
  stock: z
    .string()
    .trim()
    .regex(/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/),
});

export type ProviderApplicationInput = z.infer<typeof providerApplicationSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type StorefrontInput = z.infer<typeof storefrontSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectPackageInput = z.infer<typeof createProjectPackageSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
