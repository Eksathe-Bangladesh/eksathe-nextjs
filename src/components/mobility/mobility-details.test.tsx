import { expect, test } from "bun:test";

import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { getListingFulfillment } from "@/lib/domain/marketplace-rules";
import { serializeMobilityRequestDisplay, serializeVehicleDisplay } from "@/lib/mobility-display";

import bn from "../../../messages/bn.json";
import en from "../../../messages/en.json";
import { MobilityDetails } from "./mobility-details";

const vehicle = {
  vehicleClass: "Minibus",
  passengerCapacity: 12,
  cargoCapacityKg: { toString: () => "1250.500" },
  privateOwnerPhone: "PRIVATE_OWNER",
};
const request = {
  pickupDistrict: "Dhaka",
  pickupAddress: "PRIVATE_PICKUP",
  destinationDistrict: "Sylhet",
  destinationAddress: "PRIVATE_DESTINATION",
  cargoDescription: "Fragile boxes",
  parcelCount: 3,
  passengerCount: 8,
  weightKg: { toString: () => "42.125" },
  volumeM3: { toString: () => "2.500" },
  handlingNotes: "Keep upright",
  requestId: "PRIVATE_ID",
};
function render(kind: string, locale: "en" | "bn", includeRequest = false) {
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : bn}
      timeZone="Asia/Dhaka"
    >
      <MobilityDetails
        kind={kind}
        vehicleDetails={serializeVehicleDisplay(kind, vehicle)}
        mobilityDetails={
          includeRequest ? serializeMobilityRequestDisplay(kind, request) : undefined
        }
      />
    </NextIntlClientProvider>,
  );
}

test("public vehicle display includes capacities without customer or owner data", () => {
  const html = render("VEHICLE_RENTAL", "en");
  for (const value of ["Minibus", "Passenger capacity", "12", "1250.500"])
    expect(html).toContain(value);
  for (const value of ["PRIVATE_", "Pickup", "Requested passengers"])
    expect(html).not.toContain(value);
  expect(Object.keys(serializeVehicleDisplay("VEHICLE_RENTAL", vehicle)!)).toEqual([
    "vehicleClass",
    "passengerCapacity",
    "cargoCapacityKg",
  ]);
});

test("provider display distinguishes requested passengers and weight from vehicle capacity", () => {
  const html = render("PRIVATE_VEHICLE_CHARTER", "en", true);
  for (const value of [
    "Requested passengers",
    "Passenger capacity",
    "Cargo capacity (kg)",
    "Requested weight (kg)",
    "PRIVATE_PICKUP",
    "PRIVATE_DESTINATION",
    "Fragile boxes",
    "Keep upright",
    "42.125",
    "2.500",
  ])
    expect(html).toContain(value);
  expect(html).not.toContain("PRIVATE_ID");
  expect(html).not.toContain("PRIVATE_OWNER");
});

test.each(["DELIVERY_SERVICE", "FREIGHT_TRANSPORT"])(
  "logistics details render for %s without fabricated vehicle capacity",
  (kind) => {
    const html = render(kind, "en", true);
    expect(html).toContain("Parcel count");
    expect(html).toContain("Dhaka");
    expect(html).not.toContain("Minibus");
  },
);

test("missing optional values produce no empty labels or fabricated values", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dhaka">
      <MobilityDetails
        kind="VEHICLE_RENTAL"
        vehicleDetails={{ vehicleClass: "Car", passengerCapacity: null, cargoCapacityKg: null }}
      />
    </NextIntlClientProvider>,
  );
  expect(html).toContain("Car");
  expect(html).not.toContain("Passenger capacity");
  expect(html).not.toContain("Cargo capacity");
});

test.each(["PRODUCE", "WORKER", "MACHINERY", "CONSTRUCTION_SERVICE", "CONSTRUCTION_MATERIAL"])(
  "non-Mobility display stays empty for %s",
  (kind) => {
    expect(render(kind, "en", true)).toBe("");
  },
);

test("Bangla labels use the matching translation contract", () => {
  const html = render("VEHICLE_RENTAL", "bn", true);
  expect(html).toContain(bn.mobilityDisplay.passengerCapacity);
  expect(html).toContain(bn.mobilityDisplay.pickupAddress);
  expect(Object.keys(en.mobilityDisplay).sort()).toEqual(Object.keys(bn.mobilityDisplay).sort());
});

test("missing details remain absent and decimal values cross the client boundary as strings", () => {
  expect(serializeVehicleDisplay("VEHICLE_RENTAL", null)).toBeNull();
  expect(serializeMobilityRequestDisplay("DELIVERY_SERVICE", undefined)).toBeNull();
  const data = serializeMobilityRequestDisplay("FREIGHT_TRANSPORT", request);
  expect(data?.weightKg).toBe("42.125");
  expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  expect(data).not.toHaveProperty("requestId");
});

test("rental uses scheduled availability and other fulfillment kinds retain their classification", () => {
  expect(getListingFulfillment("VEHICLE_RENTAL")).toBe("scheduled");
  expect(getListingFulfillment("WORKER")).toBe("scheduled");
  expect(getListingFulfillment("PRODUCE")).toBe("finite-stock");
  expect(getListingFulfillment("PRIVATE_VEHICLE_CHARTER")).toBe("quote");
});
