import "server-only";
import { Prisma } from "@/generated/prisma/client";
import {
  calculateCommission,
  calculateCommissionReduction,
  calculateRemainingPayment,
} from "@/lib/domain/money";
import { prisma } from "@/lib/prisma";
import { validateStoredObject } from "@/lib/storage/s3";
import type {
  CreateListingInput,
  CreateQuoteInput,
  CreateRequestInput,
  PaymentInput,
  ProviderApplicationInput,
  StorefrontInput,
  UpdateListingInput,
} from "@/lib/validations/workflows";

type Tx = Prisma.TransactionClient;
type ListingKind =
  | "PRODUCE"
  | "WORKER"
  | "MACHINERY"
  | "CONSTRUCTION_MATERIAL"
  | "CONSTRUCTION_SERVICE";

export type WorkflowErrorCode =
  | "notFound"
  | "notAllowed"
  | "invalidState"
  | "unavailable"
  | "stockUnavailable"
  | "bookingUnavailable"
  | "amountMismatch";

export class WorkflowError extends Error {
  constructor(readonly code: WorkflowErrorCode) {
    super(code);
  }
}

function fail(code: WorkflowErrorCode): never {
  throw new WorkflowError(code);
}

function dateAtUtcStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function bookingRange(start: string, end: string) {
  const startsAt = dateAtUtcStart(start);
  const endsAt = dateAtUtcStart(end);
  endsAt.setUTCDate(endsAt.getUTCDate() + 1);
  return { startsAt, endsAt };
}

function dayCount(start: string, end: string) {
  return (
    Math.floor((dateAtUtcStart(end).getTime() - dateAtUtcStart(start).getTime()) / 86_400_000) + 1
  );
}

