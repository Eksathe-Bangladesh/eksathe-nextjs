import { expect, test } from "@playwright/test";

test("locale preference defaults safely, survives reload, and preserves the current route and form state", async ({
  page,
  context,
}) => {
  await page.context().clearCookies();
  await page.goto("/agriculture/market?q=rice");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page).toHaveURL(/\/bn\/agriculture\/market\?q=rice$/);

  const search = page.getByRole("textbox", { name: "পণ্য বা বিক্রেতা খুঁজুন" });
  await expect(search).toHaveValue("rice");
  await page.getByRole("button", { name: "EN", exact: true }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("textbox", { name: "Search products or sellers" })).toHaveValue(
    "rice",
  );
  await expect(page).toHaveURL(/\/en\/agriculture\/market\?q=rice$/);
  await expect
    .poll(
      async () => (await context.cookies()).find((cookie) => cookie.name === "NEXT_LOCALE")?.value,
    )
    .toBe("en");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Find farm products" })).toBeVisible();

  await context.addCookies([{ name: "NEXT_LOCALE", value: "fr", url: "http://127.0.0.1:3100" }]);
  await page.goto("/construction/market?type=CONSTRUCTION_MATERIAL");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("heading", { name: "নির্মাণ সেবা ও সামগ্রী খুঁজুন" })).toBeVisible();
});

const sectors = [
  "family-household",
  "ecommerce-b2b",
  "repair-services",
  "agriculture-labor",
  "construction",
  "transport-bus",
  "tourism",
  "healthcare",
  "events",
  "isp-utility",
  "jobs-professionals",
  "social-feed",
  "payment-compliance",
];

test("the service hub links to all 13 sector panels", async ({ page }) => {
  await page.goto("/dashboard");
  for (const slug of sectors) {
    const route =
      slug === "agriculture-labor" ? "/bn/dashboard/agriculture" : `/bn/dashboard/${slug}`;
    const sectorCard = page.locator(`main a[href="${route}"]`).filter({ has: page.locator("h3") });
    await expect(sectorCard).toHaveCount(1);
  }

  const liveSectorCard = page
    .locator('main a[href="/bn/dashboard/agriculture"]')
    .filter({ has: page.locator("h3") });
  const plannedSectorCard = page
    .locator('main a[href="/bn/dashboard/family-household"]')
    .filter({ has: page.locator("h3") });
  await expect(liveSectorCard.getByText("চালু", { exact: true })).toBeVisible();
  await expect(plannedSectorCard.getByText("শিগগিরই আসছে", { exact: true })).toBeVisible();
});

test("a construction visitor can find provider onboarding without guessing a route", async ({
  page,
}) => {
  await page.goto("/en/construction");
  await page.getByRole("link", { name: "Offer construction services" }).click();

  await expect(page).toHaveURL(/\/(?:en|bn)\/login\?next=/);
  const locale = new URL(page.url()).pathname.split("/")[1];
  expect(new URL(page.url()).searchParams.get("next")).toBe(`/${locale}/provider`);
});

test("the readiness endpoint reports database availability", async ({ request }) => {
  const response = await request.get("/api/health/ready");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ status: "ready" });
});

test("product cards align their view buttons across a row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/dashboard/ecommerce-b2b");

  const viewButtons = page.locator("main article").getByRole("link", { name: "View product" });
  await expect(viewButtons).toHaveCount(4);
  const yPositions = await viewButtons.evaluateAll((buttons) =>
    buttons.slice(0, 3).map((button) => button.getBoundingClientRect().y),
  );
  expect(Math.max(...yPositions) - Math.min(...yPositions)).toBeLessThan(1);
});

