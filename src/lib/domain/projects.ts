import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getConstructionService } from "@/lib/construction/service-registry";
import { WorkflowError } from "@/lib/domain/marketplace";
import { prisma } from "@/lib/prisma";
import { validateStoredObject } from "@/lib/storage/s3";
import type {
  CreateProjectInput,
  CreateProjectPackageInput,
  MilestoneInput,
} from "@/lib/validations/workflows";

function dateAtUtcStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

// Strip path separators and control characters from user-supplied filenames.
function sanitizeFilename(filename: string) {
  return filename
    .replace(/[\\/\p{Cc}]/gu, "_")
    .trim()
    .slice(0, 120);
}

export async function attachProjectDocument(
  actorId: string,
  input: { projectId: string; storageKey: string; filename: string; sizeBytes: string },
) {
  const project = await prisma.constructionProject.findFirst({
    where: { id: input.projectId, ownerId: actorId },
    select: { id: true },
  });
  if (!project || !input.storageKey.startsWith(`projects/${project.id}/${actorId}/`))
    throw new WorkflowError(project ? "notAllowed" : "notFound");
  await validateStoredObject(
    input.storageKey,
    "application/pdf",
    10_000_000,
    Number(input.sizeBytes),
  );

  const filename = sanitizeFilename(input.filename);
  if (!filename) throw new WorkflowError("invalidState");
  const document = await prisma.projectDocument.create({
    data: {
      projectId: project.id,
      uploadedById: actorId,
      filename,
      storageKey: input.storageKey,
      contentType: "application/pdf",
      sizeBytes: Number(input.sizeBytes),
    },
    select: { id: true },
  });
  await prisma.activityLog.create({
    data: {
      userId: actorId,
      action: "project.document_attached",
      entityType: "project_document",
      entityId: document.id,
    },
  });
  return document;
}

