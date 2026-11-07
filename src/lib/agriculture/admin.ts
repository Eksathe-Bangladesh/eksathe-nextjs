import "server-only";
import { cacheLife, cacheTag } from "next/cache";

import { cacheTags } from "@/lib/cache-tags";
import type { StaffAccess } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const sectorSlug = "agriculture-labor";

export async function getActiveAgricultureServiceCatalog() {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.agriculturePublic);

  const services = await prisma.serviceDefinition.findMany({
    where: { sectorSlug, isActive: true },
    select: {
      slug: true,
      titleBn: true,
      titleEn: true,
      descriptionBn: true,
      descriptionEn: true,
      icon: true,
    },
    orderBy: [{ category: "asc" }, { titleEn: "asc" }],
  });
  return services;
}

export type AgriculturePublicService = Awaited<
  ReturnType<typeof getActiveAgricultureServiceCatalog>
>[number];

export async function getActiveAgricultureService(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(cacheTags.agriculturePublic);

  return prisma.serviceDefinition.findFirst({
    where: { slug, sectorSlug, isActive: true },
    select: {
      slug: true,
      titleBn: true,
      titleEn: true,
      descriptionBn: true,
      descriptionEn: true,
      icon: true,
      formVersion: true,
    },
  });
}

export async function getAgricultureAdminWorkspace(access: StaffAccess) {
  const canManageUsers = access.userManagementSectors.includes(sectorSlug);
  const canManagePanels = access.panelManagementSectors.includes(sectorSlug);
  const canViewReports = access.reportSectors.includes(sectorSlug);

  const [users, panels, requestGroups, commissionTotals] = await Promise.all([
    canManageUsers
      ? prisma.user.findMany({
          where: { role: "customer", staffGrants: { none: {} } },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            accountType: true,
            createdAt: true,
            providerProfile: { select: { id: true } },
            _count: {
              select: {
                marketplaceRequests: true,
                customerOrders: true,
                constructionProjects: true,
                requests: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
    canManagePanels
      ? prisma.serviceDefinition.findMany({
          where: { sectorSlug },
          select: {
            id: true,
            slug: true,
            titleBn: true,
            titleEn: true,
            descriptionBn: true,
            descriptionEn: true,
            isActive: true,
          },
          orderBy: [{ category: "asc" }, { titleEn: "asc" }],
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.serviceRequest.groupBy({
          by: ["status"],
          where: { serviceDefinition: { sectorSlug } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    canViewReports
      ? prisma.commissionRecord.aggregate({
          where: { order: { request: { sectorSlug } } },
          _sum: { amount: true },
          _count: { _all: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    canManageUsers,
    canManagePanels,
    canViewReports,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      accountType: user.accountType,
      createdAt: user.createdAt.toISOString(),
      hasBusinessData:
        Boolean(user.providerProfile) ||
        user._count.marketplaceRequests > 0 ||
        user._count.customerOrders > 0 ||
        user._count.constructionProjects > 0 ||
        user._count.requests > 0,
    })),
    panels,
    report: canViewReports
      ? {
          requestGroups: requestGroups.map((group) => ({
            status: group.status,
            count: group._count._all,
          })),
          commissionCount: commissionTotals?._count._all ?? 0,
          commissionTotal: commissionTotals?._sum.amount?.toString() ?? "0",
        }
      : null,
  };
}

export type AgricultureAdminWorkspace = Awaited<ReturnType<typeof getAgricultureAdminWorkspace>>;
