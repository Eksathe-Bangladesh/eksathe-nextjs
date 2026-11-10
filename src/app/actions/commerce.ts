"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { redirect } from "@/i18n/navigation";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import {
  calculateCouponDiscount,
  commerceAddressSchema,
  commerceIdSchema,
  commerceProductSchema,
  couponSchema,
  quantitySchema,
  wholesaleQuoteSchema,
  wholesaleRequestSchema,
} from "@/lib/commerce-validation";
import { requireSuperAdmin, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

function field(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function redirectCommerce(href: string): Promise<never> {
  return redirect({ href, locale: await getLocale() });
}

function revalidateCommerce() {
  for (const path of [
    "/dashboard/ecommerce-b2b",
    "/dashboard/ecommerce-b2b/seller",
    "/dashboard/ecommerce-b2b/cart",
    "/dashboard/ecommerce-b2b/orders",
    "/dashboard/ecommerce-b2b/wholesale",
    "/admin/ecommerce-b2b",
  ])
    revalidateLocalizedPath(path);
}

const tierPriceListSchema = z
  .array(
    z.object({
      minQty: quantitySchema,
      unitPrice: z
        .string()
        .regex(/^\d{1,10}(?:\.\d{1,2})?$/)
        .refine((value) => Number(value) > 0),
    }),
  )
  .max(20);

function parseTierPrices(raw: string) {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("টিয়ার মূল্য JSON সঠিক নয়");
  }
  const tiers = tierPriceListSchema.parse(value);
  if (new Set(tiers.map((tier) => tier.minQty)).size !== tiers.length)
    throw new Error("প্রতিটি টিয়ার পরিমাণ আলাদা হতে হবে");
  return tiers;
}

async function sellerFor(userId: string) {
  const seller = await prisma.commerceSeller.findUnique({ where: { userId } });
  if (!seller || seller.status !== "APPROVED") throw new Error("অনুমোদিত বিক্রেতা প্রয়োজন");
  return seller;
}

async function notifyCommerce(userId: string, titleBn: string, titleEn: string, href: string) {
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

export async function applyAsCommerceSellerAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/seller");
  const displayName = z.string().trim().min(2).max(120).parse(field(data, "displayName"));
  const existing = await prisma.commerceSeller.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  const seller = existing
    ? await prisma.commerceSeller.update({
        where: { id: existing.id },
        data: { displayName, ...(existing.status === "REJECTED" ? { status: "PENDING" } : {}) },
      })
    : await prisma.commerceSeller.create({ data: { userId: user.id, displayName } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "commerce.seller.applied",
      entityType: "commerce_seller",
      entityKey: seller.id,
    },
  });
  revalidateCommerce();
  await redirectCommerce("/dashboard/ecommerce-b2b/seller?notice=application");
}

export async function createCommerceProductAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/seller");
  const seller = await sellerFor(user.id);
  const product = commerceProductSchema.parse({
    categoryId: field(data, "categoryId"),
    titleBn: field(data, "titleBn"),
    titleEn: field(data, "titleEn"),
    descriptionBn: field(data, "descriptionBn"),
    descriptionEn: field(data, "descriptionEn"),
    unit: field(data, "unit"),
    price: field(data, "price"),
    stock: field(data, "stock"),
    minimumWholesale: field(data, "minimumWholesale"),
  });
  const tierPrices = parseTierPrices(field(data, "tierPrices"));
  if (
    tierPrices.some(
      (tier) =>
        tier.minQty < product.minimumWholesale ||
        new Prisma.Decimal(tier.unitPrice).greaterThan(product.price),
    )
  )
    throw new Error("টিয়ার মূল্য সর্বনিম্ন পাইকারি পরিমাণের নিচে বা নিয়মিত দামের বেশি হতে পারবে না");
  const category = await prisma.commerceCategory.findFirst({
    where: { id: product.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) throw new Error("সক্রিয় ক্যাটাগরি নির্বাচন করুন");
  const created = await prisma.$transaction(async (tx) => {
    const newProduct = await tx.commerceProduct.create({
      data: {
        ...product,
        price: new Prisma.Decimal(product.price),
        sellerId: seller.id,
        status: "PENDING",
        tierPrices: {
          create: tierPrices.map((tier) => ({
            minQty: tier.minQty,
            unitPrice: new Prisma.Decimal(tier.unitPrice),
          })),
        },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "commerce.product.created",
        entityType: "commerce_product",
        entityKey: newProduct.id,
      },
    });
    return newProduct;
  });
  revalidateCommerce();
  await redirectCommerce(`/dashboard/ecommerce-b2b/seller?product=${created.id}`);
}

export async function updateCommerceInventoryAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/seller");
  const seller = await sellerFor(user.id);
  const parsed = z
    .object({ productId: commerceIdSchema, stock: z.coerce.number().int().min(0).max(1_000_000) })
    .parse({ productId: field(data, "productId"), stock: field(data, "stock") });
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceProduct.updateMany({
      where: { id: parsed.productId, sellerId: seller.id },
      data: { stock: parsed.stock },
    });
    if (updated.count !== 1) throw new Error("পণ্য পাওয়া যায়নি");
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "commerce.product.stock_updated",
        entityType: "commerce_product",
        entityKey: parsed.productId,
      },
    });
  });
  revalidateCommerce();
}

export async function updateCommerceProductDetailsAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/seller");
  const seller = await sellerFor(user.id);
  const parsed = z
    .object({
      productId: commerceIdSchema,
      titleBn: z.string().trim().min(1).max(160),
      titleEn: z.string().trim().min(1).max(160),
      descriptionBn: z.string().trim().max(4000),
      descriptionEn: z.string().trim().max(4000),
      unit: z.string().trim().min(1).max(32),
      price: z
        .string()
        .trim()
        .regex(/^\d{1,10}(?:\.\d{1,2})?$/)
        .refine((value) => Number(value) > 0),
      tierPrices: z.string().trim().max(2000),
    })
    .parse({
      productId: field(data, "productId"),
      titleBn: field(data, "titleBn"),
      titleEn: field(data, "titleEn"),
      descriptionBn: field(data, "descriptionBn"),
      descriptionEn: field(data, "descriptionEn"),
      unit: field(data, "unit"),
      price: field(data, "price"),
      tierPrices: field(data, "tierPrices"),
    });
  const tierPrices = parsed.tierPrices ? parseTierPrices(parsed.tierPrices) : null;
  const existing = await prisma.commerceProduct.findFirst({
    where: { id: parsed.productId, sellerId: seller.id },
    select: { minimumWholesale: true },
  });
  if (!existing) throw new Error("পণ্যটি পাওয়া যায়নি");
  if (
    tierPrices?.some(
      (tier) =>
        tier.minQty < existing.minimumWholesale ||
        new Prisma.Decimal(tier.unitPrice).greaterThan(parsed.price),
    )
  )
    throw new Error("টিয়ার মূল্য সর্বনিম্ন পাইকারি পরিমাণের নিচে বা নিয়মিত দামের বেশি হতে পারবে না");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceProduct.updateMany({
      where: { id: parsed.productId, sellerId: seller.id },
      data: {
        titleBn: parsed.titleBn,
        titleEn: parsed.titleEn,
        descriptionBn: parsed.descriptionBn,
        descriptionEn: parsed.descriptionEn,
        unit: parsed.unit,
        price: new Prisma.Decimal(parsed.price),
        status: "PENDING",
      },
    });
    if (updated.count !== 1) throw new Error("পণ্যটি পাওয়া যায়নি");
    if (tierPrices) {
      await tx.commerceTierPrice.deleteMany({ where: { productId: parsed.productId } });
      await tx.commerceTierPrice.createMany({
        data: tierPrices.map((tier) => ({
          productId: parsed.productId,
          minQty: tier.minQty,
          unitPrice: new Prisma.Decimal(tier.unitPrice),
        })),
      });
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "commerce.product.updated",
        entityType: "commerce_product",
        entityKey: parsed.productId,
      },
    });
  });
  revalidateCommerce();
}

export async function addCommerceCartItemAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/cart");
  const parsed = z
    .object({ productId: commerceIdSchema, quantity: quantitySchema })
    .parse({ productId: field(data, "productId"), quantity: field(data, "quantity") });
  const product = await prisma.commerceProduct.findFirst({
    where: {
      id: parsed.productId,
      status: "APPROVED",
      seller: { status: "APPROVED" },
      category: { isActive: true },
    },
    select: { id: true, stock: true },
  });
  if (!product || product.stock < parsed.quantity) throw new Error("পর্যাপ্ত মজুত নেই");
  await prisma.commerceCartItem.upsert({
    where: { userId_productId: { userId: user.id, productId: product.id } },
    update: { quantity: parsed.quantity },
    create: { userId: user.id, productId: product.id, quantity: parsed.quantity },
  });
  revalidateCommerce();
}

