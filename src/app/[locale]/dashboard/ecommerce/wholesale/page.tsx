export const instant = false;

import { getLocale } from "next-intl/server";

import {
  acceptWholesaleQuoteAction,
  createWholesaleRequestAction,
  quoteWholesaleRequestAction,
} from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function WholesaleBoardPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const seller = user
    ? await prisma.commerceSeller.findUnique({
        where: { userId: user.id },
        select: { id: true, status: true },
      })
    : null;
  const [products, requests, ownRequests] = await Promise.all([
    prisma.commerceProduct.findMany({
      where: { status: "APPROVED", seller: { status: "APPROVED" }, category: { isActive: true } },
      include: {
        tierPrices: { orderBy: { minQty: "asc" } },
        seller: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.commerceWholesaleRequest.findMany({
      where: { status: "OPEN" },
      include: {
        product: { include: { seller: { select: { id: true, displayName: true } } } },
        buyer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    user
      ? prisma.commerceWholesaleRequest.findMany({
          where: { buyerId: user.id },
          include: {
            product: { select: { titleBn: true, titleEn: true, unit: true } },
            quotes: {
              include: { seller: { select: { displayName: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
  ]);
  const bn = locale === "bn";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-sm">B2B • RFQ</p>
          <h1 className="text-3xl font-bold">
            {bn ? "পাইকারি ক্রয় ও সরবরাহ বোর্ড" : "Wholesale buy and supply board"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {bn
              ? "পাইকারি মূল্য দেখুন, দর অনুরোধ করুন এবং সরবরাহকারীর কোটেশন গ্রহণ করুন।"
              : "Compare tier pricing, request quotes, and accept supplier offers."}
          </p>
        </div>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/dashboard/ecommerce">
          {bn ? "সব পণ্য" : "All products"}
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          {bn ? "পাইকারি পণ্য ও টিয়ার মূল্য" : "Wholesale products and tier prices"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="bg-card rounded-xl border p-5">
              <h3 className="font-semibold">{bn ? product.titleBn : product.titleEn}</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {bn ? "বিক্রেতা" : "Seller"}: {product.seller.displayName} ·{" "}
                {product.minimumWholesale} {product.unit}+ · ৳ {product.price.toFixed(2)} /{" "}
                {product.unit}
              </p>
              {product.tierPrices.length > 0 && (
                <ul className="mt-2 text-sm">
                  {product.tierPrices.map((tier) => (
                    <li key={tier.id}>
                      {tier.minQty}+ {product.unit}: ৳ {tier.unitPrice.toFixed(2)} / {product.unit}
                    </li>
                  ))}
                </ul>
              )}
              {user && (
                <form action={createWholesaleRequestAction} className="mt-3 grid grid-cols-2 gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input
                    name="quantity"
                    type="number"
                    min={product.minimumWholesale}
                    max={product.stock}
                    placeholder={bn ? "পরিমাণ" : "Quantity"}
                    required
                    className="bg-background rounded-md border px-3 py-2"
                  />
                  <input
                    name="district"
                    maxLength={80}
                    placeholder={bn ? "জেলা" : "District"}
                    required
                    className="bg-background rounded-md border px-3 py-2"
                  />
                  <input
                    name="note"
                    maxLength={1000}
                    placeholder={bn ? "নোট (ঐচ্ছিক)" : "Note (optional)"}
                    className="bg-background rounded-md border px-3 py-2"
                  />
                  <button className="bg-primary text-primary-foreground rounded-md px-3 py-2">
                    {bn ? "RFQ পাঠান" : "Request quote"}
                  </button>
                </form>
              )}
              {!user && (
                <Link className="text-primary mt-3 inline-block text-sm underline" href="/login">
                  {bn ? "দর চাইতে সাইন ইন করুন" : "Sign in to request a quote"}
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="bg-card rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">
          {bn ? "খোলা RFQ • সরবরাহকারীদের জন্য" : "Open RFQs • for suppliers"}
        </h2>
        <ul className="mt-3 divide-y">
          {requests.map((request) => (
            <li key={request.id} className="py-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {bn ? request.product.titleBn : request.product.titleEn} · {request.quantity}{" "}
                    {request.product.unit}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {request.district} ·{" "}
                    {request.buyer.id === user?.id
                      ? request.buyer.name
                      : bn
                        ? "যাচাইকৃত ক্রেতা"
                        : "Verified buyer"}{" "}
                    · {request.createdAt.toLocaleDateString(bn ? "bn-BD" : "en-BD")}
                  </p>
                  {request.note && (
                    <p className="mt-1 text-sm whitespace-pre-wrap">{request.note}</p>
                  )}
                </div>
              </div>
              {user && seller?.status === "APPROVED" && seller.id === request.product.seller.id && (
                <form action={quoteWholesaleRequestAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input
                    name="unitPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder={bn ? "একক মূল্য ৳" : "Unit price ৳"}
                    className="bg-background rounded-md border px-3 py-2"
                  />
                  <input
                    name="note"
                    maxLength={1000}
                    placeholder={bn ? "শর্ত (ঐচ্ছিক)" : "Terms (optional)"}
                    className="bg-background min-w-40 flex-1 rounded-md border px-3 py-2"
                  />
                  <button className="rounded-md border px-3 py-2">
                    {bn ? "দর পাঠান" : "Send quote"}
                  </button>
                </form>
              )}
            </li>
          ))}
          {requests.length === 0 && (
            <li className="text-muted-foreground py-4">
              {bn ? "এখন কোনো খোলা RFQ নেই।" : "No open RFQs at the moment."}
            </li>
          )}
        </ul>
      </section>

      {user && (
        <section className="bg-card rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">
            {bn ? "আপনার RFQ ও কোটেশন" : "Your RFQs and quotes"}
          </h2>
          <ul className="mt-3 divide-y">
            {ownRequests.map((request) => (
              <li key={request.id} className="py-4">
                <p className="font-medium">
                  {bn ? request.product.titleBn : request.product.titleEn} · {request.quantity}{" "}
                  {request.product.unit} · {request.status}
                </p>
                {request.quotes.length ? (
                  request.quotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <p className="text-sm">
                        {quote.seller.displayName} · ৳ {quote.unitPrice.toFixed(2)} /{" "}
                        {request.product.unit}
                        {quote.note ? ` · ${quote.note}` : ""} · {quote.status}
                      </p>
                      {quote.status === "PENDING" && request.status === "OPEN" && (
                        <form action={acceptWholesaleQuoteAction}>
                          <input type="hidden" name="quoteId" value={quote.id} />
                          <button className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm">
                            {bn ? "দর গ্রহণ করুন" : "Accept quote"}
                          </button>
                        </form>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {bn ? "এখনো কোনো দর আসেনি।" : "No quotes yet."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