function endOfDate(date: string) {
  const result = dateAtUtcStart(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

async function logActivity(
  tx: Tx,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
) {
  await tx.activityLog.create({ data: { userId, action, entityType, entityId } });
}

const notificationCopy = {
  newServiceRequest: {
    titleBn: "নতুন সেবা অনুরোধ",
    titleEn: "New service request",
    messageBn: "একজন গ্রাহক আপনাকে নতুন সেবা অনুরোধ পাঠিয়েছেন।",
    messageEn: "A customer sent you a new request.",
  },
  newQuote: {
    titleBn: "নতুন দরপ্রস্তাব এসেছে",
    titleEn: "New quote received",
    messageBn: "একজন সেবাদাতা নতুন মূল্য ও সেবার শর্ত পাঠিয়েছেন।",
    messageEn: "A provider sent updated price and service terms.",
  },
  quoteAccepted: {
    titleBn: "দরপ্রস্তাব গৃহীত হয়েছে",
    titleEn: "Quote accepted",
    messageBn: "গ্রাহক আপনার দরপ্রস্তাব গ্রহণ করেছেন। কাজ শুরু করতে পারেন।",
    messageEn: "The customer accepted your quote. You can begin fulfilment.",
  },
  workStarted: {
    titleBn: "কাজ শুরু হয়েছে",
    titleEn: "Work started",
    messageBn: "সেবাদাতা অর্ডারটি চলমান হিসেবে চিহ্নিত করেছেন।",
    messageEn: "Your provider marked the order as in progress.",
  },
  workReady: {
    titleBn: "কাজ পর্যালোচনার জন্য প্রস্তুত",
    titleEn: "Work ready for review",
    messageBn: "সেবা বা পণ্য পৌঁছানো সম্পন্ন হলে নিশ্চিত করুন।",
    messageEn: "Please confirm the service or delivery is complete.",
  },
  orderCompleted: {
    titleBn: "অর্ডার সম্পন্ন হয়েছে",
    titleEn: "Order completed",
    messageBn: "গ্রাহক কাজ সম্পন্ন হওয়া নিশ্চিত করেছেন। প্ল্যাটফর্ম কমিশন বকেয়া হয়েছে।",
    messageEn: "The customer confirmed completion. Platform commission is now due.",
  },
  cancellationRequested: {
    titleBn: "বাতিলের অনুরোধ এসেছে",
    titleEn: "Cancellation requested",
    messageBn: "অন্য পক্ষ অর্ডার বাতিলের অনুরোধ করেছেন। আপনার কর্মক্ষেত্রে দেখুন।",
    messageEn: "The other party asked to cancel. Review the request in your workspace.",
  },
  orderCancelled: {
    titleBn: "অর্ডার বাতিল হয়েছে",
    titleEn: "Order cancelled",
    messageBn: "উভয় পক্ষের সম্মতিতে অর্ডার বাতিল হয়েছে।",
    messageEn: "Both parties agreed to cancel this order.",
  },
  paymentRecorded: {
    titleBn: "পেমেন্ট নথিভুক্ত হয়েছে",
    titleEn: "Payment recorded",
    messageBn: "অন্য পক্ষ একটি পেমেন্ট নথিভুক্ত করেছেন। নিশ্চিত করুন।",
    messageEn: "The other party recorded a payment and needs your confirmation.",
  },
  paymentConfirmed: {
    titleBn: "পেমেন্ট নিশ্চিত হয়েছে",
    titleEn: "Payment confirmation received",
    messageBn: "অন্য পক্ষ পেমেন্টের তথ্য নিশ্চিত করেছেন।",
    messageEn: "The other party confirmed a payment record.",
  },
  capabilityApproved: {
    titleBn: "সেবাদাতার আবেদন অনুমোদিত",
    titleEn: "Provider capability approved",
    messageBn: "আপনার সেবা কার্যক্রমের আবেদন অনুমোদিত হয়েছে।",
    messageEn: "Your service capability application was approved.",
  },
  capabilityDeclined: {
    titleBn: "সেবাদাতার আবেদন প্রত্যাখ্যাত",
    titleEn: "Provider capability declined",
    messageBn: "আপনার সেবা কার্যক্রমের আবেদন অনুমোদিত হয়নি।",
    messageEn: "Your service capability application was declined.",
  },
  listingApproved: {
    titleBn: "তালিকা অনুমোদিত",
    titleEn: "Listing approved",
    messageBn: "অপারেশনস দল আপনার তালিকা পর্যালোচনা করে অনুমোদন করেছে।",
    messageEn: "Your marketplace listing was approved by the operations team.",
  },
  listingDeclined: {
    titleBn: "তালিকা প্রত্যাখ্যাত",
    titleEn: "Listing declined",
    messageBn: "অপারেশনস দল আপনার তালিকা পর্যালোচনা করেছে; এটি প্রকাশ করা হয়নি।",
    messageEn: "Your marketplace listing was reviewed and not approved.",
  },
  commissionRecorded: {
    titleBn: "কমিশন আদায় নথিভুক্ত হয়েছে",
    titleEn: "Commission receipt recorded",
    messageBn: "প্ল্যাটফর্ম কমিশন পাওয়ার বিষয়টি নিশ্চিত করেছে।",
    messageEn: "The platform confirmed receipt of its commission.",
  },
  refundRecorded: {
    titleBn: "ফেরত নথিভুক্ত হয়েছে",
    titleEn: "Refund recorded",
    messageBn: "অর্থ বিভাগ এই পেমেন্টের ফেরত নথিভুক্ত করেছে।",
    messageEn: "Finance recorded a refund for this payment.",
  },
  issueResolved: {
    titleBn: "সমস্যার সিদ্ধান্ত নথিভুক্ত হয়েছে",
    titleEn: "Admin resolved the issue",
    messageBn: "একজন প্রশাসক অর্ডারের বিষয়ে সিদ্ধান্ত নথিভুক্ত করেছেন।",
    messageEn: "An administrator recorded a decision for the order.",
  },
} as const;

type NotificationType = keyof typeof notificationCopy;

async function notify(tx: Tx, userId: string, type: NotificationType, href: string) {
  const copy = notificationCopy[type];
  await tx.notification.create({
    data: {
      userId,
      title: copy.titleEn,
      message: copy.messageEn,
      href,
      translations: {
        create: [
          { locale: "en", title: copy.titleEn, message: copy.messageEn },
          { locale: "bn", title: copy.titleBn, message: copy.messageBn },
        ],
      },
    },
  });
}

function isFiniteStock(kind: ListingKind) {
  return kind === "PRODUCE" || kind === "CONSTRUCTION_MATERIAL";
}

function isScheduled(kind: ListingKind) {
  return kind === "WORKER" || kind === "MACHINERY" || kind === "CONSTRUCTION_SERVICE";
}

async function assertApprovedCapability(
  tx: Tx,
  providerId: string,
  sectorSlug: string,
  kind: ListingKind,
) {
  const capability = await tx.providerCapability.findFirst({
    where: {
      providerId,
      sectorSlug,
      kind,
      status: "APPROVED",
      provider: { status: "APPROVED", user: { status: "active" } },
    },
    select: { id: true },
  });
  if (!capability) fail("notAllowed");
}

async function requireLiveSector(tx: Tx, sectorSlug: string) {
  const sector = await tx.sector.findUnique({ where: { slug: sectorSlug } });
  if (!sector || sector.status !== "LIVE") fail("unavailable");
  return sector;
}

export async function applyForProvider(actorId: string, input: ProviderApplicationInput) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.providerProfile.upsert({
      where: { userId: actorId },
      update: {
        district: input.district,
        upazila: input.upazila || null,
      },
      create: {
        userId: actorId,
        district: input.district,
        upazila: input.upazila || null,
      },
      select: { id: true },
    });
    for (const translation of [
      { locale: "en", name: input.nameEn, bio: input.bioEn },
      { locale: "bn", name: input.nameBn, bio: input.bioBn },
    ]) {
      await tx.providerProfileTranslation.upsert({
        where: { providerId_locale: { providerId: profile.id, locale: translation.locale } },
        update: translation,
        create: { providerId: profile.id, ...translation },
      });
    }

    for (const capabilityValue of new Set(input.capabilities)) {
      const [sectorSlug, kind] = capabilityValue.split(":") as [string, ListingKind];
      await requireLiveSector(tx, sectorSlug);
      const existing = await tx.providerCapability.findUnique({
        where: { providerId_sectorSlug_kind: { providerId: profile.id, sectorSlug, kind } },
        select: { id: true, status: true },
      });
      if (existing?.status === "REJECTED") {
        await tx.providerCapability.update({
          where: { id: existing.id },
          data: { status: "PENDING", reviewedAt: null, reviewedById: null },
        });
      } else if (!existing) {
        await tx.providerCapability.create({ data: { providerId: profile.id, sectorSlug, kind } });
      }
    }

    await logActivity(tx, actorId, "provider.application_submitted", "provider", profile.id);
    return profile.id;
  });
}

export async function updateProviderStorefront(actorId: string, input: StorefrontInput) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: actorId },
    select: { id: true, status: true },
  });
  if (!profile || profile.status !== "APPROVED") fail("notAllowed");
  for (const imageType of ["profileImage", "coverImage"] as const) {
    const key = input[`${imageType}Key`];
    const contentType = input[`${imageType}ContentType`];
    const sizeBytes = input[`${imageType}SizeBytes`];
    if (key && contentType && sizeBytes) {
      const expectedPath = `marketplace/${profile.id}/${imageType === "profileImage" ? "profile" : "cover"}/`;
      if (!key.startsWith(expectedPath)) fail("notAllowed");
      await validateStoredObject(key, contentType, 5_000_000, Number(sizeBytes));
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.providerProfile.update({
      where: { id: profile.id },
      data: {
        district: input.district,
        upazila: input.upazila || null,
        ...(input.profileImageKey ? { profileImageKey: input.profileImageKey } : {}),
        ...(input.coverImageKey ? { coverImageKey: input.coverImageKey } : {}),
      },
    });
    for (const translation of [
      { locale: "en", name: input.nameEn, bio: input.bioEn },
      { locale: "bn", name: input.nameBn, bio: input.bioBn },
    ]) {
      await tx.providerProfileTranslation.upsert({
        where: { providerId_locale: { providerId: profile.id, locale: translation.locale } },
        update: translation,
        create: { providerId: profile.id, ...translation },
      });
    }
    await logActivity(tx, actorId, "provider.storefront_updated", "provider", profile.id);
  });
}

