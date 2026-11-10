import { describe, expect, it } from "bun:test";

import { providerVerificationSubmissionSchema } from "@/lib/validations/provider-verification";

const base = {
  applicantType: "BUSINESS",
  legalName: "A. Rahman",
  businessName: "Rahman Construction",
  businessAddress: "Dhaka, Bangladesh",
  registrationNumber: "REG-123",
  tradeLicenseNumber: "",
  taxIdentifier: "",
  yearsExperience: "12",
  teamSize: "8",
  specializations: "Masonry, renovation",
  materialCategories: "",
  brands: "",
  serviceAreas: "Dhaka",
  documents: [
    {
      documentType: "PROFESSIONAL_CREDENTIAL",
      storageKey: "provider-verification/profile/CONTRACTOR/user/file.pdf",
      filename: "credential.pdf",
      contentType: "application/pdf",
      sizeBytes: 1200,
    },
  ],
};

describe("provider verification submission validation", () => {
  it("accepts relevant contractor evidence and structured experience data", () => {
    const parsed = providerVerificationSubmissionSchema.safeParse({
      ...base,
      type: "CONTRACTOR",
    });

    expect(parsed.success).toBe(true);
  });

  it("requires business identity and at least one matching supplier document", () => {
    const parsed = providerVerificationSubmissionSchema.safeParse({
      ...base,
      type: "SUPPLIER",
      businessName: "",
      registrationNumber: "",
      documents: [
        {
          ...base.documents[0],
          documentType: "PROFESSIONAL_CREDENTIAL",
        },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain("businessName");
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain(
        "tradeLicenseNumber",
      );
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain("documents");
    }
  });

  it("accepts an individual without business registration details", () => {
    const parsed = providerVerificationSubmissionSchema.safeParse({
      ...base,
      type: "CONTRACTOR",
      applicantType: "INDIVIDUAL",
      businessName: "",
      registrationNumber: "",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unsupported file types and oversized evidence", () => {
    const parsed = providerVerificationSubmissionSchema.safeParse({
      ...base,
      type: "CONTRACTOR",
      documents: [
        {
          ...base.documents[0],
          contentType: "text/plain",
          sizeBytes: 10_000_001,
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });
});
