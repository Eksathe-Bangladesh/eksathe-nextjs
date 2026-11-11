"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminSectionNavigation({ showCommerce = false }: { showCommerce?: boolean }) {
  const locale = useLocale();
  const t = useTranslations();
  const pathname = usePathname();
  const links = [
    {
      href: "/admin",
      label: locale === "bn" ? "প্রশাসন" : "Administration",
      active: pathname === "/admin",
    },
    ...(showCommerce
      ? [
          {
            href: "/admin/ecommerce",
            label: t("admin.commerceModeration"),
            active: pathname.startsWith("/admin/ecommerce"),
          },
        ]
      : []),
  ] as const;

  return (
    <nav
      aria-label={locale === "bn" ? "প্রশাসন মডিউল" : "Administration modules"}
      className="border-border bg-background border-b"
    >
      <div className="mx-auto flex w-full max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={link.active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium",
              link.active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