export async function createProviderListing(actorId: string, input: CreateListingInput) {
  if (input.imageKey) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: actorId },
      select: { id: true },
    });
    if (
      !profile ||
      !input.imageContentType ||
      !input.imageSizeBytes ||
      !input.imageKey.startsWith(`marketplace/${profile.id}/`)
    )
      fail("notAllowed");
    await validateStoredObject(
      input.imageKey,
      input.imageContentType,
      5_000_000,
      Number(input.imageSizeBytes),
    );
  }
  return prisma.$transaction(async (tx) => {
    await requireLiveSector(tx, input.sectorSlug);
    const expectedSector = input.kind.startsWith("CONSTRUCTION_")
      ? "construction"
      : "agriculture-labor";
    if (input.sectorSlug !== expectedSector) fail("unavailable");

    const profile = await tx.providerProfile.findUnique({
      where: { userId: actorId },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "APPROVED") fail("notAllowed");
    await assertApprovedCapability(tx, profile.id, input.sectorSlug, input.kind);

    const listing = await tx.marketplaceListing.create({
      data: {
        providerId: profile.id,
        sectorSlug: input.sectorSlug,
        kind: input.kind,
        category: input.category,
        district: input.district,
        unit: input.unit,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        stock: new Prisma.Decimal(input.stock),
        availableFrom: input.availableFrom ? dateAtUtcStart(input.availableFrom) : null,
        imageKey: input.imageKey ?? null,
      },
      select: { id: true, sectorSlug: true },
    });
    await tx.marketplaceListingTranslation.createMany({
      data: [
        {
          listingId: listing.id,
          locale: "en",
          title: input.titleEn,
          description: input.descriptionEn,
        },
        {
          listingId: listing.id,
          locale: "bn",
          title: input.titleBn,
          description: input.descriptionBn,
        },
      ],
    });
    await logActivity(tx, actorId, "listing.submitted", "listing", listing.id);
    return listing;
  });
}

export async function updateProviderListing(actorId: string, input: UpdateListingInput) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: actorId },
    select: { id: true, status: true },
  });
  if (!profile || profile.status !== "APPROVED") fail("notAllowed");
  if (input.imageKey) {
    if (
      !input.imageContentType ||
      !input.imageSizeBytes ||
      !input.imageKey.startsWith(`marketplace/${profile.id}/`)
    )
      fail("notAllowed");
    await validateStoredObject(
      input.imageKey,
      input.imageContentType,
      5_000_000,
      Number(input.imageSizeBytes),
    );
  }
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findFirst({
      where: { id: input.listingId, providerId: profile.id, archivedAt: null },
      select: { id: true, sectorSlug: true, kind: true },
    });
    if (!listing) fail("notFound");
    if (listing.sectorSlug !== input.sectorSlug || listing.kind !== input.kind) fail("notAllowed");
    await assertApprovedCapability(tx, profile.id, listing.sectorSlug, listing.kind);
    const updated = await tx.marketplaceListing.update({
      where: { id: listing.id },
      data: {
        category: input.category,
        district: input.district,
        unit: input.unit,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        stock: new Prisma.Decimal(input.stock),
        availableFrom: input.availableFrom ? dateAtUtcStart(input.availableFrom) : null,
        ...(input.imageKey ? { imageKey: input.imageKey } : {}),
        moderationStatus: "PENDING",
        isPublished: false,
      },
      select: { id: true, sectorSlug: true },
    });
    for (const translation of [
      { locale: "en", title: input.titleEn, description: input.descriptionEn },
      { locale: "bn", title: input.titleBn, description: input.descriptionBn },
    ]) {
      await tx.marketplaceListingTranslation.upsert({
        where: { listingId_locale: { listingId: updated.id, locale: translation.locale } },
        update: translation,
        create: { listingId: updated.id, ...translation },
      });
    }
    await logActivity(tx, actorId, "listing.edited_for_review", "listing", updated.id);
    return updated;
  });
}

export async function archiveProviderListing(actorId: string, listingId: string) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.providerProfile.findUnique({
      where: { userId: actorId },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "APPROVED") fail("notAllowed");
    const listing = await tx.marketplaceListing.findFirst({
      where: { id: listingId, providerId: profile.id, archivedAt: null },
      select: { id: true, sectorSlug: true, kind: true },
    });
    if (!listing) fail("notFound");
    await assertApprovedCapability(tx, profile.id, listing.sectorSlug, listing.kind);
    await tx.marketplaceListing.update({
      where: { id: listing.id },
      data: { archivedAt: new Date(), isPublished: false },
    });
    await logActivity(tx, actorId, "listing.archived", "listing", listing.id);
  });
}

export async function updateProviderListingStock(
  actorId: string,
  listingId: string,
  stock: string,
) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.providerProfile.findUnique({
      where: { userId: actorId },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "APPROVED") fail("notAllowed");
    const listing = await tx.marketplaceListing.findFirst({
      where: { id: listingId, providerId: profile.id, archivedAt: null },
      select: { id: true, sectorSlug: true, kind: true },
    });
    if (!listing) fail("notFound");
    if (!isFiniteStock(listing.kind)) fail("invalidState");
    await assertApprovedCapability(tx, profile.id, listing.sectorSlug, listing.kind);
    await tx.marketplaceListing.update({
      where: { id: listing.id },
      data: { stock: new Prisma.Decimal(stock) },
    });
    await logActivity(tx, actorId, "listing.stock_updated", "listing", listing.id);
  });
}

