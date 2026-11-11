export const instant = false;

import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  addCommerceCartItemAction,
  createWholesaleRequestAction,
  startCommerceConversationAction,
  toggleCommerceWishlistAction,
} from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ productId: string }> };

export default async function CommerceProductPage({ params }: Props) {
  const [{ productId }, locale] = await Promise.all([params, getLocale()]);
  const product = await prisma.commerceProduct.findFirst({
    where: {
      id: productId,
      status: "APPROVED",
      seller: { status: "APPROVED" },
      category: { isActive: true },
    },
    include: {
      category: true,
      seller: { select: { id: true, displayName: true } },
      tierPrices: { orderBy: { minQty: "asc" } },
      reviews: {
        include: { reviewer: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!product) notFound();
  const bn = locale === "bn";
  const cartAction = addCommerceCartItemAction.bind(null);
  const requestAction = createWholesaleRequestAction.bind(null);
  const messageAction = startCommerceConversationAction.bind(null);
  const wishlistAction = toggleCommerceWishlistAction.bind(null);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link className="text-primary text-sm" href="/dashboard/ecommerce">
        {bn ? "← বাজারে ফিরুন" : "← Back to marketplace"}
      </Link>
      <section className="bg-card grid gap-6 rounded-2xl border p-6 md:grid-cols-2">
        <div
          className="bg-muted flex min-h-64 items-center justify-center rounded-xl text-7xl"
          aria-hidden="true"
        >
          📦
        </div>
        <div>
          <p className="text-muted-foreground text-sm">
            {bn ? product.category.titleBn : product.category.titleEn}
          </p>
          <h1 className="mt-2 text-3xl font-bold">{bn ? product.titleBn : product.titleEn}</h1>
          <p className="text-muted-foreground mt-3 whitespace-pre-wrap">
            {bn ? product.descriptionBn : product.descriptionEn}
          </p>
          <p className="mt-4 text-2xl font-bold">
            ৳ {product.price.toFixed(2)} / {product.unit}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {bn ? "বিক্রেতা" : "Seller"}: {product.seller.displayName} · {product.stock}{" "}
            {bn ? "মজুত" : "in stock"}
          </p>
          {product.tierPrices.length > 0 && (
            <div className="mt-4 rounded-lg border p-3">
              <h2 className="font-semibold">{bn ? "পরিমাণভিত্তিক দাম" : "Volume pricing"}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {product.tierPrices.map((tier) => (
                  <li key={tier.id}>
                    {tier.minQty}+ {product.unit}: ৳ {tier.unitPrice.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form action={cartAction} className="mt-4 flex flex-wrap items-end gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <label className="grid gap-1 text-sm">
              {bn ? "পরিমাণ" : "Quantity"}
              <input
                className="bg-background w-24 rounded-md border px-3 py-2"
                name="quantity"
                type="number"
                min="1"
                max={product.stock}
                defaultValue="1"
                required
              />
            </label>
            <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
              {bn ? "কার্টে যোগ করুন" : "Add to cart"}
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={wishlistAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button className="rounded-md border px-3 py-2 text-sm">
                {bn ? "ইচ্ছেতালিকায় যোগ/বাদ" : "Toggle wishlist"}
              </button>
            </form>
            <form action={messageAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button className="rounded-md border px-3 py-2 text-sm">
                {bn ? "বিক্রেতাকে বার্তা" : "Message seller"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">
          {bn ? "পাইকারি দর অনুরোধ" : "Request a wholesale quote"}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {bn
            ? `সর্বনিম্ন পরিমাণ ${product.minimumWholesale} ${product.unit}।`
            : `Minimum order: ${product.minimumWholesale} ${product.unit}.`}
        </p>
        <form action={requestAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <label className="grid gap-1 text-sm">
            {bn ? "পরিমাণ" : "Quantity"}
            <input
              className="bg-background rounded-md border px-3 py-2"
              name="quantity"
              type="number"
              min={product.minimumWholesale}
              max={product.stock}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            {bn ? "জেলা" : "District"}
            <input
              className="bg-background rounded-md border px-3 py-2"
              name="district"
              maxLength={80}
              required
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            {bn ? "বিশেষ শর্ত" : "Note"}
            <textarea
              className="bg-background rounded-md border px-3 py-2"
              name="note"
              maxLength={1000}
              rows={3}
            />
          </label>
          <button className="bg-secondary rounded-md px-4 py-2 sm:col-span-2">
            {bn ? "RFQ পাঠান" : "Submit RFQ"}
          </button>
        </form>
      </section>

      <section className="bg-card rounded-2xl border p-6">
        <h2 className="text-xl font-semibold">{bn ? "ক্রেতাদের রিভিউ" : "Buyer reviews"}</h2>
        {product.reviews.length ? (
          <ul className="mt-4 space-y-4">
            {product.reviews.map((review) => (
              <li key={review.id} className="border-t pt-4">
                <p className="font-medium">
                  {review.reviewer.name} · {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{review.body}</p>
                {review.reply && (
                  <p className="bg-muted mt-2 rounded-md p-3 text-sm">
                    {bn ? "বিক্রেতার উত্তর" : "Seller reply"}: {review.reply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">
            {bn ? "এখনো রিভিউ নেই।" : "No reviews yet."}
          </p>
        )}
      </section>
    </main>
  );
}
