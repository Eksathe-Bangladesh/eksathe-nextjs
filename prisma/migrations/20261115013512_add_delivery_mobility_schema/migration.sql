-- AlterEnum
ALTER TYPE "ListingKind" ADD VALUE 'DELIVERY_SERVICE';
ALTER TYPE "ListingKind" ADD VALUE 'FREIGHT_TRANSPORT';
ALTER TYPE "ListingKind" ADD VALUE 'VEHICLE_RENTAL';
ALTER TYPE "ListingKind" ADD VALUE 'PRIVATE_VEHICLE_CHARTER';

-- CreateTable
CREATE TABLE "marketplace_request_details" (
    "request_id" TEXT NOT NULL,
    "pickup_district" TEXT NOT NULL,
    "pickup_address" TEXT,
    "destination_district" TEXT NOT NULL,
    "destination_address" TEXT,
    "cargo_description" TEXT,
    "parcel_count" INTEGER,
    "passenger_count" INTEGER,
    "weight_kg" DECIMAL(12,3),
    "volume_m3" DECIMAL(12,3),
    "handling_notes" TEXT,

    CONSTRAINT "marketplace_request_details_pkey" PRIMARY KEY ("request_id"),
    CONSTRAINT "marketplace_request_details_pickup_district_nonempty_check"
        CHECK (length(btrim("pickup_district")) > 0),
    CONSTRAINT "marketplace_request_details_dest_district_nonempty_check"
        CHECK (length(btrim("destination_district")) > 0),
    CONSTRAINT "marketplace_request_details_parcel_count_positive_check"
        CHECK ("parcel_count" IS NULL OR "parcel_count" > 0),
    CONSTRAINT "marketplace_request_details_passenger_count_positive_check"
        CHECK ("passenger_count" IS NULL OR "passenger_count" > 0),
    CONSTRAINT "marketplace_request_details_weight_kg_positive_check"
        CHECK ("weight_kg" IS NULL OR "weight_kg" > 0),
    CONSTRAINT "marketplace_request_details_volume_m3_positive_check"
        CHECK ("volume_m3" IS NULL OR "volume_m3" > 0)
);

-- CreateTable
CREATE TABLE "vehicle_listing_details" (
    "listing_id" TEXT NOT NULL,
    "vehicle_class" TEXT NOT NULL,
    "passenger_capacity" INTEGER,
    "cargo_capacity_kg" DECIMAL(12,3),

    CONSTRAINT "vehicle_listing_details_pkey" PRIMARY KEY ("listing_id"),
    CONSTRAINT "vehicle_listing_details_vehicle_class_nonempty_check"
        CHECK (length(btrim("vehicle_class")) > 0),
    CONSTRAINT "vehicle_listing_details_passenger_capacity_positive_check"
        CHECK ("passenger_capacity" IS NULL OR "passenger_capacity" > 0),
    CONSTRAINT "vehicle_listing_details_cargo_capacity_kg_positive_check"
        CHECK ("cargo_capacity_kg" IS NULL OR "cargo_capacity_kg" > 0)
);

-- AlterTable
ALTER TABLE "orders"
    ADD COLUMN "vehicle_class_snapshot" TEXT,
    ADD COLUMN "passenger_capacity_snapshot" INTEGER,
    ADD COLUMN "cargo_capacity_kg_snapshot" DECIMAL(12,3);

-- CreateIndex
CREATE INDEX "marketplace_request_details_pickup_district_destination_dis_idx" ON "marketplace_request_details"("pickup_district", "destination_district");
CREATE INDEX ON "vehicle_listing_details"("vehicle_class", "passenger_capacity");

-- AddForeignKey
ALTER TABLE "marketplace_request_details"
    ADD CONSTRAINT "marketplace_request_details_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES "marketplace_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_listing_details"
    ADD CONSTRAINT "vehicle_listing_details_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
