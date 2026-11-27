import { z } from "zod";

export type ShipmentMeasurementPolicy = { maximum: number | string };

// Compare exact thousandths, never rounded floating-point multiplication.
// Numbers are checked using their JS decimal representation; callers needing
// preservation of the original lexical precision must supply strings.
function thousandths(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = typeof value === "string" ? value.trim() : String(value);
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,3})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  // At most 999,999,999,999: safely below Number.MAX_SAFE_INTEGER.
  const scaled = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  return scaled > 0 ? scaled : null;
}

export function createShipmentMeasurementSchema(policy: ShipmentMeasurementPolicy) {
  const maximum = thousandths(policy?.maximum);
  if (maximum === null) throw new Error("Invalid shipment measurement policy");
  return z
    .union([z.string(), z.number()])
    .refine((value) => {
      const scaled = thousandths(value);
      return scaled !== null && scaled <= maximum;
    }, "Invalid shipment measurement")
    .transform(Number);
}
