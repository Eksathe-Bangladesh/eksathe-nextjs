import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl)
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated, migrated PostgreSQL test database before running integration tests.",
  );
process.env.DATABASE_URL = testDatabaseUrl;
void mock.module("server-only", () => ({}));

const [{ prisma }, agriculture, publishing] = await Promise.all([
  import("@/lib/prisma"),
  import("@/lib/domain/agriculture-requests"),
  import("@/lib/agriculture/publishing"),
]);

const suffix = crypto.randomUUID();
const customerId = `test-price-customer-${suffix}`;
const otherUserId = `test-price-other-${suffix}`;
const staffId = `test-price-staff-${suffix}`;
const serviceRequestIds: number[] = [];
const priceIds: string[] = [];
const updateIds: string[] = [];
const currentUser = (id: string, role = "customer") => ({
  id,
  name: id,
  email: `${id}@integration.example`,
  emailVerified: true,
  phone: "+8801700000000",
  role,
  status: "active",
});
const today = new Date().toISOString().slice(0, 10);

describe("PostgreSQL agriculture publishing", () => {
  beforeAll(async () => {
    await prisma.sector.upsert({
      where: { slug: "agriculture-labor" },
      update: {},
      create: {
        slug: "agriculture-labor",
        position: 4,
        titleBn: "কৃষি ও শ্রমিক",
        titleEn: "Agriculture & Labor",
        icon: "🌾",
        status: "LIVE",
      },
    });
    for (const user of [
      currentUser(customerId),
      currentUser(otherUserId),
      currentUser(staffId, "super_admin"),
    ])
      await prisma.user.create({ data: user });
    await prisma.serviceDefinition.upsert({
      where: { slug: "daily-market-price" },
      update: { isActive: true, formVersion: 1 },
      create: {
        slug: "daily-market-price",
        titleBn: "দৈনিক বাজারদর",
        titleEn: "Daily market prices",
        category: "কৃষি",
        descriptionBn: "বাজারদর জানান",
        descriptionEn: "Report a market price",
        sectorSlug: "agriculture-labor",
        isActive: true,
      },
    });
  });

  it("publishes reviewed prices and current updates without exposing request contact details", async () => {
    const request = await agriculture.createAgricultureServiceRequest({
      user: currentUser(customerId),
      serviceSlug: "daily-market-price",
      formVersion: 1,
      customerName: "Private test farmer",
      phone: "+8801888888888",
      district: "Bogura",
      details: "Rice price at town market",
      budget: "",
      answers: { product_name: "Rice", market_name: "Town market", reported_price: "52" },
      fieldSnapshot: {
        formVersion: 1,
        fields: [{ name: "product_name", labelBn: "পণ্যের নাম", labelEn: "Product" }],
      },
    });
    serviceRequestIds.push(request.id);

    const queue = await publishing.getAgriculturePublishingWorkspace(
      currentUser(staffId, "super_admin"),
    );
    const queuedRequest = queue.requests.find((item) => item.id === request.id);
    expect(queuedRequest?.answers).toMatchObject({ product_name: "Rice", reported_price: "52" });
    expect(JSON.stringify(queuedRequest)).not.toContain("+8801888888888");

    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "price", {
      productBn: "ধান",
      productEn: "Rice",
      market: "Town market",
      district: "Bogura",
      unit: "kg",
      price: "52.50",
      observedAt: today,
      source: "Reviewed district market submission",
      status: "PUBLISHED",
      sourceRequestId: String(request.id),
    });
    const linkedPrice = await prisma.agricultureMarketPrice.findUniqueOrThrow({
      where: { sourceRequestId: request.id },
      select: { id: true },
    });
    priceIds.push(linkedPrice.id);
    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "price", {
      productBn: "নমুনা",
      productEn: "Draft example",
      market: "Town market",
      district: "Bogura",
      unit: "kg",
      price: "99",
      observedAt: today,
      source: "Internal draft",
      status: "DRAFT",
    });
    const draftPrice = await prisma.agricultureMarketPrice.findFirstOrThrow({
      where: { productEn: "Draft example" },
      select: { id: true },
    });
    priceIds.push(draftPrice.id);
    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "price", {
      productBn: "পুরোনো ধান",
      productEn: "Stale rice",
      market: "Town market",
      district: "Bogura",
      unit: "kg",
      price: "48",
      observedAt: "2025-01-01",
      source: "Old district market report",
      status: "PUBLISHED",
    });
    const stalePrice = await prisma.agricultureMarketPrice.findFirstOrThrow({
      where: { productEn: "Stale rice" },
      select: { id: true },
    });
    priceIds.push(stalePrice.id);

    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "update", {
      kind: "ADVICE",
      titleBn: "সেচ পরামর্শ",
      titleEn: "Irrigation advice",
      bodyBn: "সকালে সেচ দিন।",
      bodyEn: "Irrigate in the morning.",
      source: "Agriculture operations",
      status: "PUBLISHED",
      publishedAt: today,
    });
    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "update", {
      kind: "WEATHER_ALERT",
      titleBn: "পুরোনো সতর্কতা",
      titleEn: "Expired alert",
      bodyBn: "মেয়াদ শেষ।",
      bodyEn: "Expired.",
      source: "BMD",
      status: "PUBLISHED",
      publishedAt: "2025-01-01",
      expiresAt: "2025-01-02",
    });
    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "update", {
      kind: "NEWS",
      titleBn: "ভবিষ্যৎ খবর",
      titleEn: "Future news",
      bodyBn: "পরে প্রকাশিত হবে।",
      bodyEn: "To be published later.",
      source: "Agriculture operations",
      status: "PUBLISHED",
      publishedAt: "2099-01-01",
    });
    const updates = await prisma.agricultureUpdate.findMany({ select: { id: true } });
    updateIds.push(...updates.map((item) => item.id));

    await publishing.saveAgriculturePublication(currentUser(staffId, "super_admin"), "support", {
      phone: "+880 2 0000 0000",
      email: "support@example.org",
      messageBn: "কৃষি সহায়তা",
      messageEn: "Agriculture support",
    });
    const publicInfo = await publishing.getAgriculturePublicInfo();
    expect(publicInfo.unavailable).toBe(false);
    expect(publicInfo.prices).toHaveLength(1);
    expect(publicInfo.prices[0]).toMatchObject({
      productEn: "Rice",
      source: "Reviewed district market submission",
    });
    expect("sourceRequestId" in publicInfo.prices[0]!).toBe(false);
    expect(JSON.stringify(publicInfo.prices)).not.toContain("Private test farmer");
    expect(JSON.stringify(publicInfo.prices)).not.toContain("+8801888888888");
    expect(publicInfo.updates.map((item) => item.titleEn)).toEqual(["Irrigation advice"]);
    expect(publicInfo.support?.email).toBe("support@example.org");
    const afterPublish = await publishing.getAgriculturePublishingWorkspace(
      currentUser(staffId, "super_admin"),
    );
    expect(afterPublish.requests.some((item) => item.id === request.id)).toBe(false);
  });

  it("blocks unapproved staff from publishing and staff members from changing public support settings", async () => {
    expect(
      publishing.saveAgriculturePublication(currentUser(otherUserId), "price", {}),
    ).rejects.toThrow("Permission denied");
    await prisma.staffGrant.create({
      data: {
        userId: otherUserId,
        scopeKey: "agriculture-labor",
        sectorSlug: "agriculture-labor",
        permission: "OPERATIONS",
      },
    });
    expect(
      publishing.saveAgriculturePublication(currentUser(otherUserId, "staff"), "support", {
        phone: "",
        email: "",
        messageBn: "",
        messageEn: "",
      }),
    ).rejects.toThrow("Permission denied");
  });

  afterAll(async () => {
    await prisma.agricultureMarketPrice.deleteMany({ where: { id: { in: priceIds } } });
    await prisma.agricultureUpdate.deleteMany({ where: { id: { in: updateIds } } });
    await prisma.serviceRequest.deleteMany({ where: { id: { in: serviceRequestIds } } });
    await prisma.platformSetting.deleteMany({ where: { key: "agriculture-support" } });
    await prisma.staffGrant.deleteMany({
      where: { userId: { in: [customerId, otherUserId, staffId] } },
    });
    await prisma.activityLog.deleteMany({
      where: { userId: { in: [customerId, otherUserId, staffId] } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: [customerId, otherUserId, staffId] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [customerId, otherUserId, staffId] } } });
    await prisma.$disconnect();
  });
});
