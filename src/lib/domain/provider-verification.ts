import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { WorkflowError } from "@/lib/domain/marketplace";
import { prisma } from "@/lib/prisma";
import { validateStoredObject } from "@/lib/storage/s3";
import type {
  ProviderVerificationReviewInput,
  ProviderVerificationSubmissionInput,
} from "@/lib/validations/provider-verification";

type Tx = Prisma.TransactionClient;

function fail(code: ConstructorParameters<typeof WorkflowError>[0]): never {
  throw new WorkflowError(code);
}

function sanitizeFilename(filename: string) {
  return filename
    .replace(/[\\/\p{Cc}]/gu, "_")
    .trim()
    .slice(0, 120);
}

function toList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 80)),
    ),
  ).slice(0, 30);
}

function verificationKind(type: "CONTRACTOR" | "SUPPLIER") {
  return type === "CONTRACTOR" ? "CONSTRUCTION_SERVICE" : "CONSTRUCTION_MATERIAL";
}

function notificationCopy(
  status: "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "REVOKED",
) {
  const copy = {
    SUBMITTED: {
      titleEn: "Verification application submitted",
      titleBn: "যাচাইকরণের আবেদন জমা হয়েছে",
      messageEn: "Your construction provider verification is in the review queue.",
      messageBn: "আপনার নির্মাণসেবা যাচাইয়ের আবেদন পর্যালোচনার অপেক্ষায় আছে।",
    },
    APPROVED: {
      titleEn: "Provider verification approved",
      titleBn: "সেবাদাতার যাচাইকরণ অনুমোদিত হয়েছে",
      messageEn: "Your construction provider verification was approved.",
      messageBn: "আপনার নির্মাণসেবা যাচাইকরণ অনুমোদিত হয়েছে।",
    },
    CHANGES_REQUESTED: {
      titleEn: "More information is needed",
      titleBn: "আরও তথ্য প্রয়োজন",
      messageEn: "Review the requested changes in your provider workspace and resubmit.",
      messageBn: "সেবাদাতা প্যানেলে প্রয়োজনীয় সংশোধন দেখে আবার জমা দিন।",
    },
    REJECTED: {
      titleEn: "Provider verification declined",
      titleBn: "সেবাদাতার যাচাইকরণ প্রত্যাখ্যাত হয়েছে",
      messageEn:
        "Your construction provider verification was declined. Review the reason in your workspace.",
      messageBn: "আপনার নির্মাণসেবা যাচাইকরণ প্রত্যাখ্যাত হয়েছে। প্যানেলে কারণটি দেখুন।",
    },
    REVOKED: {
      titleEn: "Provider verification revoked",
      titleBn: "সেবাদাতার যাচাইকরণ বাতিল করা হয়েছে",
      messageEn:
        "Your construction provider verification is no longer active. Review the reason in your workspace.",
      messageBn: "আপনার নির্মাণসেবা যাচাইকরণ আর সক্রিয় নেই। প্যানেলে কারণটি দেখুন।",
    },
  } as const;
  return copy[status];
}

async function addNotification(
  tx: Tx,
  userId: string,
  status: "SUBMITTED" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "REVOKED",
) {
  const copy = notificationCopy(status);
  await tx.notification.create({
    data: {
      userId,
      title: copy.titleEn,
      message: copy.messageEn,
      href: "/provider#construction-verification",
      translations: {
        create: [
          { locale: "en", title: copy.titleEn, message: copy.messageEn },
          { locale: "bn", title: copy.titleBn, message: copy.messageBn },
        ],
      },
    },
  });
}

