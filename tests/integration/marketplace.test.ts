import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

import { Prisma } from "@/generated/prisma/client";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated, migrated PostgreSQL test database before running integration tests.",
  );
process.env.DATABASE_URL = testDatabaseUrl;
void mock.module("server-only", () => ({}));
void mock.module("next/cache", () => ({
  cacheLife: () => {},
  cacheTag: () => {},
  revalidatePath: () => {},
  revalidateTag: () => {},
}));
void mock.module("next-intl/server", () => ({ getLocale: async () => "en" }));

const [{ prisma }, marketplace, workspaces, listings, dal] = await Promise.all([
  import("@/lib/prisma"),
  import("@/lib/domain/marketplace"),
  import("@/lib/workspaces"),
  import("@/lib/listings"),
  import("@/lib/dal"),
]);
const { getAdminWorkspace } = workspaces;
const { getStaffAccess, hasStaffPermission } = dal;

const suffix = crypto.randomUUID();
const buyerId = "test-buyer-" + suffix;
const buyerTwoId = "test-buyer-two-" + suffix;
const providerUserId = "test-provider-" + suffix;
const financeUserId = "test-finance-" + suffix;
const constructionOperationsUserId = "test-construction-ops-" + suffix;
const constructionFinanceUserId = "test-construction-finance-" + suffix;
let providerId = "";
const requestIds: string[] = [];
const listingIds: string[] = [];
const orderIds: string[] = [];
const userIds = [
  buyerId,
  buyerTwoId,
  providerUserId,
  financeUserId,
  constructionOperationsUserId,
  constructionFinanceUserId,
];

async function createRequestAndQuote(
  listingId: string,
  customerId: string,
  sectorSlug = "agriculture-labor",
) {
  const request = await prisma.marketplaceRequest.create({
    data: {
      buyerId: customerId,
      providerId,
      listingId,
      sectorSlug,
      quantity: new Prisma.Decimal(1),
      district: "Dhaka",
      details: "Integration test request",
    },
    select: { id: true },
  });
  requestIds.push(request.id);
  await marketplace.submitQuote(providerUserId, {
    requestId: request.id,
    quantity: "1",
    unitPrice: "10",
    transportFee: "0",
    note: "Test terms",
  });
  return request.id;
}

async function createListing(
  stock: string,
  sectorSlug = "agriculture-labor",
  kind: "PRODUCE" | "WORKER" | "MACHINERY" | "CONSTRUCTION_MATERIAL" = "PRODUCE",
  moderationStatus: "APPROVED" | "PENDING" = "APPROVED",
) {
  const listing = await prisma.marketplaceListing.create({
    data: {
      providerId,
      sectorSlug,
      kind,
      translations: {
        create: [
          { locale: "bn", title: "পরীক্ষার ধান", description: "" },
          {
            locale: "en",
            title:
              kind === "PRODUCE"
                ? "Test rice"
                : kind === "CONSTRUCTION_MATERIAL"
                  ? "Test cement"
                  : "Test worker",
            description: "",
          },
        ],
      },
      category:
        kind === "PRODUCE" ? "Rice" : kind === "CONSTRUCTION_MATERIAL" ? "Cement" : "Farm labor",
      district: "Dhaka",
      unit: kind === "PRODUCE" ? "kg" : kind === "CONSTRUCTION_MATERIAL" ? "bag" : "day",
      unitPrice: new Prisma.Decimal(10),
      stock: new Prisma.Decimal(stock),
      moderationStatus,
      isPublished: moderationStatus === "APPROVED",
    },
    select: { id: true },
  });
  listingIds.push(listing.id);
  return listing.id;
}

async function completeOrder(orderId: string) {
  await marketplace.progressOrder(providerUserId, orderId, "start");
  await marketplace.progressOrder(providerUserId, orderId, "submit");
  await marketplace.progressOrder(buyerId, orderId, "confirm");
}