export async function attachProjectPhoto(
  actorId: string,
  input: {
    projectId: string;
    storageKey: string;
    filename: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    sizeBytes: string;
  },
) {
  const project = await prisma.constructionProject.findUnique({
    where: { id: input.projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) throw new WorkflowError("notFound");
  const profile =
    project.ownerId === actorId
      ? null
      : await prisma.providerProfile.findUnique({
          where: { userId: actorId },
          select: { id: true, status: true },
        });
  if (project.ownerId !== actorId) {
    if (!profile || profile.status !== "APPROVED") throw new WorkflowError("notAllowed");
    const engaged = await prisma.order.findFirst({
      where: {
        projectId: project.id,
        providerId: profile.id,
        status: { not: "CANCELLED" },
        listing: { kind: "CONSTRUCTION_SERVICE" },
      },
      select: { id: true },
    });
    if (!engaged) throw new WorkflowError("notAllowed");
  }
  if (!input.storageKey.startsWith(`projects/${project.id}/${actorId}/`))
    throw new WorkflowError("notAllowed");
  await validateStoredObject(
    input.storageKey,
    input.contentType,
    5_000_000,
    Number(input.sizeBytes),
  );

  const filename = sanitizeFilename(input.filename);
  if (!filename) throw new WorkflowError("invalidState");
  const photo = await prisma.projectPhoto.create({
    data: {
      projectId: project.id,
      uploadedById: actorId,
      filename,
      storageKey: input.storageKey,
      contentType: input.contentType,
      sizeBytes: Number(input.sizeBytes),
    },
    select: { id: true },
  });
  await prisma.activityLog.create({
    data: {
      userId: actorId,
      action: "project.photo_attached",
      entityType: "project_photo",
      entityId: photo.id,
    },
  });
  if (project.ownerId !== actorId) {
    await prisma.notification.create({
      data: {
        userId: project.ownerId,
        title: "Project photo added",
        message: "A construction provider added a progress photo.",
        titleBn: "প্রকল্পে ছবি যোগ হয়েছে",
        titleEn: "Project photo added",
        messageBn: "একজন নির্মাণসেবাদাতা কাজের অগ্রগতির ছবি যোগ করেছেন।",
        messageEn: "A construction provider added a progress photo.",
        href: `/account/projects/${project.id}`,
      },
    });
  }
  return photo;
}

export async function createConstructionProject(actorId: string, input: CreateProjectInput) {
  const sector = await prisma.sector.findUnique({
    where: { slug: "construction" },
    select: { status: true },
  });
  if (!sector || sector.status !== "LIVE") throw new WorkflowError("unavailable");
  const service = input.serviceSlug ? getConstructionService(input.serviceSlug) : undefined;
  if (input.serviceSlug && !service) throw new WorkflowError("invalidState");

  return prisma.$transaction(async (tx) => {
    const listing = input.listingId
      ? await tx.marketplaceListing.findFirst({
          where: {
            id: input.listingId,
            sectorSlug: "construction",
            isPublished: true,
            moderationStatus: "APPROVED",
            archivedAt: null,
            provider: { status: "APPROVED", user: { status: "active" } },
          },
          select: { id: true, kind: true, titleEn: true },
        })
      : null;
    if (input.listingId && !listing) throw new WorkflowError("notFound");
    const project = await tx.constructionProject.create({
      data: {
        ownerId: actorId,
        title: input.title,
        projectType: input.projectType,
        district: input.district,
        description: input.description,
        approximateArea: input.approximateArea || null,
        budget: input.budget ? new Prisma.Decimal(input.budget) : null,
        startsAt: input.startsAt ? dateAtUtcStart(input.startsAt) : null,
        targetEndsAt: input.targetEndsAt ? dateAtUtcStart(input.targetEndsAt) : null,
        ...(service || listing
          ? {
              packages: {
                create: {
                  label: service?.titleEn ?? listing!.titleEn,
                  description: input.description,
                  kind: service?.kind ?? listing!.kind,
                  serviceSlug: service?.slug,
                  preferredListingId: listing?.id,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "project.created",
        entityType: "project",
        entityId: project.id,
      },
    });
    return project;
  });
}

export async function createProjectPackage(actorId: string, input: CreateProjectPackageInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const project = await tx.constructionProject.findUnique({
        where: { id: input.projectId },
        select: { id: true, ownerId: true, status: true },
      });
      if (!project) throw new WorkflowError("notFound");
      if (project.ownerId !== actorId) throw new WorkflowError("notAllowed");
      if (project.status !== "PLANNING" && project.status !== "ACTIVE")
        throw new WorkflowError("invalidState");
      const workPackage = await tx.projectPackage.create({
        data: {
          projectId: project.id,
          label: input.label,
          description: input.description,
          kind: input.kind,
        },
        select: { id: true },
      });
      await tx.activityLog.create({
        data: {
          userId: actorId,
          action: "project.package_created",
          entityType: "project_package",
          entityId: workPackage.id,
        },
      });
      return workPackage;
    });
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new WorkflowError("invalidState");
    throw error;
  }
}

export async function recordProjectExpense(
  actorId: string,
  input: { projectId: string; description: string; amount: string; occurredAt?: string },
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.constructionProject.findUnique({
      where: { id: input.projectId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!project) throw new WorkflowError("notFound");
    if (project.ownerId !== actorId) throw new WorkflowError("notAllowed");
    if (project.status === "CANCELLED") throw new WorkflowError("invalidState");
    const expense = await tx.projectExpense.create({
      data: {
        projectId: project.id,
        createdById: actorId,
        description: input.description,
        amount: new Prisma.Decimal(input.amount),
        occurredAt: input.occurredAt ? dateAtUtcStart(input.occurredAt) : new Date(),
      },
      select: { id: true },
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "project.expense_recorded",
        entityType: "project_expense",
        entityId: expense.id,
      },
    });
    return expense;
  });
}

export async function addProjectMilestone(actorId: string, input: MilestoneInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.constructionProject.findUnique({
      where: { id: input.projectId },
      select: { id: true, ownerId: true, status: true },
    });
    if (!project) throw new WorkflowError("notFound");
    if (project.ownerId !== actorId) throw new WorkflowError("notAllowed");
    if (project.status !== "PLANNING" && project.status !== "ACTIVE")
      throw new WorkflowError("invalidState");
    const assignedOrder = await tx.order.findFirst({
      where: {
        projectId: project.id,
        providerId: input.assignedProviderId,
        status: { not: "CANCELLED" },
        listing: { kind: "CONSTRUCTION_SERVICE" },
      },
      select: { provider: { select: { userId: true } } },
    });
    if (!assignedOrder) throw new WorkflowError("notAllowed");

    const milestone = await tx.projectMilestone.create({
      data: {
        projectId: project.id,
        assignedProviderId: input.assignedProviderId,
        title: input.title,
        description: input.description,
        amount: input.amount ? new Prisma.Decimal(input.amount) : null,
        dueAt: input.dueAt ? dateAtUtcStart(input.dueAt) : null,
      },
      select: { id: true },
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "project.milestone_created",
        entityType: "milestone",
        entityId: milestone.id,
      },
    });
    await tx.notification.create({
      data: {
        userId: assignedOrder.provider.userId,
        title: "Project milestone assigned",
        message: "You are responsible for progress on a project milestone.",
        titleBn: "প্রকল্পের ধাপের দায়িত্ব দেওয়া হয়েছে",
        titleEn: "Project milestone assigned",
        messageBn: "প্রকল্পের একটি ধাপের অগ্রগতির দায়িত্ব আপনাকে দেওয়া হয়েছে।",
        messageEn: "You are responsible for progress on a project milestone.",
        href: `/account/projects/${project.id}`,
      },
    });
    return milestone;
  });
}

