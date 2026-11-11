export const instant = false;

import { getLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CommerceMessagesPage() {
  const [user, locale] = await Promise.all([
    requireUser("/dashboard/ecommerce/messages"),
    getLocale(),
  ]);
  const threads = await prisma.commerceConversation.findMany({
    where: { OR: [{ buyerId: user.id }, { seller: { userId: user.id } }] },
    include: {
      product: { select: { titleBn: true, titleEn: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { displayName: true, userId: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const bn = locale === "bn";
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold">{bn ? "মার্কেটপ্লেস বার্তা" : "Marketplace messages"}</h1>
      <ul className="mt-5 divide-y rounded-xl border">
        {threads.map((thread) => {
          const otherParty =
            thread.buyer.id === user.id ? thread.seller.displayName : thread.buyer.name;
          return (
            <li key={thread.id}>
              <Link
                href={`/dashboard/ecommerce/messages/${thread.id}`}
                className="bg-card hover:bg-muted/50 block p-4"
              >
                <p className="font-semibold">
                  {bn ? thread.product.titleBn : thread.product.titleEn} · {otherParty}
                </p>
                <p className="text-muted-foreground mt-1 line-clamp-1 text-sm">
                  {thread.messages[0]?.body ?? (bn ? "এখনো কোনো বার্তা নেই" : "No messages yet")}
                </p>
              </Link>
            </li>
          );
        })}
        {!threads.length && (
          <li className="text-muted-foreground p-8 text-center">
            {bn
              ? "এখনো কোনো কথোপকথন নেই। পণ্য থেকে বিক্রেতাকে বার্তা পাঠান।"
              : "No conversations yet. Contact a seller from a product page."}
          </li>
        )}
      </ul>
    </main>
  );
}