export async function removeCommerceCartItemAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/cart");
  const productId = commerceIdSchema.parse(field(data, "productId"));
  await prisma.commerceCartItem.deleteMany({ where: { userId: user.id, productId } });
  revalidateCommerce();
}

export async function toggleCommerceWishlistAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b");
  const productId = commerceIdSchema.parse(field(data, "productId"));
  const existing = await prisma.commerceWishlistItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.commerceWishlistItem.delete({ where: { id: existing.id } });
    revalidateLocalizedPath("/dashboard/ecommerce-b2b");
    revalidateLocalizedPath("/dashboard/ecommerce-b2b/wishlist");
    return;
  }
  const product = await prisma.commerceProduct.findFirst({
    where: {
      id: productId,
      status: "APPROVED",
      seller: { status: "APPROVED" },
      category: { isActive: true },
    },
    select: { id: true },
  });
  if (!product) throw new Error("পণ্য পাওয়া যায়নি");
  await prisma.commerceWishlistItem.create({ data: { userId: user.id, productId } });
  revalidateLocalizedPath("/dashboard/ecommerce-b2b");
}

export async function saveCommerceAddressAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/cart");
  const address = commerceAddressSchema.parse({
    fullName: field(data, "fullName"),
    phone: field(data, "phone"),
    district: field(data, "district"),
    city: field(data, "city"),
    addressLine: field(data, "addressLine"),
    postalCode: field(data, "postalCode"),
  });
  await prisma.$transaction(async (tx) => {
    const makeDefault = field(data, "isDefault") === "on";
    if (makeDefault)
      await tx.commerceAddress.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    const hasAddress = await tx.commerceAddress.count({ where: { userId: user.id } });
    await tx.commerceAddress.create({
      data: { ...address, userId: user.id, isDefault: makeDefault || hasAddress === 0 },
    });
  });
  revalidateCommerce();
  await redirectCommerce("/dashboard/ecommerce-b2b/cart?notice=address");
}

