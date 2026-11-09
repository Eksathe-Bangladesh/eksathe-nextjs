import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const channel = process.env.PLAYWRIGHT_CHANNEL === "msedge" ? "msedge" : undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel,
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "node ./node_modules/next/dist/bin/next dev --turbo --hostname 127.0.0.1 --port 3100",
        url: baseURL,
        env: {
          NEXT_DIST_DIR: ".next-e2e-node",
          DATABASE_URL:
            "postgresql://eksathe_test:eksathe_test_password@127.0.0.1:5433/eksathe_test",
          BETTER_AUTH_SECRET: "local-e2e-only-secret-with-at-least-32-bytes",
          BETTER_AUTH_URL: baseURL,
          NEXT_PUBLIC_APP_URL: baseURL,
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          RESEND_API_KEY: "",
          RESEND_FROM: "",
          S3_BUCKET: "",
          S3_REGION: "",
          S3_ACCESS_KEY_ID: "",
          S3_SECRET_ACCESS_KEY: "",
          S3_ENDPOINT: "",
        },
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
