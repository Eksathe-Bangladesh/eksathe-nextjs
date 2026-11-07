"use client";

import {
  BriefcaseBusinessIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UserRoundPlusIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { signOutAction } from "@/app/actions/session";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

export type SiteHeaderUserProps = {
  userName?: string;
  signedIn?: boolean;
  canProvider?: boolean;
  canAdmin?: boolean;
  isAgroAdmin?: boolean;
};

export function SiteHeaderUserMenu({
  userName,
  signedIn = false,
  canProvider = false,
  canAdmin = false,
  isAgroAdmin = false,
}: SiteHeaderUserProps) {
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  if (!signedIn) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold hover:bg-white/10"
        >
          {t("header.login")}
        </Link>
        <Link
          href="/register"
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-white px-3 text-sm font-semibold text-[#0b5036] hover:bg-white/90"
        >
          <UserRoundPlusIcon aria-hidden="true" className="size-4" />
          {t("header.register")}
        </Link>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10"
      >
        <UserRoundIcon aria-hidden="true" className="size-4" />
        <span className="max-w-32 truncate">{userName ?? t("auth.signIn")}</span>
        <ChevronDownIcon aria-hidden="true" className="size-4" />
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="border-border bg-card text-foreground mt-2 flex min-w-48 flex-col gap-1 rounded-xl border p-2 shadow-lg xl:absolute xl:top-full xl:right-0"
        >
          <Link
            role="menuitem"
            href="/account#profile"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <UserRoundIcon aria-hidden="true" className="size-4" />
            {t("dashboard.profile")}
          </Link>
          {canProvider && (
            <Link
              role="menuitem"
              href="/provider"
              onClick={() => setMenuOpen(false)}
              className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <BriefcaseBusinessIcon aria-hidden="true" className="size-4" />
              {t("nav.provider")}
            </Link>
          )}
          {canAdmin && (
            <Link
              role="menuitem"
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <ShieldCheckIcon aria-hidden="true" className="size-4" />
              {isAgroAdmin ? t("workflow.agroAdmin" as never) : t("nav.admin")}
            </Link>
          )}
          <form action={signOutAction}>
            <button
              role="menuitem"
              type="submit"
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-red-500/20"
            >
              <LogOutIcon aria-hidden="true" className="size-4" />
              {t("nav.signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export type SiteHeaderProps = {
  userSlot?: ReactNode;
  userName?: string;
  signedIn?: boolean;
  canProvider?: boolean;
  canAdmin?: boolean;
  isAgroAdmin?: boolean;
};

export function SiteHeader({
  userSlot,
  userName,
  signedIn = false,
  canProvider = false,
  canAdmin = false,
  isAgroAdmin = false,
}: SiteHeaderProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <header
      className="border-border/70 sticky top-0 z-40 border-b bg-[#0b5036] text-white shadow-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (navigationOpen)
            event.currentTarget
              .querySelector<HTMLButtonElement>("[aria-controls=site-navigation]")
              ?.focus();
          setNavigationOpen(false);
        }
      }}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-360 items-center justify-between gap-3 px-4 sm:px-6 xl:grid xl:grid-cols-[1fr_auto_1fr]">
        <Link
          href="/"
          onClick={() => setNavigationOpen(false)}
          className="flex min-w-0 items-center gap-3 leading-tight font-bold [&_img]:size-11"
          aria-label={t("common.brandName")}
        >
          <BrandLogo />
          <span className="hidden flex-col gap-1 sm:flex">
            <span className="text-sm sm:text-base">{t("common.brandName")}</span>
            <span className="hidden text-[0.65rem] font-normal text-white/70 sm:block">
              {t("common.brandSlogan")}
            </span>
          </span>
        </Link>

        <nav
          id="site-navigation"
          className={`${navigationOpen ? "flex" : "hidden"} absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] flex-col gap-4 overflow-y-auto border-b border-white/20 bg-[#0b5036] p-4 shadow-lg xl:contents`}
          aria-label={t("header.services")}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setNavigationOpen(false);
            }
          }}
        >
          <div className="flex min-w-0 flex-col gap-1 xl:flex-row xl:items-center xl:gap-2">
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              {t("header.dashboard")}
            </Link>
            <Link
              href="/agriculture"
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              {t("home.agriculture")}
            </Link>
            <Link
              href="/construction"
              className="inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              {t("home.construction")}
            </Link>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/20 pt-3 xl:flex-nowrap xl:justify-self-end xl:border-0 xl:pt-0">
            <div className="hidden xl:block [&_button]:size-9">
              <ThemeToggle />
            </div>
            <div className="hidden items-center xl:flex [&_button]:h-7 **:[[role=group]]:h-9">
              <LanguageToggle />
            </div>

            {userSlot ?? (
              <SiteHeaderUserMenu
                userName={userName}
                signedIn={signedIn}
                canProvider={canProvider}
                canAdmin={canAdmin}
                isAgroAdmin={isAgroAdmin}
              />
            )}
          </div>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2 xl:hidden">
          <div className="[&_button]:size-11">
            <ThemeToggle />
          </div>
          <div className="flex items-center [&_button]:h-9 **:[[role=group]]:h-11">
            <LanguageToggle />
          </div>
          <button
            type="button"
            aria-controls="site-navigation"
            aria-expanded={navigationOpen}
            aria-label={
              locale === "bn"
                ? navigationOpen
                  ? "মেনু বন্ধ করুন"
                  : "মেনু খুলুন"
                : navigationOpen
                  ? "Close menu"
                  : "Open menu"
            }
            onClick={() => {
              setNavigationOpen((open) => !open);
            }}
            className="inline-flex size-11 items-center justify-center rounded-lg border border-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white xl:hidden"
          >
            {navigationOpen ? (
              <XIcon aria-hidden="true" className="size-5" />
            ) : (
              <MenuIcon aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
