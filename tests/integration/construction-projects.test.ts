import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

import { Prisma } from "@/generated/prisma/client";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated, migrated PostgreSQL test database before running integration tests.",
  );
process.env.DATABASE_URL = testDatabaseUrl;
void mock.module("server-only", () => ({}));

const [{ prisma }, marketplace, projects, { getProjectWorkspace }] = await Promise.all([
  import("@/lib/prisma"),
  import("@/lib/domain/marketplace"),
  import("@/lib/domain/projects"),
  import("@/lib/workspaces"),
]);

const suffix = crypto.randomUUID();
const ownerId = `construction-owner-${suffix}`;
const outsiderId = `construction-outsider-${suffix}`;
const serviceOneUserId = `construction-service-one-${suffix}`;
const serviceTwoUserId = `construction-service-two-${suffix}`;
const materialUserId = `construction-material-${suffix}`;
const userIds = [ownerId, outsiderId, serviceOneUserId, serviceTwoUserId, materialUserId];
const providerIds: string[] = [];
const listingIds: string[] = [];
const requestIds: string[] = [];
const orderIds: string[] = [];
let projectId = "";
let serviceOneProviderId = "";
let serviceTwoProviderId = "";
let materialProviderId = "";

const futureDate = () => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  return date.toISOString().slice(0, 10);
};

async function createListing(
  providerId: string,
  kind: "CONSTRUCTION_SERVICE" | "CONSTRUCTION_MATERIAL",
  title: string,
) {
  const listing = await prisma.marketplaceListing.create({
    data: {
      providerId,
      sectorSlug: "construction",
      kind,
      titleBn: "পরীক্ষার নির্মাণ সেবা",
      titleEn: title,
      descriptionBn: "",
      descriptionEn: "Integration test listing",
      category: kind === "CONSTRUCTION_SERVICE" ? "Contractors" : "Cement",
      district: "Dhaka",
      unit: kind === "CONSTRUCTION_SERVICE" ? "day" : "bag",
      unitPrice: new Prisma.Decimal(100),
      stock: new Prisma.Decimal(kind === "CONSTRUCTION_MATERIAL" ? 100 : 0),
      moderationStatus: "APPROVED",
      isPublished: true,
    },
    select: { id: true },
  });
  listingIds.push(listing.id);
  return listing.id;
}

async function invite(
  listingId: string,
  packageId: string,
  providerUserId: string,
  scheduled: boolean,
) {
  const date = scheduled ? futureDate() : undefined;
  const request = await marketplace.createMarketplaceRequest(ownerId, {
    listingId,
    quantity: "1",
    district: "Dhaka",
    details: "Integration project invitation",
    projectId,
    packageId,
    ...(date ? { requestedStart: date, requestedEnd: date } : {}),
  });
  requestIds.push(request.id);
  await marketplace.submitQuote(providerUserId, {
    requestId: request.id,
    quantity: "1",
    unitPrice: "100",
    transportFee: "10",
    note: "Integration quote",
  });
  return request.id;
}

async function completeOrder(orderId: string, providerUserId: string) {
  await marketplace.progressOrder(providerUserId, orderId, "start");
  await marketplace.progressOrder(providerUserId, orderId, "submit");
  await marketplace.progressOrder(ownerId, orderId, "confirm");
}

