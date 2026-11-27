"use client";

import { useTranslations } from "next-intl";

import { isMobilityListingKind } from "@/lib/domain/marketplace-rules";
import type { MobilityRequestDisplay, VehicleDisplay } from "@/lib/mobility-display";
import { isVehicleListingKind } from "@/lib/sector-listing-kinds";

export function MobilityDetails({
  kind,
  vehicleDetails,
  mobilityDetails,
}: {
  kind: string;
  vehicleDetails?: VehicleDisplay | null;
  mobilityDetails?: MobilityRequestDisplay | null;
}) {
  const t = useTranslations("mobilityDisplay");
  if (!isMobilityListingKind(kind)) return null;
  const vehicle = isVehicleListingKind(kind) ? vehicleDetails : null;
  const rows = [
    ["vehicleClass", vehicle?.vehicleClass],
    ["passengerCapacity", vehicle?.passengerCapacity],
    ["cargoCapacityKg", vehicle?.cargoCapacityKg],
    ["pickupDistrict", mobilityDetails?.pickupDistrict],
    ["pickupAddress", mobilityDetails?.pickupAddress],
    ["destinationDistrict", mobilityDetails?.destinationDistrict],
    ["destinationAddress", mobilityDetails?.destinationAddress],
    ["passengerCount", mobilityDetails?.passengerCount],
    ["cargoDescription", mobilityDetails?.cargoDescription],
    ["parcelCount", mobilityDetails?.parcelCount],
    ["weightKg", mobilityDetails?.weightKg],
    ["volumeM3", mobilityDetails?.volumeM3],
    ["handlingNotes", mobilityDetails?.handlingNotes],
  ] as const;
  const present = rows.filter(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== "",
  );
  if (!present.length) return null;
  return (
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      {present.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{t(label)}</dt>
          <dd className="wrap-break-word whitespace-pre-line">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
