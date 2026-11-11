"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

export function CommerceWorkspaceNavigation() {
  const t = useTranslations("commerceNavigation");
  const pathname = usePathname();
  const destinations = [
    { href: "/dashboard/ecommerce", key: "market", label: t("market") },
    { href: "/dashboard/ecommerce/wholesale", key: "wholesale", label: t("wholesale") },
    { href: "/dashboard/ecommerce/cart", key: "cart", label: t("cart") },
    { href: "/dashboard/ecommerce/wishlist", key: "wishlist", label: t("wishlist") },
    { href: "/dashboard/ecommerce/orders", key: "orders", label: t("orders") },
    { href: "/dashboard/ecommerce/messages", key: "messages", label: t("messages") },
    { href: "/dashboard/ecommerce/seller", key: "seller", label: t("seller") },
  ] as const;

  return (
    <nav aria-label={t("label")} className="border-border bg-background border-b">
      <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {destinations.map(({ href, key, label }) => {
          const active =
            key === "market"
              ? pathname === href || pathname.startsWith(`${href}/products/`)
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
