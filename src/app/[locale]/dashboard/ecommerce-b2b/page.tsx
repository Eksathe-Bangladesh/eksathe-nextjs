export const instant = false;

import { getLocale } from "next-intl/server";
import { connection } from "next/server";

import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export default async function CommerceMarketPage({ searchParams }: Props) {
  await connection();
  const [{ q, category }, locale] = await Promise.all([searchParams, getLocale()]);
  const search = q?.trim().slice(0, 100) ?? "";
  const [categories, products] = await Promise.all([
    prisma.commerceCategory.findMany({ where: { isActive: true }, orderBy: { titleEn: "asc" } }),
    prisma.commerceProduct.findMany({
      where: {
        status: "APPROVED",
        seller: { status: "APPROVED" },
        category: { isActive: true },
        ...(category ? { categoryId: category } : {}),
        ...(search
          ? {
              OR: [
                { titleBn: { contains: search, mode: "insensitive" } },
                { titleEn: { contains: search, mode: "insensitive" } },
                { descriptionBn: { contains: search, mode: "insensitive" } },
                { descriptionEn: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { seller: { select: { displayName: true } }, category: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  const bn = locale === "bn";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <div>
          <p className="text-primary text-sm font-semibold">EKsathe • B2B</p>
          <h1 className="mt-1 text-3xl font-bold">{bn ? "পণ্য বাজার" : "Product marketplace"}</h1>
          <p className="text-muted-foreground mt-2">
            {bn
              ? "খুচরা ও পাইকারি পণ্য, বিক্রেতা, RFQ এবং অর্ডার এক জায়গায়।"
              : "Retail and wholesale products, sellers, RFQs, and orders in one place."}
          </p>
        </div>
      </header>

      <form className="bg-card flex flex-wrap gap-3 rounded-xl border p-4">
        <input
          name="q"
          defaultValue={search}
          maxLength={100}
          aria-label={bn ? "পণ্য খুঁজুন" : "Search products"}
          placeholder={bn ? "পণ্য বা বিবরণ খুঁজুন" : "Search products and descriptions"}
          className="bg-background min-w-56 flex-1 rounded-md border px-3 py-2"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="bg-background rounded-md border px-3 py-2"
        >
          <option value="">{bn ? "সব ক্যাটাগরি" : "All categories"}</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {bn ? item.titleBn : item.titleEn}
            </option>
          ))}
        </select>
        <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
          {bn ? "খুঁজুন" : "Search"}
        </button>
      </form>

      {products.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
          {bn ? "এখনো কোনো অনুমোদিত পণ্য নেই।" : "There are no approved products yet."}
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="bg-card flex flex-col rounded-xl border p-5">
              <p className="text-muted-foreground text-xs">
                {bn ? product.category.titleBn : product.category.titleEn}
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                {bn ? product.titleBn : product.titleEn}
              </h2>
              <p className="text-muted-foreground mt-1 line-clamp-3 text-sm">
                {bn ? product.descriptionBn : product.descriptionEn}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <strong>
                  ৳ {product.price.toFixed(2)} / {product.unit}
                </strong>
                <span className="text-muted-foreground text-xs">
                  {product.stock} {bn ? "মজুত" : "in stock"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {bn ? "বিক্রেতা" : "Seller"}: {product.seller.displayName}
              </p>
              <Link
                className="bg-primary text-primary-foreground mt-4 rounded-md px-3 py-2 text-center text-sm"
                href={`/dashboard/ecommerce-b2b/products/${product.id}`}
              >
                {bn ? "বিস্তারিত দেখুন" : "View product"}
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
