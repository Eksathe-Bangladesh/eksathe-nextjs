import { describe, expect, test } from "bun:test";

import {
  createProjectPackageSchema,
  createRequestSchema,
  staffGrantSchema,
} from "@/lib/validations/workflows";

describe("construction workflow validation", () => {
  test("accepts a service package without a redundant kind", () => {
    expect(
      createProjectPackageSchema.safeParse({
        projectId: "project-1",
        label: "Engineering review",
        description: "Review the plans",
        serviceSlug: "engineers",
      }).success,
    ).toBe(true);
  });

  test("allows a single-day booking and rejects an end date before the start", () => {
    const base = {
      listingId: "listing-1",
      quantity: "1",
      district: "Dhaka",
      details: "Site consultation",
    };
    expect(
      createRequestSchema.safeParse({
        ...base,
        requestedStart: "2026-11-27",
        requestedEnd: "2026-11-27",
      }).success,
    ).toBe(true);
    expect(
      createRequestSchema.safeParse({
        ...base,
        requestedStart: "2026-11-28",
        requestedEnd: "2026-11-27",
      }).success,
    ).toBe(false);
  });
});

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
