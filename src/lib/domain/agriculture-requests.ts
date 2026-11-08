import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { hasStaffPermission, type CurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { validateStoredObject } from "@/lib/storage/s3";

const sectorSlug = "agriculture-labor";

export type DiseasePhotoInput = {
  key: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
};

export class AgricultureRequestError extends Error {
  constructor(readonly code: "notFound" | "notAllowed" | "invalidState" | "unavailable") {
    super(code);
  }
}

export async function createAgricultureServiceRequest(input: {
  user: CurrentUser;
  serviceSlug: string;
  formVersion: number;
  customerName: string;
  phone: string;
  district: string;
  details: string;
  budget: string;
  answers: Record<string, string>;
  fieldSnapshot: object;
  photo?: DiseasePhotoInput;
}) {
  const account = await prisma.user.findUnique({
    where: { id: input.user.id },
    select: { id: true, status: true, emailVerified: true },
  });
  if (!account || account.status !== "active" || !account.emailVerified)
    throw new AgricultureRequestError("notAllowed");
  const service = await prisma.serviceDefinition.findFirst({
    where: { slug: input.serviceSlug, sectorSlug, isActive: true },
    select: { id: true, slug: true, formVersion: true },
  });
  if (!service) throw new AgricultureRequestError("notFound");
  if (service.formVersion !== input.formVersion) throw new AgricultureRequestError("invalidState");

  if (input.photo) {
    if (
      service.slug !== "pest-control" ||
      !input.photo.key.startsWith(`agriculture-requests/${input.user.id}/`)
    ) {
      throw new AgricultureRequestError("notAllowed");
    }
    try {
      await validateStoredObject(
        input.photo.key,
        input.photo.contentType,
        5_000_000,
        input.photo.sizeBytes,
      );
    } catch {
      throw new AgricultureRequestError("unavailable");
    }
  }

  return prisma.$transaction(async (tx) => {
    const request = await tx.serviceRequest.create({
      data: {
        userId: input.user.id,
        serviceDefinitionId: service.id,
        customerName: input.customerName,
        phone: input.phone,
        district: input.district,
        details: input.details,
        budget: input.budget ? new Prisma.Decimal(input.budget) : null,
        formVersion: service.formVersion,
        answers: input.answers as Prisma.InputJsonValue,
        fieldSnapshot: input.fieldSnapshot as Prisma.InputJsonValue,
      },
      select: { id: true, createdAt: true },
    });
    const referenceCode = `AG-${request.createdAt.getUTCFullYear()}-${String(request.id).padStart(6, "0")}`;
    await tx.serviceRequest.update({ where: { id: request.id }, data: { referenceCode } });
    if (input.photo) {
      const extension =
        input.photo.contentType === "image/jpeg"
          ? "jpg"
          : input.photo.contentType === "image/png"
            ? "png"
            : "webp";
      await tx.serviceRequestAttachment.create({
        data: {
          requestId: request.id,
          createdById: input.user.id,
          storageKey: input.photo.key,
          filename: `crop-disease-photo.${extension}`,
          contentType: input.photo.contentType,
          sizeBytes: input.photo.sizeBytes,
        },
      });
    }
    await tx.serviceRequestUpdate.create({
      data: {
        requestId: request.id,
        authorId: input.user.id,
        visibility: "CUSTOMER",
        messageBn: "আপনার অনুরোধ গ্রহণ করা হয়েছে। কৃষি পরিচালনা দল এটি পর্যালোচনা করবে।",
        messageEn: "Your request has been received. Agriculture operations staff will review it.",
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.user.id,
        action: "agriculture_service_request.created",
        entityType: "ServiceRequest",
        entityId: BigInt(request.id),
      },
    });
    return { id: request.id, referenceCode };
  });
}

const allowedNext: Record<string, readonly string[]> = {
  NEW: ["REVIEWING", "REJECTED", "CANCELLED"],
  REVIEWING: ["ASSIGNED", "REJECTED", "CANCELLED"],
  ASSIGNED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

const statusCopy: Record<string, { messageBn: string; messageEn: string }> = {
  REVIEWING: {
    messageBn: "আপনার অনুরোধ পর্যালোচনা করা হচ্ছে।",
    messageEn: "Your request is being reviewed.",
  },
  ASSIGNED: {
    messageBn: "আপনার অনুরোধটি সমন্বয়ের জন্য একজন কর্মীকে দেওয়া হয়েছে।",
    messageEn: "A staff member has been assigned to coordinate your request.",
  },
  COMPLETED: {
    messageBn: "আপনার অনুরোধের সমন্বয় সম্পন্ন হয়েছে।",
    messageEn: "Coordination for your request is complete.",
  },
  REJECTED: {
    messageBn: "দুঃখিত, আপনার অনুরোধটি এগিয়ে নেওয়া যাচ্ছে না।",
    messageEn: "We could not proceed with your request.",
  },
  CANCELLED: {
    messageBn: "আপনার অনুরোধটি বাতিল করা হয়েছে।",
    messageEn: "Your request has been cancelled.",
  },
};

export async function updateAgricultureServiceRequest(input: {
  actor: CurrentUser;
  requestId: number;
  status?: "NEW" | "REVIEWING" | "ASSIGNED" | "COMPLETED" | "CANCELLED" | "REJECTED";
  assignedToId?: string;
  marketplaceRequestId?: string;
  publicMessage?: string;
  publicLocale?: "bn" | "en";
  privateNote?: string;
  privateLocale?: "bn" | "en";
}) {
  const current = await prisma.serviceRequest.findFirst({
    where: { id: input.requestId, serviceDefinition: { sectorSlug } },
    select: {
      id: true,
      userId: true,
      status: true,
      assignedToId: true,
      marketplaceRequestId: true,
    },
  });
  if (!current) throw new AgricultureRequestError("notFound");
  const nextStatus = input.status ?? current.status;
  if (nextStatus !== current.status && !allowedNext[current.status].includes(nextStatus))
    throw new AgricultureRequestError("invalidState");

  const assignedToId =
    input.assignedToId === undefined ? current.assignedToId : input.assignedToId || null;
  if (nextStatus === "ASSIGNED" && !assignedToId) throw new AgricultureRequestError("invalidState");
  if (assignedToId) {
    const assignee = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, role: true, status: true, emailVerified: true },
    });
    const authorized =
      assignee &&
      (assignee.role === "super_admin" ||
        (await hasStaffPermission(
          {
            ...input.actor,
            id: assignee.id,
            role: assignee.role,
            status: assignee.status,
            emailVerified: assignee.emailVerified,
          },
          "OPERATIONS",
          sectorSlug,
        )));
    if (!assignee || assignee.status !== "active" || !authorized)
      throw new AgricultureRequestError("notAllowed");
  }

  const marketplaceRequestId =
    input.marketplaceRequestId === undefined
      ? current.marketplaceRequestId
      : input.marketplaceRequestId || null;
  if (marketplaceRequestId) {
    const match = await prisma.marketplaceRequest.findFirst({
      where: { id: marketplaceRequestId, sectorSlug },
      select: { id: true },
    });
    if (!match) throw new AgricultureRequestError("notFound");
    const linked = await prisma.serviceRequest.findFirst({
      where: { marketplaceRequestId, id: { not: current.id } },
      select: { id: true },
    });
    if (linked) throw new AgricultureRequestError("invalidState");
  }

  const publicMessage = input.publicMessage?.trim() ?? "";
  const privateNote = input.privateNote?.trim() ?? "";
  if (
    nextStatus === current.status &&
    !assignedToId &&
    !marketplaceRequestId &&
    !publicMessage &&
    !privateNote
  )
    throw new AgricultureRequestError("invalidState");

  await prisma.$transaction(async (tx) => {
    const updated = await tx.serviceRequest.updateMany({
      where: { id: current.id, status: current.status },
      data: { status: nextStatus, assignedToId, marketplaceRequestId },
    });
    if (updated.count !== 1) throw new AgricultureRequestError("invalidState");
    if (nextStatus !== current.status && input.actor.id && current.userId) {
      const copy = statusCopy[nextStatus];
      await tx.serviceRequestUpdate.create({
        data: {
          requestId: current.id,
          authorId: input.actor.id,
          visibility: "CUSTOMER",
          messageBn: copy.messageBn,
          messageEn: copy.messageEn,
        },
      });
    }
    if (publicMessage) {
      await tx.serviceRequestUpdate.create({
        data: {
          requestId: current.id,
          authorId: input.actor.id,
          visibility: "CUSTOMER",
          ...(input.publicLocale === "bn"
            ? { messageBn: publicMessage }
            : { messageEn: publicMessage }),
        },
      });
    }
    if (privateNote) {
      await tx.serviceRequestUpdate.create({
        data: {
          requestId: current.id,
          authorId: input.actor.id,
          visibility: "INTERNAL",
          ...(input.privateLocale === "bn"
            ? { messageBn: privateNote }
            : { messageEn: privateNote }),
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: input.actor.id,
        action: `agriculture_service_request.updated:${current.status}->${nextStatus}`,
        entityType: "ServiceRequest",
        entityId: BigInt(current.id),
      },
    });
    if (current.userId && (nextStatus !== current.status || publicMessage)) {
      const copy = statusCopy[nextStatus] ?? {
        messageBn: "আপনার অনুরোধে একটি আপডেট আছে।",
        messageEn: "There is an update to your request.",
      };
      await tx.notification.create({
        data: {
          userId: current.userId,
          title: "Agriculture request updated",
          titleBn: "কৃষি অনুরোধ হালনাগাদ হয়েছে",
          titleEn: "Agriculture request updated",
          message: copy.messageEn,
          href: `/account/agriculture-requests/${current.id}`,
          translations: {
            create: [
              {
                locale: "en",
                title: "Agriculture request updated",
                message: copy.messageEn,
              },
              {
                locale: "bn",
                title: "কৃষি অনুরোধ হালনাগাদ হয়েছে",
                message: copy.messageBn,
              },
            ],
          },
        },
      });
    }
  });
  return { id: current.id };
}

export async function withdrawAgricultureServiceRequest(userId: string, requestId: number) {
  const current = await prisma.serviceRequest.findFirst({
    where: { id: requestId, userId, serviceDefinition: { sectorSlug } },
    select: { id: true, status: true },
  });
  if (!current) throw new AgricultureRequestError("notFound");
  if (current.status !== "NEW" && current.status !== "REVIEWING")
    throw new AgricultureRequestError("invalidState");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.serviceRequest.updateMany({
      where: { id: current.id, userId, status: current.status },
      data: { status: "CANCELLED" },
    });
    if (updated.count !== 1) throw new AgricultureRequestError("invalidState");
    await tx.serviceRequestUpdate.create({
      data: {
        requestId: current.id,
        authorId: userId,
        visibility: "CUSTOMER",
        messageBn: "আপনি অনুরোধটি প্রত্যাহার করেছেন।",
        messageEn: "You withdrew this request.",
      },
    });
    await tx.auditLog.create({
      data: {
        userId,
        action: "agriculture_service_request.withdrawn",
        entityType: "ServiceRequest",
        entityId: BigInt(current.id),
      },
    });
  });
}
