export const instant = false;

import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { sendCommerceMessageAction } from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ conversationId: string }> };

export default async function CommerceConversationPage({ params }: Props) {
  const [{ conversationId }, user, locale] = await Promise.all([
    params,
    requireUser("/dashboard/ecommerce/messages"),
    getLocale(),
  ]);
  const conversation = await prisma.commerceConversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: user.id }, { seller: { userId: user.id } }],
    },
    include: {
      product: { select: { titleBn: true, titleEn: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { userId: true, displayName: true } },
      messages: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!conversation) notFound();
  const bn = locale === "bn";
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link className="text-primary text-sm" href="/dashboard/ecommerce/messages">
        {bn ? "← বার্তায় ফিরুন" : "← Messages"}
      </Link>
      <h1 className="mt-3 text-2xl font-bold">
        {bn ? conversation.product.titleBn : conversation.product.titleEn}
      </h1>
      <p className="text-muted-foreground text-sm">
        {conversation.buyer.id === user.id
          ? conversation.seller.displayName
          : conversation.buyer.name}
      </p>
      <ol className="bg-card mt-5 flex min-h-64 flex-col gap-3 rounded-xl border p-4">
        {conversation.messages.map((message) => (
          <li
            key={message.id}
            className={`max-w-[85%] rounded-xl px-4 py-3 ${message.authorId === user.id ? "bg-primary text-primary-foreground self-end" : "bg-muted self-start"}`}
          >
            <p className="text-xs opacity-70">
              {message.author.name} · {message.createdAt.toLocaleString(bn ? "bn-BD" : "en-BD")}
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{message.body}</p>
          </li>
        ))}
      </ol>
      <form action={sendCommerceMessageAction} className="mt-4 flex gap-2">
        <input type="hidden" name="conversationId" value={conversation.id} />
        <textarea
          name="body"
          maxLength={2000}
          required
          placeholder={bn ? "বার্তা লিখুন" : "Write a message"}
          className="bg-background min-w-0 flex-1 rounded-md border px-3 py-2"
        />
        <button className="bg-primary text-primary-foreground self-end rounded-md px-4 py-2">
          {bn ? "পাঠান" : "Send"}
        </button>
      </form>
    </main>
  );
}
