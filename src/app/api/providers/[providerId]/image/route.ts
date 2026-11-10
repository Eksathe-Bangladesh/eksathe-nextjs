import { NextResponse } from "next/server";

import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/storage/s3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params;
  const imageType = new URL(request.url).searchParams.get("type");
  if (imageType !== "profile" && imageType !== "cover")
    return new NextResponse(null, { status: 404 });
  const profile = await prisma.providerProfile.findFirst({
    where: { id: providerId, status: "APPROVED", user: { status: "active" } },
    select: { profileImageKey: true, coverImageKey: true },
  });
  const key = imageType === "profile" ? profile?.profileImageKey : profile?.coverImageKey;
  if (!key) return new NextResponse(null, { status: 404 });
  try {
    const url = await createDownloadUrl(key, 3600);
    if (!url) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=3000, s-maxage=3000, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    logError("provider.image_signing_failed", error);
    return new NextResponse(null, { status: 503 });
  }
}
