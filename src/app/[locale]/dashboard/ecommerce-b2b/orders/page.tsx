export const instant = false;

import { getLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CommerceOrdersPage() {
  const [user, locale] = await Promise.all([
    requireUser("/dashboard/ecommerce-b2b/orders"),
    getLocale(),
  ]);
  const orders = await prisma.commerceOrder.findMany({
    where: { OR: [{ buyerId: user.id }, { seller: { userId: user.id } }] },
    include: {
      seller: { select: { displayName: true } },
      buyer: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const bn = locale === "bn";
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{bn ? "অর্ডার ইতিহাস" : "Order history"}</h1>
      <ul className="mt-5 divide-y rounded-xl border">
        {orders.map((order) => {
          const isBuyer = order.buyerId === user.id;
          return (
            <li
              key={order.id}
              className="bg-card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <Link
                  className="font-semibold hover:underline"
                  href={`/dashboard/ecommerce-b2b/orders/${order.id}`}
                >
                  #{order.id.slice(-8)}
                </Link>
                <p className="text-muted-foreground mt-1 text-sm">
                  {isBuyer
                    ? bn
                      ? `বিক্রেতা: ${order.seller.displayName}`
                      : `Seller: ${order.seller.displayName}`
                    : bn
                      ? `ক্রেতা: ${order.buyer.name}`
                      : `Buyer: ${order.buyer.name}`}{" "}
                  · {order.createdAt.toLocaleDateString(bn ? "bn-BD" : "en-BD")}
                </p>
                <p className="mt-1 text-sm">
                  {order.items.length} {bn ? "পণ্য" : "items"} · {order.status}
                </p>
              </div>
              <strong>৳ {order.total.toFixed(2)}</strong>
            </li>
          );
        })}
        {!orders.length && (
          <li className="text-muted-foreground p-8 text-center">
            {bn ? "এখনো কোনো অর্ডার নেই।" : "No orders yet."}
          </li>
        )}
      </ul>
    </main>
  );
}
