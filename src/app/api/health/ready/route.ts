import { logError } from "@/lib/logging";
import { prisma } from "@/lib/prisma";

// Deliberate block: Health check route must query the database live for current readiness status.
export const instant = false;

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logError("health.readiness_failed", error);
    return Response.json(
      { status: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
