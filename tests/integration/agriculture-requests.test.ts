import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

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

const [{ prisma }, agriculture, workspaces] = await Promise.all([
  import("@/lib/prisma"),
  import("@/lib/domain/agriculture-requests"),
  import("@/lib/workspaces"),
]);

const suffix = crypto.randomUUID();
const customerId = `test-agriculture-customer-${suffix}`;
const otherCustomerId = `test-agriculture-other-${suffix}`;
const staffId = `test-agriculture-staff-${suffix}`;
const createdRequestIds: number[] = [];
const currentUser = (id: string, role = "customer") => ({
  id,
  name: id,
  email: `${id}@integration.example`,
  emailVerified: true,
  phone: "+8801700000000",
  role,
  status: "active",
  accountType: "customer",
});

describe("PostgreSQL agriculture service requests", () => {
  beforeAll(async () => {
    await prisma.sector.upsert({
      where: { slug: "agriculture-labor" },
      update: { status: "LIVE" },
      create: {
        slug: "agriculture-labor",
        position: 4,
        icon: "🌾",
        status: "LIVE",
      },
    });
    for (const user of [
      currentUser(customerId),
      currentUser(otherCustomerId),
      currentUser(staffId, "super_admin"),
    ]) {
      await prisma.user.create({ data: user });
    }
    await prisma.serviceDefinition.upsert({
      where: { slug: "crop-farming" },
      update: { isActive: true, formVersion: 1 },
      create: {
        slug: "crop-farming",
        category: "কৃষি",
        sectorSlug: "agriculture-labor",
        isActive: true,
      },
    });
  });

  it("stores versioned answers and snapshots, protects owner access, and tracks staff processing", async () => {
    const result = await agriculture.createAgricultureServiceRequest({
      user: currentUser(customerId),
      serviceSlug: "crop-farming",
      formVersion: 1,
      customerName: "Test customer",
      phone: "+8801700000000",
      district: "Bogura",
      details: "I need help planning crops for the coming season.",
      budget: "1250.50",
      answers: { crop_name: "Rice", land_area: "2 bigha" },
      fieldSnapshot: {
        formVersion: 1,
        fields: [{ name: "crop_name", labelEn: "Crop name", labelBn: "ফসলের নাম", options: [] }],
      },
    });
    createdRequestIds.push(result.id);
    expect(result.referenceCode).toMatch(/^AG-\d{4}-\d{6}$/);

    const customerView = await workspaces.getCustomerAgricultureRequest(customerId, result.id);
    const unauthorizedView = await workspaces.getCustomerAgricultureRequest(
      otherCustomerId,
      result.id,
    );
    expect(customerView?.answers).toEqual({ crop_name: "Rice", land_area: "2 bigha" });
    expect(customerView?.fieldSnapshot).toMatchObject({ formVersion: 1 });
    expect(customerView?.updates).toHaveLength(1);
    expect(unauthorizedView).toBeNull();

    await agriculture.updateAgricultureServiceRequest({
      actor: currentUser(staffId, "super_admin"),
      requestId: result.id,
      status: "REVIEWING",
      assignedToId: staffId,
      publicMessage: "We are checking local availability.",
      publicLocale: "en",
      privateNote: "Verify district service coverage.",
      privateLocale: "en",
    });
    const afterReview = await workspaces.getCustomerAgricultureRequest(customerId, result.id);
    expect(afterReview?.updates.some((update) => update.message?.includes("Verify district"))).toBe(
      false,
    );
    expect(
      afterReview?.updates.some((update) =>
        update.message?.includes("checking local availability"),
      ),
    ).toBe(true);

    await agriculture.updateAgricultureServiceRequest({
      actor: currentUser(staffId, "super_admin"),
      requestId: result.id,
      status: "ASSIGNED",
      assignedToId: staffId,
    });
    await agriculture.updateAgricultureServiceRequest({
      actor: currentUser(staffId, "super_admin"),
      requestId: result.id,
      status: "COMPLETED",
      assignedToId: staffId,
    });
    const completed = await prisma.serviceRequest.findUnique({
      where: { id: result.id },
      select: { status: true },
    });
    expect(completed?.status).toBe("COMPLETED");
    expect(
      await prisma.auditLog.count({
        where: { entityType: "ServiceRequest", entityId: BigInt(result.id) },
      }),
    ).toBeGreaterThanOrEqual(4);
    expect(
      await prisma.notification.count({
        where: { userId: customerId, href: `/account/agriculture-requests/${result.id}` },
      }),
    ).toBe(3);
  });

  it("lets the owner withdraw a new request and rejects access to assigned requests", async () => {
    const result = await agriculture.createAgricultureServiceRequest({
      user: currentUser(customerId),
      serviceSlug: "crop-farming",
      formVersion: 1,
      customerName: "Test customer",
      phone: "+8801700000000",
      district: "Bogura",
      details: "Please advise which crops fit this land.",
      budget: "",
      answers: {},
      fieldSnapshot: { formVersion: 1, fields: [] },
    });
    createdRequestIds.push(result.id);
    await agriculture.withdrawAgricultureServiceRequest(customerId, result.id);
    const request = await prisma.serviceRequest.findUnique({
      where: { id: result.id },
      select: { status: true },
    });
    expect(request?.status).toBe("CANCELLED");
    expect(
      agriculture.withdrawAgricultureServiceRequest(otherCustomerId, result.id),
    ).rejects.toMatchObject({ code: "notFound" });
  });

  afterAll(async () => {
    await prisma.serviceRequest.deleteMany({ where: { id: { in: createdRequestIds } } });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [customerId, otherCustomerId, staffId] } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: [customerId, otherCustomerId, staffId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [customerId, otherCustomerId, staffId] } } });
    await prisma.$disconnect();
  });
});