export async function createMarketplaceRequest(actorId: string, input: CreateRequestInput) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findFirst({
      where: {
        id: input.listingId,
        isPublished: true,
        archivedAt: null,
        moderationStatus: "APPROVED",
        provider: {
          status: "APPROVED",
          user: { status: "active" },
          capabilities: { some: { status: "APPROVED" } },
        },
      },
      select: {
        id: true,
        providerId: true,
        sectorSlug: true,
        kind: true,
        unit: true,
        stock: true,
        availableFrom: true,
        provider: {
          select: {
            userId: true,
            capabilities: { select: { sectorSlug: true, kind: true, status: true } },
          },
        },
      },
    });
    if (!listing) fail("notFound");
    if (listing.provider.userId === actorId) fail("notAllowed");
    if (
      listing.provider.capabilities.every(
        (capability) =>
          capability.sectorSlug !== listing.sectorSlug ||
          capability.kind !== listing.kind ||
          capability.status !== "APPROVED",
      )
    ) {
      fail("notAllowed");
    }
    await requireLiveSector(tx, listing.sectorSlug);

    let requestedQuantity = new Prisma.Decimal(input.quantity);
    if (isScheduled(listing.kind)) {
      if (!input.requestedStart || !input.requestedEnd) fail("invalidState");
      const startsAt = dateAtUtcStart(input.requestedStart);
      if (startsAt < dateAtUtcStart(new Date().toISOString().slice(0, 10))) fail("invalidState");
      if (listing.availableFrom && startsAt < listing.availableFrom) fail("unavailable");
      requestedQuantity = new Prisma.Decimal(dayCount(input.requestedStart, input.requestedEnd));
    } else if (requestedQuantity.greaterThan(listing.stock)) {
      fail("stockUnavailable");
    }

    let projectId: string | null = null;
    let packageId: string | null = null;
    let packageLabel: string | null = null;
    if (input.projectId) {
      if (listing.sectorSlug !== "construction") fail("notAllowed");
      const workPackage = await tx.projectPackage.findFirst({
        where: {
          id: input.packageId,
          projectId: input.projectId,
          project: { ownerId: actorId, status: { in: ["PLANNING", "ACTIVE"] } },
        },
        select: { id: true, label: true, kind: true },
      });
      if (!workPackage) fail("notFound");
      if (workPackage.kind && workPackage.kind !== listing.kind) fail("invalidState");
      projectId = input.projectId;
      packageId = workPackage.id;
      packageLabel = workPackage.label;
    } else if (input.packageId) {
      fail("invalidState");
    }

    const request = await tx.marketplaceRequest.create({
      data: {
        buyerId: actorId,
        providerId: listing.providerId,
        listingId: listing.id,
        sectorSlug: listing.sectorSlug,
        projectId,
        packageId,
        packageLabel,
        quantity: requestedQuantity,
        district: input.district,
        details: input.details,
        requestedStart: input.requestedStart ? dateAtUtcStart(input.requestedStart) : null,
        requestedEnd: input.requestedEnd ? dateAtUtcStart(input.requestedEnd) : null,
      },
      select: { id: true, provider: { select: { userId: true } } },
    });
    await notify(tx, request.provider.userId, "newServiceRequest", "/provider#requests");
    await logActivity(tx, actorId, "request.created", "request", request.id);
    return { id: request.id };
  });
}

export async function cancelMarketplaceRequest(actorId: string, requestId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.marketplaceRequest.findUnique({
      where: { id: requestId },
      select: { buyerId: true, status: true, quote: { select: { id: true, status: true } } },
    });
    if (!request) fail("notFound");
    if (request.buyerId !== actorId) fail("notAllowed");
    if (request.status !== "OPEN" && request.status !== "QUOTED") fail("invalidState");
    await tx.marketplaceRequest.update({ where: { id: requestId }, data: { status: "CANCELLED" } });
    if (request.quote?.status === "PENDING") {
      await tx.quote.update({ where: { id: request.quote.id }, data: { status: "REJECTED" } });
    }
    await logActivity(tx, actorId, "request.cancelled", "request", requestId);
  });
}

export async function submitQuote(actorId: string, input: CreateQuoteInput) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.marketplaceRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        buyerId: true,
        providerId: true,
        sectorSlug: true,
        quantity: true,
        listing: { select: { kind: true } },
        status: true,
        quote: { select: { id: true, status: true } },
        buyer: { select: { id: true } },
      },
    });
    if (!request) fail("notFound");
    const profile = await tx.providerProfile.findUnique({
      where: { userId: actorId },
      select: { id: true, status: true },
    });
    if (!profile || profile.id !== request.providerId || profile.status !== "APPROVED")
      fail("notAllowed");
    await assertApprovedCapability(tx, profile.id, request.sectorSlug, request.listing.kind);
    if (request.status !== "OPEN" && request.status !== "QUOTED") fail("invalidState");
    if (request.quote && request.quote.status !== "PENDING") fail("invalidState");

    const quoteQuantity = new Prisma.Decimal(input.quantity);
    if (quoteQuantity.greaterThan(request.quantity)) fail("invalidState");
    if (isScheduled(request.listing.kind) && !quoteQuantity.equals(request.quantity))
      fail("invalidState");
    const quote = request.quote
      ? await tx.quote.update({
          where: { id: request.quote.id },
          data: {
            quantity: quoteQuantity,
            unitPrice: new Prisma.Decimal(input.unitPrice),
            transportFee: new Prisma.Decimal(input.transportFee),
            note: input.note,
            expiresAt: input.expiresAt ? endOfDate(input.expiresAt) : null,
          },
          select: { id: true },
        })
      : await tx.quote.create({
          data: {
            requestId: request.id,
            quantity: quoteQuantity,
            unitPrice: new Prisma.Decimal(input.unitPrice),
            transportFee: new Prisma.Decimal(input.transportFee),
            note: input.note,
            expiresAt: input.expiresAt ? endOfDate(input.expiresAt) : null,
          },
          select: { id: true },
        });
    await tx.marketplaceRequest.update({ where: { id: request.id }, data: { status: "QUOTED" } });
    await notify(tx, request.buyer.id, "newQuote", "/account#requests");
    await logActivity(tx, actorId, "quote.submitted", "quote", quote.id);
    return { id: quote.id };
  });
}

