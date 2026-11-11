"use server";

import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { commerceIdSchema, couponSchema } from "@/lib/commerce-validation";
import { requireStaff } from "@/lib/dal";
import {
  createCommerceCategory,
  createCommerceCoupon,
  moderateCommerceProduct,
  moderateCommerceSeller,
  setCommerceCategoryActive,
  setCommerceCouponActive,
} from "@/lib/domain/commerce-admin";

function field(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidateCommerceAdmin() {
  for (const path of [
    "/admin",
    "/admin/ecommerce",
    "/dashboard/ecommerce",
    "/dashboard/ecommerce/seller",
    "/dashboard/ecommerce/cart",
    "/dashboard/ecommerce/orders",
    "/dashboard/ecommerce/wholesale",
  ])
    revalidateLocalizedPath(path);
}

export async function moderateCommerceProductAction(data: FormData) {
  const admin = await requireStaff("OPERATIONS", "ecommerce-b2b");
  const parsed = z
    .object({ productId: commerceIdSchema, status: z.enum(["APPROVED", "REJECTED"]) })
    .parse({ productId: field(data, "productId"), status: field(data, "status") });
  await moderateCommerceProduct(admin.id, parsed.productId, parsed.status);
  revalidateCommerceAdmin();
}

export async function moderateCommerceSellerAction(data: FormData) {
  const admin = await requireStaff("OPERATIONS", "ecommerce-b2b");
  const parsed = z
    .object({ sellerId: commerceIdSchema, status: z.enum(["APPROVED", "REJECTED"]) })
    .parse({ sellerId: field(data, "sellerId"), status: field(data, "status") });
  await moderateCommerceSeller(admin.id, parsed.sellerId, parsed.status);
  revalidateCommerceAdmin();
}

export async function createCommerceCategoryAction(data: FormData) {
  const admin = await requireStaff("PANELS", "ecommerce-b2b");
  const parsed = z
    .object({
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9-]{2,48}$/),
      titleBn: z.string().trim().min(1).max(100),
      titleEn: z.string().trim().min(1).max(100),
    })
    .parse({
      slug: field(data, "slug"),
      titleBn: field(data, "titleBn"),
      titleEn: field(data, "titleEn"),
    });
  await createCommerceCategory(admin.id, parsed);
  revalidateCommerceAdmin();
}

export async function setCommerceCategoryActiveAction(data: FormData) {
  const admin = await requireStaff("PANELS", "ecommerce-b2b");
  const parsed = z
    .object({ categoryId: commerceIdSchema, isActive: z.enum(["true", "false"]) })
    .parse({ categoryId: field(data, "categoryId"), isActive: field(data, "isActive") });
  await setCommerceCategoryActive(admin.id, parsed.categoryId, parsed.isActive === "true");
  revalidateCommerceAdmin();
}

export async function createCommerceCouponAction(data: FormData) {
  const admin = await requireStaff("FINANCE", "ecommerce-b2b");
  const parsed = couponSchema.parse({
    code: field(data, "code"),
    discountType: field(data, "discountType"),
    discountValue: field(data, "discountValue"),
    minimumSpend: field(data, "minimumSpend") || "0",
    maximumDiscount: field(data, "maximumDiscount"),
    maxUses: field(data, "maxUses"),
    expiresAt: field(data, "expiresAt"),
  });
  await createCommerceCoupon(admin.id, parsed);
  revalidateCommerceAdmin();
}

export async function setCommerceCouponActiveAction(data: FormData) {
  const admin = await requireStaff("FINANCE", "ecommerce-b2b");
  const parsed = z
    .object({ couponId: commerceIdSchema, isActive: z.enum(["true", "false"]) })
    .parse({ couponId: field(data, "couponId"), isActive: field(data, "isActive") });
  await setCommerceCouponActive(admin.id, parsed.couponId, parsed.isActive === "true");
  revalidateCommerceAdmin();
}
