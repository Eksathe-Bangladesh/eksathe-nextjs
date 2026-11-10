export const instant = false;

import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { createCommerceReviewAction, setCommerceOrderStatusAction } from "@/app/actions/commerce";
import { PrintButton } from "@/components/commerce/print-button";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ orderId: string }> };
type AddressSnapshot = {
  fullName?: string;
  phone?: string;
  district?: string;
  city?: string;
  addressLine?: string;
  postalCode?: string | null;
  note?: string;
};

export default async function CommerceInvoicePage({ params }: Props) {
  const [{ orderId }, user, locale] = await Promise.all([
    params,
    requireUser("/dashboard/ecommerce-b2b/orders"),
    getLocale(),
  ]);
  const order = await prisma.commerceOrder.findFirst({
    where: { id: orderId, OR: [{ buyerId: user.id }, { seller: { userId: user.id } }] },
    include: {
      buyer: { select: { name: true, email: true } },
      seller: { select: { displayName: true, user: { select: { phone: true, email: true } } } },
      items: true,
      reviews: { where: { reviewerId: user.id }, select: { productId: true } },
    },
  });
  if (!order) notFound();
  const bn = locale === "bn";
  const isBuyer = order.buyerId === user.id;
  const address = order.addressSnapshot as AddressSnapshot;
  const nextStatus: Record<string, "PROCESSING" | "SHIPPED" | "DELIVERED"> = {
    CONFIRMED: "PROCESSING",
    PROCESSING: "SHIPPED",
    SHIPPED: "DELIVERED",
  };
  const next = nextStatus[order.status];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary text-sm">{bn ? "অর্ডার / ইনভয়েস" : "Order / Invoice"}</p>
          <h1 className="text-3xl font-bold">#{order.id.slice(-10)}</h1>
          <p className="text-muted-foreground mt-1">
            {order.createdAt.toLocaleString(bn ? "bn-BD" : "en-BD")}
          </p>
        </div>
        <PrintButton label={bn ? "ইনভয়েস প্রিন্ট" : "Print invoice"} />
      </header>

      <section className="bg-card mt-5 rounded-2xl border p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="font-semibold">{bn ? "ক্রেতা" : "Buyer"}</h2>
            <p>{order.buyer.name}</p>
            <p className="text-muted-foreground text-sm">{order.buyer.email}</p>
          </div>
          <div>
            <h2 className="font-semibold">{bn ? "বিক্রেতা" : "Seller"}</h2>
            <p>{order.seller.displayName}</p>
            <p className="text-muted-foreground text-sm">{order.seller.user.phone}</p>
          </div>
          <div className="sm:col-span-2">
            <h2 className="font-semibold">{bn ? "ডেলিভারি ঠিকানা" : "Delivery address"}</h2>
            <p>
              {address.fullName ?? order.buyer.name}
              {address.phone ? ` · ${address.phone}` : ""}
            </p>
            <p className="text-muted-foreground text-sm">
              {[address.addressLine, address.city, address.district, address.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card mt-5 rounded-2xl border p-5">
        <h2 className="text-xl font-semibold">{bn ? "পণ্য তালিকা" : "Items"}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">{bn ? "পণ্য" : "Product"}</th>
                <th>{bn ? "পরিমাণ" : "Quantity"}</th>
                <th>{bn ? "একক মূল্য" : "Unit price"}</th>
                <th className="text-right">{bn ? "মোট" : "Subtotal"}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.title}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>৳ {item.unitPrice.toFixed(2)}</td>
                  <td className="text-right">৳ {item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 ml-auto grid max-w-xs grid-cols-2 gap-2 text-sm">
          <dt>{bn ? "পণ্যের মোট" : "Subtotal"}</dt>
          <dd className="text-right">৳ {order.subtotal.toFixed(2)}</dd>
          <dt>{bn ? "ছাড়" : "Discount"}</dt>
          <dd className="text-right">− ৳ {order.discount.toFixed(2)}</dd>
          <dt className="border-t pt-2 font-bold">{bn ? "সর্বমোট" : "Total"}</dt>
          <dd className="border-t pt-2 text-right font-bold">৳ {order.total.toFixed(2)}</dd>
        </dl>
        <p className="text-muted-foreground mt-3 text-sm">
          {bn ? "পেমেন্ট পদ্ধতি" : "Payment method"}: {order.paymentMethod} · {bn ? "অবস্থা" : "Status"}
          : <strong>{order.status}</strong>
        </p>
      </section>

      {!isBuyer && next && (
        <form action={setCommerceOrderStatusAction} className="mt-4 print:hidden">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="status" value={next} />
          <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
            {bn ? `অর্ডার ${next} করুন` : `Mark order ${next.toLowerCase()}`}
          </button>
        </form>
      )}

      {isBuyer && order.status === "DELIVERED" && (
        <section className="bg-card mt-5 rounded-2xl border p-5 print:hidden">
          <h2 className="text-xl font-semibold">
            {bn ? "পণ্য রিভিউ দিন" : "Review delivered products"}
          </h2>
          {order.items
            .filter((item) => !order.reviews.some((review) => review.productId === item.productId))
            .map((item) => (
              <form
                key={item.id}
                action={createCommerceReviewAction}
                className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[1fr_auto_2fr_auto]"
              >
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="productId" value={item.productId} />
                <span className="self-center text-sm">{item.title}</span>
                <select name="rating" className="bg-background rounded-md border p-2">
                  <option value="5">5 ★</option>
                  <option value="4">4 ★</option>
                  <option value="3">3 ★</option>
                  <option value="2">2 ★</option>
                  <option value="1">1 ★</option>
                </select>
                <input
                  name="body"
                  maxLength={1000}
                  placeholder={bn ? "আপনার অভিজ্ঞতা (ঐচ্ছিক)" : "Your experience (optional)"}
                  className="bg-background rounded-md border px-3 py-2"
                />
                <button className="rounded-md border px-3 py-2 text-sm">
                  {bn ? "জমা" : "Submit"}
                </button>
              </form>
            ))}
          {order.reviews.length === order.items.length && (
            <p className="text-muted-foreground mt-3 text-sm">
              {bn
                ? "এই অর্ডারের সব পণ্যে রিভিউ দেওয়া হয়েছে।"
                : "You have reviewed every item in this order."}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