export async function checkoutCommerceCartAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/cart");
  const input = z
    .object({
      addressId: commerceIdSchema,
      paymentMethod: z.enum(["CASH_ON_DELIVERY", "MOBILE_WALLET", "BANK_TRANSFER"]),
      couponCode: z.string().trim().toUpperCase().max(32),
    })
    .parse({
      addressId: field(data, "addressId"),
      paymentMethod: field(data, "paymentMethod"),
      couponCode: field(data, "couponCode"),
    });
  const address = await prisma.commerceAddress.findFirst({
    where: { id: input.addressId, userId: user.id },
  });
  if (!address) throw new Error("নিজের ডেলিভারি ঠিকানা নির্বাচন করুন");
  const checkoutGroup = crypto.randomUUID();
  const createdOrders = await prisma.$transaction(
    async (tx) => {
      const cart = await tx.commerceCartItem.findMany({
        where: { userId: user.id },
        include: {
          product: {
            include: {
              seller: true,
              category: true,
              tierPrices: { orderBy: { minQty: "desc" } },
            },
          },
        },
        orderBy: { id: "asc" },
      });
      if (!cart.length) throw new Error("কার্ট খালি");
      for (const item of cart) {
        if (
          item.product.status !== "APPROVED" ||
          item.product.seller.status !== "APPROVED" ||
          !item.product.category.isActive
        )
          throw new Error("কার্টের একটি পণ্য আর কেনার জন্য উপলভ্য নেই");
        if (item.product.seller.userId === user.id) throw new Error("নিজের পণ্য নিজে কেনা যাবে না");
        if (item.quantity > item.product.stock)
          throw new Error("মজুত পরিবর্তিত হয়েছে; কার্ট হালনাগাদ করুন");
      }

      const effectiveUnitPrice = (item: (typeof cart)[number]) =>
        item.product.tierPrices.find((price) => item.quantity >= price.minQty)?.unitPrice ??
        item.product.price;
      const subtotal = cart.reduce(
        (sum, item) => sum.plus(effectiveUnitPrice(item).mul(item.quantity)),
        new Prisma.Decimal(0),
      );
      let discount = new Prisma.Decimal(0);
      let coupon: { id: string; code: string; maxUses: number | null } | null = null;
      if (input.couponCode) {
        const foundCoupon = await tx.commerceCoupon.findUnique({
          where: { code: input.couponCode },
        });
        const now = new Date();
        if (
          !foundCoupon ||
          !foundCoupon.isActive ||
          !["PERCENT", "FIXED"].includes(foundCoupon.discountType) ||
          (foundCoupon.startsAt && foundCoupon.startsAt > now) ||
          (foundCoupon.expiresAt && foundCoupon.expiresAt <= now) ||
          subtotal.lessThan(foundCoupon.minimumSpend) ||
          (foundCoupon.discountType === "PERCENT" && foundCoupon.discountValue.greaterThan(100))
        )
          throw new Error("কুপনটি প্রযোজ্য নয়");
        if (
          await tx.commerceCouponUse.findUnique({
            where: { couponId_userId: { couponId: foundCoupon.id, userId: user.id } },
          })
        )
          throw new Error("এই কুপনটি আগে ব্যবহার করা হয়েছে");
        if (foundCoupon.maxUses !== null && foundCoupon.usedCount >= foundCoupon.maxUses)
          throw new Error("কুপনের ব্যবহারসীমা শেষ");
        discount = new Prisma.Decimal(
          calculateCouponDiscount(
            subtotal.toFixed(2),
            foundCoupon.discountType as "PERCENT" | "FIXED",
            foundCoupon.discountValue.toFixed(2),
            foundCoupon.maximumDiscount?.toFixed(2),
          ),
        );
        coupon = foundCoupon;
      }

      const grouped = new Map<string, typeof cart>();
      for (const item of cart) {
        const sellerItems = grouped.get(item.product.sellerId) ?? [];
        sellerItems.push(item);
        grouped.set(item.product.sellerId, sellerItems);
      }
      let allocated = new Prisma.Decimal(0);
      const sellerEntries = [...grouped.entries()];
      const orders = [];
      for (const [index, [sellerId, items]] of sellerEntries.entries()) {
        const sellerSubtotal = items.reduce(
          (sum, item) => sum.plus(effectiveUnitPrice(item).mul(item.quantity)),
          new Prisma.Decimal(0),
        );
        const sellerDiscount =
          index === sellerEntries.length - 1
            ? discount.minus(allocated)
            : subtotal.greaterThan(0)
              ? discount
                  .mul(sellerSubtotal)
                  .div(subtotal)
                  .toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN)
              : new Prisma.Decimal(0);
        allocated = allocated.plus(sellerDiscount);
        const order = await tx.commerceOrder.create({
          data: {
            checkoutGroup,
            buyerId: user.id,
            sellerId,
            addressSnapshot: {
              fullName: address.fullName,
              phone: address.phone,
              district: address.district,
              city: address.city,
              addressLine: address.addressLine,
              postalCode: address.postalCode,
            },
            paymentMethod: input.paymentMethod,
            subtotal: sellerSubtotal,
            discount: sellerDiscount,
            total: sellerSubtotal.minus(sellerDiscount),
            couponCode: coupon?.code,
            items: {
              create: items.map((item) => {
                const unitPrice = effectiveUnitPrice(item);
                return {
                  productId: item.product.id,
                  title: item.product.titleEn,
                  unit: item.product.unit,
                  quantity: item.quantity,
                  unitPrice,
                  subtotal: unitPrice.mul(item.quantity),
                };
              }),
            },
          },
        });
        for (const item of items) {
          const stockUpdate = await tx.commerceProduct.updateMany({
            where: {
              id: item.productId,
              status: "APPROVED",
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (stockUpdate.count !== 1) throw new Error("মজুত শেষ; অর্ডার নিশ্চিত করা যায়নি");
        }
        orders.push(order);
      }
      if (coupon) {
        const reserved = await tx.commerceCoupon.updateMany({
          where: {
            id: coupon.id,
            isActive: true,
            ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (reserved.count !== 1) throw new Error("কুপনের ব্যবহারসীমা শেষ");
        await tx.commerceCouponUse.create({
          data: { couponId: coupon.id, userId: user.id, checkoutGroup },
        });
      }
      await tx.commerceCartItem.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "commerce.checkout.created",
          entityType: "commerce_checkout",
          entityKey: checkoutGroup,
        },
      });
      return orders;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  for (const order of createdOrders) {
    const seller = await prisma.commerceOrder.findUnique({
      where: { id: order.id },
      select: { seller: { select: { userId: true } } },
    });
    if (seller)
      await notifyCommerce(
        seller.seller.userId,
        "নতুন অর্ডার এসেছে",
        "You received a new order",
        `/dashboard/ecommerce-b2b/orders/${order.id}`,
      );
  }
  revalidateCommerce();
  await redirectCommerce(`/dashboard/ecommerce-b2b/orders/${createdOrders[0].id}`);
}

export async function createWholesaleRequestAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/wholesale");
  const request = wholesaleRequestSchema.parse({
    productId: field(data, "productId"),
    quantity: field(data, "quantity"),
    district: field(data, "district"),
    note: field(data, "note"),
  });
  const product = await prisma.commerceProduct.findFirst({
    where: {
      id: request.productId,
      status: "APPROVED",
      seller: { status: "APPROVED" },
      minimumWholesale: { lte: request.quantity },
      category: { isActive: true },
    },
    select: { id: true, seller: { select: { userId: true } } },
  });
  if (!product) throw new Error("পণ্যটি বা সর্বনিম্ন পাইকারি পরিমাণ যাচাই করুন");
  if (product.seller.userId === user.id) throw new Error("নিজের পণ্যের জন্য RFQ তৈরি করা যাবে না");
  const created = await prisma.commerceWholesaleRequest.create({
    data: { ...request, buyerId: user.id },
  });
  revalidateCommerce();
  await redirectCommerce(`/dashboard/ecommerce-b2b/wholesale?request=${created.id}`);
}

export async function quoteWholesaleRequestAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/wholesale");
  const seller = await sellerFor(user.id);
  const quote = wholesaleQuoteSchema.parse({
    requestId: field(data, "requestId"),
    unitPrice: field(data, "unitPrice"),
    note: field(data, "note"),
  });
  const request = await prisma.commerceWholesaleRequest.findFirst({
    where: {
      id: quote.requestId,
      status: "OPEN",
      product: { sellerId: seller.id, status: "APPROVED", category: { isActive: true } },
    },
    select: { id: true, buyerId: true },
  });
  if (!request) throw new Error("Այս RFQ-তে দর দেওয়ার অনুমতি নেই");
  if (request.buyerId === user.id) throw new Error("নিজের RFQ-তে দর দেওয়া যাবে না");
  await prisma.$transaction(async (tx) => {
    const savedQuote = await tx.commerceWholesaleQuote.upsert({
      where: { requestId_sellerId: { requestId: request.id, sellerId: seller.id } },
      update: {
        unitPrice: new Prisma.Decimal(quote.unitPrice),
        note: quote.note,
        status: "PENDING",
      },
      create: { ...quote, unitPrice: new Prisma.Decimal(quote.unitPrice), sellerId: seller.id },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "commerce.wholesale.quote_sent",
        entityType: "commerce_wholesale_quote",
        entityKey: savedQuote.id,
      },
    });
  });
  await notifyCommerce(
    request.buyerId,
    "আপনার RFQ-তে নতুন দর এসেছে",
    "A seller sent a quote for your RFQ",
    "/dashboard/ecommerce-b2b/wholesale",
  );
  revalidateCommerce();
  await redirectCommerce(`/dashboard/ecommerce-b2b/wholesale?request=${request.id}`);
}

export async function acceptWholesaleQuoteAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/wholesale");
  const quoteId = commerceIdSchema.parse(field(data, "quoteId"));
  const order = await prisma.$transaction(
    async (tx) => {
      const quote = await tx.commerceWholesaleQuote.findUnique({
        where: { id: quoteId },
        include: {
          request: { include: { product: { include: { seller: true, tierPrices: true } } } },
        },
      });
      if (
        !quote ||
        quote.request.buyerId !== user.id ||
        quote.status !== "PENDING" ||
        quote.request.status !== "OPEN" ||
        quote.sellerId !== quote.request.product.sellerId ||
        quote.request.product.seller.status !== "APPROVED" ||
        (quote.expiresAt && quote.expiresAt <= new Date())
      )
        throw new Error("দরটি আর গ্রহণ করা যাবে না");
      const product = quote.request.product;
      const update = await tx.commerceProduct.updateMany({
        where: {
          id: product.id,
          status: "APPROVED",
          category: { isActive: true },
          stock: { gte: quote.request.quantity },
        },
        data: { stock: { decrement: quote.request.quantity } },
      });
      if (update.count !== 1) throw new Error("পর্যাপ্ত মজুত নেই");
      const unitPrice = quote.unitPrice;
      const subtotal = unitPrice.mul(quote.request.quantity);
      const created = await tx.commerceOrder.create({
        data: {
          checkoutGroup: crypto.randomUUID(),
          buyerId: user.id,
          sellerId: quote.sellerId,
          addressSnapshot: { district: quote.request.district, note: quote.request.note },
          paymentMethod: "OFFLINE_QUOTE",
          status: "CONFIRMED",
          subtotal,
          total: subtotal,
          items: {
            create: {
              productId: product.id,
              title: product.titleEn,
              unit: product.unit,
              quantity: quote.request.quantity,
              unitPrice,
              subtotal,
            },
          },
        },
      });
      await tx.commerceWholesaleQuote.update({
        where: { id: quote.id },
        data: { status: "ACCEPTED" },
      });
      await tx.commerceWholesaleRequest.update({
        where: { id: quote.requestId },
        data: { status: "ACCEPTED" },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "commerce.wholesale.accepted",
          entityType: "commerce_order",
          entityKey: created.id,
        },
      });
      return { id: created.id, sellerUserId: product.seller.userId };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await notifyCommerce(
    order.sellerUserId,
    "RFQ দর গ্রহণ করা হয়েছে",
    "Your wholesale quote was accepted",
    `/dashboard/ecommerce-b2b/orders/${order.id}`,
  );
  revalidateCommerce();
  await redirectCommerce(`/dashboard/ecommerce-b2b/orders/${order.id}`);
}

