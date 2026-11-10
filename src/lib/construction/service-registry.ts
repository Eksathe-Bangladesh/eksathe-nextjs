import type { ConstructionServiceSlug } from "@/i18n/message-keys";

export type ConstructionService = {
  slug: ConstructionServiceSlug;
  group: "professionals" | "trades" | "materials";
  kind: "CONSTRUCTION_SERVICE" | "CONSTRUCTION_MATERIAL";
  icon: string;
  searchTerms: string[];
};

export const constructionServiceCategories = [
  { id: "professionals" },
  { id: "trades" },
  { id: "materials" },
] as const;

export const constructionServiceRegistry = [
  {
    slug: "contractors",
    group: "professionals",
    kind: "CONSTRUCTION_SERVICE",
    icon: "👷",
    searchTerms: ["contractor", "builder", "ঠিকাদার", "নির্মাতা"],
  },
  {
    slug: "engineers",
    group: "professionals",
    kind: "CONSTRUCTION_SERVICE",
    icon: "📐",
    searchTerms: ["engineer", "engineering", "প্রকৌশলী", "ইঞ্জিনিয়ার"],
  },
  {
    slug: "architects",
    group: "professionals",
    kind: "CONSTRUCTION_SERVICE",
    icon: "🏛️",
    searchTerms: ["architect", "design", "স্থপতি", "নকশা"],
  },
  {
    slug: "masonry",
    group: "trades",
    kind: "CONSTRUCTION_SERVICE",
    icon: "🧱",
    searchTerms: ["mason", "masonry", "brick", "concrete", "রাজমিস্ত্রি", "ইট"],
  },
  {
    slug: "electrical",
    group: "trades",
    kind: "CONSTRUCTION_SERVICE",
    icon: "⚡",
    searchTerms: ["electric", "electrical", "wiring", "ইলেকট্রিক", "বৈদ্যুতিক"],
  },
  {
    slug: "plumbing",
    group: "trades",
    kind: "CONSTRUCTION_SERVICE",
    icon: "🚰",
    searchTerms: ["plumb", "water", "প্লাম্ব", "পানির লাইন"],
  },
  {
    slug: "painting-finishing",
    group: "trades",
    kind: "CONSTRUCTION_SERVICE",
    icon: "🖌️",
    searchTerms: ["paint", "finishing", "tile", "রং", "ফিনিশিং", "টাইলস"],
  },
  {
    slug: "building-materials",
    group: "materials",
    kind: "CONSTRUCTION_MATERIAL",
    icon: "🧱",
    searchTerms: ["material", "materials", "supply", "সামগ্রী", "সরবরাহ"],
  },
] as const satisfies readonly ConstructionService[];

export function getConstructionService(slug: string) {
  return constructionServiceRegistry.find((service) => service.slug === slug);
}
