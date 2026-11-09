import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated, migrated PostgreSQL test database before running integration tests.",
  );
process.env.DATABASE_URL = testDatabaseUrl;
const previousEnforcement = process.env.CONSTRUCTION_VERIFICATION_ENFORCED;
process.env.CONSTRUCTION_VERIFICATION_ENFORCED = "true";
void mock.module("server-only", () => ({}));
void mock.module("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
void mock.module("next-intl/server", () => ({ getLocale: async () => "en" }));
void mock.module("@/lib/storage/s3", () => ({
  validateStoredObject: async (
    key: string,
    contentType: string,
    maxBytes: number,
    sizeBytes: number,
  ) => ({
    key,
    contentType,
    sizeBytes: Math.min(sizeBytes, maxBytes),
  }),
}));

const [{ prisma }, marketplace, verification, listings] = await Promise.all([
  import("@/lib/prisma"),
  import("@/lib/domain/marketplace"),
  import("@/lib/domain/provider-verification"),
  import("@/lib/listings"),
]);

const suffix = crypto.randomUUID();
const providerUserId = `verification-provider-${suffix}`;
const customerUserId = `verification-customer-${suffix}`;
const reviewerUserId = `verification-reviewer-${suffix}`;
const userIds = [providerUserId, customerUserId, reviewerUserId];
let providerId = "";
const listingIds: string[] = [];

const listingInput = (kind: "CONSTRUCTION_SERVICE" | "CONSTRUCTION_MATERIAL") => ({
  sectorSlug: "construction" as const,
  kind,
  titleBn: kind === "CONSTRUCTION_SERVICE" ? "নির্মাণ সেবা" : "নির্মাণসামগ্রী",
  titleEn: kind === "CONSTRUCTION_SERVICE" ? "Construction service" : "Construction material",
  descriptionBn: "",
  descriptionEn: "Verification integration test",
  category: kind === "CONSTRUCTION_SERVICE" ? "Contractors" : "Cement",
  district: "Dhaka",
  unit: kind === "CONSTRUCTION_SERVICE" ? "day" : "bag",
  unitPrice: "100",
  stock: kind === "CONSTRUCTION_SERVICE" ? "0" : "10",
  availableFrom: undefined,
});

function submission(type: "CONTRACTOR" | "SUPPLIER", version: number) {
  const documentType: "PROFESSIONAL_CREDENTIAL" | "SUPPLIER_AUTHORIZATION" =
    type === "CONTRACTOR" ? "PROFESSIONAL_CREDENTIAL" : "SUPPLIER_AUTHORIZATION";
  const filename = `${type.toLowerCase()}-evidence-${version}.pdf`;
  return {
    type,
    applicantType: "BUSINESS" as const,
    legalName: "Test applicant",
    businessName: "Test construction business",
    businessAddress: "Dhaka, Bangladesh",
    registrationNumber: "REG-123",
    tradeLicenseNumber: "",
    taxIdentifier: "",
    yearsExperience: type === "CONTRACTOR" ? "8" : "",
    teamSize: type === "CONTRACTOR" ? "4" : "",
    specializations: "Masonry",
    materialCategories: type === "SUPPLIER" ? "Cement" : "",
    brands: type === "SUPPLIER" ? "Test brand" : "",
    serviceAreas: "Dhaka",
    documents: [
      {
        documentType,
        storageKey: `provider-verification/${providerId}/${type}/${providerUserId}/${type.toLowerCase()}-${version}.pdf`,
        filename,
        contentType: "application/pdf" as const,
        sizeBytes: 1200,
      },
    ],
  };
}

async function approve(applicationId: string, note = "Evidence reviewed and confirmed.") {
  const application = await prisma.providerVerificationApplication.findUniqueOrThrow({
    where: { id: applicationId },
    select: { version: true },
  });
  const documents = await prisma.providerVerificationDocument.findMany({
    where: { applicationId, version: application.version },
    select: { id: true },
  });
  await verification.reviewProviderVerification(reviewerUserId, {
    applicationId,
    decision: "APPROVED",
    reviewNote: note,
    documentDecisions: documents.map(({ id }) => ({ id, status: "APPROVED" as const, note: "" })),
  });
}

async function expectWorkflowError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toMatchObject({ code });
}