export async function startCommerceConversationAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/messages");
  const productId = commerceIdSchema.parse(field(data, "productId"));
  const product = await prisma.commerceProduct.findFirst({
    where: {
      id: productId,
      status: "APPROVED",
      seller: { status: "APPROVED" },
      category: { isActive: true },
    },
    select: { id: true, sellerId: true, seller: { select: { userId: true } } },
  });
  if (!product) throw new Error("পণ্য পাওয়া যায়নি");
  if (product.seller.userId === user.id) throw new Error("নিজের পণ্যকে বার্তা পাঠানো যাবে না");
  const thread = await prisma.commerceConversation.upsert({
    where: {
      buyerId_sellerId_productId: {
        buyerId: user.id,
        sellerId: product.sellerId,
        productId,
      },
    },
    update: {},
    create: { buyerId: user.id, productId, sellerId: product.sellerId },
    select: { id: true },
  });
  revalidateCommerce();
  await redirectCommerce(`/dashboard/ecommerce-b2b/messages/${thread.id}`);
}

export async function sendCommerceMessageAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/messages");
  const parsed = z
    .object({ conversationId: commerceIdSchema, body: z.string().trim().min(1).max(2000) })
    .parse({ conversationId: field(data, "conversationId"), body: field(data, "body") });
  const thread = await prisma.commerceConversation.findFirst({
    where: {
      id: parsed.conversationId,
      OR: [{ buyerId: user.id }, { seller: { userId: user.id } }],
    },
    select: { id: true, buyerId: true, seller: { select: { userId: true } } },
  });
  if (!thread) throw new Error("বার্তাটি পাঠানোর অনুমতি নেই");
  await prisma.$transaction([
    prisma.commerceMessage.create({
      data: { ...parsed, authorId: user.id },
    }),
    prisma.commerceConversation.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    }),
  ]);
  const recipient = thread.buyerId === user.id ? thread.seller.userId : thread.buyerId;
  await notifyCommerce(
    recipient,
    "নতুন মার্কেটপ্লেস বার্তা",
    "You have a new marketplace message",
    `/dashboard/ecommerce-b2b/messages/${thread.id}`,
  );
  revalidateCommerce();
}

export async function markCommerceNotificationReadAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/notifications");
  const notificationId = commerceIdSchema.parse(field(data, "notificationId"));
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateLocalizedPath("/dashboard/ecommerce-b2b/notifications");
}

