import "server-only";
import type {
  AgricultureAccountStatus,
  AgricultureAccountType,
} from "@/lib/agriculture/account-types";
import { prisma } from "@/lib/prisma";

export class AgricultureAdminError extends Error {
  constructor(readonly code: "accountNotFound" | "panelNotFound" | "notAllowed" | "invalidState") {
    super(code);
  }
}

export async function updateAgricultureUser(
  actorId: string,
  userId: string,
  accountType: AgricultureAccountType,
  status: AgricultureAccountStatus,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: userId, role: "customer", staffGrants: { none: {} } },
      select: { id: true },
    });
    if (!user) throw new AgricultureAdminError("accountNotFound");
    await tx.user.update({ where: { id: userId }, data: { accountType, status } });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "agriculture.user_updated",
        entityType: "user",
        entityId: userId,
      },
    });
  });
}

export async function deleteAgricultureUser(actorId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({
      where: { id: userId, role: "customer", staffGrants: { none: {} } },
      select: {
        id: true,
        providerProfile: { select: { id: true } },
        marketplaceRequests: { take: 1, select: { id: true } },
        customerOrders: { take: 1, select: { id: true } },
        constructionProjects: { take: 1, select: { id: true } },
        requests: { take: 1, select: { id: true } },
      },
    });
    if (!user) throw new AgricultureAdminError("accountNotFound");
    if (
      user.providerProfile ||
      user.marketplaceRequests.length ||
      user.customerOrders.length ||
      user.constructionProjects.length ||
      user.requests.length
    ) {
      throw new AgricultureAdminError("invalidState");
    }

    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "agriculture.user_deleted",
        entityType: "user",
        entityId: userId,
      },
    });
    await tx.user.delete({ where: { id: userId } });
  });
}

export async function setAgriculturePanelActive(
  actorId: string,
  panelId: number,
  isActive: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const panel = await tx.serviceDefinition.findFirst({
      where: { id: panelId, sectorSlug: "agriculture-labor" },
      select: { id: true, isActive: true },
    });
    if (!panel) throw new AgricultureAdminError("panelNotFound");
    if (panel.isActive === isActive) return;
    await tx.serviceDefinition.update({
      where: { id: panel.id },
      data: { isActive },
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: isActive ? "agriculture.panel_activated" : "agriculture.panel_deactivated",
        entityType: "service_definition",
        entityId: String(panel.id),
      },
    });
  });
}

export async function updateAgriculturePanel(
  actorId: string,
  panelId: number,
  input: {
    titleBn: string;
    titleEn: string;
    descriptionBn: string;
    descriptionEn: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const panel = await tx.serviceDefinition.findFirst({
      where: { id: panelId, sectorSlug: "agriculture-labor" },
      select: { id: true },
    });
    if (!panel) throw new AgricultureAdminError("panelNotFound");
    await tx.serviceDefinition.update({
      where: { id: panel.id },
      data: input,
    });
    await tx.activityLog.create({
      data: {
        userId: actorId,
        action: "agriculture.panel_updated",
        entityType: "service_definition",
        entityId: String(panel.id),
      },
    });
  });
}