export async function updateProjectMilestone(
  actorId: string,
  milestoneId: string,
  intent: "submit" | "approve",
) {
  return prisma.$transaction(async (tx) => {
    const milestone = await tx.projectMilestone.findUnique({
      where: { id: milestoneId },
      select: {
        id: true,
        status: true,
        assignedProviderId: true,
        assignedProvider: { select: { userId: true } },
        project: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });
    if (!milestone) throw new WorkflowError("notFound");
    const isOwner = milestone.project.ownerId === actorId;

    if (intent === "submit") {
      if (
        !milestone.assignedProviderId ||
        milestone.assignedProvider?.userId !== actorId ||
        !["PENDING", "IN_PROGRESS"].includes(milestone.status)
      )
        throw new WorkflowError("notAllowed");
      const activeEngagement = await tx.order.findFirst({
        where: {
          projectId: milestone.project.id,
          providerId: milestone.assignedProviderId,
          status: { not: "CANCELLED" },
          listing: { kind: "CONSTRUCTION_SERVICE" },
        },
        select: { id: true },
      });
      if (!activeEngagement) throw new WorkflowError("notAllowed");
      await tx.projectMilestone.update({ where: { id: milestone.id }, data: { status: "REVIEW" } });
      await tx.notification.create({
        data: {
          userId: milestone.project.ownerId,
          title: "Milestone ready for review",
          message: "A provider submitted a project milestone for approval.",
          titleBn: "প্রকল্পের ধাপ পর্যালোচনার জন্য প্রস্তুত",
          titleEn: "Milestone ready for review",
          messageBn: "একজন সেবাদাতা প্রকল্পের একটি ধাপ অনুমোদনের জন্য পাঠিয়েছেন।",
          messageEn: "A provider submitted a project milestone for approval.",
          href: `/account/projects/${milestone.project.id}`,
        },
      });
    } else {
      if (!isOwner || milestone.status !== "REVIEW") throw new WorkflowError("notAllowed");
      await tx.projectMilestone.update({
        where: { id: milestone.id },
        data: { status: "APPROVED" },
      });
      const provider = milestone.assignedProvider;
      if (provider) {
        await tx.notification.create({
          data: {
            userId: provider.userId,
            title: "Milestone approved",
            message: "The customer approved a project milestone.",
            titleBn: "প্রকল্পের ধাপ অনুমোদিত",
            titleEn: "Milestone approved",
            messageBn: "গ্রাহক প্রকল্পের একটি ধাপ অনুমোদন করেছেন।",
            messageEn: "The customer approved a project milestone.",
            href: "/provider#orders",
          },
        });
      }
    }
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: `project.milestone_${intent}`,
        entityType: "milestone",
        entityId: milestone.id,
      },
    });
  });
}

export async function confirmProjectHandover(actorId: string, projectId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.constructionProject.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        orders: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, status: true, provider: { select: { userId: true } } },
        },
        milestones: { select: { status: true } },
      },
    });
    if (!project) throw new WorkflowError("notFound");
    if (project.ownerId !== actorId) throw new WorkflowError("notAllowed");
    if (
      project.status !== "ACTIVE" ||
      project.orders.length === 0 ||
      project.orders.some((order) => order.status !== "COMPLETED") ||
      project.milestones.some((milestone) => milestone.status !== "APPROVED")
    ) {
      throw new WorkflowError("invalidState");
    }
    const updated = await tx.constructionProject.updateMany({
      where: { id: project.id, ownerId: actorId, status: "ACTIVE" },
      data: { status: "COMPLETED", handedOverAt: new Date() },
    });
    if (updated.count !== 1) throw new WorkflowError("invalidState");
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "project.handover_confirmed",
        entityType: "project",
        entityId: project.id,
      },
    });
    for (const userId of new Set(project.orders.map((order) => order.provider.userId))) {
      await tx.notification.create({
        data: {
          userId,
          title: "Project handover confirmed",
          message: "The customer confirmed final handover of this project.",
          titleBn: "প্রকল্পের চূড়ান্ত হস্তান্তর নিশ্চিত",
          titleEn: "Project handover confirmed",
          messageBn: "গ্রাহক প্রকল্পের চূড়ান্ত হস্তান্তর নিশ্চিত করেছেন।",
          messageEn: "The customer confirmed final handover of this project.",
          href: `/account/projects/${project.id}`,
        },
      });
    }
    return { id: project.id };
  });
}
