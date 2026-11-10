export const instant = false;

import { getLocale } from "next-intl/server";

import { toggleCommerceWishlistAction } from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CommerceWishlistPage() {
  const [user, locale] = await Promise.all([
    requireUser("/dashboard/ecommerce-b2b/wishlist"),
    getLocale(),
  ]);
  const items = await prisma.commerceWishlistItem.findMany({
    where: { userId: user.id },
    include: {
      product: { include: { category: true, seller: { select: { displayName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const bn = locale === "bn";
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{bn ? "ইচ্ছেতালিকা" : "Wishlist"}</h1>
        <Link className="text-primary text-sm" href="/dashboard/ecommerce-b2b">
          {bn ? "বাজার" : "Marketplace"}
        </Link>
      </header>
      <ul className="mt-5 divide-y rounded-xl border">
        {items.map(({ product }) => (
          <li
            key={product.id}
            className="bg-card flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <Link
                className="font-semibold hover:underline"
                href={`/dashboard/ecommerce-b2b/products/${product.id}`}
              >
                {bn ? product.titleBn : product.titleEn}
              </Link>
              <p className="text-muted-foreground text-sm">
                {bn ? product.category.titleBn : product.category.titleEn} ·{" "}
                {product.seller.displayName} · ৳ {product.price.toFixed(2)} / {product.unit}
              </p>
            </div>
            <form action={toggleCommerceWishlistAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button className="rounded-md border px-3 py-2 text-sm">
                {bn ? "ইচ্ছেতালিকা থেকে বাদ" : "Remove from wishlist"}
              </button>
            </form>
          </li>
        ))}
        {!items.length && (
          <li className="text-muted-foreground p-8 text-center">
            {bn ? "ইচ্ছেতালিকা খালি।" : "Your wishlist is empty."}
          </li>
        )}
      </ul>
    </main>
  );
}
