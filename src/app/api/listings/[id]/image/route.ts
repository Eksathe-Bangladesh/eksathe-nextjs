import { NextResponse } from "next/server";

import { constructionVerificationIsEnforced } from "@/lib/construction/verification-policy";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/storage/s3";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.marketplaceListing.findFirst({
    where: {
      id,
      isPublished: true,
      archivedAt: null,
      moderationStatus: "APPROVED",
      OR: [
        { kind: { in: ["PRODUCE", "CONSTRUCTION_MATERIAL"] }, stock: { gt: 0 } },
        { kind: { in: ["WORKER", "MACHINERY", "CONSTRUCTION_SERVICE"] } },
      ],
      provider: {
        status: "APPROVED",
        user: { status: "active" },
      },
    },
    select: {
      id: true,
      sectorSlug: true,
      kind: true,
      imageKey: true,
      provider: {
        select: {
          capabilities: { where: { status: "APPROVED" }, select: { sectorSlug: true, kind: true } },
          verificationApplications: {
            where: {
              status: "APPROVED",
              expiresAt: { gt: new Date() },
            },
            select: { type: true },
          },
        },
      },
    },
  });
  const requiresVerification =
    listing?.sectorSlug === "construction" && constructionVerificationIsEnforced();
  const verificationType =
    requiresVerification && listing.kind === "CONSTRUCTION_SERVICE"
      ? "CONTRACTOR"
      : requiresVerification && listing.kind === "CONSTRUCTION_MATERIAL"
        ? "SUPPLIER"
        : null;
  if (
    !listing?.imageKey ||
    !listing.provider.capabilities.some(
      (capability) =>
        capability.sectorSlug === listing.sectorSlug && capability.kind === listing.kind,
    ) ||
    (requiresVerification &&
      (!verificationType ||
        !listing.provider.verificationApplications.some(
          (application) => application.type === verificationType,
        )))
  ) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const isConstruction = listing.sectorSlug === "construction";
    const url = await createDownloadUrl(listing.imageKey, isConstruction ? 60 : 3600);
    if (!url) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        "Cache-Control": isConstruction
          ? "private, no-store"
          : "public, max-age=3000, s-maxage=3000, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    logError("listing.image_signing_failed", error);
    return new NextResponse(null, { status: 503 });
  }
}