export async function setCommerceOrderStatusAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/orders");
  const parsed = z
    .object({
      orderId: commerceIdSchema,
      status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED"]),
    })
    .parse({ orderId: field(data, "orderId"), status: field(data, "status") });
  const seller = await sellerFor(user.id);
  const order = await prisma.commerceOrder.findFirst({
    where: { id: parsed.orderId, sellerId: seller.id },
    select: { id: true, status: true, buyerId: true },
  });
  const transitions: Record<string, string> = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };
  if (!order || transitions[order.status] !== parsed.status)
    throw new Error("এই অর্ডারের অবস্থা পরিবর্তন করা যাবে না");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceOrder.updateMany({
      where: { id: order.id, sellerId: seller.id, status: order.status },
      data: { status: parsed.status },
    });
    if (updated.count !== 1) throw new Error("অর্ডারের অবস্থা অন্য সেশনে পরিবর্তিত হয়েছে");
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: `commerce.order.${parsed.status.toLowerCase()}`,
        entityType: "commerce_order",
        entityKey: order.id,
      },
    });
  });
  await notifyCommerce(
    order.buyerId,
    "আপনার অর্ডারের অবস্থা হালনাগাদ হয়েছে",
    "Your order status has been updated",
    `/dashboard/ecommerce-b2b/orders/${order.id}`,
  );
  revalidateCommerce();
}

export async function createCommerceReviewAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/orders");
  const parsed = z
    .object({
      orderId: commerceIdSchema,
      productId: commerceIdSchema,
      rating: z.coerce.number().int().min(1).max(5),
      body: z.string().trim().max(1000),
    })
    .parse({
      orderId: field(data, "orderId"),
      productId: field(data, "productId"),
      rating: field(data, "rating"),
      body: field(data, "body"),
    });
  const order = await prisma.commerceOrder.findFirst({
    where: { id: parsed.orderId, buyerId: user.id, status: "DELIVERED" },
    include: { items: { where: { productId: parsed.productId }, select: { productId: true } } },
  });
  if (!order || !order.items.length) throw new Error("ডেলিভারির পর কেনা পণ্যে রিভিউ দিন");
  await prisma.commerceReview.create({
    data: {
      ...parsed,
      reviewerId: user.id,
      sellerId: order.sellerId,
    },
  });
  revalidateCommerce();
}

export async function replyCommerceReviewAction(data: FormData) {
  const user = await requireUser("/dashboard/ecommerce-b2b/seller");
  const seller = await sellerFor(user.id);
  const parsed = z
    .object({ reviewId: commerceIdSchema, reply: z.string().trim().min(1).max(1000) })
    .parse({ reviewId: field(data, "reviewId"), reply: field(data, "reply") });
  const updated = await prisma.commerceReview.updateMany({
    where: { id: parsed.reviewId, sellerId: seller.id },
    data: { reply: parsed.reply },
  });
  if (updated.count !== 1) throw new Error("রিভিউটির উত্তর দেওয়ার অনুমতি নেই");
  revalidateCommerce();
}

export async function moderateCommerceProductAction(data: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = z
    .object({ productId: commerceIdSchema, status: z.enum(["APPROVED", "REJECTED"]) })
    .parse({ productId: field(data, "productId"), status: field(data, "status") });
  const product = await prisma.commerceProduct.findUnique({
    where: { id: parsed.productId },
    select: { id: true, seller: { select: { userId: true } } },
  });
  if (!product) throw new Error("পণ্য পাওয়া যায়নি");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceProduct.updateMany({
      where: { id: parsed.productId, status: "PENDING" },
      data: { status: parsed.status },
    });
    if (updated.count !== 1) throw new Error("পণ্যটি আর মডারেশনের অপেক্ষায় নেই");
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: `commerce.product.${parsed.status.toLowerCase()}`,
        entityType: "commerce_product",
        entityKey: parsed.productId,
      },
    });
  });
  await notifyCommerce(
    product.seller.userId,
    "আপনার পণ্য মডারেশন হয়েছে",
    `Product moderation: ${parsed.status.toLowerCase()}`,
    "/dashboard/ecommerce-b2b/seller",
  );
  revalidateCommerce();
}

