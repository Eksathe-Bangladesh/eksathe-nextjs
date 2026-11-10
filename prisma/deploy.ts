import { spawnSync } from "node:child_process";

const dbUrl =
  process.env["DATABASE_URL"] || process.env["POSTGRES_PRISMA_URL"] || process.env["POSTGRES_URL"];

if (!dbUrl) {
  console.warn("⚠️ DATABASE_URL is not set in this environment. Skipping 'prisma migrate deploy'.");
  process.exit(0);
}

const result = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: dbUrl,
  },
});

process.exit(result.status ?? 0);
