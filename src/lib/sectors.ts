import type { SectorMessageKey } from "@/i18n/message-keys";

export interface DashboardCategory {
  id: number;
  slug: SectorMessageKey;
  icon: string;
  status: "live" | "coming-soon";
}

export type SectorDefinition = DashboardCategory;

export const sectors = [
  {
    id: 1,
    slug: "family-household",
    icon: "🏠",
    status: "coming-soon",
  },
  {
    id: 2,
    slug: "ecommerce-b2b",
    icon: "🛒",
    status: "live",
  },
  {
    id: 3,
    slug: "repair-services",
    icon: "🔧",
    status: "coming-soon",
  },
  {
    id: 4,
    slug: "agriculture-labor",
    icon: "🌾",
    status: "live",
  },
  {
    id: 5,
    slug: "construction",
    icon: "🏗️",
    status: "live",
  },
  {
    id: 6,
    slug: "transport-bus",
    icon: "🚌",
    status: "coming-soon",
  },
  {
    id: 7,
    slug: "tourism",
    icon: "🧳",
    status: "coming-soon",
  },
  {
    id: 8,
    slug: "healthcare",
    icon: "🏥",
    status: "coming-soon",
  },
  { id: 9, slug: "events", icon: "🎉", status: "coming-soon" },
  {
    id: 10,
    slug: "isp-utility",
    icon: "🌐",
    status: "coming-soon",
  },
  {
    id: 11,
    slug: "jobs-professionals",
    icon: "💼",
    status: "coming-soon",
  },
  {
    id: 12,
    slug: "social-feed",
    icon: "💬",
    status: "coming-soon",
  },
  {
    id: 13,
    slug: "payment-compliance",
    icon: "💳",
    status: "coming-soon",
  },
  {
    id: 14,
    slug: "logistics-delivery",
    icon: "\u{1F4E6}",
    status: "coming-soon",
  },
  {
    id: 15,
    slug: "transport-vehicle-services",
    icon: "\u{1F698}",
    status: "coming-soon",
  },
] as const satisfies readonly SectorDefinition[];

export type SectorSlug = (typeof sectors)[number]["slug"];

export function getSector(slug: string) {
  return sectors.find((sector) => sector.slug === slug);
}

export function isLiveSector(slug: string): slug is "agriculture-labor" | "construction" {
  return slug === "agriculture-labor" || slug === "construction";
}

export const agricultureListings = [
  {
    slug: "produce-market",
    kind: "PRODUCE",
    icon: "🥬",
    unit: "kg",
  },
  {
    slug: "farm-labour",
    kind: "WORKER",
    icon: "👨‍🌾",
    unit: "day",
  },
  {
    slug: "farm-machinery",
    kind: "MACHINERY",
    icon: "🚜",
    unit: "day",
  },
] as const;

export const constructionListings = [
  {
    slug: "construction-material",
    kind: "CONSTRUCTION_MATERIAL",
    icon: "🧱",
    unit: "piece",
  },
  {
    slug: "construction-service",
    kind: "CONSTRUCTION_SERVICE",
    icon: "👷",
    unit: "job",
  },
] as const;
