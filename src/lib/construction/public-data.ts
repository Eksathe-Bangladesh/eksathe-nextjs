import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { cacheTags } from "@/lib/cache-tags";
import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";

async function queryConstructionCommissionRate(): Promise<string | null> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.constructionPublic);

  const sector = await prisma.sector.findUnique({
    where: { slug: "construction" },
    select: { commissionRate: true },
  });
  return sector?.commissionRate.toString() ?? null;
}

export async function getConstructionCommissionRate(): Promise<string | null> {
  try {
    return await queryConstructionCommissionRate();
  } catch (error) {
    logError("construction.commission_rate_query_failed", error);
    return null;
  }
}
