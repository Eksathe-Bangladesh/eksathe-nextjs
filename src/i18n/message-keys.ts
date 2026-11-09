import type messages from "../../messages/en.json";

export type Messages = typeof messages;
export type SectorMessageKey = keyof Messages["sectors"];
export type ConstructionServiceSlug = keyof Messages["constructionServices"];
export type StatusMessageKey = keyof Messages["statuses"];

// Only enum identifiers live here; translated display text stays in the catalogs.
const statusKeys = {
  PENDING: "statuses.PENDING",
  APPROVED: "statuses.APPROVED",
  REJECTED: "statuses.REJECTED",
  SUSPENDED: "statuses.SUSPENDED",
  OPEN: "statuses.OPEN",
  NEW: "statuses.NEW",
  REVIEWING: "statuses.REVIEWING",
  ASSIGNED: "statuses.ASSIGNED",
  QUOTED: "statuses.QUOTED",
  ACCEPTED: "statuses.ACCEPTED",
  CANCELLED: "statuses.CANCELLED",
  CONFIRMED: "statuses.CONFIRMED",
  IN_PROGRESS: "statuses.IN_PROGRESS",
  AWAITING_CONFIRMATION: "statuses.AWAITING_CONFIRMATION",
  COMPLETED: "statuses.COMPLETED",
  DISPUTED: "statuses.DISPUTED",
  DUE: "statuses.DUE",
  COLLECTED: "statuses.COLLECTED",
  WAIVED: "statuses.WAIVED",
  REVIEW: "statuses.REVIEW",
  PLANNING: "statuses.PLANNING",
  ACTIVE: "statuses.ACTIVE",
} as const satisfies { [Key in StatusMessageKey]: `statuses.${Key}` };

export function statusMessageKey(status: string) {
  // DB values may include new/unknown statuses; never pass them unchecked to t().
  return Object.hasOwn(statusKeys, status) ? statusKeys[status as StatusMessageKey] : null;
}
