import { NextResponse } from "next/server";

import { getCurrentUser, hasStaffPermission } from "@/lib/dal";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/storage/s3";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  const user = await getCurrentUser();
  if (!user || user.status !== "active" || !user.emailVerified)
    return new NextResponse(null, { status: 404 });

  const document = await prisma.providerVerificationDocument.findUnique({
    where: { id: documentId },
    select: {
      storageKey: true,
      application: { select: { provider: { select: { userId: true } } } },
    },
  });
  if (!document) return new NextResponse(null, { status: 404 });
  const isOwner = document.application.provider.userId === user.id;
  const isConstructionReviewer = await hasStaffPermission(user, "OPERATIONS", "construction");
  if (!isOwner && !isConstructionReviewer) return new NextResponse(null, { status: 404 });

  if (!isOwner) {
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "provider_verification.document_accessed",
        entityType: "provider_verification_document",
        entityId: documentId,
      },
    });
  }

  try {
    const url = await createDownloadUrl(document.storageKey, 60);
    if (!url) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    logError("provider_verification.document_signing_failed", error);
    return new NextResponse(null, { status: 503 });
  }
}
