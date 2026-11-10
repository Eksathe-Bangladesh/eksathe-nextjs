export const instant = false;

import { getLocale } from "next-intl/server";

import {
  createCommerceCategoryAction,
  createCommerceCouponAction,
  moderateCommerceProductAction,
  moderateCommerceSellerAction,
  setCommerceCategoryActiveAction,
  setCommerceCouponActiveAction,
} from "@/app/actions/commerce";
import { requireSuperAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CommerceAdminPage() {
  await requireSuperAdmin();
  const [locale, sellers, products, categories, coupons] = await Promise.all([
    getLocale(),
    prisma.commerceSeller.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.commerceProduct.findMany({
      where: { status: "PENDING" },
      include: { seller: { select: { displayName: true } }, category: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.commerceCategory.findMany({ orderBy: { titleEn: "asc" } }),
    prisma.commerceCoupon.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const bn = locale === "bn";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-primary text-sm">ADMIN • B2B</p>
        <h1 className="text-3xl font-bold">
          {bn ? "ই-কমার্স ও B2B ব্যবস্থাপনা" : "E-Commerce & B2B administration"}
        </h1>
      </header>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">{bn ? "বিক্রেতা আবেদন" : "Seller applications"}</h2>
        <ul className="mt-3 divide-y">
          {sellers.map((seller) => (
            <li key={seller.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{seller.displayName}</p>
                <p className="text-muted-foreground text-sm">
                  {seller.user.name} · {seller.user.email}
                </p>
              </div>
              <div className="flex gap-2">
                {(["APPROVED", "REJECTED"] as const).map((status) => (
                  <form key={status} action={moderateCommerceSellerAction}>
                    <input type="hidden" name="sellerId" value={seller.id} />
                    <input type="hidden" name="status" value={status} />
                    <button className="rounded-md border px-3 py-2 text-sm">
                      {status === "APPROVED"
                        ? bn
                          ? "অনুমোদন"
                          : "Approve"
                        : bn
                          ? "প্রত্যাখ্যান"
                          : "Reject"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
          {!sellers.length && (
            <li className="text-muted-foreground py-3">
              {bn ? "নতুন আবেদন নেই।" : "No pending applications."}
            </li>
          )}
        </ul>
      </section>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">{bn ? "পণ্য মডারেশন" : "Product moderation"}</h2>
        <ul className="mt-3 divide-y">
          {products.map((product) => (
            <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{bn ? product.titleBn : product.titleEn}</p>
                <p className="text-muted-foreground text-sm">
                  {product.seller.displayName} ·{" "}
                  {bn ? product.category.titleBn : product.category.titleEn} · ৳{" "}
                  {product.price.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                {(["APPROVED", "REJECTED"] as const).map((status) => (
                  <form key={status} action={moderateCommerceProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="status" value={status} />
                    <button className="rounded-md border px-3 py-2 text-sm">
                      {status === "APPROVED"
                        ? bn
                          ? "অনুমোদন"
                          : "Approve"
                        : bn
                          ? "প্রত্যাখ্যান"
                          : "Reject"}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
          {!products.length && (
            <li className="text-muted-foreground py-3">
              {bn ? "মডারেশনের অপেক্ষায় পণ্য নেই।" : "No products awaiting moderation."}
            </li>
          )}
        </ul>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">{bn ? "ক্যাটাগরি" : "Categories"}</h2>
          <form action={createCommerceCategoryAction} className="mt-4 grid gap-2">
            <input
              name="slug"
              required
              maxLength={48}
              pattern="[a-z0-9-]{2,48}"
              placeholder="slug"
              className="bg-background rounded-md border px-3 py-2"
            />
            <input
              name="titleBn"
              required
              maxLength={100}
              placeholder={bn ? "বাংলা নাম" : "Bangla title"}
              className="bg-background rounded-md border px-3 py-2"
            />
            <input
              name="titleEn"
              required
              maxLength={100}
              placeholder={bn ? "ইংরেজি নাম" : "English title"}
              className="bg-background rounded-md border px-3 py-2"
            />
            <button className="rounded-md border px-3 py-2">
              {bn ? "ক্যাটাগরি যোগ করুন" : "Add category"}
            </button>
          </form>
          <ul className="mt-4 divide-y">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-2 py-2">
                <span>{bn ? category.titleBn : category.titleEn}</span>
                <form action={setCommerceCategoryActiveAction} className="flex items-center gap-2">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="isActive" value={String(!category.isActive)} />
                  <button className="rounded-md border px-2 py-1 text-xs">
                    {category.isActive
                      ? bn
                        ? "বন্ধ করুন"
                        : "Deactivate"
                      : bn
                        ? "চালু করুন"
                        : "Activate"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">{bn ? "কুপন" : "Coupons"}</h2>
          <form action={createCommerceCouponAction} className="mt-4 grid gap-2 sm:grid-cols-2">
            <input
              name="code"
              required
              maxLength={32}
              placeholder="code"
              className="bg-background rounded-md border px-3 py-2"
            />
            <select name="discountType" className="bg-background rounded-md border px-3 py-2">
              <option value="PERCENT">{bn ? "শতকরা" : "Percent"}</option>
              <option value="FIXED">{bn ? "নির্দিষ্ট অঙ্ক" : "Fixed amount"}</option>
            </select>
            <input
              name="discountValue"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder={bn ? "ছাড়ের পরিমাণ" : "Discount amount"}
              className="bg-background rounded-md border px-3 py-2"
            />
            <input
              name="minimumSpend"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              placeholder={bn ? "ন্যূনতম ক্রয়" : "Minimum spend"}
              className="bg-background rounded-md border px-3 py-2"
            />
            <input
              name="maximumDiscount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder={bn ? "সর্বোচ্চ ছাড় (ঐচ্ছিক)" : "Maximum discount (optional)"}
              className="bg-background rounded-md border px-3 py-2"
            />
            <input
              name="maxUses"
              type="number"
              min="1"
              placeholder={bn ? "ব্যবহারসীমা (ঐচ্ছিক)" : "Use limit (optional)"}
              className="bg-background rounded-md border px-3 py-2"
            />
            <label className="grid gap-1 text-sm sm:col-span-2">
              {bn ? "মেয়াদ শেষ" : "Expires on"}
              <input
                name="expiresAt"
                type="date"
                className="bg-background rounded-md border px-3 py-2"
              />
            </label>
            <button className="rounded-md border px-3 py-2 sm:col-span-2">
              {bn ? "কুপন তৈরি করুন" : "Create coupon"}
            </button>
          </form>
          <ul className="mt-4 divide-y">
            {coupons.map((coupon) => (
              <li key={coupon.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {coupon.code} ·{" "}
                  {coupon.discountType === "PERCENT"
                    ? `${String(coupon.discountValue)}%`
                    : `৳ ${coupon.discountValue.toFixed(2)}`}{" "}
                  · {coupon.usedCount}
                  {coupon.maxUses ? `/${coupon.maxUses}` : ""}
                </span>
                <form action={setCommerceCouponActiveAction} className="flex items-center gap-2">
                  <input type="hidden" name="couponId" value={coupon.id} />
                  <input type="hidden" name="isActive" value={String(!coupon.isActive)} />
                  <button className="rounded-md border px-2 py-1 text-xs">
                    {coupon.isActive ? (bn ? "বন্ধ" : "Disable") : bn ? "চালু" : "Enable"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