export async function acceptQuote(actorId: string, requestId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const request = await tx.marketplaceRequest.findUnique({
          where: { id: requestId },
          include: {
            quote: true,
            listing: true,
            sector: true,
            provider: { select: { id: true, userId: true, status: true } },
          },
        });
        if (!request?.quote) fail("notFound");
        if (request.buyerId !== actorId) fail("notAllowed");
        if (request.status !== "QUOTED" || request.quote.status !== "PENDING") fail("invalidState");
        if (request.quote.expiresAt && request.quote.expiresAt < new Date()) fail("unavailable");
        if (request.provider.status !== "APPROVED") fail("notAllowed");
        if (request.packageId) {
          const accepted = await tx.order.findFirst({
            where: { packageId: request.packageId, status: { not: "CANCELLED" } },
            select: { id: true },
          });
          if (accepted) fail("invalidState");
        }
        await assertApprovedCapability(
          tx,
          request.providerId,
          request.sectorSlug,
          request.listing.kind,
        );

        const bookingDates =
          request.requestedStart && request.requestedEnd
            ? bookingRange(
                request.requestedStart.toISOString().slice(0, 10),
                request.requestedEnd.toISOString().slice(0, 10),
              )
            : null;
        if (isScheduled(request.listing.kind) && !bookingDates) fail("invalidState");
        if (bookingDates && isScheduled(request.listing.kind)) {
          const overlap = await tx.booking.findFirst({
            where: {
              startsAt: { lt: bookingDates.endsAt },
              endsAt: { gt: bookingDates.startsAt },
              order: {
                providerId: request.providerId,
                status: { not: "CANCELLED" },
                ...(request.listing.kind === "MACHINERY" ? { listingId: request.listingId } : {}),
              },
            },
            select: { id: true },
          });
          if (overlap) fail("bookingUnavailable");
        }

        if (isFiniteStock(request.listing.kind)) {
          const reserved = await tx.marketplaceListing.updateMany({
            where: {
              id: request.listingId,
              stock: { gte: request.quote.quantity },
              isPublished: true,
              moderationStatus: "APPROVED",
            },
            data: { stock: { decrement: request.quote.quantity } },
          });
          if (reserved.count !== 1) fail("stockUnavailable");
        }

        const subtotal = request.quote.unitPrice
          .mul(request.quote.quantity)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const commissionRate = request.sector.commissionRate;
        const commissionAmount = calculateCommission(subtotal, commissionRate);
        const order = await tx.order.create({
          data: {
            requestId: request.id,
            quoteId: request.quote.id,
            buyerId: actorId,
            providerId: request.providerId,
            listingId: request.listingId,
            projectId: request.projectId,
            packageId: request.packageId,
            packageLabel: request.packageLabel,
            quantity: request.quote.quantity,
            unit: request.listing.unit,
            unitPrice: request.quote.unitPrice,
            subtotal,
            transportFee: request.quote.transportFee,
            commissionRate,
            commissionAmount,
            providerAmount: subtotal.minus(commissionAmount).plus(request.quote.transportFee),
            ...(bookingDates ? { booking: { create: bookingDates } } : {}),
          },
          select: { id: true },
        });
        await tx.quote.update({
          where: { id: request.quote.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
        await tx.marketplaceRequest.update({
          where: { id: request.id },
          data: { status: "ACCEPTED" },
        });
        if (request.projectId) {
          await tx.constructionProject.updateMany({
            where: { id: request.projectId, status: "PLANNING" },
            data: { status: "ACTIVE" },
          });
        }
        await notify(tx, request.provider.userId, "quoteAccepted", "/provider#orders");
        await logActivity(tx, actorId, "quote.accepted", "order", order.id);
        return { id: order.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2034" || error.code === "P2002")
    ) {
      fail("invalidState");
    }
    throw error;
  }
}

export async function progressOrder(
  actorId: string,
  orderId: string,
  action: "start" | "submit" | "confirm",
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        providerId: true,
        status: true,
        buyer: { select: { id: true } },
        provider: { select: { userId: true } },
        subtotal: true,
        transportFee: true,
        commissionRate: true,
        commissionAmount: true,
        payments: { select: { refundAmount: true } },
      },
    });
    if (!order) fail("notFound");
    const isProvider = order.provider.userId === actorId;
    const isBuyer = order.buyerId === actorId;
    if (!isProvider && !isBuyer) fail("notAllowed");

    if (action === "start") {
      if (!isProvider || order.status !== "CONFIRMED") fail("invalidState");
      await tx.order.update({ where: { id: order.id }, data: { status: "IN_PROGRESS" } });
      await notify(tx, order.buyer.id, "workStarted", "/account#orders");
    } else if (action === "submit") {
      if (!isProvider || order.status !== "IN_PROGRESS") fail("invalidState");
      await tx.order.update({ where: { id: order.id }, data: { status: "AWAITING_CONFIRMATION" } });
      await notify(tx, order.buyer.id, "workReady", "/account#orders");
    } else {
      if (!isBuyer || order.status !== "AWAITING_CONFIRMATION") fail("invalidState");
      await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
      const refundTotal = order.payments.reduce(
        (sum, payment) => sum.plus(payment.refundAmount ?? 0),
        new Prisma.Decimal(0),
      );
      const adjustment = calculateCommissionReduction(
        refundTotal,
        order.subtotal,
        order.transportFee,
        order.commissionRate,
      );
      const commissionDue = Prisma.Decimal.max(0, order.commissionAmount.minus(adjustment));
      await tx.commissionRecord.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          amount: commissionDue,
          status: commissionDue.isZero() ? "WAIVED" : "DUE",
        },
        update: {},
      });
      await notify(tx, order.provider.userId, "orderCompleted", "/provider#orders");
    }
    await logActivity(tx, actorId, `order.${action}`, "order", order.id);
  });
}