describe("PostgreSQL marketplace transactions", () => {
  beforeAll(async () => {
    await prisma.sector.upsert({
      where: { slug: "agriculture-labor" },
      update: { status: "LIVE", commissionRate: new Prisma.Decimal("10.00") },
      create: {
        slug: "agriculture-labor",
        position: 4,
        icon: "🌾",
        status: "LIVE",
        commissionRate: new Prisma.Decimal("10.00"),
      },
    });
    await prisma.sector.upsert({
      where: { slug: "construction" },
      update: { status: "LIVE", commissionRate: new Prisma.Decimal("10.00") },
      create: {
        slug: "construction",
        position: 5,
        icon: "🏗️",
        status: "LIVE",
        commissionRate: new Prisma.Decimal("10.00"),
      },
    });
    for (const [id, role] of [
      [buyerId, "customer"],
      [buyerTwoId, "customer"],
      [providerUserId, "customer"],
      [financeUserId, "super_admin"],
      [constructionOperationsUserId, "customer"],
      [constructionFinanceUserId, "customer"],
    ] as const) {
      await prisma.user.create({
        data: {
          id,
          name: id,
          email: id + "@integration.example",
          emailVerified: true,
          phone: "+8801700000000",
          role,
          status: "active",
        },
      });
    }
    await prisma.staffGrant.createMany({
      data: [
        {
          userId: constructionOperationsUserId,
          permission: "OPERATIONS",
          scopeKey: "construction",
          sectorSlug: "construction",
        },
        {
          userId: constructionFinanceUserId,
          permission: "FINANCE",
          scopeKey: "construction",
          sectorSlug: "construction",
        },
      ],
    });
    const profile = await prisma.providerProfile.create({
      data: {
        userId: providerUserId,
        district: "Dhaka",
        status: "APPROVED",
        translations: {
          create: [
            { locale: "bn", name: "পরীক্ষার কৃষক", bio: "" },
            { locale: "en", name: "Test farmer", bio: "" },
          ],
        },
      },
      select: { id: true },
    });
    providerId = profile.id;
    await prisma.providerCapability.create({
      data: { providerId, sectorSlug: "agriculture-labor", kind: "PRODUCE", status: "APPROVED" },
    });
    await prisma.providerCapability.create({
      data: { providerId, sectorSlug: "agriculture-labor", kind: "WORKER", status: "APPROVED" },
    });
    await prisma.providerCapability.create({
      data: {
        providerId,
        sectorSlug: "construction",
        kind: "CONSTRUCTION_MATERIAL",
        status: "APPROVED",
      },
    });
    const verificationExpiry = new Date();
    verificationExpiry.setUTCFullYear(verificationExpiry.getUTCFullYear() + 1);
    await prisma.providerVerificationApplication.create({
      data: {
        providerId,
        type: "SUPPLIER",
        applicantType: "BUSINESS",
        legalName: "Test supplier",
        businessName: "Test construction supply",
        businessAddress: "Dhaka, Bangladesh",
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: financeUserId,
        expiresAt: verificationExpiry,
      },
    });
  });

  it("completes a request, quote, order, confirmed payment, review, and commission receipt", async () => {
    const listingId = await createListing("5");
    const requestId = await createRequestAndQuote(listingId, buyerId);
    const requestNotification = await prisma.notification.findFirstOrThrow({
      where: {
        userId: buyerId,
        translations: { some: { locale: "en", title: "New quote received" } },
      },
      include: { translations: true },
    });
    const bengaliNotification = requestNotification.translations.find(
      (translation) => translation.locale === "bn",
    );
    expect(bengaliNotification?.title).toBe("নতুন দরপ্রস্তাব এসেছে");
    expect(bengaliNotification?.message).toContain("নতুন মূল্য");
    const order = await marketplace.acceptQuote(buyerId, requestId);
    orderIds.push(order.id);
    const acceptedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: {
        subtotal: true,
        transportFee: true,
        commissionRate: true,
        commissionAmount: true,
        providerAmount: true,
      },
    });
    expect(acceptedOrder.subtotal.toFixed(2)).toBe("10.00");
    expect(acceptedOrder.commissionRate.toFixed(2)).toBe("10.00");
    expect(acceptedOrder.commissionAmount.toFixed(2)).toBe("1.00");
    expect(acceptedOrder.providerAmount.toFixed(2)).toBe("9.00");
    const acceptedNotification = await prisma.notification.findFirstOrThrow({
      where: {
        userId: providerUserId,
        translations: { some: { locale: "en", title: "Quote accepted" } },
      },
      include: { translations: true },
    });
    expect(
      acceptedNotification.translations.find((translation) => translation.locale === "en")?.message,
    ).toContain("accepted your quote");
    expect(
      (
        await prisma.marketplaceListing.findUniqueOrThrow({
          where: { id: listingId },
          select: { stock: true },
        })
      ).stock.toString(),
    ).toBe("4");

    const payment = await marketplace.recordPayment(buyerId, {
      orderId: order.id,
      amount: "10",
      method: "BANK_TRANSFER",
      reference: "integration-payment",
    });
    await marketplace.confirmPayment(providerUserId, order.id, payment.id);
    const paymentConfirmationNotification = await prisma.notification.findFirstOrThrow({
      where: {
        userId: buyerId,
        translations: {
          some: { locale: "en", title: "Payment confirmation received" },
        },
      },
      include: { translations: true },
    });
    expect(
      paymentConfirmationNotification.translations.find(
        (translation) => translation.locale === "en",
      )?.message,
    ).toContain("confirmed a payment record");
    await marketplace.progressOrder(providerUserId, order.id, "start");
    await marketplace.progressOrder(providerUserId, order.id, "submit");
    await marketplace.progressOrder(buyerId, order.id, "confirm");
    await marketplace.writeReview(buyerId, order.id, 5, "Integration review");

    const commission = await prisma.commissionRecord.findUniqueOrThrow({
      where: { orderId: order.id },
    });
    expect(commission.amount.toFixed(2)).toBe("1.00");
    expect(commission.amount.toFixed(2)).toBe(acceptedOrder.commissionAmount.toFixed(2));
    await marketplace.markCommissionCollected(financeUserId, commission.id, "integration-receipt");
    const completedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: {
        status: true,
        commissionAmount: true,
        review: { select: { rating: true } },
        commission: { select: { status: true, reference: true } },
        payments: {
          select: { amount: true, buyerConfirmedAt: true, providerConfirmedAt: true },
        },
      },
    });
    expect(completedOrder.status).toBe("COMPLETED");
    expect(completedOrder.review?.rating).toBe(5);
    expect(completedOrder.commission).toEqual({
      status: "COLLECTED",
      reference: "integration-receipt",
    });
    expect(
      (
        await prisma.commissionRecord.findUniqueOrThrow({ where: { orderId: order.id } })
      ).amount.toFixed(2),
    ).toBe(completedOrder.commissionAmount.toFixed(2));
    expect(
      Boolean(
        completedOrder.payments[0]?.buyerConfirmedAt &&
        completedOrder.payments[0]?.providerConfirmedAt,
      ),
    ).toBe(true);
    expect(completedOrder.payments[0]?.amount.toFixed(2)).toBe("10.00");
    const orderActivity = await prisma.activityLog.findMany({
      where: { entityType: "order", entityId: order.id },
      select: { action: true },
    });
    expect(orderActivity.map(({ action }) => action)).toEqual(
      expect.arrayContaining(["quote.accepted", "order.start", "order.submit", "order.confirm"]),
    );
    const paymentActivity = await prisma.activityLog.findMany({
      where: { entityType: "payment", entityId: payment.id },
      select: { action: true },
    });
    expect(paymentActivity.map(({ action }) => action)).toEqual(
      expect.arrayContaining(["payment.recorded", "payment.confirmed"]),
    );
    expect(
      await prisma.activityLog.count({
        where: {
          entityType: "commission",
          entityId: commission.id,
          action: "commission.collected",
        },
      }),
    ).toBe(1);
    const commissionNotification = await prisma.notification.findFirstOrThrow({
      where: {
        userId: providerUserId,
        translations: { some: { locale: "en", title: "Commission receipt recorded" } },
      },
      include: { translations: true },
    });
    expect(
      commissionNotification.translations.find((translation) => translation.locale === "en")
        ?.message,
    ).toContain("confirmed receipt");

    await marketplace.updateProviderListing(providerUserId, {
      listingId,
      sectorSlug: "agriculture-labor",
      kind: "PRODUCE",
      titleBn: "পরীক্ষার নতুন ধান",
      titleEn: "Updated test rice",
      descriptionBn: "",
      descriptionEn: "Updated description",
      category: "Grains / শস্য",
      district: "Dhaka",
      unit: "kg",
      unitPrice: "99",
      stock: "4",
      availableFrom: undefined,
    });
    const moderatedListing = await prisma.marketplaceListing.findUniqueOrThrow({
      where: { id: listingId },
      select: { unitPrice: true, moderationStatus: true, isPublished: true },
    });
    const orderSnapshot = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { unitPrice: true },
    });
    expect(moderatedListing.unitPrice.toString()).toBe("99");
    expect(moderatedListing.moderationStatus).toBe("PENDING");
    expect(moderatedListing.isPublished).toBe(false);
    expect(orderSnapshot.unitPrice.toString()).toBe("10");
  });

  it("does not oversell when two customers accept quotes concurrently", async () => {
    const listingId = await createListing("1");
    const [firstRequest, secondRequest] = await Promise.all([
      createRequestAndQuote(listingId, buyerId),
      createRequestAndQuote(listingId, buyerTwoId),
    ]);
    const results = await Promise.allSettled([
      marketplace.acceptQuote(buyerId, firstRequest),
      marketplace.acceptQuote(buyerTwoId, secondRequest),
    ]);
    for (const result of results) if (result.status === "fulfilled") orderIds.push(result.value.id);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(
      (
        await prisma.marketplaceListing.findUniqueOrThrow({
          where: { id: listingId },
          select: { stock: true },
        })
      ).stock.toString(),
    ).toBe("0");
    expect(await prisma.order.count({ where: { listingId } })).toBe(1);
  });

  it("keeps zero-stock workers visible and uses bookings instead of stock for availability", async () => {
    const workerListingId = await createListing("0", "agriculture-labor", "WORKER");
    const [market, detail, profile] = await Promise.all([
      listings.getPublicListings("agriculture-labor", "en", "WORKER"),
      listings.getPublicListing(workerListingId, "en"),
      listings.getPublicProviderProfile("agriculture-labor", providerId, "en"),
    ]);
    expect(market.items.some((item) => item.id === workerListingId)).toBe(true);
    expect(detail.listing?.id).toBe(workerListingId);
    expect(profile.provider?.listings.some((item) => item.id === workerListingId)).toBe(true);
    expect(
      marketplace.updateProviderListingStock(providerUserId, workerListingId, "1"),
    ).rejects.toMatchObject({ code: "invalidState" });

    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 1);
    const endsAt = new Date(startsAt);
    endsAt.setUTCDate(endsAt.getUTCDate() + 1);
    const startDate = startsAt.toISOString().slice(0, 10);
    const endDate = endsAt.toISOString().slice(0, 10);
    const request = await marketplace.createMarketplaceRequest(buyerId, {
      listingId: workerListingId,
      quantity: "1",
      district: "Dhaka",
      details: "Worker availability test",
      requestedStart: startDate,
      requestedEnd: endDate,
    });
    requestIds.push(request.id);
    await marketplace.submitQuote(providerUserId, {
      requestId: request.id,
      quantity: "2",
      unitPrice: "10",
      transportFee: "0",
      note: "Two days",
    });
    const order = await marketplace.acceptQuote(buyerId, request.id);
    orderIds.push(order.id);
    const scheduled = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { quantity: true, booking: { select: { startsAt: true, endsAt: true } } },
    });
    expect(scheduled.quantity.toString()).toBe("2");
    expect(scheduled.booking).not.toBeNull();
    expect(
      (
        await prisma.marketplaceListing.findUniqueOrThrow({
          where: { id: workerListingId },
          select: { stock: true },
        })
      ).stock.toString(),
    ).toBe("0");
  });

  it("archives listings without deleting their order references", async () => {
    const listingId = await createListing("3");
    await marketplace.archiveProviderListing(providerUserId, listingId);
    const archived = await prisma.marketplaceListing.findUniqueOrThrow({
      where: { id: listingId },
      select: { archivedAt: true, isPublished: true },
    });
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(archived.isPublished).toBe(false);
    expect((await listings.getPublicListing(listingId, "en")).listing).toBeNull();
  });

  it("limits provider and finance workspaces to a staff member's granted sector", async () => {
    const agricultureListingId = await createListing(
      "10",
      "agriculture-labor",
      "PRODUCE",
      "PENDING",
    );
    const constructionListingId = await createListing(
      "10",
      "construction",
      "CONSTRUCTION_MATERIAL",
      "PENDING",
    );
    await prisma.providerCapability.createMany({
      data: [
        { providerId, sectorSlug: "agriculture-labor", kind: "MACHINERY", status: "PENDING" },
        { providerId, sectorSlug: "construction", kind: "CONSTRUCTION_SERVICE", status: "PENDING" },
      ],
    });
    const agricultureRequest = await prisma.marketplaceRequest.create({
      data: {
        buyerId,
        providerId,
        listingId: agricultureListingId,
        sectorSlug: "agriculture-labor",
        quantity: new Prisma.Decimal(1),
        district: "Dhaka",
        details: "Active agriculture request",
      },
      select: { id: true },
    });
    const constructionRequest = await prisma.marketplaceRequest.create({
      data: {
        buyerId,
        providerId,
        listingId: constructionListingId,
        sectorSlug: "construction",
        quantity: new Prisma.Decimal(1),
        district: "Dhaka",
        details: "Construction request",
      },
      select: { id: true },
    });
    const cancelledRequest = await prisma.marketplaceRequest.create({
      data: {
        buyerId,
        providerId,
        listingId: agricultureListingId,
        sectorSlug: "agriculture-labor",
        quantity: new Prisma.Decimal(1),
        district: "Dhaka",
        details: "Closed request",
        status: "CANCELLED",
      },
      select: { id: true },
    });
    requestIds.push(agricultureRequest.id, constructionRequest.id, cancelledRequest.id);

    const operationsUser = {
      id: constructionOperationsUserId,
      name: "Construction operations",
      email: `${constructionOperationsUserId}@integration.example`,
      emailVerified: true,
      phone: "+8801700000000",
      role: "customer",
      status: "active",
      accountType: "customer",
    };
    const operationsAccess = await getStaffAccess(operationsUser);
    expect(operationsAccess.operationSectors).toEqual(["construction"]);
    expect(operationsAccess.financeSectors).toEqual([]);
    expect(await hasStaffPermission(operationsUser, "OPERATIONS", "construction")).toBe(true);
    expect(await hasStaffPermission(operationsUser, "OPERATIONS", "agriculture-labor")).toBe(false);
    expect(await hasStaffPermission(operationsUser, "FINANCE", "construction")).toBe(false);

    const operationsWorkspace = await getAdminWorkspace(operationsAccess);
    expect(operationsWorkspace.requests.map(({ id }) => id)).toContain(constructionRequest.id);
    expect(operationsWorkspace.requests.map(({ id }) => id)).not.toContain(agricultureRequest.id);
    expect(operationsWorkspace.requests.map(({ id }) => id)).not.toContain(cancelledRequest.id);
    expect(operationsWorkspace.capabilities.map(({ kind }) => kind)).toContain(
      "CONSTRUCTION_SERVICE",
    );
    expect(operationsWorkspace.capabilities.map(({ kind }) => kind)).not.toContain("MACHINERY");
    expect(operationsWorkspace.listings.map(({ id }) => id)).toContain(constructionListingId);
    expect(operationsWorkspace.listings.map(({ id }) => id)).not.toContain(agricultureListingId);
    expect(operationsWorkspace.verificationApplications.map(({ providerId: id }) => id)).toContain(
      providerId,
    );

    const financeUser = {
      ...operationsUser,
      id: constructionFinanceUserId,
      name: "Construction finance",
      email: `${constructionFinanceUserId}@integration.example`,
    };
    const financeAccess = await getStaffAccess(financeUser);
    expect(financeAccess.operationSectors).toEqual([]);
    expect(financeAccess.financeSectors).toEqual(["construction"]);
    expect(await hasStaffPermission(financeUser, "FINANCE", "construction")).toBe(true);
    expect(await hasStaffPermission(financeUser, "FINANCE", "agriculture-labor")).toBe(false);
    expect(await hasStaffPermission(financeUser, "OPERATIONS", "construction")).toBe(false);
  });

  it("keeps scoped finance queues consistent with order snapshots", async () => {
    const constructionListingId = await createListing("5", "construction", "CONSTRUCTION_MATERIAL");
    const constructionRequestId = await createRequestAndQuote(
      constructionListingId,
      buyerId,
      "construction",
    );
    const constructionOrder = await marketplace.acceptQuote(buyerId, constructionRequestId);
    orderIds.push(constructionOrder.id);
    const constructionPayment = await marketplace.recordPayment(buyerId, {
      orderId: constructionOrder.id,
      amount: "10",
      method: "BANK_TRANSFER",
      reference: "construction-scope-payment",
    });
    await completeOrder(constructionOrder.id);

    const agricultureListingId = await createListing("5");
    const agricultureRequestId = await createRequestAndQuote(agricultureListingId, buyerId);
    const agricultureOrder = await marketplace.acceptQuote(buyerId, agricultureRequestId);
    orderIds.push(agricultureOrder.id);
    await marketplace.recordPayment(buyerId, {
      orderId: agricultureOrder.id,
      amount: "10",
      method: "BANK_TRANSFER",
      reference: "agriculture-scope-payment",
    });
    await completeOrder(agricultureOrder.id);

    const financeUser = {
      id: constructionFinanceUserId,
      name: "Construction finance",
      email: `${constructionFinanceUserId}@integration.example`,
      emailVerified: true,
      phone: "+8801700000000",
      role: "customer",
      status: "active",
      accountType: "customer",
    };
    const financeWorkspace = await getAdminWorkspace(await getStaffAccess(financeUser));
    expect(
      financeWorkspace.commissions.every(({ sectorSlug }) => sectorSlug === "construction"),
    ).toBe(true);
    expect(financeWorkspace.commissions.some(({ amount }) => amount === "1")).toBe(true);
    expect(financeWorkspace.paymentMismatches.map(({ id }) => id)).toContain(
      constructionPayment.id,
    );
    expect(
      financeWorkspace.paymentMismatches.every(({ sectorSlug }) => sectorSlug === "construction"),
    ).toBe(true);

    const constructionSnapshot = await prisma.order.findUniqueOrThrow({
      where: { id: constructionOrder.id },
      select: { commissionAmount: true },
    });
    expect(
      financeWorkspace.commissions.some(
        ({ amount }) => amount === constructionSnapshot.commissionAmount.toString(),
      ),
    ).toBe(true);
  });

  afterAll(async () => {
    await prisma.paymentRecord.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.review.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.commissionRecord.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.booking.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.quote.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.marketplaceRequest.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.marketplaceListing.deleteMany({ where: { id: { in: listingIds } } });
    await prisma.providerVerificationApplication.deleteMany({ where: { providerId } });
    await prisma.activityLog.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.staffGrant.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.providerCapability.deleteMany({ where: { providerId } });
    await prisma.providerProfile.deleteMany({ where: { id: providerId } });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await prisma.$disconnect();
  });
});