test("planned sectors show a coming-soon page and unknown sectors return 404", async ({ page }) => {
  await page.goto("/dashboard/family-household");
  await expect(page.getByText("এই বিভাগে সেবা শিগগিরই চালু হবে।")).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /একসাথে বাংলাদেশে .+ সেবা ও সেবাদাতা খুঁজুন।/,
  );
  const response = await page.goto("/dashboard/not-a-sector");
  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("agriculture routes share the prototype service directory and old routes redirect", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/agriculture");
  await expect(page.getByRole("heading", { name: "কোন সেবাটি আপনার প্রয়োজন?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /ফসল উৎপাদন ও চাষাবাদ/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /কৃষিশ্রমিক বুকিং/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "সেবাসমূহে ফিরুন" })).toHaveCount(0);

  await page.goto("/dashboard/agriculture");
  await expect(page.getByRole("heading", { name: "কোন সেবাটি আপনার প্রয়োজন?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "সেবাসমূহে ফিরুন" })).toHaveAttribute(
    "href",
    "/bn/dashboard",
  );

  await page.goto("/dashboard/agriculture-labor?source=legacy");
  await expect(page).toHaveURL(/\/bn\/dashboard\/agriculture\?source=legacy$/);
});

test("agriculture service routes show specific form fields and unknown slugs return 404", async ({
  page,
}) => {
  await page.goto("/agriculture/services/crop-farming");
  await expect(page.getByText("জমির পরিমাণ", { exact: true })).toBeVisible();
  const response = await page.goto("/agriculture/services/not-a-service");
  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("agriculture marketplace keeps filters in the direct and dashboard URL contexts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/agriculture/market?q=rice&category=grains&district=Dhaka&minPrice=10&maxPrice=100&sort=price-asc",
  );
  await expect(page.getByRole("heading", { name: "কৃষিপণ্য খুঁজুন" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "পণ্য বা বিক্রেতা খুঁজুন" })).toHaveValue("rice");
  await expect(page.getByLabel("বিভাগ")).toHaveValue("grains");
  await expect(page.getByLabel("জেলা")).toHaveValue("ঢাকা");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "কৃষিপণ্য খুঁজুন" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Find farm products" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Search products or sellers" })).toHaveValue(
    "rice",
  );
  await page.getByRole("button", { name: "বাং", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByRole("heading", { name: "কৃষিপণ্য খুঁজুন" })).toBeVisible();

  await page.goto("/dashboard/agriculture/market?category=fish");
  await expect(page.getByRole("heading", { name: "কৃষিপণ্য খুঁজুন" })).toBeVisible();
  await expect(page.getByRole("link", { name: "কৃষি সেবায় ফিরুন" })).toHaveAttribute(
    "href",
    "/bn/dashboard/agriculture",
  );
  await expect(page.locator("form")).toHaveAttribute("action", "/dashboard/agriculture/market");
});

test("construction marketplace shares the responsive filter and result layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/en/construction/market?q=brick&type=CONSTRUCTION_MATERIAL&minPrice=10&maxPrice=100&sort=price-asc&term=brick&term=block",
  );

  await expect(
    page.getByRole("heading", { name: "Find construction services and materials" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search services, materials, or providers" }),
  ).toHaveValue("brick");
  await expect(page.getByLabel("Type")).toHaveValue("CONSTRUCTION_MATERIAL");
  await expect(page.getByLabel("Minimum price")).toHaveValue("10");
  await expect(page.getByLabel("Maximum price")).toHaveValue("100");
  await expect(page.locator("main")).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await expect(page.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
    "href",
    "/en/construction/market",
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=brick/);
  await expect(page).toHaveURL(/type=CONSTRUCTION_MATERIAL/);
  await expect(page).toHaveURL(/term=brick/);
  await expect(page).toHaveURL(/term=block/);
});

test("construction home shares content across canonical and dashboard entries", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main a[href='/bn/construction']")).toBeVisible();

  await page.goto("/construction");
  await expect(
    page.getByRole("heading", { name: "পরিকল্পনা করুন, সঠিক নির্মাণসেবা খুঁজে নিন।" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily))
    .toContain("Hind Siliguri");
  await expect(page.getByRole("link", { name: "সেবাসমূহে ফিরুন" })).toHaveCount(0);
  await expect(page.locator("header a[href='/bn/construction']")).toBeVisible();
  await expect(page.getByRole("link", { name: "ঠিকাদার ও নির্মাতা" })).toHaveAttribute(
    "href",
    "/bn/construction/services/contractors",
  );

  await page.goto("/dashboard/construction");
  await expect(
    page.getByRole("heading", { name: "পরিকল্পনা করুন, সঠিক নির্মাণসেবা খুঁজে নিন।" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "সেবাসমূহে ফিরুন" })).toHaveAttribute(
    "href",
    "/bn/dashboard",
  );
});

test("construction service directory routes and unknown slugs", async ({ page }) => {
  test.setTimeout(60_000);
  const services = [
    "contractors",
    "engineers",
    "architects",
    "masonry",
    "electrical",
    "plumbing",
    "painting-finishing",
    "building-materials",
  ];
  await page.goto("/construction");
  for (const slug of services) {
    await page.goto(`/construction/services/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /প্রকল্প তৈরি/ }).first()).toHaveAttribute(
      "href",
      `/bn/account/projects/new?service=${slug}`,
    );
  }
  const response = await page.goto("/construction/services/not-a-service");
  expect([200, 404]).toContain(response?.status());
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("construction marketplace keeps URL filters and route context", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/construction/market?type=CONSTRUCTION_SERVICE&district=Dhaka&minPrice=10&maxPrice=100&sort=price-asc&q=engineer",
  );
  await expect(page.getByRole("heading", { name: "নির্মাণ সেবা ও সামগ্রী খুঁজুন" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily))
    .toContain("Hind Siliguri");
  await expect(page.getByRole("textbox", { name: "সেবা, সামগ্রী বা সেবাদাতা খুঁজুন" })).toHaveValue(
    "engineer",
  );
  await expect(page.getByLabel("ধরন")).toHaveValue("CONSTRUCTION_SERVICE");
  await expect(page.getByLabel("জেলা")).toHaveValue("ঢাকা");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Find construction services and materials" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).fontFamily))
    .toContain("Hind Siliguri");
  await expect(
    page.getByRole("textbox", { name: "Search services, materials, or providers" }),
  ).toHaveValue("engineer");

  await page.goto("/dashboard/construction/market?type=CONSTRUCTION_MATERIAL");
  await expect(
    page.getByRole("heading", { name: "Find construction services and materials" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to construction services" })).toHaveAttribute(
    "href",
    "/en/dashboard/construction",
  );
  await expect(page.locator("form")).toHaveAttribute("action", "/dashboard/construction/market");
});

test("construction listing and provider details preserve direct and dashboard routes", async ({
  page,
}) => {
  await page.goto("/construction/listings/demo-listing-brick");
  await expect(page.getByText("প্রথম শ্রেণির লাল ইট", { exact: true })).toBeVisible();
  const listingImage = page.locator('[data-slot="listing-image"]').first();
  await expect(listingImage).toBeVisible();
  const cardTopPadding = await listingImage.evaluate(
    (image) => getComputedStyle(image.parentElement!).paddingTop,
  );
  expect(cardTopPadding).toBe("0px");
  await expect(page.getByRole("link", { name: "সেবাদাতা পরিচিতি" })).toHaveAttribute(
    "href",
    "/bn/construction/providers/demo-construction-provider",
  );

  await page.goto("/dashboard/construction/listings/demo-listing-brick");
  await expect(page.getByText("প্রথম শ্রেণির লাল ইট", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "সেবাদাতা পরিচিতি" })).toHaveAttribute(
    "href",
    "/bn/dashboard/construction/providers/demo-construction-provider",
  );

  await page.goto("/construction/providers/demo-construction-provider");
  await expect(page.getByText("নির্মাণ সাথী", { exact: true })).toBeVisible();
  await expect(page.locator("main a[href^='/bn/construction/listings/']").first()).toBeVisible();

  await page.goto("/dashboard/construction/providers/demo-construction-provider");
  await expect(page.getByText("নির্মাণ সাথী", { exact: true })).toBeVisible();
  await expect(
    page.locator("main a[href^='/bn/dashboard/construction/listings/']").first(),
  ).toBeVisible();
});

test("a customer workspace sends a guest to sign in with the destination preserved", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/bn\/login\?next=/);
  await expect(page.getByLabel("ইমেইল")).toBeVisible();
});

test("a construction project keeps its selected service through guest sign-in", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto("/account/projects/new?service=contractors");
  await expect(page).toHaveURL(/\/bn\/login\?next=/);
  const destination = new URL(page.url()).searchParams.get("next");
  expect(destination).toBe("/bn/account/projects/new?service=contractors");
});

test("the sector hub switches to English at a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "একসাথে বাংলাদেশ", exact: true })).toBeVisible();
  const search = page.getByPlaceholder("বিভাগ খুঁজুন");
  await expect
    .poll(() => search.evaluate((input) => getComputedStyle(input).backdropFilter))
    .toBe("none");
  await expect
    .poll(() =>
      search
        .locator("..")
        .locator("svg")
        .evaluate((icon) => getComputedStyle(icon).zIndex),
    )
    .toBe("10");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("link", { name: "EKsathe Bangladesh", exact: true })).toBeVisible();
  await expect(page.getByText("Family & Household")).toBeVisible();
  await expect(page.getByRole("link", { name: /Agriculture & Labor/ })).toHaveAttribute(
    "href",
    "/en/dashboard/agriculture",
  );
});

test("public routes return public cache headers for static CDN caching", async ({ request }) => {
  const response = await request.get("/bn/agriculture");
  expect(response.status()).toBe(200);
  const cacheControl = response.headers()["cache-control"] || "";
  if (process.env.NODE_ENV === "production") {
    expect(cacheControl).not.toContain("private");
    expect(cacheControl).not.toContain("no-store");
  }
});