export async function requestOrderCancellation(actorId: string, orderId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        providerId: true,
        status: true,
        cancelRequestedById: true,
        provider: { select: { userId: true } },
      },
    });
    if (!order) fail("notFound");
    const isBuyer = order.buyerId === actorId;
    const isProvider = order.provider.userId === actorId;
    if (!isBuyer && !isProvider) fail("notAllowed");
    if (!["CONFIRMED", "IN_PROGRESS", "AWAITING_CONFIRMATION"].includes(order.status))
      fail("invalidState");
    if (order.cancelRequestedById) {
      if (order.cancelRequestedById === actorId) fail("invalidState");
      await finalizeCancellation(tx, order.id, actorId, reason);
    } else {
      await tx.order.update({
        where: { id: order.id },
        data: {
          cancelRequestedById: actorId,
          cancelRequestedAt: new Date(),
          cancellationReason: reason,
        },
      });
      const recipientId = isBuyer ? order.provider.userId : order.buyerId;
      await notify(
        tx,
        recipientId,
        "cancellationRequested",
        isBuyer ? "/provider#orders" : "/account#orders",
      );
    }
    await logActivity(tx, actorId, "order.cancellation_requested", "order", order.id);
  });
}

async function finalizeCancellation(tx: Tx, orderId: string, actorId: string, reason: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      requestId: true,
      status: true,
      listingId: true,
      quantity: true,
      listing: { select: { kind: true } },
      buyerId: true,
      provider: { select: { userId: true } },
    },
  });
  if (order.status === "CANCELLED" || order.status === "COMPLETED") fail("invalidState");
  await tx.order.update({
    where: { id: order.id },
    data: {
      status: "CANCELLED",
      cancelConfirmedAt: new Date(),
      cancellationReason: reason || undefined,
    },
  });
  await tx.marketplaceRequest.updateMany({
    where: { id: order.requestId, status: "ACCEPTED" },
    data: { status: "CANCELLED" },
  });
  if (isFiniteStock(order.listing.kind)) {
    await tx.marketplaceListing.update({
      where: { id: order.listingId },
      data: { stock: { increment: order.quantity } },
    });
  }
  await tx.booking.deleteMany({ where: { orderId: order.id } });
  const recipientId = actorId === order.buyerId ? order.provider.userId : order.buyerId;
  await notify(
    tx,
    recipientId,
    "orderCancelled",
    actorId === order.buyerId ? "/provider#orders" : "/account#orders",
  );
  await logActivity(tx, actorId, "order.cancelled", "order", order.id);
}

export async function recordPayment(actorId: string, input: PaymentInput) {
  if (input.receiptKey) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, OR: [{ buyerId: actorId }, { provider: { userId: actorId } }] },
      select: { id: true },
    });
    if (
      !order ||
      !input.receiptContentType ||
      !input.receiptSizeBytes ||
      !input.receiptKey.startsWith(`payments/${order.id}/${actorId}/`)
    )
      fail("notAllowed");
    await validateStoredObject(
      input.receiptKey,
      input.receiptContentType,
      10_000_000,
      Number(input.receiptSizeBytes),
    );
  }
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: input.orderId },
          select: {
            id: true,
            buyerId: true,
            status: true,
            provider: { select: { userId: true } },
            subtotal: true,
            transportFee: true,
            payments: { select: { amount: true, refundAmount: true } },
          },
        });
        if (!order) fail("notFound");
        const isBuyer = order.buyerId === actorId;
        const isProvider = order.provider.userId === actorId;
        if (!isBuyer && !isProvider) fail("notAllowed");
        if (order.status === "CANCELLED") fail("invalidState");
        const amountDue = calculateRemainingPayment(
          order.subtotal.plus(order.transportFee),
          order.payments,
        );
        const amount = new Prisma.Decimal(input.amount);
        if (amount.greaterThan(amountDue)) fail("amountMismatch");
        const payment = await tx.paymentRecord.create({
          data: {
            orderId: order.id,
            submittedById: actorId,
            amount,
            method: input.method,
            reference: input.reference || null,
            receiptKey: input.receiptKey ?? null,
            paidAt: new Date(),
            buyerConfirmedAt: isBuyer ? new Date() : null,
            providerConfirmedAt: isProvider ? new Date() : null,
          },
          select: { id: true },
        });
        await logActivity(tx, actorId, "payment.recorded", "payment", payment.id);
        const recipientId = isBuyer ? order.provider.userId : order.buyerId;
        await notify(
          tx,
          recipientId,
          "paymentRecorded",
          isBuyer ? "/provider#orders" : "/account#orders",
        );
        return { id: payment.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      fail("amountMismatch");
    throw error;
  }
}

export async function confirmPayment(actorId: string, orderId: string, paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        submittedById: true,
        buyerConfirmedAt: true,
        providerConfirmedAt: true,
        order: { select: { id: true, buyerId: true, provider: { select: { userId: true } } } },
      },
    });
    if (!payment || payment.order.id !== orderId) fail("notFound");
    if (payment.submittedById === actorId) fail("notAllowed");
    const isBuyer = payment.order.buyerId === actorId;
    const isProvider = payment.order.provider.userId === actorId;
    if (!isBuyer && !isProvider) fail("notAllowed");
    if ((isBuyer && payment.buyerConfirmedAt) || (isProvider && payment.providerConfirmedAt))
      fail("invalidState");
    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: isBuyer ? { buyerConfirmedAt: new Date() } : { providerConfirmedAt: new Date() },
    });
    const recipientId = isBuyer ? payment.order.provider.userId : payment.order.buyerId;
    await notify(
      tx,
      recipientId,
      "paymentConfirmed",
      isBuyer ? "/provider#orders" : "/account#orders",
    );
    await logActivity(tx, actorId, "payment.confirmed", "payment", payment.id);
  });
}

