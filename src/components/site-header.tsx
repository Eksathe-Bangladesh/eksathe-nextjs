"use client";

import {
  BriefcaseBusinessIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  FolderKanbanIcon,
  LogOutIcon,
  LoaderCircleIcon,
  MenuIcon,
  ShoppingBagIcon,
  StoreIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UserRoundPlusIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { signOutAction } from "@/app/actions/session";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { statusMessageKey } from "@/i18n/message-keys";
import { Link, usePathname } from "@/i18n/navigation";

type ProviderSummary = {
  status: string;
  capabilities: { sectorSlug: string; kind: string; status: string }[];
  verifications: { type: string; status: string }[];
};

export type SiteHeaderUserProps = {
  userName?: string;
  signedIn?: boolean;
  accountType?: string;
  canProvider?: boolean;
  providerSummary?: ProviderSummary | null;
  canAdmin?: boolean;
  isAgroAdmin?: boolean;
  commerceSellerStatus?: string | null;
};

export function SiteHeaderUserMenu({
  userName,
  signedIn = false,
  accountType = "customer",
  canProvider = false,
  providerSummary = null,
  canAdmin = false,
  isAgroAdmin = false,
  commerceSellerStatus = null,
}: SiteHeaderUserProps) {
  const t = useTranslations();
  const accountTypeLabels: Record<string, string> = {
    customer: t("workflow.customerAccount"),
    farmer: t("workflow.farmerAccount"),
    agro_laborer: t("workflow.agroLaborerAccount"),
    agronomist: t("workflow.agronomistAccount"),
    veterinarian: t("workflow.veterinarianAccount"),
    agro_seller: t("workflow.agroSellerAccount"),
    agriculture_professional: t("workflow.agricultureProfessionalAccount"),
  };
  const capabilityLabels: Record<string, string> = {
    PRODUCE: t("marketplaceServices.produce-market"),
    WORKER: t("marketplaceServices.farm-labour"),
    MACHINERY: t("marketplaceServices.farm-machinery"),
    CONSTRUCTION_SERVICE: t("marketplaceServices.construction-service"),
    CONSTRUCTION_MATERIAL: t("marketplaceServices.construction-material"),
  };
  const getStatusLabel = (status: string) => {
    const key = statusMessageKey(status);
    return key ? t(key) : status.replaceAll("_", " ").toLowerCase();
  };
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const displayName = userName?.trim().split(/\s+/).slice(0, 2).join(" ");

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
        aria-label={signingOut ? t("nav.signingOut") : undefined}
        aria-live="polite"
        disabled={signingOut}
        onClick={() => setMenuOpen((open) => !open)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-80"
      >
        {signingOut ? (
          <>
            <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
            <span>{t("nav.signingOut")}</span>
          </>
        ) : (
          <>
            <UserRoundIcon aria-hidden="true" className="size-4" />
            <span className="max-w-32 truncate">{displayName ?? t("auth.signIn")}</span>
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </>
        )}
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="border-border bg-card text-foreground mt-2 flex max-w-80 min-w-64 flex-col gap-1 rounded-xl border p-2 shadow-lg xl:absolute xl:top-full xl:right-0"
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
          <Link
            role="menuitem"
            href="/dashboard/ecommerce"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <ShoppingBagIcon aria-hidden="true" className="size-4" />
            {t("header.shopping")}
          </Link>
          <div className="border-border/70 flex flex-col gap-1 border-y px-3 py-2 text-xs">
            <p className="font-semibold">{t("header.accountType")}</p>
            <p className="text-muted-foreground">
              {accountTypeLabels[accountType] ?? t("header.standardAccount")}
            </p>
            {providerSummary && (
              <>
                <p className="mt-1 font-semibold">{t("header.providerAccess")}</p>
                <p className="text-muted-foreground">
                  {t("header.providerProfile")}: {getStatusLabel(providerSummary.status)}
                </p>
                {providerSummary.capabilities.map((capability) => (
                  <p
                    key={`${capability.sectorSlug}:${capability.kind}`}
                    className="text-muted-foreground"
                  >
                    {capability.sectorSlug === "construction"
                      ? t("home.construction")
                      : capability.sectorSlug === "agriculture-labor"
                        ? t("home.agriculture")
                        : capability.sectorSlug}
                    {capabilityLabels[capability.kind]
                      ? ` · ${capabilityLabels[capability.kind]}`
                      : ""}
                    : {getStatusLabel(capability.status)}
                  </p>
                ))}
                {providerSummary.verifications.map((verification) => (
                  <p key={verification.type} className="text-muted-foreground">
                    {verification.type === "CONTRACTOR"
                      ? t("header.contractorVerification")
                      : t("header.supplierVerification")}
                    : {getStatusLabel(verification.status)}
                  </p>
                ))}
              </>
            )}
            {canAdmin && (
              <p className="text-muted-foreground mt-1">
                {t("header.staffAccess")}: {isAgroAdmin ? t("workflow.agroAdmin") : t("nav.admin")}
              </p>
            )}
          </div>
          <Link
            role="menuitem"
            href="/account#requests"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <ClipboardListIcon aria-hidden="true" className="size-4" />
            {t("header.myRequests")}
          </Link>
          <Link
            role="menuitem"
            href="/account#orders"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <ShoppingBagIcon aria-hidden="true" className="size-4" />
            {t("header.myOrders")}
          </Link>
          <Link
            role="menuitem"
            href="/dashboard/ecommerce/orders"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <ShoppingBagIcon aria-hidden="true" className="size-4" />
            {t("header.myProductOrders")}
          </Link>
          <Link
            role="menuitem"
            href="/account#projects"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <FolderKanbanIcon aria-hidden="true" className="size-4" />
            {t("header.myProjects")}
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
          {!canProvider && (
            <Link
              role="menuitem"
              href="/provider"
              onClick={() => setMenuOpen(false)}
              className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <BriefcaseBusinessIcon aria-hidden="true" className="size-4" />
              {t("header.becomeProvider")}
            </Link>
          )}
          <Link
            role="menuitem"
            href="/dashboard/ecommerce/seller"
            onClick={() => setMenuOpen(false)}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <StoreIcon aria-hidden="true" className="size-4" />
            {commerceSellerStatus === "APPROVED"
              ? t("header.sellerWorkspace")
              : commerceSellerStatus === "PENDING" || commerceSellerStatus === "REJECTED"
                ? t("header.sellerApplication")
                : t("header.becomeSeller")}
          </Link>
          {canAdmin && (
            <Link
              role="menuitem"
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="hover:bg-muted inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <ShieldCheckIcon aria-hidden="true" className="size-4" />
              {isAgroAdmin ? t("workflow.agroAdmin") : t("nav.admin")}
            </Link>
          )}
          <form
            action={signOutAction}
            onSubmit={() => {
              setSigningOut(true);
              setMenuOpen(false);
            }}
          >
            <button
              role="menuitem"
              type="submit"
              disabled={signingOut}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-red-500/20 disabled:cursor-wait disabled:opacity-70"
            >
              {signingOut ? (
                <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <LogOutIcon aria-hidden="true" className="size-4" />
              )}
              {signingOut ? t("nav.signingOut") : t("nav.signOut")}
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
  accountType?: string;
  canProvider?: boolean;
  providerSummary?: ProviderSummary | null;
  canAdmin?: boolean;
  isAgroAdmin?: boolean;
  commerceSellerStatus?: string | null;
};

function NavigationLinks({ pathname }: { pathname: string }) {
  const t = useTranslations();
  const items = [
    { href: "/dashboard", label: t("header.services") },
    { href: "/agriculture", label: t("home.agriculture") },
    { href: "/construction", label: t("home.construction") },
    { href: "/dashboard/ecommerce", label: t("header.shopping") },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-1 xl:flex-row xl:items-center xl:gap-2">
      {items.map(({ href, label }) => {
        const active =
          href === "/dashboard"
            ? pathname === href ||
              (pathname.startsWith(`${href}/`) && !pathname.startsWith("/dashboard/ecommerce"))
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 ${active ? "bg-white/15" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveNavigationLinks() {
  return <NavigationLinks pathname={usePathname()} />;
}

export function SiteHeader({
  userSlot,
  userName,
  signedIn = false,
  accountType = "customer",
  canProvider = false,
  providerSummary = null,
  canAdmin = false,
  isAgroAdmin = false,
  commerceSellerStatus = null,
}: SiteHeaderProps) {
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
          <BrandLogo loading="eager" />
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
          aria-label={t("header.primaryNavigation")}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) {
              setNavigationOpen(false);
            }
          }}
        >
          <Suspense fallback={<NavigationLinks pathname="" />}>
            <ActiveNavigationLinks />
          </Suspense>
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
                accountType={accountType}
                canProvider={canProvider}
                providerSummary={providerSummary}
                canAdmin={canAdmin}
                isAgroAdmin={isAgroAdmin}
                commerceSellerStatus={commerceSellerStatus}
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
            aria-label={navigationOpen ? t("nav.closeMenu") : t("nav.openMenu")}
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
