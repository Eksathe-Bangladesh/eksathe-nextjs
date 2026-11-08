import "server-only";
import type { RequestStatus } from "@/generated/prisma/client";
import { defaultLocale, type Locale } from "@/i18n/locales";
import { resolveTranslation } from "@/i18n/content";
import type { StaffAccess } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const decimal = (value: { toString(): string } | null | undefined) => value?.toString() ?? null;
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export async function getCustomerWorkspace(userId: string, locale: Locale) {
  const translationLocales = { in: [locale, defaultLocale] };
  const [requests, orders, projects, notifications, agricultureRequests] = await Promise.all([
    prisma.marketplaceRequest.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            kind: true,
            unit: true,
            district: true,
            translations: {
              where: { locale: translationLocales },
              select: { locale: true, title: true, description: true },
            },
          },
        },
        provider: {
          select: {
            translations: {
              where: { locale: translationLocales },
              select: { locale: true, name: true, bio: true },
            },
          },
        },
        quote: true,
        order: { select: { id: true, status: true } },
      },
    }),
    prisma.order.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            kind: true,
            unit: true,
            translations: { where: { locale: translationLocales }, select: { locale: true, title: true } },
          },
        },
        provider: {
          select: {
            userId: true,
            translations: { where: { locale: translationLocales }, select: { locale: true, name: true } },
          },
        },
        booking: true,
        payments: { orderBy: { createdAt: "desc" } },
        commission: true,
        review: true,
      },
    }),
    prisma.constructionProject.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      include: {
        milestones: { orderBy: { createdAt: "asc" } },
        orders: {
          include: {
            listing: {
              select: {
                kind: true,
                translations: { where: { locale: translationLocales }, select: { locale: true, title: true } },
              },
            },
            provider: {
              select: {
                translations: { where: { locale: translationLocales }, select: { locale: true, name: true } },
              },
            },
            payments: { orderBy: { createdAt: "desc" } },
          },
        },
        requests: {
          include: {
            listing: {
              select: {
                kind: true,
                translations: { where: { locale: translationLocales }, select: { locale: true, title: true } },
              },
            },
            provider: {
              select: {
                id: true,
                translations: { where: { locale: translationLocales }, select: { locale: true, name: true } },
              },
            },
            quote: true,
            order: { select: { id: true, status: true } },
          },
        },
        documents: {
          select: { id: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
        },
        expenses: { orderBy: { occurredAt: "desc" } },
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        translations: {
          where: { locale: translationLocales },
          select: { locale: true, title: true, message: true },
        },
      },
    }),
    prisma.serviceRequest.findMany({
      where: { userId, serviceDefinition: { sectorSlug: "agriculture-labor" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        serviceDefinition: {
          select: {
            slug: true,
            icon: true,
            translations: {
              where: { locale: translationLocales },
              select: { locale: true, title: true, description: true },
            },
          },
        },
        updates: {
          where: { visibility: "CUSTOMER" },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            translations: {
              where: { locale: translationLocales },
              select: { locale: true, message: true },
            },
          },
        },
        attachments: { select: { id: true, filename: true, contentType: true, sizeBytes: true } },
      },
    }),
  ]);

  return {
    requests: requests.map((request) => ({
      id: request.id,
      status: request.status,
      sectorSlug: request.sectorSlug,
      quantity: request.quantity.toString(),
      district: request.district,
      details: request.details,
      requestedStart: iso(request.requestedStart),
      requestedEnd: iso(request.requestedEnd),
      createdAt: iso(request.createdAt),
      listing: {
        ...request.listing,
        ...resolveTranslation(request.listing.translations, defaultLocale, defaultLocale),
      },
      provider: {
        ...request.provider,
        ...resolveTranslation(request.provider.translations, defaultLocale, defaultLocale),
      },
      quote: request.quote
        ? {
            id: request.quote.id,
            status: request.quote.status,
            quantity: request.quote.quantity.toString(),
            unitPrice: request.quote.unitPrice.toString(),
            transportFee: request.quote.transportFee.toString(),
            note: request.quote.note,
            expiresAt: iso(request.quote.expiresAt),
          }
        : null,
      order: request.order,
    })),
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      quantity: order.quantity.toString(),
      unit: order.unit,
      unitPrice: order.unitPrice.toString(),
      subtotal: order.subtotal.toString(),
      transportFee: order.transportFee.toString(),
      commissionAmount: order.commissionAmount.toString(),
      commissionRate: order.commissionRate.toString(),
      cancellationReason: order.cancellationReason,
      cancelRequestedById: order.cancelRequestedById,
      listing: {
        ...order.listing,
        title: resolveTranslation(order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      },
      provider: {
        ...order.provider,
        name: resolveTranslation(order.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
      },
      booking: order.booking
        ? { startsAt: iso(order.booking.startsAt), endsAt: iso(order.booking.endsAt) }
        : null,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        method: payment.method,
        reference: payment.reference,
        paidAt: iso(payment.paidAt),
        submittedById: payment.submittedById,
        buyerConfirmedAt: iso(payment.buyerConfirmedAt),
        providerConfirmedAt: iso(payment.providerConfirmedAt),
        refundAmount: decimal(payment.refundAmount),
        hasReceipt: Boolean(payment.receiptKey),
      })),
      commission: order.commission
        ? { status: order.commission.status, amount: order.commission.amount.toString() }
        : null,
      hasReview: Boolean(order.review),
    })),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title,
      projectType: project.projectType,
      district: project.district,
      description: project.description,
      approximateArea: project.approximateArea,
      budget: decimal(project.budget),
      startsAt: iso(project.startsAt),
      targetEndsAt: iso(project.targetEndsAt),
      status: project.status,
      orders: project.orders.map((order) => ({
        id: order.id,
        status: order.status,
        subtotal: order.subtotal.toString(),
        transportFee: order.transportFee.toString(),
        title: resolveTranslation(order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
        kind: order.listing.kind,
        providerName: resolveTranslation(order.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
        payments: order.payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toString(),
          method: payment.method,
          reference: payment.reference,
          refundAmount: decimal(payment.refundAmount),
          confirmed: Boolean(payment.buyerConfirmedAt && payment.providerConfirmedAt),
          hasReceipt: Boolean(payment.receiptKey),
        })),
      })),
      requests: project.requests.map((request) => ({
        id: request.id,
        status: request.status,
        quantity: request.quantity.toString(),
        district: request.district,
        details: request.details,
        packageLabel: request.packageLabel,
        requestedStart: iso(request.requestedStart),
        requestedEnd: iso(request.requestedEnd),
        listing: {
          ...request.listing,
          ...resolveTranslation(request.listing.translations, defaultLocale, defaultLocale),
        },
        providerId: request.provider.id,
        providerName: resolveTranslation(request.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
        quote: request.quote
          ? {
              id: request.quote.id,
              quantity: request.quote.quantity.toString(),
              unitPrice: request.quote.unitPrice.toString(),
              transportFee: request.quote.transportFee.toString(),
              note: request.quote.note,
              status: request.quote.status,
              expiresAt: iso(request.quote.expiresAt),
            }
          : null,
        order: request.order,
      })),
      milestones: project.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        amount: decimal(milestone.amount),
        dueAt: iso(milestone.dueAt),
        status: milestone.status,
      })),
      documents: project.documents.map((document) => ({
        ...document,
        createdAt: iso(document.createdAt),
      })),
      expenses: project.expenses.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount.toString(),
        occurredAt: iso(expense.occurredAt),
      })),
    })),
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: resolveTranslation(notification.translations, defaultLocale, defaultLocale)?.title ?? notification.title,
      message: resolveTranslation(notification.translations, defaultLocale, defaultLocale)?.message ?? notification.message,
      href: notification.href,
      readAt: iso(notification.readAt),
      createdAt: iso(notification.createdAt),
    })),
    agricultureRequests: agricultureRequests.map((request) => ({
      id: request.id,
      referenceCode: request.referenceCode,
      status: request.status,
      district: request.district,
      details: request.details,
      budget: decimal(request.budget),
      createdAt: iso(request.createdAt),
      service: {
        ...request.serviceDefinition,
        ...resolveTranslation(request.serviceDefinition.translations, defaultLocale, defaultLocale),
      },
      updates: request.updates.map((update) => ({
        id: update.id,
        message: resolveTranslation(update.translations, defaultLocale, defaultLocale)?.message ?? "",
        createdAt: iso(update.createdAt),
      })),
      attachments: request.attachments,
    })),
  };
}