export async function moderateCommerceSellerAction(data: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = z
    .object({ sellerId: commerceIdSchema, status: z.enum(["APPROVED", "REJECTED"]) })
    .parse({ sellerId: field(data, "sellerId"), status: field(data, "status") });
  const seller = await prisma.commerceSeller.findUnique({
    where: { id: parsed.sellerId },
    select: { userId: true },
  });
  if (!seller) throw new Error("বিক্রেতা পাওয়া যায়নি");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceSeller.updateMany({
      where: { id: parsed.sellerId, status: "PENDING" },
      data: { status: parsed.status },
    });
    if (updated.count !== 1) throw new Error("বিক্রেতার আবেদন আর পর্যালোচনার অপেক্ষায় নেই");
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: `commerce.seller.${parsed.status.toLowerCase()}`,
        entityType: "commerce_seller",
        entityKey: parsed.sellerId,
      },
    });
  });
  await notifyCommerce(
    seller.userId,
    "বিক্রেতা আবেদন পর্যালোচনা হয়েছে",
    `Seller application ${parsed.status.toLowerCase()}`,
    "/dashboard/ecommerce-b2b/seller",
  );
  revalidateCommerce();
}

export async function createCommerceCategoryAction(data: FormData) {
  const admin = await requireSuperAdmin();
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
  await prisma.$transaction(async (tx) => {
    const category = await tx.commerceCategory.create({ data: parsed });
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "commerce.category.created",
        entityType: "commerce_category",
        entityKey: category.id,
      },
    });
  });
  revalidateCommerce();
}

export async function setCommerceCategoryActiveAction(data: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = z
    .object({ categoryId: commerceIdSchema, isActive: z.enum(["true", "false"]) })
    .parse({ categoryId: field(data, "categoryId"), isActive: field(data, "isActive") });
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceCategory.updateMany({
      where: { id: parsed.categoryId },
      data: { isActive: parsed.isActive === "true" },
    });
    if (updated.count !== 1) throw new Error("ক্যাটাগরি পাওয়া যায়নি");
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "commerce.category.updated",
        entityType: "commerce_category",
        entityKey: parsed.categoryId,
      },
    });
  });
  revalidateCommerce();
}

export async function createCommerceCouponAction(data: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = couponSchema.parse({
    code: field(data, "code"),
    discountType: field(data, "discountType"),
    discountValue: field(data, "discountValue"),
    minimumSpend: field(data, "minimumSpend") || "0",
    maximumDiscount: field(data, "maximumDiscount"),
    maxUses: field(data, "maxUses"),
    expiresAt: field(data, "expiresAt"),
  });
  if (parsed.discountType === "PERCENT" && Number(parsed.discountValue) > 100)
    throw new Error("শতকরা ছাড় ১০০-এর বেশি হতে পারবে না");
  await prisma.$transaction(async (tx) => {
    const coupon = await tx.commerceCoupon.create({
      data: {
        code: parsed.code,
        discountType: parsed.discountType,
        discountValue: new Prisma.Decimal(parsed.discountValue),
        minimumSpend: new Prisma.Decimal(parsed.minimumSpend),
        maximumDiscount: parsed.maximumDiscount ? new Prisma.Decimal(parsed.maximumDiscount) : null,
        maxUses: parsed.maxUses ? Number(parsed.maxUses) : null,
        expiresAt: parsed.expiresAt ? new Date(`${parsed.expiresAt}T23:59:59.999+06:00`) : null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "commerce.coupon.created",
        entityType: "commerce_coupon",
        entityKey: coupon.id,
      },
    });
  });
  revalidateCommerce();
}

export async function setCommerceCouponActiveAction(data: FormData) {
  const admin = await requireSuperAdmin();
  const parsed = z
    .object({ couponId: commerceIdSchema, isActive: z.enum(["true", "false"]) })
    .parse({ couponId: field(data, "couponId"), isActive: field(data, "isActive") });
  await prisma.$transaction(async (tx) => {
    const updated = await tx.commerceCoupon.updateMany({
      where: { id: parsed.couponId },
      data: { isActive: parsed.isActive === "true" },
    });
    if (updated.count !== 1) throw new Error("কুপন পাওয়া যায়নি");
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: "commerce.coupon.updated",
        entityType: "commerce_coupon",
        entityKey: parsed.couponId,
      },
    });
  });
  revalidateCommerce();
}