export async function submitProviderVerification(
  actorId: string,
  input: ProviderVerificationSubmissionInput,
) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: actorId },
    select: { id: true },
  });
  if (!profile) fail("notAllowed");

  const capability = await prisma.providerCapability.findUnique({
    where: {
      providerId_sectorSlug_kind: {
        providerId: profile.id,
        sectorSlug: "construction",
        kind: verificationKind(input.type),
      },
    },
    select: { id: true },
  });
  if (!capability) fail("notAllowed");

  const prefix = `provider-verification/${profile.id}/${input.type}/${actorId}/`;
  const keys = new Set<string>();
  const documents = input.documents.map((document) => {
    const filename = sanitizeFilename(document.filename);
    if (!filename || !document.storageKey.startsWith(prefix) || keys.has(document.storageKey))
      fail("notAllowed");
    keys.add(document.storageKey);
    return { ...document, filename };
  });

  await Promise.all(
    documents.map((document) =>
      validateStoredObject(
        document.storageKey,
        document.contentType,
        10_000_000,
        document.sizeBytes,
      ),
    ),
  );

  return prisma.$transaction(async (tx) => {
    const current = await tx.providerVerificationApplication.findUnique({
      where: { providerId_type: { providerId: profile.id, type: input.type } },
      select: { id: true, status: true, version: true, expiresAt: true },
    });
    const expired =
      current?.status === "APPROVED" && current.expiresAt && current.expiresAt <= new Date();
    const mayResubmit =
      !current ||
      current.status === "CHANGES_REQUESTED" ||
      current.status === "REJECTED" ||
      current.status === "EXPIRED" ||
      current.status === "REVOKED" ||
      expired;
    if (!mayResubmit) fail("invalidState");

    const version = (current?.version ?? 0) + 1;
    const values = {
      applicantType: input.applicantType,
      legalName: input.legalName,
      businessName: input.businessName || null,
      businessAddress: input.businessAddress,
      registrationNumber: input.registrationNumber || null,
      tradeLicenseNumber: input.tradeLicenseNumber || null,
      taxIdentifier: input.taxIdentifier || null,
      yearsExperience: input.yearsExperience === "" ? null : Number(input.yearsExperience),
      teamSize: input.teamSize === "" ? null : Number(input.teamSize),
      specializations: toList(input.specializations),
      materialCategories: toList(input.materialCategories),
      brands: toList(input.brands),
      serviceAreas: toList(input.serviceAreas),
      status: "SUBMITTED" as const,
      version,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null,
      reviewNote: null,
      expiresAt: null,
    };
    const application = current
      ? await tx.providerVerificationApplication.update({
          where: { id: current.id },
          data: values,
          select: { id: true },
        })
      : await tx.providerVerificationApplication.create({
          data: { providerId: profile.id, type: input.type, ...values },
          select: { id: true },
        });

    await tx.providerVerificationDocument.createMany({
      data: documents.map((document) => ({
        applicationId: application.id,
        version,
        documentType: document.documentType,
        filename: document.filename,
        storageKey: document.storageKey,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
      })),
    });
    await tx.providerVerificationApplicationVersion.create({
      data: {
        applicationId: application.id,
        version,
        applicantType: values.applicantType,
        legalName: values.legalName,
        businessName: values.businessName,
        businessAddress: values.businessAddress,
        registrationNumber: values.registrationNumber,
        tradeLicenseNumber: values.tradeLicenseNumber,
        taxIdentifier: values.taxIdentifier,
        yearsExperience: values.yearsExperience,
        teamSize: values.teamSize,
        specializations: values.specializations,
        materialCategories: values.materialCategories,
        brands: values.brands,
        serviceAreas: values.serviceAreas,
      },
    });
    await tx.providerVerificationReview.create({
      data: { applicationId: application.id, actorId, version, action: "SUBMITTED" },
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "provider_verification.submitted",
        entityType: "provider_verification_application",
        entityId: application.id,
      },
    });
    await addNotification(tx, actorId, "SUBMITTED");
    return { id: application.id };
  });
}

export async function reviewProviderVerification(
  actorId: string,
  input: ProviderVerificationReviewInput,
) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.providerVerificationApplication.findUnique({
      where: { id: input.applicationId },
      include: {
        provider: { select: { userId: true } },
      },
    });
    if (!application) fail("notFound");
    if (application.provider.userId === actorId) fail("notAllowed");

    const currentDocuments = await tx.providerVerificationDocument.findMany({
      where: { applicationId: application.id, version: application.version },
      select: { id: true },
    });
    const note = input.reviewNote.trim();
    if (input.decision !== "IN_REVIEW" && note.length < 10) fail("invalidState");
    if (input.decision === "REVOKED" && application.status !== "APPROVED") fail("invalidState");
    if (
      input.decision !== "REVOKED" &&
      application.status !== "SUBMITTED" &&
      application.status !== "IN_REVIEW"
    ) {
      fail("invalidState");
    }

    if (input.documentDecisions.length) {
      const decisions = new Map(input.documentDecisions.map((decision) => [decision.id, decision]));
      if (decisions.size !== input.documentDecisions.length) fail("invalidState");
      if (Array.from(decisions.keys()).some((id) => !currentDocuments.some((doc) => doc.id === id)))
        fail("notAllowed");
      for (const decision of input.documentDecisions) {
        await tx.providerVerificationDocument.update({
          where: { id: decision.id },
          data: {
            status: decision.status,
            reviewNote: decision.note || null,
            reviewedAt: new Date(),
            reviewedById: actorId,
          },
        });
      }
    }

    if (input.decision === "APPROVED") {
      if (!currentDocuments.length) fail("invalidState");
      const decisions = new Map(
        input.documentDecisions.map((decision) => [decision.id, decision.status]),
      );
      if (currentDocuments.some((document) => decisions.get(document.id) !== "APPROVED")) {
        fail("invalidState");
      }
    }

    const updated = await tx.providerVerificationApplication.updateMany({
      where: { id: application.id, version: application.version, status: application.status },
      data: {
        status: input.decision,
        reviewedAt: new Date(),
        reviewedById: actorId,
        reviewNote: note || null,
        ...(input.decision === "APPROVED"
          ? { expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
          : input.decision === "REVOKED"
            ? { expiresAt: new Date() }
            : {}),
      },
    });
    if (updated.count !== 1) fail("invalidState");

    await tx.providerVerificationReview.create({
      data: {
        applicationId: application.id,
        actorId,
        version: application.version,
        action: input.decision,
        note: note || null,
        documentDecisions: input.documentDecisions,
      },
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: `provider_verification.${input.decision.toLowerCase()}`,
        entityType: "provider_verification_application",
        entityId: application.id,
      },
    });
    if (input.decision !== "IN_REVIEW") {
      await addNotification(tx, application.provider.userId, input.decision);
    }
  });
}
