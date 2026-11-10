import { expect, test } from "bun:test";

import { defaultTestDatabaseUrl, validateTestDatabaseUrl } from "./test-database";

test("accepts the isolated default test database", () => {
  expect(
    validateTestDatabaseUrl(defaultTestDatabaseUrl, [
      "postgresql://eksathe:password@localhost:5432/eksathe",
    ]),
  ).toBe(defaultTestDatabaseUrl);
});

test("rejects application databases regardless of credentials or loopback alias", () => {
  expect(() =>
    validateTestDatabaseUrl(defaultTestDatabaseUrl, [
      "postgres://other:password@127.0.0.1:5433/eksathe_test",
    ]),
  ).toThrow("application database");
});

test("requires an explicitly named PostgreSQL test database", () => {
  expect(() => validateTestDatabaseUrl("postgresql://localhost/eksathe", [])).toThrow();
  expect(() => validateTestDatabaseUrl("https://localhost/eksathe_test", [])).toThrow();
});
