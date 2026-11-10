export const agricultureAccountTypes = [
  "customer",
  "farmer",
  "agro_laborer",
  "agronomist",
  "veterinarian",
  "agro_seller",
  "agriculture_professional",
] as const;

export type AgricultureAccountType = (typeof agricultureAccountTypes)[number];

export const agricultureAccountStatuses = ["active", "pending", "suspended"] as const;

export type AgricultureAccountStatus = (typeof agricultureAccountStatuses)[number];

export function isAgricultureAccountType(value: string): value is AgricultureAccountType {
  return agricultureAccountTypes.some((accountType) => accountType === value);
}