export async function writeReview(
  actorId: string,
  orderId: string,
  rating: number,
  comment: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, buyerId: true, providerId: true, status: true },
    });
    if (!order) fail("notFound");
    if (order.buyerId !== actorId) fail("notAllowed");
    if (order.status !== "COMPLETED") fail("invalidState");
    const review = await tx.review.create({
      data: { orderId, reviewerId: actorId, providerId: order.providerId, rating, comment },
      select: { id: true },
    });
    await logActivity(tx, actorId, "review.created", "review", review.id);
  });
}

export async function raiseDispute(actorId: string, orderId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, buyerId: true, status: true, provider: { select: { userId: true } } },
    });
    if (!order) fail("notFound");
    if (actorId !== order.buyerId && actorId !== order.provider.userId) fail("notAllowed");
    if (!["CONFIRMED", "IN_PROGRESS", "AWAITING_CONFIRMATION"].includes(order.status))
      fail("invalidState");
    await tx.order.update({
      where: { id: order.id },
      data: { status: "DISPUTED", cancellationReason: reason },
    });
    await logActivity(tx, actorId, "order.disputed", "order", order.id);
  });
}

export async function moderateProviderCapability(
  actorId: string,
  capabilityId: number,
  decision: "APPROVED" | "REJECTED",
) {
  return prisma.$transaction(async (tx) => {
    const capability = await tx.providerCapability.findUnique({
      where: { id: capabilityId },
      select: { id: true, sectorSlug: true, providerId: true, status: true },
    });
    if (!capability || capability.status !== "PENDING") fail("notFound");
    const updated = await tx.providerCapability.updateMany({
      where: { id: capability.id, status: "PENDING" },
      data: { status: decision, reviewedAt: new Date(), reviewedById: actorId },
    });
    if (updated.count !== 1) fail("invalidState");

    const approvedCapabilities = await tx.providerCapability.count({
      where: { providerId: capability.providerId, status: "APPROVED" },
    });
    const pendingCapabilities = await tx.providerCapability.count({
      where: { providerId: capability.providerId, status: "PENDING" },
    });
    await tx.providerProfile.update({
      where: { id: capability.providerId },
      data: {
        status:
          approvedCapabilities > 0 || decision === "APPROVED"
            ? "APPROVED"
            : pendingCapabilities > 0
              ? "PENDING"
              : "REJECTED",
        reviewedAt: new Date(),
        reviewedById: actorId,
      },
    });
    const provider = await tx.providerProfile.findUniqueOrThrow({
      where: { id: capability.providerId },
      select: { userId: true },
    });
    await notify(
      tx,
      provider.userId,
      decision === "APPROVED" ? "capabilityApproved" : "capabilityDeclined",
      "/provider",
    );
    await logActivity(
      tx,
      actorId,
      `provider.capability_${decision.toLowerCase()}`,
      "provider_capability",
      String(capability.id),
    );
  });
}

export async function moderateListing(
  actorId: string,
  listingId: string,
  decision: "APPROVED" | "REJECTED",
) {
  return prisma.$transaction(async (tx) => {
    const listing = await tx.marketplaceListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        sectorSlug: true,
        kind: true,
        provider: {
          select: {
            id: true,
            userId: true,
            status: true,
            capabilities: { select: { sectorSlug: true, kind: true, status: true } },
          },
        },
      },
    });
    if (!listing) fail("notFound");
    const updated = await tx.marketplaceListing.updateMany({
      where: { id: listing.id, moderationStatus: "PENDING", archivedAt: null },
      data: {
        moderationStatus: decision,
        isPublished:
          decision === "APPROVED" &&
          listing.provider.status === "APPROVED" &&
          listing.provider.capabilities.some(
            (capability) =>
              capability.sectorSlug === listing.sectorSlug &&
              capability.kind === listing.kind &&
              capability.status === "APPROVED",
          ),
      },
    });
    if (updated.count !== 1) fail("invalidState");
    await notify(
      tx,
      listing.provider.userId,
      decision === "APPROVED" ? "listingApproved" : "listingDeclined",
      "/provider#listings",
    );
    await logActivity(tx, actorId, `listing.${decision.toLowerCase()}`, "listing", listing.id);
  });
}

export async function markCommissionCollected(
  actorId: string,
  commissionId: string,
  reference: string,
) {
  return prisma.$transaction(async (tx) => {
    const commission = await tx.commissionRecord.findUnique({
      where: { id: commissionId },
      select: {
        id: true,
        status: true,
        order: { select: { provider: { select: { userId: true } } } },
      },
    });
    if (!commission) fail("notFound");
    if (commission.status !== "DUE") fail("invalidState");
    await tx.commissionRecord.update({
      where: { id: commission.id },
      data: {
        status: "COLLECTED",
        collectedById: actorId,
        collectedAt: new Date(),
        reference: reference || null,
      },
    });
    await notify(
      tx,
      commission.order.provider.userId,
      "commissionRecorded",
      "/provider#commissions",
    );
    await logActivity(tx, actorId, "commission.collected", "commission", commission.id);
  });
}

