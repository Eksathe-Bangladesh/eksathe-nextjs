export const instant = false;

import { getLocale } from "next-intl/server";

import {
  applyAsCommerceSellerAction,
  createCommerceProductAction,
  replyCommerceReviewAction,
  updateCommerceProductDetailsAction,
  updateCommerceInventoryAction,
} from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CommerceSellerPage() {
  const [user, locale] = await Promise.all([
    requireUser("/dashboard/ecommerce-b2b/seller"),
    getLocale(),
  ]);
  const [seller, categories] = await Promise.all([
    prisma.commerceSeller.findUnique({ where: { userId: user.id } }),
    prisma.commerceCategory.findMany({ where: { isActive: true }, orderBy: { titleEn: "asc" } }),
  ]);
  const bn = locale === "bn";
  if (!seller || seller.status !== "APPROVED") {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link className="text-primary text-sm" href="/dashboard/ecommerce-b2b">
          {bn ? "← বাজারে ফিরুন" : "← Marketplace"}
        </Link>
        <section className="bg-card mt-5 rounded-2xl border p-6">
          <h1 className="text-2xl font-bold">
            {bn ? "বিক্রেতা হিসেবে আবেদন" : "Apply to become a seller"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {seller
              ? bn
                ? `আপনার আবেদনের অবস্থা: ${seller.status === "PENDING" ? "পর্যালোচনাধীন" : "পুনরায় জমা দিন"}।`
                : `Application status: ${seller.status.toLowerCase()}.`
              : bn
                ? "পণ্য প্রকাশের আগে প্রশাসকের অনুমোদন প্রয়োজন।"
                : "An administrator must approve your seller profile before listings can be published."}
          </p>
          <form action={applyAsCommerceSellerAction} className="mt-5 grid gap-3">
            <label className="grid gap-1 text-sm">
              {bn ? "দোকান/ব্যবসার নাম" : "Store or business name"}
              <input
                name="displayName"
                maxLength={120}
                required
                defaultValue={seller?.displayName ?? user.name}
                className="bg-background rounded-md border px-3 py-2"
              />
            </label>
            <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
              {seller
                ? bn
                  ? "আবেদন হালনাগাদ"
                  : "Update application"
                : bn
                  ? "আবেদন জমা দিন"
                  : "Submit application"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const [products, orders, reviews] = await Promise.all([
    prisma.commerceProduct.findMany({
      where: { sellerId: seller.id },
      include: { category: true, tierPrices: { orderBy: { minQty: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.commerceOrder.findMany({
      where: { sellerId: seller.id },
      include: { buyer: { select: { name: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.commerceReview.findMany({
      where: { sellerId: seller.id },
      include: {
        product: { select: { titleEn: true, titleBn: true } },
        reviewer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-sm">{seller.displayName}</p>
          <h1 className="text-3xl font-bold">{bn ? "বিক্রেতা কর্মক্ষেত্র" : "Seller workspace"}</h1>
        </div>
        <Link
          className="rounded-md border px-3 py-2 text-sm"
          href="/dashboard/ecommerce-b2b/orders"
        >
          {bn ? "সব অর্ডার" : "All orders"}
        </Link>
      </header>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">
          {bn ? "নতুন পণ্য তালিকাভুক্ত করুন" : "Create a product listing"}
        </h2>
        <form action={createCommerceProductAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            {bn ? "ক্যাটাগরি" : "Category"}
            <select
              name="categoryId"
              required
              className="bg-background rounded-md border px-3 py-2"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {bn ? category.titleBn : category.titleEn}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "পণ্যের নাম (বাংলা)" : "Product name (Bangla)"}
            <input
              name="titleBn"
              maxLength={160}
              required
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "পণ্যের নাম (ইংরেজি)" : "Product name (English)"}
            <input
              name="titleEn"
              maxLength={160}
              required
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "বিবরণ (বাংলা)" : "Description (Bangla)"}
            <textarea
              name="descriptionBn"
              maxLength={4000}
              rows={3}
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "বিবরণ (ইংরেজি)" : "Description (English)"}
            <textarea
              name="descriptionEn"
              maxLength={4000}
              rows={3}
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "একক" : "Unit"}
            <input
              name="unit"
              maxLength={32}
              placeholder="kg, piece, carton"
              required
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "প্রতি এককের দাম (৳)" : "Unit price (৳)"}
            <input
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "মজুত" : "Stock"}
            <input
              name="stock"
              type="number"
              min="0"
              max="1000000"
              defaultValue="0"
              required
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "সর্বনিম্ন পাইকারি পরিমাণ" : "Minimum wholesale quantity"}
            <input
              name="minimumWholesale"
              type="number"
              min="1"
              defaultValue="1"
              required
              className="bg-background rounded-md border px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            {bn ? "টিয়ার মূল্য JSON (ঐচ্ছিক)" : "Tier prices JSON (optional)"}
            <input
              name="tierPrices"
              placeholder='[{"minQty":10,"unitPrice":"75.00"}]'
              className="bg-background rounded-md border px-3 py-2 font-mono text-xs"
            />
            <span className="text-muted-foreground">
              {bn
                ? "প্রতি ১০ এককে ৭৫ টাকা হলে উপরের উদাহরণ অনুসরণ করুন।"
                : "Example: a ৳75 price for orders of 10 or more units."}
            </span>
          </label>
          <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 sm:col-span-2">
            {bn ? "মডারেশনে পাঠান" : "Submit for moderation"}
          </button>
        </form>
      </section>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">{bn ? "আপনার পণ্য" : "Your products"}</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground mt-3">
            {bn ? "এখনো কোনো পণ্য নেই।" : "You have not listed products yet."}
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{bn ? product.titleBn : product.titleEn}</p>
                  <p className="text-muted-foreground text-sm">
                    {bn ? product.category.titleBn : product.category.titleEn} · ৳{" "}
                    {product.price.toFixed(2)} · {bn ? "অবস্থা" : "Status"}: {product.status}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateCommerceInventoryAction} className="flex items-center gap-2">
                    <input type="hidden" name="productId" value={product.id} />
                    <label className="text-sm">
                      {bn ? "মজুত" : "Stock"}
                      <input
                        className="bg-background ml-2 w-20 rounded-md border px-2 py-1"
                        name="stock"
                        type="number"
                        min="0"
                        max="1000000"
                        defaultValue={product.stock}
                      />
                    </label>
                    <button className="rounded-md border px-3 py-1.5 text-sm">
                      {bn ? "হালনাগাদ" : "Update"}
                    </button>
                  </form>
                  <details className="basis-full">
                    <summary className="text-primary cursor-pointer text-sm">
                      {bn ? "বিবরণ/দাম সম্পাদনা" : "Edit details and price"}
                    </summary>
                    <form
                      action={updateCommerceProductDetailsAction}
                      className="mt-2 grid gap-2 sm:grid-cols-2"
                    >
                      <input type="hidden" name="productId" value={product.id} />
                      <input
                        name="titleBn"
                        defaultValue={product.titleBn}
                        maxLength={160}
                        required
                        className="bg-background rounded-md border px-3 py-2"
                      />
                      <input
                        name="titleEn"
                        defaultValue={product.titleEn}
                        maxLength={160}
                        required
                        className="bg-background rounded-md border px-3 py-2"
                      />
                      <textarea
                        name="descriptionBn"
                        defaultValue={product.descriptionBn}
                        maxLength={4000}
                        rows={2}
                        className="bg-background rounded-md border px-3 py-2"
                      />
                      <textarea
                        name="descriptionEn"
                        defaultValue={product.descriptionEn}
                        maxLength={4000}
                        rows={2}
                        className="bg-background rounded-md border px-3 py-2"
                      />
                      <input
                        name="unit"
                        defaultValue={product.unit}
                        maxLength={32}
                        required
                        className="bg-background rounded-md border px-3 py-2"
                      />
                      <input
                        name="price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        defaultValue={product.price.toFixed(2)}
                        required
                        className="bg-background rounded-md border px-3 py-2"
                      />
                      <label className="grid gap-1 text-sm sm:col-span-2">
                        {bn ? "টিয়ার মূল্য JSON" : "Tier prices JSON"}
                        <textarea
                          name="tierPrices"
                          defaultValue={JSON.stringify(
                            product.tierPrices.map((tier) => ({
                              minQty: tier.minQty,
                              unitPrice: tier.unitPrice.toFixed(2),
                            })),
                          )}
                          maxLength={2000}
                          rows={2}
                          className="bg-background rounded-md border px-3 py-2 font-mono text-xs"
                        />
                        <span className="text-muted-foreground">
                          {bn ? "[] দিলে সব টিয়ার মূল্য মুছে যাবে।" : "Enter [] to remove all tiers."}
                        </span>
                      </label>
                      <button className="rounded-md border px-3 py-2 text-sm sm:col-span-2">
                        {bn
                          ? "পরিবর্তন সংরক্ষণ (পুনরায় মডারেশন)"
                          : "Save changes (resubmit for moderation)"}
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">
          {bn ? "সাম্প্রতিক বিক্রেতা অর্ডার" : "Recent seller orders"}
        </h2>
        <ul className="mt-3 divide-y">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap justify-between gap-2 py-3">
              <div>
                <Link
                  className="font-medium hover:underline"
                  href={`/dashboard/ecommerce-b2b/orders/${order.id}`}
                >
                  #{order.id.slice(-8)}
                </Link>
                <p className="text-muted-foreground text-sm">
                  {order.buyer.name} · ৳ {order.total.toFixed(2)} · {order.status}
                </p>
              </div>
              <span className="text-muted-foreground text-sm">
                {order.items.length} {bn ? "পণ্য" : "items"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">
          {bn ? "ক্রেতাদের রিভিউ ও উত্তর" : "Buyer reviews and replies"}
        </h2>
        <ul className="mt-3 divide-y">
          {reviews.map((review) => (
            <li key={review.id} className="py-4">
              <p className="font-medium">
                {bn ? review.product.titleBn : review.product.titleEn} · {"★".repeat(review.rating)}{" "}
                · {review.reviewer.name}
              </p>
              <p className="mt-1 text-sm">{review.body}</p>
              <form action={replyCommerceReviewAction} className="mt-2 flex gap-2">
                <input type="hidden" name="reviewId" value={review.id} />
                <input
                  name="reply"
                  defaultValue={review.reply ?? ""}
                  maxLength={1000}
                  placeholder={bn ? "উত্তর লিখুন" : "Write a reply"}
                  required
                  className="bg-background min-w-0 flex-1 rounded-md border px-3 py-2"
                />
                <button className="rounded-md border px-3 py-2 text-sm">
                  {bn ? "উত্তর দিন" : "Reply"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
