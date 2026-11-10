import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createUploadUrl } from "@/lib/storage/s3";
import { uploadPresignSchema } from "@/lib/validations/workflows";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 });
  if (user.status !== "active")
    return NextResponse.json({ error: "This account cannot upload files." }, { status: 403 });
  if (!user.emailVerified)
    return NextResponse.json(
      { error: "Verify your email before uploading files." },
      { status: 403 },
    );

  const limit = await enforceRateLimit("uploads", user.id, 20, 600);
  if (!limit.available)
    return NextResponse.json(
      { error: "Upload preparation is temporarily unavailable." },
      { status: 503 },
    );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }
  const parsed = uploadPresignSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "The file details are invalid." }, { status: 400 });

  let key: string;
  if (parsed.data.purpose === "provider-verification-document") {
    const capabilityKind =
      parsed.data.verificationType === "CONTRACTOR"
        ? "CONSTRUCTION_SERVICE"
        : "CONSTRUCTION_MATERIAL";
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        capabilities: {
          where: { sectorSlug: "construction", kind: capabilityKind },
          select: { id: true },
        },
      },
    });
    if (!profile || !profile.capabilities.length)
      return NextResponse.json(
        { error: "Apply for the matching construction capability before uploading evidence." },
        { status: 403 },
      );
    key = `provider-verification/${profile.id}/${parsed.data.verificationType}/${user.id}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;
  } else if (parsed.data.purpose === "listing-image") {
    const expectedSector = parsed.data.kind.startsWith("CONSTRUCTION_")
      ? "construction"
      : "agriculture-labor";
    if (parsed.data.sectorSlug !== expectedSector)
      return NextResponse.json({ error: "The listing category is invalid." }, { status: 400 });
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        capabilities: {
          where: { sectorSlug: parsed.data.sectorSlug, kind: parsed.data.kind, status: "APPROVED" },
          select: { id: true },
        },
      },
    });
    if (!profile || profile.status !== "APPROVED" || !profile.capabilities.length) {
      return NextResponse.json(
        { error: "An approved provider capability is required." },
        { status: 403 },
      );
    }
    key = `marketplace/${profile.id}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;
  } else if (parsed.data.purpose === "provider-storefront-image") {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "APPROVED")
      return NextResponse.json(
        { error: "An approved provider profile is required." },
        { status: 403 },
      );
    key = `marketplace/${profile.id}/${parsed.data.imageType}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;
  } else if (parsed.data.purpose === "crop-disease-photo") {
    key = `agriculture-requests/${user.id}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;
  } else if (parsed.data.purpose === "project-photo") {
    const project = await prisma.constructionProject.findFirst({
      where: {
        id: parsed.data.projectId,
        OR: [
          { ownerId: user.id },
          {
            orders: {
              some: {
                provider: { userId: user.id },
                listing: { kind: "CONSTRUCTION_SERVICE" },
                status: { not: "CANCELLED" },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    key = `projects/${project.id}/${user.id}/${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;
  } else {
    if (parsed.data.purpose === "project-document") {
      const project = await prisma.constructionProject.findFirst({
        where: { id: parsed.data.projectId, ownerId: user.id },
        select: { id: true },
      });
      if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      key = `projects/${project.id}/${user.id}/${crypto.randomUUID()}.pdf`;
    } else {
      const order = await prisma.order.findFirst({
        where: {
          id: parsed.data.orderId,
          OR: [{ buyerId: user.id }, { provider: { userId: user.id } }],
        },
        select: { id: true },
      });
      if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      const extension =
        parsed.data.contentType === "application/pdf" ? "pdf" : extensions[parsed.data.contentType];
      key = `payments/${order.id}/${user.id}/${crypto.randomUUID()}.${extension}`;
    }
  }

  try {
    const signed = await createUploadUrl(key, parsed.data.contentType, parsed.data.sizeBytes);
    if (!signed)
      return NextResponse.json({ error: "File storage is not configured." }, { status: 503 });
    return NextResponse.json({ key, url: signed.url, expiresIn: signed.expiresIn });
  } catch (error) {
    logError("upload.presign_failed", error);
    return NextResponse.json({ error: "Could not prepare the file upload." }, { status: 503 });
  }
}
