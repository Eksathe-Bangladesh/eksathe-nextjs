-- CreateEnum
CREATE TYPE "ProviderVerificationType" AS ENUM ('CONTRACTOR', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "ProviderApplicantType" AS ENUM ('INDIVIDUAL', 'BUSINESS');

-- CreateEnum
CREATE TYPE "ProviderVerificationStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ProviderVerificationDocumentType" AS ENUM ('BUSINESS_REGISTRATION', 'TRADE_LICENSE', 'TAX_DOCUMENT', 'PROFESSIONAL_CREDENTIAL', 'PORTFOLIO_OR_REFERENCE', 'SUPPLIER_AUTHORIZATION', 'PRODUCT_CERTIFICATE', 'WAREHOUSE_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderVerificationDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "provider_verification_applications" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "type" "ProviderVerificationType" NOT NULL,
    "applicant_type" "ProviderApplicantType" NOT NULL,
    "legal_name" TEXT NOT NULL,
    "business_name" TEXT,
    "business_address" TEXT NOT NULL,
    "registration_number" TEXT,
    "trade_license_number" TEXT,
    "tax_identifier" TEXT,
    "years_experience" INTEGER,
    "team_size" INTEGER,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "material_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ProviderVerificationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "review_note" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_verification_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verification_application_versions" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "applicant_type" "ProviderApplicantType" NOT NULL,
    "legal_name" TEXT NOT NULL,
    "business_name" TEXT,
    "business_address" TEXT NOT NULL,
    "registration_number" TEXT,
    "trade_license_number" TEXT,
    "tax_identifier" TEXT,
    "years_experience" INTEGER,
    "team_size" INTEGER,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "material_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "service_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_verification_application_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verification_documents" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "document_type" "ProviderVerificationDocumentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "ProviderVerificationDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verification_reviews" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" "ProviderVerificationStatus" NOT NULL,
    "note" TEXT,
    "document_decisions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_verification_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_verification_applications_type_status_submitted_at_idx" ON "provider_verification_applications"("type", "status", "submitted_at");

-- CreateIndex
CREATE INDEX "provider_verification_applications_provider_id_status_idx" ON "provider_verification_applications"("provider_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_verification_applications_provider_id_type_key" ON "provider_verification_applications"("provider_id", "type");

-- CreateIndex
CREATE INDEX "provider_verification_application_versions_application_id_s_idx" ON "provider_verification_application_versions"("application_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_verification_application_versions_application_id_v_key" ON "provider_verification_application_versions"("application_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "provider_verification_documents_storage_key_key" ON "provider_verification_documents"("storage_key");

-- CreateIndex
CREATE INDEX "provider_verification_documents_application_id_version_crea_idx" ON "provider_verification_documents"("application_id", "version", "created_at");

-- CreateIndex
CREATE INDEX "provider_verification_reviews_application_id_created_at_idx" ON "provider_verification_reviews"("application_id", "created_at");

-- AddForeignKey
ALTER TABLE "provider_verification_applications" ADD CONSTRAINT "provider_verification_applications_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verification_applications" ADD CONSTRAINT "provider_verification_applications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verification_application_versions" ADD CONSTRAINT "provider_verification_application_versions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "provider_verification_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verification_documents" ADD CONSTRAINT "provider_verification_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "provider_verification_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verification_documents" ADD CONSTRAINT "provider_verification_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verification_reviews" ADD CONSTRAINT "provider_verification_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "provider_verification_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verification_reviews" ADD CONSTRAINT "provider_verification_reviews_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