export async function recordRefund(
  actorId: string,
  paymentId: string,
  amountValue: string,
  reference: string,
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        refundAmount: true,
        buyerConfirmedAt: true,
        providerConfirmedAt: true,
        order: {
          select: {
            id: true,
            subtotal: true,
            transportFee: true,
            commissionRate: true,
            buyerId: true,
            commission: { select: { id: true, amount: true, status: true } },
            provider: { select: { userId: true } },
            payments: { select: { refundAmount: true } },
          },
        },
      },
    });
    if (!payment) fail("notFound");
    if (!payment.buyerConfirmedAt || !payment.providerConfirmedAt || payment.refundAmount)
      fail("invalidState");
    if (payment.order.commission?.status === "COLLECTED") fail("invalidState");

    const amount = new Prisma.Decimal(amountValue);
    const refundedPreviously = payment.order.payments.reduce(
      (sum, item) => sum.plus(item.refundAmount ?? 0),
      new Prisma.Decimal(0),
    );
    const confirmedAmount = await tx.paymentRecord.aggregate({
      where: {
        orderId: payment.order.id,
        buyerConfirmedAt: { not: null },
        providerConfirmedAt: { not: null },
      },
      _sum: { amount: true },
    });
    const refundCapacity = (confirmedAmount._sum.amount ?? new Prisma.Decimal(0)).minus(
      refundedPreviously,
    );
    if (amount.greaterThan(payment.amount) || amount.greaterThan(refundCapacity))
      fail("amountMismatch");

    await tx.paymentRecord.update({
      where: { id: payment.id },
      data: { refundAmount: amount, refundedAt: new Date(), refundReference: reference || null },
    });
    if (payment.order.commission && payment.order.commission.status === "DUE") {
      const commissionReduction = calculateCommissionReduction(
        amount,
        payment.order.subtotal,
        payment.order.transportFee,
        payment.order.commissionRate,
      );
      const remainingCommission = Prisma.Decimal.max(
        0,
        payment.order.commission.amount.minus(commissionReduction),
      );
      await tx.commissionRecord.update({
        where: { id: payment.order.commission.id },
        data: {
          amount: remainingCommission,
          status: remainingCommission.isZero() ? "WAIVED" : "DUE",
        },
      });
    }
    await notify(tx, payment.order.buyerId, "refundRecorded", "/account#orders");
    await notify(tx, payment.order.provider.userId, "refundRecorded", "/provider#orders");
    await logActivity(tx, actorId, "payment.refunded", "payment", payment.id);
  });
}

export async function resolveDispute(
  actorId: string,
  orderId: string,
  decision: "COMPLETE" | "CANCEL",
  note: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        requestId: true,
        status: true,
        listingId: true,
        quantity: true,
        listing: { select: { kind: true } },
        commissionAmount: true,
        commission: { select: { id: true, amount: true, status: true } },
        buyerId: true,
        provider: { select: { userId: true } },
        booking: { select: { orderId: true } },
        payments: { select: { refundAmount: true } },
      },
    });
    if (!order) fail("notFound");
    if (order.status !== "DISPUTED") fail("invalidState");

    if (decision === "CANCEL") {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancellationReason: note || "Resolved by administration",
          cancelConfirmedAt: new Date(),
        },
      });
      await tx.marketplaceRequest.updateMany({
        where: { id: order.requestId, status: "ACCEPTED" },
        data: { status: "CANCELLED" },
      });
      if (isFiniteStock(order.listing.kind)) {
        await tx.marketplaceListing.update({
          where: { id: order.listingId },
          data: { stock: { increment: order.quantity } },
        });
      }
      await tx.booking.deleteMany({ where: { orderId: order.id } });
    } else {
      await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
      const refundTotal = order.payments.reduce(
        (sum, payment) => sum.plus(payment.refundAmount ?? 0),
        new Prisma.Decimal(0),
      );
      const total = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        select: { subtotal: true, transportFee: true, commissionRate: true },
      });
      const adjustment = calculateCommissionReduction(
        refundTotal,
        total.subtotal,
        total.transportFee,
        total.commissionRate,
      );
      const commissionDue = Prisma.Decimal.max(0, order.commissionAmount.minus(adjustment));
      await tx.commissionRecord.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          amount: commissionDue,
          status: commissionDue.isZero() ? "WAIVED" : "DUE",
        },
        update: {},
      });
    }
    await notify(tx, order.buyerId, "issueResolved", "/account#orders");
    await notify(tx, order.provider.userId, "issueResolved", "/provider#orders");
    await logActivity(tx, actorId, `order.dispute_${decision.toLowerCase()}`, "order", order.id);
  });
}

export async function grantStaffAccess(
  actorId: string,
  email: string,
  permission: "OPERATIONS" | "FINANCE" | "USERS" | "PANELS" | "REPORTS",
  scope: string,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, status: true } });
    if (!user || user.status !== "active") fail("notFound");
    const sectorSlug = scope === "global" ? null : scope;
    if (sectorSlug) await requireLiveSector(tx, sectorSlug);
    await tx.staffGrant.upsert({
      where: { userId_permission_scopeKey: { userId: user.id, permission, scopeKey: scope } },
      update: { sectorSlug },
      create: { userId: user.id, permission, scopeKey: scope, sectorSlug },
    });
    await logActivity(tx, actorId, "staff.access_granted", "user", user.id);
  });
}

export async function revokeStaffAccess(actorId: string, grantId: number) {
  return prisma.$transaction(async (tx) => {
    const grant = await tx.staffGrant.findUnique({
      where: { id: grantId },
      select: { id: true, userId: true },
    });
    if (!grant) fail("notFound");
    await tx.staffGrant.delete({ where: { id: grant.id } });
    await logActivity(tx, actorId, "staff.access_revoked", "user", grant.userId);
  });
}

export async function updateSectorCommissionRate(
  actorId: string,
  sectorSlug: string,
  rate: string,
) {
  await prisma.$transaction(async (tx) => {
    await requireLiveSector(tx, sectorSlug);
    await tx.sector.update({
      where: { slug: sectorSlug },
      data: { commissionRate: new Prisma.Decimal(rate) },
    });
    await logActivity(tx, actorId, "sector.commission_rate_updated", "sector", sectorSlug);
  });
}