describe("PostgreSQL construction project workflows", () => {
  beforeAll(async () => {
    await prisma.sector.upsert({
      where: { slug: "construction" },
      update: { status: "LIVE", commissionRate: new Prisma.Decimal("10.00") },
      create: {
        slug: "construction",
        position: 5,
        titleBn: "নির্মাণ",
        titleEn: "Construction",
        icon: "🏗️",
        status: "LIVE",
        commissionRate: new Prisma.Decimal("10.00"),
      },
    });
    for (const id of userIds) {
      await prisma.user.create({
        data: {
          id,
          name: id,
          email: `${id}@integration.example`,
          emailVerified: true,
          phone: "+8801700000000",
        },
      });
    }
    const [serviceOne, serviceTwo, material] = await Promise.all([
      prisma.providerProfile.create({
        data: {
          userId: serviceOneUserId,
          nameBn: "সেবা এক",
          nameEn: "Service One",
          district: "Dhaka",
          status: "APPROVED",
        },
        select: { id: true },
      }),
      prisma.providerProfile.create({
        data: {
          userId: serviceTwoUserId,
          nameBn: "সেবা দুই",
          nameEn: "Service Two",
          district: "Dhaka",
          status: "APPROVED",
        },
        select: { id: true },
      }),
      prisma.providerProfile.create({
        data: {
          userId: materialUserId,
          nameBn: "সামগ্রী",
          nameEn: "Materials",
          district: "Dhaka",
          status: "APPROVED",
        },
        select: { id: true },
      }),
    ]);
    serviceOneProviderId = serviceOne.id;
    serviceTwoProviderId = serviceTwo.id;
    materialProviderId = material.id;
    providerIds.push(serviceOne.id, serviceTwo.id, material.id);
    await prisma.providerCapability.createMany({
      data: [
        {
          providerId: serviceOne.id,
          sectorSlug: "construction",
          kind: "CONSTRUCTION_SERVICE",
          status: "APPROVED",
        },
        {
          providerId: serviceTwo.id,
          sectorSlug: "construction",
          kind: "CONSTRUCTION_SERVICE",
          status: "APPROVED",
        },
        {
          providerId: material.id,
          sectorSlug: "construction",
          kind: "CONSTRUCTION_MATERIAL",
          status: "APPROVED",
        },
      ],
    });
    const project = await projects.createConstructionProject(ownerId, {
      title: "Integration home project",
      projectType: "Residential",
      district: "Dhaka",
      description: "Testing work packages and project handover.",
      approximateArea: "",
      serviceSlug: "contractors",
    });
    projectId = project.id;
  });

  it("accepts only one competing quote per work package and tracks separate material packages", async () => {
    const servicePackage = await prisma.projectPackage.findFirstOrThrow({
      where: { projectId, serviceSlug: "contractors" },
      select: { id: true },
    });
    const materialPackage = await projects.createProjectPackage(ownerId, {
      projectId,
      label: "Cement supply",
      description: "Supply the requested cement.",
      kind: "CONSTRUCTION_MATERIAL",
    });
    await prisma.constructionProject.update({
      where: { id: projectId },
      data: { status: "ACTIVE" },
    });

    const serviceListingOne = await createListing(
      serviceOneProviderId,
      "CONSTRUCTION_SERVICE",
      "Service One builders",
    );
    const serviceListingTwo = await createListing(
      serviceTwoProviderId,
      "CONSTRUCTION_SERVICE",
      "Service Two builders",
    );
    const materialListing = await createListing(
      materialProviderId,
      "CONSTRUCTION_MATERIAL",
      "Cement supply",
    );
    const [serviceRequestOne, serviceRequestTwo, materialRequest] = await Promise.all([
      invite(serviceListingOne, servicePackage.id, serviceOneUserId, true),
      invite(serviceListingTwo, servicePackage.id, serviceTwoUserId, true),
      invite(materialListing, materialPackage.id, materialUserId, false),
    ]);

    expect(
      marketplace.createMarketplaceRequest(ownerId, {
        listingId: materialListing,
        quantity: "1",
        district: "Dhaka",
        details: "Wrong package kind",
        projectId,
        packageId: servicePackage.id,
      }),
    ).rejects.toMatchObject({ code: "invalidState" });

    const competingAcceptances = await Promise.allSettled([
      marketplace.acceptQuote(ownerId, serviceRequestOne),
      marketplace.acceptQuote(ownerId, serviceRequestTwo),
    ]);
    for (const result of competingAcceptances)
      if (result.status === "fulfilled") orderIds.push(result.value.id);
    expect(competingAcceptances.filter((result) => result.status === "fulfilled")).toHaveLength(1);

    const firstServiceOrder = await prisma.order.findFirstOrThrow({
      where: { packageId: servicePackage.id },
      select: { id: true, providerId: true },
    });
    const firstProviderUserId =
      firstServiceOrder.providerId === serviceOneProviderId ? serviceOneUserId : serviceTwoUserId;
    const replacementRequestId =
      firstServiceOrder.providerId === serviceOneProviderId ? serviceRequestTwo : serviceRequestOne;
    await marketplace.requestOrderCancellation(
      ownerId,
      firstServiceOrder.id,
      "Customer and provider agreed to restart this package.",
    );
    await marketplace.requestOrderCancellation(
      firstProviderUserId,
      firstServiceOrder.id,
      "Customer and provider agreed to restart this package.",
    );
    expect(
      (
        await prisma.order.findUniqueOrThrow({
          where: { id: firstServiceOrder.id },
          select: { status: true },
        })
      ).status,
    ).toBe("CANCELLED");

    const replacementOrder = await marketplace.acceptQuote(ownerId, replacementRequestId);
    orderIds.push(replacementOrder.id);
    const serviceOrder = await prisma.order.findFirstOrThrow({
      where: { packageId: servicePackage.id, status: { not: "CANCELLED" } },
      select: { id: true, providerId: true },
    });
    const materialOrder = await marketplace.acceptQuote(ownerId, materialRequest);
    orderIds.push(materialOrder.id);
    expect(await prisma.order.count({ where: { projectId } })).toBe(3);
    expect(await getProjectWorkspace(outsiderId, projectId)).toBeNull();
    const serviceProviderUserId =
      serviceOrder.providerId === serviceOneProviderId ? serviceOneUserId : serviceTwoUserId;
    const providerWorkspace = await getProjectWorkspace(serviceProviderUserId, projectId);
    expect(providerWorkspace?.orders.map((order) => order.id)).toEqual([serviceOrder.id]);

    const milestone = await projects.addProjectMilestone(ownerId, {
      projectId,
      title: "Foundation work",
      description: "Complete the foundation.",
      assignedProviderId: serviceOrder.providerId,
    });
    const assignedProviderUserId = serviceProviderUserId;
    const unassignedProviderUserId =
      assignedProviderUserId === serviceOneUserId ? serviceTwoUserId : serviceOneUserId;

    expect(
      projects.updateProjectMilestone(unassignedProviderUserId, milestone.id, "submit"),
    ).rejects.toMatchObject({ code: "notAllowed" });
    expect(projects.confirmProjectHandover(ownerId, projectId)).rejects.toMatchObject({
      code: "invalidState",
    });
    await projects.updateProjectMilestone(assignedProviderUserId, milestone.id, "submit");
    await projects.updateProjectMilestone(ownerId, milestone.id, "approve");
    await completeOrder(serviceOrder.id, assignedProviderUserId);
    await completeOrder(materialOrder.id, materialUserId);
    await projects.confirmProjectHandover(ownerId, projectId);

    const completedProject = await prisma.constructionProject.findUniqueOrThrow({
      where: { id: projectId },
      select: { status: true, handedOverAt: true },
    });
    expect(completedProject.status).toBe("COMPLETED");
    expect(completedProject.handedOverAt).toBeInstanceOf(Date);
    expect(
      await prisma.activityLog.count({
        where: { entityType: "project", entityId: projectId, action: "project.handover_confirmed" },
      }),
    ).toBe(1);
  });

  afterAll(async () => {
    await prisma.commissionRecord.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.paymentRecord.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.booking.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.quote.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.marketplaceRequest.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.projectMilestone.deleteMany({ where: { projectId } });
    await prisma.projectPackage.deleteMany({ where: { projectId } });
    if (projectId) await prisma.constructionProject.deleteMany({ where: { id: projectId } });
    await prisma.marketplaceListing.deleteMany({ where: { id: { in: listingIds } } });
    await prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.providerCapability.deleteMany({ where: { providerId: { in: providerIds } } });
    await prisma.providerProfile.deleteMany({ where: { id: { in: providerIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
});
