import { expect, test, type Page } from "@playwright/test";

const demoPassword = "Demo-only-123!";

async function signIn(page: Page, email: string) {
  await page.goto("/en/login");
  await page.waitForLoadState("networkidle");
  const emailField = page.getByLabel("Email address");
  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);
  await page.getByLabel("Password").fill(demoPassword);
  await expect(emailField).toHaveValue(email);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account(?:\?|$)/, { timeout: 15_000 });
}

test("a customer sees their account, can search provider districts, and cannot open administration", async ({
  page,
}) => {
  await signIn(page, "demo.buyer@example.com");

  await expect(page.getByRole("heading", { name: "Welcome, Demo Buyer" })).toBeVisible();
  await expect(
    page.locator("#orders").getByText("Fresh Savar Aman Rice", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/en/account/projects/demo-project-family-home"]'),
  ).toBeVisible();

  await page.getByRole("button", { name: /Demo Buyer/ }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Account type")).toBeVisible();
  await expect(menu.getByText("Customer", { exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "My requests" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Service orders" })).toHaveAttribute(
    "href",
    "/en/account#orders",
  );
  await expect(menu.getByRole("menuitem", { name: "Product orders" })).toHaveAttribute(
    "href",
    "/en/dashboard/ecommerce/orders",
  );
  await expect(menu.getByRole("menuitem", { name: "My projects" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Become a provider" })).toBeVisible();

  await page.goto("/bn/provider");
  const district = page.getByLabel("জেলা", { exact: true });
  await district.fill("রং");
  await page.getByRole("option", { name: "রংপুর", exact: true }).click();
  await expect(district).toHaveValue("রংপুর");
  await expect
    .poll(() =>
      page
        .locator("form")
        .evaluate((form) => new FormData(form as HTMLFormElement).get("district")),
    )
    .toBe("Rangpur");

  await page.goto("/en/dashboard");
  await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await page.goto("/en/dashboard/ecommerce-b2b?q=rice");
  await expect(page).toHaveURL(/\/en\/dashboard\/ecommerce\?q=rice$/);
  await expect(page.getByRole("heading", { name: "Product marketplace" })).toBeVisible();

  await page.goto("/en/admin/ecommerce-b2b");
  await expect(page).toHaveURL(/\/en\/admin\/ecommerce$/);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("a construction provider sees their requests and engaged project, not agriculture orders", async ({
  page,
}) => {
  await signIn(page, "demo.builder@example.com");
  await page.getByRole("button", { name: /Demo Construction/ }).click();
  const accountMenu = page.getByRole("menu");
  await expect(accountMenu.getByText("Provider access")).toBeVisible();
  await expect(accountMenu.getByText(/Provider profile:/)).toBeVisible();
  await expect(accountMenu.getByRole("menuitem", { name: "Provider workspace" })).toBeVisible();

  await page.goto("/en/provider");

  await expect(page.getByRole("heading", { name: "Provider workspace" })).toBeVisible();
  await expect(page.getByText(/Nirman Sathi/)).toBeVisible();
  await expect(
    page.getByText("Quote for 80 bags including delivery to the Dhanmondi site."),
  ).toBeVisible();
  await expect(page.getByText("Fresh Savar Aman Rice", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Demo Buyer", { exact: true })).toBeVisible();
});

test("construction operations and finance remain sector-scoped", async ({ page }) => {
  await signIn(page, "demo.construction.ops@example.com");
  await page.goto("/en/admin");

  await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
  await expect(page.getByText("Your sectors: construction")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment confirmations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Commission due" })).toBeVisible();
  await expect(page.getByText("Agriculture intake", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Fresh Savar Aman Rice", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Manage staff", { exact: true })).toHaveCount(0);
  await page.goto("/en/admin/ecommerce");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await page.goto("/en/admin/agriculture/management");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await page.goto("/en/account/projects/demo-project-family-home");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("upload preparation requires a session and enforces metadata and project ownership", async ({
  page,
  request,
}) => {
  const payload = {
    purpose: "project-document",
    projectId: "demo-project-family-home",
    contentType: "application/pdf",
    sizeBytes: 1024,
  };

  const guestResponse = await request.post("/api/uploads/presign", { data: payload });
  expect(guestResponse.status()).toBe(401);

  await signIn(page, "demo.construction.ops@example.com");
  const crossProjectResponse = await page.context().request.post("/api/uploads/presign", {
    data: payload,
  });
  expect(crossProjectResponse.status()).toBe(404);

  const oversizedResponse = await page.context().request.post("/api/uploads/presign", {
    data: { purpose: "crop-disease-photo", contentType: "image/jpeg", sizeBytes: 5_000_001 },
  });
  expect(oversizedResponse.status()).toBe(400);
});

test("local upload preparation rate limiting rejects the 21st request", async ({ page }) => {
  await signIn(page, "demo.buyer@example.com");
  const api = page.context().request;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await api.post("/api/uploads/presign", { data: {} });
    expect(response.status(), `invalid request ${attempt + 1} should reach validation`).toBe(400);
  }

  const limitedResponse = await api.post("/api/uploads/presign", { data: {} });
  expect(limitedResponse.status()).toBe(429);
  expect(limitedResponse.headers()["retry-after"]).toMatch(/^\d+$/);
});