describe("construction contractor and supplier verification", () => {
  beforeAll(async () => {
    process.env.CONSTRUCTION_VERIFICATION_ENFORCED = "true";
    await prisma.sector.upsert({
      where: { slug: "construction" },
      update: { status: "LIVE" },
      create: {
        slug: "construction",
        position: 5,
        icon: "🏗️",
        status: "LIVE",
        commissionRate: "10.00",
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
          role: id === reviewerUserId ? "super_admin" : "customer",
          status: "active",
        },
      });
    }
    const profile = await prisma.providerProfile.create({
      data: {
        userId: providerUserId,
        district: "Dhaka",
        status: "APPROVED",
        translations: {
          create: [
            { locale: "bn", name: "যাচাইকরণ ব্যবসা", bio: "" },
            { locale: "en", name: "Verification business", bio: "" },
          ],
        },
      },
      select: { id: true },
    });
    providerId = profile.id;
    await prisma.providerCapability.createMany({
      data: [
        {
          providerId,
          sectorSlug: "construction",
          kind: "CONSTRUCTION_SERVICE",
          status: "APPROVED",
        },
        {
          providerId,
          sectorSlug: "construction",
          kind: "CONSTRUCTION_MATERIAL",
          status: "APPROVED",
        },
      ],
    });
  });

  it("keeps contractor and supplier approvals separate, versioned, and expiring", async () => {
    await expectWorkflowError(
      marketplace.createProviderListing(providerUserId, listingInput("CONSTRUCTION_SERVICE")),
      "notAllowed",
    );
    const supplier = await verification.submitProviderVerification(
      providerUserId,
      submission("SUPPLIER", 1),
    );
    await approve(supplier.id);
    const materialListing = await marketplace.createProviderListing(
      providerUserId,
      listingInput("CONSTRUCTION_MATERIAL"),
    );
    listingIds.push(materialListing.id);
    await prisma.marketplaceListing.update({
      where: { id: materialListing.id },
      data: { isPublished: true, moderationStatus: "APPROVED" },
    });

    await expectWorkflowError(
      marketplace.createProviderListing(providerUserId, listingInput("CONSTRUCTION_SERVICE")),
      "notAllowed",
    );

    const contractorV1 = await verification.submitProviderVerification(
      providerUserId,
      submission("CONTRACTOR", 1),
    );
    await verification.reviewProviderVerification(reviewerUserId, {
      applicationId: contractorV1.id,
      decision: "CHANGES_REQUESTED",
      reviewNote: "Please provide a clearer professional credential.",
      documentDecisions: [],
    });
    const contractorV2 = await verification.submitProviderVerification(
      providerUserId,
      submission("CONTRACTOR", 2),
    );
    expect(contractorV2.id).toBe(contractorV1.id);
    expect(
      await prisma.providerVerificationApplicationVersion.count({
        where: { applicationId: contractorV1.id },
      }),
    ).toBe(2);
    await approve(contractorV2.id);

    const serviceListing = await marketplace.createProviderListing(
      providerUserId,
      listingInput("CONSTRUCTION_SERVICE"),
    );
    listingIds.push(serviceListing.id);
    await prisma.marketplaceListing.update({
      where: { id: serviceListing.id },
      data: { isPublished: true, moderationStatus: "APPROVED" },
    });
    const publicServiceListing = await listings.getPublicListing(serviceListing.id);
    expect(publicServiceListing.listing?.id).toBe(serviceListing.id);

    await prisma.providerVerificationApplication.update({
      where: { id: contractorV2.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expectWorkflowError(
      marketplace.createProviderListing(providerUserId, listingInput("CONSTRUCTION_SERVICE")),
      "notAllowed",
    );
    await expectWorkflowError(
      marketplace.createMarketplaceRequest(customerUserId, {
        listingId: serviceListing.id,
        quantity: "1",
        district: "Dhaka",
        details: "An expired verification should block a new construction booking.",
        requestedStart: "2027-01-01",
        requestedEnd: "2027-01-02",
      }),
      "notAllowed",
    );

    const market = await listings.getConstructionMarketListings({ kind: "CONSTRUCTION_SERVICE" });
    expect(market.items.some((item) => item.id === serviceListing.id)).toBe(false);
    const publicExpiredListing = await listings.getPublicListing(serviceListing.id);
    expect(publicExpiredListing.listing).toBeNull();
    const publicProvider = await listings.getPublicProviderProfile("construction", providerId);
    expect(publicProvider.provider?.verifications.map(({ type }) => type)).toEqual(["SUPPLIER"]);
    const supplierMarket = await listings.getConstructionMarketListings({
      kind: "CONSTRUCTION_MATERIAL",
    });
    expect(supplierMarket.items.some((item) => item.id === materialListing.id)).toBe(true);
  });

  afterAll(async () => {
    await prisma.marketplaceListing.deleteMany({ where: { id: { in: listingIds } } });
    await prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.providerCapability.deleteMany({ where: { providerId } });
    await prisma.providerProfile.deleteMany({ where: { id: providerId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (previousEnforcement === undefined) delete process.env.CONSTRUCTION_VERIFICATION_ENFORCED;
    else process.env.CONSTRUCTION_VERIFICATION_ENFORCED = previousEnforcement;
    await prisma.$disconnect();
  });
});
