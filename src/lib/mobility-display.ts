import { isMobilityListingKind } from "@/lib/domain/marketplace-rules";
import { isVehicleListingKind } from "@/lib/sector-listing-kinds";

type DecimalValue = { toString(): string };
export type VehicleDisplay = {
  vehicleClass: string;
  passengerCapacity: number | null;
  cargoCapacityKg: string | null;
};
export type MobilityRequestDisplay = {
  pickupDistrict: string;
  pickupAddress: string | null;
  destinationDistrict: string;
  destinationAddress: string | null;
  cargoDescription: string | null;
  parcelCount: number | null;
  passengerCount: number | null;
  weightKg: string | null;
  volumeM3: string | null;
  handlingNotes: string | null;
};

// Explicit projections keep persistence metadata out of client components.
export function serializeVehicleDisplay(
  kind: string,
  details:
    | (Omit<VehicleDisplay, "cargoCapacityKg"> & { cargoCapacityKg: DecimalValue | null })
    | null
    | undefined,
): VehicleDisplay | null {
  if (!isVehicleListingKind(kind) || !details) return null;
  return {
    vehicleClass: details.vehicleClass,
    passengerCapacity: details.passengerCapacity,
    cargoCapacityKg: details.cargoCapacityKg?.toString() ?? null,
  };
}

export function serializeMobilityRequestDisplay(
  kind: string,
  details:
    | (Omit<MobilityRequestDisplay, "weightKg" | "volumeM3"> & {
        weightKg: DecimalValue | null;
        volumeM3: DecimalValue | null;
      })
    | null
    | undefined,
): MobilityRequestDisplay | null {
  if (!isMobilityListingKind(kind) || !details) return null;
  return {
    pickupDistrict: details.pickupDistrict,
    pickupAddress: details.pickupAddress,
    destinationDistrict: details.destinationDistrict,
    destinationAddress: details.destinationAddress,
    cargoDescription: details.cargoDescription,
    parcelCount: details.parcelCount,
    passengerCount: details.passengerCount,
    weightKg: details.weightKg?.toString() ?? null,
    volumeM3: details.volumeM3?.toString() ?? null,
    handlingNotes: details.handlingNotes,
  };
}
