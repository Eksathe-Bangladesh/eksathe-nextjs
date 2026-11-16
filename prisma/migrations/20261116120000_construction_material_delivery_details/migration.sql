ALTER TABLE "marketplace_requests"
ADD COLUMN "delivery_address" TEXT,
ADD COLUMN "delivery_instructions" TEXT,
ADD COLUMN "requested_delivery_date" TIMESTAMP(3),
ADD COLUMN "unloading_arrangement" TEXT;

ALTER TABLE "orders"
ADD COLUMN "delivery_address" TEXT,
ADD COLUMN "delivery_instructions" TEXT,
ADD COLUMN "requested_delivery_date" TIMESTAMP(3),
ADD COLUMN "unloading_arrangement" TEXT;
