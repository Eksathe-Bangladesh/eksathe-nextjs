import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

async function notifyCommerceAdminDecision(
  userId: string,
  titleBn: string,
  titleEn: string,
  href: string,
) {
  await prisma.notification.create({
    data: {
      userId,
      title: titleEn,
      message: titleEn,
      translations: {
        create: [
          { locale: "bn", title: titleBn, message: titleBn },
          { locale: "en", title: titleEn, message: titleEn },
        ],
      },
      href,
    },
  });
}

export async function moderateCommerceProduct(
  adminId: string,
  productId: string,
  status: "APPROVED" | "REJECTED",
) {
  const product = await prisma.commerceProduct.findUnique({
    where: { id: productId },
    select: { id: true, seller: { select: { userId: true } } },
  });
  if (!product) throw new Error("পণ্য পাওয়া যায়নি");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceProduct.updateMany({
      where: { id: productId, status: "PENDING" },
      data: { status },
    });
    if (updated.count !== 1) throw new Error("পণ্যটি আর মডারেশনের অপেক্ষায় নেই");
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: `commerce.product.${status.toLowerCase()}`,
        entityType: "commerce_product",
        entityKey: productId,
      },
    });
  });
  await notifyCommerceAdminDecision(
    product.seller.userId,
    "আপনার পণ্য মডারেশন হয়েছে",
    `Product moderation: ${status.toLowerCase()}`,
    "/dashboard/ecommerce/seller",
  );
}

export async function moderateCommerceSeller(
  adminId: string,
  sellerId: string,
  status: "APPROVED" | "REJECTED",
) {
  const seller = await prisma.commerceSeller.findUnique({
    where: { id: sellerId },
    select: { userId: true },
  });
  if (!seller) throw new Error("বিক্রেতা পাওয়া যায়নি");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceSeller.updateMany({
      where: { id: sellerId, status: "PENDING" },
      data: { status },
    });
    if (updated.count !== 1) throw new Error("বিক্রেতার আবেদন আর পর্যালোচনার অপেক্ষায় নেই");
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: `commerce.seller.${status.toLowerCase()}`,
        entityType: "commerce_seller",
        entityKey: sellerId,
      },
    });
  });
  await notifyCommerceAdminDecision(
    seller.userId,
    "বিক্রেতা আবেদন পর্যালোচনা হয়েছে",
    `Seller application ${status.toLowerCase()}`,
    "/dashboard/ecommerce/seller",
  );
}

export async function createCommerceCategory(
  adminId: string,
  input: { slug: string; titleBn: string; titleEn: string },
) {
  await prisma.$transaction(async (tx) => {
    const category = await tx.commerceCategory.create({ data: input });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "commerce.category.created",
        entityType: "commerce_category",
        entityKey: category.id,
      },
    });
  });
}

export async function setCommerceCategoryActive(
  adminId: string,
  categoryId: string,
  isActive: boolean,
) {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceCategory.updateMany({
      where: { id: categoryId },
      data: { isActive },
    });
    if (updated.count !== 1) throw new Error("ক্যাটাগরি পাওয়া যায়নি");
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "commerce.category.updated",
        entityType: "commerce_category",
        entityKey: categoryId,
      },
    });
  });
}

export async function createCommerceCoupon(
  adminId: string,
  input: {
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: string;
    minimumSpend: string;
    maximumDiscount: string;
    maxUses: string;
    expiresAt: string;
  },
) {
  if (input.discountType === "PERCENT" && Number(input.discountValue) > 100)
    throw new Error("শতকরা ছাড় ১০০-এর বেশি হতে পারবে না");
  await prisma.$transaction(async (tx) => {
    const coupon = await tx.commerceCoupon.create({
      data: {
        code: input.code,
        discountType: input.discountType,
        discountValue: new Prisma.Decimal(input.discountValue),
        minimumSpend: new Prisma.Decimal(input.minimumSpend),
        maximumDiscount: input.maximumDiscount ? new Prisma.Decimal(input.maximumDiscount) : null,
        maxUses: input.maxUses ? Number(input.maxUses) : null,
        expiresAt: input.expiresAt ? new Date(`${input.expiresAt}T23:59:59.999+06:00`) : null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "commerce.coupon.created",
        entityType: "commerce_coupon",
        entityKey: coupon.id,
      },
    });
  });
}

export async function setCommerceCouponActive(
  adminId: string,
  couponId: string,
  isActive: boolean,
) {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceCoupon.updateMany({
      where: { id: couponId },
      data: { isActive },
    });
    if (updated.count !== 1) throw new Error("কুপন পাওয়া যায়নি");
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "commerce.coupon.updated",
        entityType: "commerce_coupon",
        entityKey: couponId,
      },
    });
  });
}
