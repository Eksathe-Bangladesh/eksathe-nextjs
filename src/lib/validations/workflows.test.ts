import { describe, expect, test } from "bun:test";

import { staffGrantSchema } from "@/lib/validations/workflows";

describe("staffGrantSchema", () => {
  test("accepts ecommerce as a scoped staff grant", () => {
    expect(
      staffGrantSchema.safeParse({
        email: "commerce-ops@example.com",
        permission: "OPERATIONS",
        scope: "ecommerce-b2b",
      }).success,
    ).toBe(true);
  });

  test("continues to reject unknown sector scopes", () => {
    expect(
      staffGrantSchema.safeParse({
        email: "commerce-ops@example.com",
        permission: "OPERATIONS",
        scope: "unknown-sector",
      }).success,
    ).toBe(false);
  });
});
