import { describe, expect, it, mock } from "bun:test";

void mock.module("server-only", () => ({}));

describe("construction verification policy", () => {
  it("maps construction service and material listings to separate verification types", async () => {
    process.env.CONSTRUCTION_VERIFICATION_ENFORCED = "true";
    const policy = await import("@/lib/construction/verification-policy");

    expect(policy.verificationTypeForKind("CONSTRUCTION_SERVICE")).toBe("CONTRACTOR");
    expect(policy.verificationTypeForKind("CONSTRUCTION_MATERIAL")).toBe("SUPPLIER");
    const contractorWhere = policy.verifiedConstructionProviderWhere("CONTRACTOR", new Date(0));
    expect(contractorWhere).toHaveProperty("verificationApplications.some.type", "CONTRACTOR");
    expect(contractorWhere).toHaveProperty(
      "verificationApplications.some.expiresAt.gt",
      new Date(0),
    );
  });

  it("allows a temporary rollout override without changing the default policy", async () => {
    const policy = await import("@/lib/construction/verification-policy");
    delete process.env.CONSTRUCTION_VERIFICATION_ENFORCED;
    expect(policy.constructionVerificationIsEnforced()).toBe(true);
    expect(policy.verifiedConstructionProviderWhere("SUPPLIER", new Date(0))).toHaveProperty(
      "verificationApplications",
    );

    process.env.CONSTRUCTION_VERIFICATION_ENFORCED = "false";
    expect(policy.constructionVerificationIsEnforced()).toBe(false);
    expect(policy.verifiedConstructionProviderWhere("SUPPLIER", new Date(0))).toEqual({});
    delete process.env.CONSTRUCTION_VERIFICATION_ENFORCED;
  });
});
