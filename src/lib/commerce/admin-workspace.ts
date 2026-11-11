import "server-only";
import { prisma } from "@/lib/prisma";

export async function getCommerceAdminWorkspace({
  canModerateCommerce,
  canManageCategories,
  canManageCoupons,
}: {
  canModerateCommerce: boolean;
  canManageCategories: boolean;
  canManageCoupons: boolean;
}) {
  const [sellers, products, categories, coupons] = await Promise.all([
    canModerateCommerce
      ? prisma.commerceSeller.findMany({
          where: { status: "PENDING" },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
    canModerateCommerce
      ? prisma.commerceProduct.findMany({
          where: { status: "PENDING" },
          include: { seller: { select: { displayName: true } }, category: true },
          orderBy: { createdAt: "asc" },
          take: 100,
        })
      : Promise.resolve([]),
    canManageCategories
      ? prisma.commerceCategory.findMany({ orderBy: { titleEn: "asc" } })
      : Promise.resolve([]),
    canManageCoupons
      ? prisma.commerceCoupon.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
      : Promise.resolve([]),
  ]);
  return { sellers, products, categories, coupons };
}
