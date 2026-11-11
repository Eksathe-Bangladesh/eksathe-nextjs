import "server-only";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { defaultLocale, isLocale, type Locale } from "@/i18n/locales";
import { localizedPath } from "@/i18n/paths";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sectors } from "@/lib/sectors";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  role: string;
  status: string;
  accountType: string;
};

export const getCurrentUser = cache(async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      role: true,
      status: true,
      accountType: true,
    },
  });
});

export async function requireUser(returnTo = "/account", verified = true) {
  const user = await getCurrentUser();
  if (!user) {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get("NEXT_LOCALE")?.value;
    const locale: Locale = isLocale(cookieVal) ? cookieVal : defaultLocale;
    const dest = localizedPath(locale, returnTo);
    redirect(localizedPath(locale, `/login?next=${encodeURIComponent(dest)}`));
  }
  if (user.status !== "active") notFound();
  if (verified && !user.emailVerified) {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get("NEXT_LOCALE")?.value;
    const locale: Locale = isLocale(cookieVal) ? cookieVal : defaultLocale;
    const dest = localizedPath(locale, returnTo);
    redirect(localizedPath(locale, `/verify?next=${encodeURIComponent(dest)}`));
  }
  return user;
}

export async function hasStaffPermission(
  user: CurrentUser,
  permission: "OPERATIONS" | "FINANCE" | "USERS" | "PANELS" | "REPORTS",
  sectorSlug?: string,
) {
  if (user.role === "super_admin") return true;

  const scopeKey = sectorSlug ?? "global";
  const grant = await prisma.staffGrant.findFirst({
    where: {
      userId: user.id,
      permission,
      scopeKey: { in: [scopeKey, "global"] },
    },
    select: { id: true },
  });
  return Boolean(grant);
}

export async function hasAnyStaffPermission(user: CurrentUser) {
  if (user.role === "super_admin") return true;
  const grant = await prisma.staffGrant.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });
  return Boolean(grant);
}

export type StaffAccess = {
  isSuperAdmin: boolean;
  operationSectors: string[];
  financeSectors: string[];
  userManagementSectors: string[];
  panelManagementSectors: string[];
  reportSectors: string[];
  canManageStaff: boolean;
};

export const getStaffAccess = cache(async function getStaffAccess(
  user: CurrentUser,
): Promise<StaffAccess> {
  const isSuperAdmin = user.role === "super_admin";
  const liveSectorSlugs = sectors
    .filter((sector) => sector.status === "live")
    .map((sector) => sector.slug);
  if (isSuperAdmin) {
    return {
      isSuperAdmin,
      operationSectors: liveSectorSlugs,
      financeSectors: liveSectorSlugs,
      userManagementSectors: liveSectorSlugs,
      panelManagementSectors: liveSectorSlugs,
      reportSectors: liveSectorSlugs,
      canManageStaff: true,
    };
  }

  const grants = await prisma.staffGrant.findMany({
    where: { userId: user.id },
    select: { scopeKey: true, sectorSlug: true, permission: true },
  });
  const scopesFor = (permission: "OPERATIONS" | "FINANCE" | "USERS" | "PANELS" | "REPORTS") => {
    const matching = grants.filter((grant) => grant.permission === permission);
    if (matching.some((grant) => grant.scopeKey === "global")) return liveSectorSlugs;
    return matching
      .map((grant) => grant.sectorSlug)
      .filter((slug): slug is string => Boolean(slug));
  };

  return {
    isSuperAdmin,
    operationSectors: scopesFor("OPERATIONS"),
    financeSectors: scopesFor("FINANCE"),
    userManagementSectors: scopesFor("USERS"),
    panelManagementSectors: scopesFor("PANELS"),
    reportSectors: scopesFor("REPORTS"),
    canManageStaff: false,
  };
});

export async function requireAdmin(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  const access = await getStaffAccess(user);
  if (
    !access.isSuperAdmin &&
    access.operationSectors.length === 0 &&
    access.financeSectors.length === 0 &&
    access.userManagementSectors.length === 0 &&
    access.panelManagementSectors.length === 0 &&
    access.reportSectors.length === 0
  )
    notFound();
  return { user, access };
}

export async function requireSuperAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "super_admin") notFound();
  return user;
}

export async function requireStaff(
  permission: "OPERATIONS" | "FINANCE" | "USERS" | "PANELS" | "REPORTS",
  sectorSlug?: string,
) {
  const user = await requireUser("/admin");
  if (!(await hasStaffPermission(user, permission, sectorSlug))) notFound();
  return user;
}

export { safeNextPath } from "@/i18n/paths";
