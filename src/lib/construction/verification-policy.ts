import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ProviderVerificationType } from "@/generated/prisma/client";

export function constructionVerificationIsEnforced() {
  return process.env.CONSTRUCTION_VERIFICATION_ENFORCED !== "false";
}

export function verificationTypeForKind(
  kind: "CONSTRUCTION_SERVICE" | "CONSTRUCTION_MATERIAL",
): ProviderVerificationType {
  return kind === "CONSTRUCTION_SERVICE" ? "CONTRACTOR" : "SUPPLIER";
}

export function verifiedConstructionProviderWhere(
  type: ProviderVerificationType,
  asOf: Date,
): Prisma.ProviderProfileWhereInput {
  if (!constructionVerificationIsEnforced()) return {};
  return {
    verificationApplications: {
      some: {
        type,
        status: "APPROVED",
        expiresAt: { gt: asOf },
      },
    },
  };
}

export function verifiedConstructionListingWhere(
  kind: "CONSTRUCTION_SERVICE" | "CONSTRUCTION_MATERIAL",
  asOf: Date,
): Prisma.MarketplaceListingWhereInput {
  return {
    kind,
    ...(!constructionVerificationIsEnforced()
      ? {}
      : {
          provider: verifiedConstructionProviderWhere(verificationTypeForKind(kind), asOf),
        }),
  };
}

export async function isConstructionProviderVerified(
  tx: Prisma.TransactionClient,
  providerId: string,
  kind: "CONSTRUCTION_SERVICE" | "CONSTRUCTION_MATERIAL",
) {
  if (!constructionVerificationIsEnforced()) return true;
  const verification = await tx.providerVerificationApplication.findFirst({
    where: {
      providerId,
      type: verificationTypeForKind(kind),
      status: "APPROVED",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(verification);
}
