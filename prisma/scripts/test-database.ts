import "dotenv/config";
import { fileURLToPath } from "node:url";

export const defaultTestDatabaseUrl =
  "postgresql://eksathe_test:eksathe_test_password@localhost:5433/eksathe_test";

export function validateTestDatabaseUrl(value: string, applicationUrls: string[]) {
  const url = new URL(value);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !/(^|_)test($|_)/i.test(name)) {
    throw new Error(
      "TEST_DATABASE_URL must target a PostgreSQL database with 'test' in its name (for example, eksathe_test).",
    );
  }

  function identity(database: URL) {
    const hostname = ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
      ? "localhost"
      : database.hostname;
    return `${hostname}:${database.port || "5432"}/${decodeURIComponent(database.pathname.slice(1))}`;
  }

  if (
    applicationUrls.some((applicationUrl) => identity(new URL(applicationUrl)) === identity(url))
  ) {
    throw new Error("TEST_DATABASE_URL must not point to the application database.");
  }
  return value;
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "setup" && mode !== "test") throw new Error("Usage: test-database.ts <setup|test>");

  const databaseUrl = validateTestDatabaseUrl(
    process.env.TEST_DATABASE_URL || defaultTestDatabaseUrl,
    [process.env.DATABASE_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL].filter(
      (value): value is string => Boolean(value),
    ),
  );
  const cwd = fileURLToPath(new URL("../../", import.meta.url));
  const env = { ...process.env, DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl };

  async function run(command: string[]) {
    const child = Bun.spawn(command, {
      cwd,
      env,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await child.exited;
    if (code !== 0) throw new Error(`${command[0]} exited with code ${code}.`);
  }

  if (mode === "setup") {
    if (databaseUrl === defaultTestDatabaseUrl) {
      await run(["docker", "compose", "--profile", "test", "up", "-d", "--wait", "db-test"]);
    }
    const prisma = [process.execPath, "node_modules/prisma/build/index.js"];
    await run([...prisma, "generate", "--config", "prisma7.config.ts"]);
    await run([...prisma, "migrate", "deploy", "--config", "prisma7.config.ts"]);
    console.log("Test database ready. Run: bun run test:integration");
  } else {
    await run([process.execPath, "test", "./tests/integration"]);
  }
}

if (import.meta.main) {
  await main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Test database command failed.");
    process.exitCode = 1;
  });
}