export async function getProviderWorkspace(userId: string, locale: Locale) {
  const translationLocales = { in: [locale, defaultLocale] };
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    include: {
      capabilities: { orderBy: [{ sectorSlug: "asc" }, { kind: "asc" }] },
      listings: {
        orderBy: { createdAt: "desc" },
        include: {
          translations: {
            where: { locale: translationLocales },
            select: { locale: true, title: true, description: true },
          },
        },
      },
      translations: {
        where: { locale: translationLocales },
        select: { locale: true, name: true, bio: true },
      },
    },
  });
  if (!profile) return null;

  const [requests, orders, notifications, projectMilestones] = await Promise.all([
    prisma.marketplaceRequest.findMany({
      where: { providerId: profile.id, status: { in: ["OPEN", "QUOTED"] } },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { name: true } },
        listing: {
          select: {
            kind: true,
            unit: true,
            translations: {
              where: { locale: translationLocales },
              select: { locale: true, title: true, description: true },
            },
          },
        },
        quote: true,
      },
    }),
    prisma.order.findMany({
      where: { providerId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { name: true, id: true } },
        listing: {
          select: {
            kind: true,
            unit: true,
            translations: {
              where: { locale: translationLocales },
              select: { locale: true, title: true, description: true },
            },
          },
        },
        booking: true,
        payments: { orderBy: { createdAt: "desc" } },
        commission: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        translations: {
          where: { locale: translationLocales },
          select: { locale: true, title: true, message: true },
        },
      },
    }),
    prisma.projectMilestone.findMany({
      where: { project: { orders: { some: { providerId: profile.id } } } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      include: { project: { select: { id: true, title: true, district: true } } },
    }),
  ]);

  return {
    profile: {
      id: profile.id,
      name: resolveTranslation(profile.translations, defaultLocale, defaultLocale)?.name ?? "",
      bio: resolveTranslation(profile.translations, defaultLocale, defaultLocale)?.bio ?? "",
      district: profile.district,
      upazila: profile.upazila,
      status: profile.status,
      hasProfileImage: Boolean(profile.profileImageKey),
      hasCoverImage: Boolean(profile.coverImageKey),
    },
    capabilities: profile.capabilities.map((capability) => ({
      id: capability.id,
      sectorSlug: capability.sectorSlug,
      kind: capability.kind,
      status: capability.status,
    })),
    listings: profile.listings.map((listing) => ({
      id: listing.id,
      sectorSlug: listing.sectorSlug,
      kind: listing.kind,
      title: resolveTranslation(listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      description: resolveTranslation(listing.translations, defaultLocale, defaultLocale)?.description ?? "",
      category: listing.category,
      district: listing.district,
      unit: listing.unit,
      unitPrice: listing.unitPrice.toString(),
      stock: listing.stock.toString(),
      availableFrom: iso(listing.availableFrom),
      hasImage: Boolean(listing.imageKey),
      archivedAt: iso(listing.archivedAt),
      moderationStatus: listing.moderationStatus,
      isPublished: listing.isPublished,
    })),
    requests: requests.map((request) => ({
      id: request.id,
      status: request.status,
      quantity: request.quantity.toString(),
      district: request.district,
      details: request.details,
      requestedStart: iso(request.requestedStart),
      requestedEnd: iso(request.requestedEnd),
      buyerName: request.buyer.name,
      listing: {
        ...request.listing,
        ...resolveTranslation(request.listing.translations, defaultLocale, defaultLocale),
      },
      quote: request.quote
        ? {
            id: request.quote.id,
            status: request.quote.status,
            quantity: request.quote.quantity.toString(),
            unitPrice: request.quote.unitPrice.toString(),
            transportFee: request.quote.transportFee.toString(),
            note: request.quote.note,
          }
        : null,
    })),
    orders: orders.map((order) => ({
      id: order.id,
      status: order.status,
      buyerId: order.buyer.id,
      buyerName: order.buyer.name,
      quantity: order.quantity.toString(),
      unit: order.unit,
      unitPrice: order.unitPrice.toString(),
      subtotal: order.subtotal.toString(),
      transportFee: order.transportFee.toString(),
      commissionAmount: order.commissionAmount.toString(),
      listing: {
        ...order.listing,
        ...resolveTranslation(order.listing.translations, defaultLocale, defaultLocale),
        title: resolveTranslation(order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      },
      booking: order.booking
        ? { startsAt: iso(order.booking.startsAt), endsAt: iso(order.booking.endsAt) }
        : null,
      cancellationReason: order.cancellationReason,
      cancelRequestedById: order.cancelRequestedById,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        method: payment.method,
        reference: payment.reference,
        paidAt: iso(payment.paidAt),
        submittedById: payment.submittedById,
        buyerConfirmedAt: iso(payment.buyerConfirmedAt),
        providerConfirmedAt: iso(payment.providerConfirmedAt),
        hasReceipt: Boolean(payment.receiptKey),
      })),
      commission: order.commission
        ? { status: order.commission.status, amount: order.commission.amount.toString() }
        : null,
    })),
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: resolveTranslation(notification.translations, defaultLocale, defaultLocale)?.title ?? notification.title,
      message: resolveTranslation(notification.translations, defaultLocale, defaultLocale)?.message ?? notification.message,
      href: notification.href,
      createdAt: iso(notification.createdAt),
    })),
    projectMilestones: projectMilestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      amount: decimal(milestone.amount),
      dueAt: iso(milestone.dueAt),
      status: milestone.status,
      projectId: milestone.project.id,
      projectTitle: milestone.project.title,
      district: milestone.project.district,
    })),
  };
}

export type AgricultureAdminFilters = {
  serviceSlug?: string;
  district?: string;
  status?: RequestStatus;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getAdminWorkspace(
  access: StaffAccess,
  agricultureFilters: AgricultureAdminFilters = {},
) {
  const sectorSlugs = Array.from(
    new Set([
      ...access.operationSectors,
      ...access.financeSectors,
      ...access.userManagementSectors,
      ...access.panelManagementSectors,
      ...access.reportSectors,
    ]),
  );
  const dateToExclusive = agricultureFilters.dateTo
    ? new Date(`${agricultureFilters.dateTo}T00:00:00.000Z`)
    : undefined;
  dateToExclusive?.setUTCDate(dateToExclusive.getUTCDate() + 1);
  const agricultureWhere = {
    serviceDefinition: {
      sectorSlug: "agriculture-labor",
      ...(agricultureFilters.serviceSlug ? { slug: agricultureFilters.serviceSlug } : {}),
    },
    ...(agricultureFilters.district
      ? { district: { contains: agricultureFilters.district, mode: "insensitive" as const } }
      : {}),
    ...(agricultureFilters.status ? { status: agricultureFilters.status } : {}),
    ...(agricultureFilters.assigneeId ? { assignedToId: agricultureFilters.assigneeId } : {}),
    ...(agricultureFilters.dateFrom || dateToExclusive
      ? {
          createdAt: {
            ...(agricultureFilters.dateFrom
              ? { gte: new Date(`${agricultureFilters.dateFrom}T00:00:00.000Z`) }
              : {}),
            ...(dateToExclusive ? { lt: dateToExclusive } : {}),
          },
        }
      : {}),
  };
  const agricultureEnabled = access.operationSectors.includes("agriculture-labor");
  const [
    capabilities,
    listings,
    requests,
    disputes,
    commissions,
    paymentMismatches,
    sectors,
    staffGrants,
    agricultureRequests,
    agricultureStaff,
  ] = await Promise.all([
    access.operationSectors.length
      ? prisma.providerCapability.findMany({
          where: { status: "PENDING", sectorSlug: { in: access.operationSectors } },
          orderBy: { createdAt: "asc" },
          include: {
            sector: { include: { translations: true } },
            provider: { include: { user: { select: { name: true, email: true, phone: true } }, translations: true } },
          },
        })
      : Promise.resolve([]),
    access.operationSectors.length
      ? prisma.marketplaceListing.findMany({
          where: {
            moderationStatus: "PENDING",
            archivedAt: null,
            sectorSlug: { in: access.operationSectors },
          },
          orderBy: { createdAt: "asc" },
          include: { provider: { include: { translations: true } }, translations: true },
        })
      : Promise.resolve([]),
    access.operationSectors.length
      ? prisma.marketplaceRequest.findMany({
          where: {
            status: { in: ["OPEN", "QUOTED"] },
            sectorSlug: { in: access.operationSectors },
          },
          orderBy: { createdAt: "asc" },
          include: {
            buyer: { select: { name: true } },
            listing: { include: { translations: true } },
            provider: { include: { translations: true } },
            project: { select: { title: true } },
            quote: { select: { quantity: true, unitPrice: true, transportFee: true } },
          },
        })
      : Promise.resolve([]),
    access.operationSectors.length
      ? prisma.order.findMany({
          where: { status: "DISPUTED", request: { sectorSlug: { in: access.operationSectors } } },
          orderBy: { updatedAt: "asc" },
          include: {
            buyer: { select: { name: true } },
            provider: { include: { translations: true } },
            listing: { include: { translations: true } },
            request: { select: { sectorSlug: true } },
          },
        })
      : Promise.resolve([]),
    access.financeSectors.length
      ? prisma.commissionRecord.findMany({
          where: {
            status: "DUE",
            order: { request: { sectorSlug: { in: access.financeSectors } } },
          },
          orderBy: { order: { createdAt: "asc" } },
          include: {
            order: {
              include: {
                buyer: { select: { name: true } },
                provider: { include: { translations: true } },
                listing: { include: { translations: true } },
                request: { select: { sectorSlug: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    access.financeSectors.length
      ? prisma.paymentRecord.findMany({
          where: {
            OR: [{ buyerConfirmedAt: null }, { providerConfirmedAt: null }],
            order: { request: { sectorSlug: { in: access.financeSectors } } },
          },
          orderBy: { createdAt: "asc" },
          include: {
            order: {
              include: {
                buyer: { select: { name: true } },
                provider: { include: { translations: true } },
                listing: { include: { translations: true } },
                request: { select: { sectorSlug: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    sectorSlugs.length
      ? prisma.sector.findMany({
          where: { slug: { in: sectorSlugs } },
          orderBy: { position: "asc" },
          include: { translations: true },
        })
      : Promise.resolve([]),
    access.isSuperAdmin
      ? prisma.staffGrant.findMany({
          orderBy: [{ permission: "asc" }, { scopeKey: "asc" }],
          include: { user: { select: { name: true, email: true } } },
        })
      : Promise.resolve([]),
    agricultureEnabled
      ? prisma.serviceRequest.findMany({
          where: agricultureWhere,
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            serviceDefinition: { include: { translations: true } },
            user: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            updates: {
              orderBy: { createdAt: "desc" },
              take: 10,
              include: { translations: true },
            },
            attachments: { select: { id: true, filename: true, sizeBytes: true } },
            marketplaceRequest: {
              select: { id: true, listing: { include: { translations: true } } },
            },
          },
        })
      : Promise.resolve([]),
    agricultureEnabled
      ? prisma.user.findMany({
          where: {
            status: "active",
            OR: [
              { role: "super_admin" },
              {
                staffGrants: {
                  some: {
                    permission: "OPERATIONS",
                    scopeKey: { in: ["global", "agriculture-labor"] },
                  },
                },
              },
            ],
          },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    capabilities: capabilities.map((capability) => ({
      id: capability.id,
      sectorSlug: capability.sectorSlug,
      sectorTitle: resolveTranslation(capability.sector.translations, defaultLocale, defaultLocale)?.title ?? "",
      kind: capability.kind,
      providerId: capability.provider.id,
      name: resolveTranslation(capability.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
      district: capability.provider.district,
      bio: resolveTranslation(capability.provider.translations, defaultLocale, defaultLocale)?.bio ?? "",
      userName: capability.provider.user.name,
      email: capability.provider.user.email,
      phone: capability.provider.user.phone,
      createdAt: iso(capability.createdAt),
    })),
    listings: listings.map((listing) => ({
      id: listing.id,
      sectorSlug: listing.sectorSlug,
      kind: listing.kind,
      title: resolveTranslation(listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      category: listing.category,
      district: listing.district,
      unit: listing.unit,
      unitPrice: listing.unitPrice.toString(),
      stock: listing.stock.toString(),
      providerName: resolveTranslation(listing.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
    })),
    requests: requests.map((request) => ({
      id: request.id,
      sectorSlug: request.sectorSlug,
      status: request.status,
      buyerName: request.buyer.name,
      providerId: request.provider.id,
      providerName: resolveTranslation(request.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
      title: resolveTranslation(request.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      kind: request.listing.kind,
      unit: request.listing.unit,
      quantity: request.quantity.toString(),
      district: request.district,
      details: request.details,
      packageLabel: request.packageLabel,
      projectTitle: request.project?.title ?? null,
      requestedStart: iso(request.requestedStart),
      requestedEnd: iso(request.requestedEnd),
      createdAt: iso(request.createdAt),
      quote: request.quote
        ? {
            quantity: request.quote.quantity.toString(),
            unitPrice: request.quote.unitPrice.toString(),
            transportFee: request.quote.transportFee.toString(),
          }
        : null,
    })),
    disputes: disputes.map((order) => ({
      id: order.id,
      sectorSlug: order.request.sectorSlug,
      title: resolveTranslation(order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      buyerName: order.buyer.name,
      providerName: resolveTranslation(order.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
      subtotal: order.subtotal.toString(),
      cancellationReason: order.cancellationReason,
    })),
    commissions: commissions.map((commission) => ({
      id: commission.id,
      amount: commission.amount.toString(),
      sectorSlug: commission.order.request.sectorSlug,
      title: resolveTranslation(commission.order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      buyerName: commission.order.buyer.name,
      providerName: resolveTranslation(commission.order.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
    })),
    paymentMismatches: paymentMismatches.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount.toString(),
      reference: payment.reference,
      buyerConfirmed: Boolean(payment.buyerConfirmedAt),
      providerConfirmed: Boolean(payment.providerConfirmedAt),
      hasReceipt: Boolean(payment.receiptKey),
      sectorSlug: payment.order.request.sectorSlug,
      title: resolveTranslation(payment.order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      buyerName: payment.order.buyer.name,
      providerName: resolveTranslation(payment.order.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
    })),
    sectors: sectors.map((sector) => ({
      slug: sector.slug,
      title: resolveTranslation(sector.translations, defaultLocale, defaultLocale)?.title ?? "",
      commissionRate: sector.commissionRate.toString(),
    })),
    staffGrants: staffGrants.map((grant) => ({
      id: grant.id,
      name: grant.user.name,
      email: grant.user.email,
      permission: grant.permission,
      scopeKey: grant.scopeKey,
    })),
    agricultureRequests: agricultureRequests.map((request) => ({
      id: request.id,
      referenceCode: request.referenceCode,
      customerName: request.customerName,
      customerEmail: request.user?.email ?? "",
      phone: request.phone,
      district: request.district,
      details: request.details,
      budget: decimal(request.budget),
      status: request.status,
      createdAt: iso(request.createdAt),
      service: {
        ...request.serviceDefinition,
        ...resolveTranslation(request.serviceDefinition.translations, defaultLocale, defaultLocale),
      },
      answers: request.answers,
      fieldSnapshot: request.fieldSnapshot,
      assignedTo: request.assignedTo,
      userId: request.userId,
      updates: request.updates.map((update) => ({
        id: update.id,
        visibility: update.visibility,
        message: resolveTranslation(update.translations, defaultLocale, defaultLocale)?.message ?? "",
        createdAt: iso(update.createdAt),
      })),
      attachments: request.attachments,
      marketplaceRequest: request.marketplaceRequest
        ? {
            ...request.marketplaceRequest,
            listing: {
              ...request.marketplaceRequest.listing,
              ...resolveTranslation(
                request.marketplaceRequest.listing.translations,
                defaultLocale,
                defaultLocale,
              ),
            },
          }
        : null,
    })),
    agricultureStaff,
    agricultureFilters,
    access,
  };
}

export async function getCustomerAgricultureRequest(userId: string, requestId: number) {
  const request = await prisma.serviceRequest.findFirst({
    where: { id: requestId, userId, serviceDefinition: { sectorSlug: "agriculture-labor" } },
    include: {
      serviceDefinition: { include: { translations: true } },
      updates: {
        where: { visibility: "CUSTOMER" },
        orderBy: { createdAt: "asc" },
        include: { translations: true },
      },
      attachments: {
        select: { id: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
      },
    },
  });
  if (!request) return null;
  return {
    id: request.id,
    referenceCode: request.referenceCode,
    status: request.status,
    customerName: request.customerName,
    phone: request.phone,
    district: request.district,
    details: request.details,
    budget: decimal(request.budget),
    answers: request.answers,
    fieldSnapshot: request.fieldSnapshot,
    createdAt: iso(request.createdAt),
    service: {
      ...request.serviceDefinition,
      ...resolveTranslation(request.serviceDefinition.translations, defaultLocale, defaultLocale),
    },
    updates: request.updates.map((update) => ({
      id: update.id,
      message: resolveTranslation(update.translations, defaultLocale, defaultLocale)?.message ?? "",
      createdAt: iso(update.createdAt),
    })),
    attachments: request.attachments.map((attachment) => ({
      ...attachment,
      createdAt: iso(attachment.createdAt),
    })),
  };
}

export async function getProjectWorkspace(userId: string, projectId: string) {
  const access = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!access) return null;
  const isOwner = access.ownerId === userId;
  let providerId: string | null = null;
  if (!isOwner) {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (!profile || profile.status !== "APPROVED") return null;
    providerId = profile.id;
    const invited = await prisma.marketplaceRequest.findFirst({
      where: { projectId, providerId },
      select: { id: true },
    });
    const engaged = await prisma.order.findFirst({
      where: { projectId, providerId },
      select: { id: true },
    });
    if (!invited && !engaged) return null;
  }

  const project = await prisma.constructionProject.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { name: true } },
      requests: {
        ...(isOwner ? {} : { where: { providerId: providerId ?? undefined } }),
        orderBy: { createdAt: "desc" },
        include: {
          listing: { include: { translations: true } },
          provider: { include: { translations: true } },
          projectPackage: { select: { id: true, label: true, kind: true } },
          quote: true,
          order: { select: { id: true, status: true } },
        },
      },
      orders: {
        ...(isOwner ? {} : { where: { providerId: providerId ?? undefined } }),
        orderBy: { createdAt: "desc" },
        include: {
          listing: { include: { translations: true } },
          provider: { include: { translations: true } },
          projectPackage: { select: { id: true, label: true } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
      packages: {
        ...(isOwner
          ? {}
          : { where: { requests: { some: { providerId: providerId ?? undefined } } } }),
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          description: true,
          kind: true,
          serviceSlug: true,
          preferredListingId: true,
          createdAt: true,
        },
      },
      milestones: {
        ...(isOwner ? {} : { where: { assignedProviderId: providerId ?? undefined } }),
        orderBy: { createdAt: "asc" },
        include: { assignedProvider: { include: { translations: true } } },
      },
      documents: {
        select: { id: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
      },
      photos: {
        select: { id: true, filename: true, contentType: true, sizeBytes: true, createdAt: true },
      },
      expenses: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!project) return null;
  return {
    id: project.id,
    ownerId: project.ownerId,
    isOwner,
    ownerName: project.owner.name,
    title: project.title,
    projectType: project.projectType,
    district: project.district,
    description: project.description,
    approximateArea: project.approximateArea,
    budget: decimal(project.budget),
    startsAt: iso(project.startsAt),
    targetEndsAt: iso(project.targetEndsAt),
    status: project.status,
    handedOverAt: iso(project.handedOverAt),
    packages: project.packages.map((workPackage) => ({
      id: workPackage.id,
      label: workPackage.label,
      description: workPackage.description,
      kind: workPackage.kind,
      serviceSlug: workPackage.serviceSlug,
      preferredListingId: workPackage.preferredListingId,
      createdAt: iso(workPackage.createdAt),
    })),
    requests: project.requests.map((request) => ({
      id: request.id,
      status: request.status,
      quantity: request.quantity.toString(),
      district: request.district,
      details: request.details,
      packageId: request.projectPackage?.id ?? null,
      packageLabel: request.projectPackage?.label ?? request.packageLabel,
      packageKind: request.projectPackage?.kind ?? null,
      requestedStart: iso(request.requestedStart),
      requestedEnd: iso(request.requestedEnd),
      listing: {
        ...request.listing,
        title: resolveTranslation(request.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
        description:
          resolveTranslation(request.listing.translations, defaultLocale, defaultLocale)?.description ?? "",
      },
      providerId: request.provider.id,
      providerName: resolveTranslation(request.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
      quote: request.quote
        ? {
            id: request.quote.id,
            status: request.quote.status,
            quantity: request.quote.quantity.toString(),
            unitPrice: request.quote.unitPrice.toString(),
            transportFee: request.quote.transportFee.toString(),
            note: request.quote.note,
            expiresAt: iso(request.quote.expiresAt),
          }
        : null,
      order: request.order,
    })),
    orders: project.orders.map((order) => ({
      id: order.id,
      status: order.status,
      subtotal: order.subtotal.toString(),
      transportFee: order.transportFee.toString(),
      title: resolveTranslation(order.listing.translations, defaultLocale, defaultLocale)?.title ?? "",
      kind: order.listing.kind,
      providerId: order.provider.id,
      packageId: order.projectPackage?.id ?? null,
      packageLabel: order.projectPackage?.label ?? null,
      providerName: resolveTranslation(order.provider.translations, defaultLocale, defaultLocale)?.name ?? "",
      payments: order.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        method: payment.method,
        reference: payment.reference,
        refundAmount: decimal(payment.refundAmount),
        confirmed: Boolean(payment.buyerConfirmedAt && payment.providerConfirmedAt),
        hasReceipt: Boolean(payment.receiptKey),
      })),
    })),
    milestones: project.milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      amount: decimal(milestone.amount),
      dueAt: iso(milestone.dueAt),
      status: milestone.status,
      assignedProviderId: milestone.assignedProviderId,
      assignedProvider: milestone.assignedProvider
        ? {
            id: milestone.assignedProvider.id,
            name: resolveTranslation(
              milestone.assignedProvider.translations,
              defaultLocale,
              defaultLocale,
            )?.name ?? "",
          }
        : null,
    })),
    documents: project.documents.map((document) => ({
      id: document.id,
      filename: document.filename,
      contentType: document.contentType,
      sizeBytes: document.sizeBytes,
      createdAt: iso(document.createdAt),
    })),
    photos: project.photos.map((photo) => ({
      id: photo.id,
      filename: photo.filename,
      contentType: photo.contentType,
      sizeBytes: photo.sizeBytes,
      createdAt: iso(photo.createdAt),
    })),
    expenses: isOwner
      ? project.expenses.map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount.toString(),
          occurredAt: iso(expense.occurredAt),
        }))
      : [],
  };
}

export async function getProjectPackageContext(
  userId: string,
  projectId: string,
  packageId: string,
) {
  return prisma.projectPackage.findFirst({
    where: { id: packageId, projectId, project: { ownerId: userId } },
    select: { id: true, label: true, kind: true, serviceSlug: true },
  });
}

export type CustomerWorkspace = Awaited<ReturnType<typeof getCustomerWorkspace>>;
export type ProviderWorkspace = NonNullable<Awaited<ReturnType<typeof getProviderWorkspace>>>;
export type AdminWorkspace = Awaited<ReturnType<typeof getAdminWorkspace>>;
export type ProjectWorkspace = NonNullable<Awaited<ReturnType<typeof getProjectWorkspace>>>;
