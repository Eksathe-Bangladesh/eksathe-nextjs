"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";

import { submitProviderVerificationAction } from "@/app/actions/provider-verification";
import { FormField as Field } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { uploadPrivateFile } from "@/lib/client-upload";
import { verificationMessageKey } from "@/lib/construction/verification-labels";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { ProviderWorkspace } from "@/lib/workspaces";

type VerificationApplication = ProviderWorkspace["verificationApplications"][number];
type VerificationType = "CONTRACTOR" | "SUPPLIER";
type DocumentType = VerificationApplication["documents"][number]["documentType"];
type UploadedDocument = {
  documentType: DocumentType;
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};
type DocumentRow = { id: number; type: DocumentType; filename: string; uploading: boolean };

const documentTypes: Record<VerificationType, DocumentType[]> = {
  CONTRACTOR: [
    "BUSINESS_REGISTRATION",
    "TRADE_LICENSE",
    "PROFESSIONAL_CREDENTIAL",
    "PORTFOLIO_OR_REFERENCE",
    "TAX_DOCUMENT",
    "OTHER",
  ],
  SUPPLIER: [
    "BUSINESS_REGISTRATION",
    "TRADE_LICENSE",
    "SUPPLIER_AUTHORIZATION",
    "PRODUCT_CERTIFICATE",
    "WAREHOUSE_PROOF",
    "TAX_DOCUMENT",
    "OTHER",
  ],
};

export function ProviderVerificationPanel({
  applications,
  capabilityTypes,
}: {
  applications: VerificationApplication[];
  capabilityTypes: VerificationType[];
}) {
  const t = useTranslations();
  if (!capabilityTypes.length) return null;
  return (
    <section id="construction-verification" className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{t("verification.provider.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("verification.provider.description")}
        </p>
      </div>
      {capabilityTypes.map((type) => {
        const application = applications.find((entry) => entry.type === type) ?? null;
        return <VerificationCard key={type} type={type} application={application} />;
      })}
    </section>
  );
}

function VerificationCard({
  type,
  application,
}: {
  type: VerificationType;
  application: VerificationApplication | null;
}) {
  const t = useTranslations();
  const canResubmit =
    !application ||
    ["CHANGES_REQUESTED", "REJECTED", "REVOKED", "EXPIRED"].includes(application.status);
  return (
    <div className="border-border/70 bg-card flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {t(`verification.types.${verificationMessageKey(type)}`)}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {t(`verification.provider.typeDescription.${verificationMessageKey(type)}`)}
          </p>
        </div>
        {application && <StatusBadge status={application.status} />}
      </div>
      {application?.reviewNote && (
        <div className="border-border/70 bg-muted/40 rounded-lg border p-3 text-sm">
          <p className="font-medium">{t("verification.provider.reviewNote")}</p>
          <p className="mt-1 whitespace-pre-line">{application.reviewNote}</p>
        </div>
      )}
      {application?.expiresAt && application.status === "APPROVED" && (
        <p className="text-muted-foreground text-sm">
          {t("verification.provider.validUntil", {
            date: new Date(application.expiresAt).toLocaleDateString(),
          })}
        </p>
      )}
      {application?.documents.length ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {application.documents.map((document) => (
            <a
              key={document.id}
              href={`/api/provider-verification/documents/${encodeURIComponent(document.id)}`}
              className="text-primary hover:underline"
            >
              {t(`verification.documents.${verificationMessageKey(document.documentType)}`)} · v
              {document.version}
            </a>
          ))}
        </div>
      ) : null}
      {canResubmit ? (
        <ProviderVerificationForm type={type} initial={application} />
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("verification.provider.waitingForReview")}
        </p>
      )}
    </div>
  );
}

function ProviderVerificationForm({
  type,
  initial,
}: {
  type: VerificationType;
  initial: VerificationApplication | null;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    submitProviderVerificationAction,
    initialWorkflowState,
  );
  const [rows, setRows] = useState<DocumentRow[]>([
    {
      id: 1,
      type: type === "CONTRACTOR" ? "PORTFOLIO_OR_REFERENCE" : "TRADE_LICENSE",
      filename: "",
      uploading: false,
    },
  ]);
  const [documents, setDocuments] = useState<Record<number, UploadedDocument>>({});
  const [uploadError, setUploadError] = useState(false);
  const nextRowId = useRef(2);
  const fileInputs = useRef(new Map<number, HTMLInputElement>());

  async function uploadDocument(rowId: number, file?: File) {
    if (!file) return;
    const row = rows.find((item) => item.id === rowId);
    if (!row) return;
    setDocuments((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
    setRows((current) =>
      current.map((item) =>
        item.id === rowId ? { ...item, uploading: true, filename: file.name } : item,
      ),
    );
    setUploadError(false);
    try {
      const result = await uploadPrivateFile(file, {
        purpose: "provider-verification-document",
        verificationType: type,
        documentType: row.type,
      });
      setDocuments((current) => ({
        ...current,
        [rowId]: {
          documentType: row.type,
          storageKey: result.key,
          filename: file.name,
          contentType: result.contentType,
          sizeBytes: Number(result.sizeBytes),
        },
      }));
    } catch {
      setUploadError(true);
      setRows((current) =>
        current.map((item) => (item.id === rowId ? { ...item, filename: "" } : item)),
      );
    } finally {
      setRows((current) =>
        current.map((item) => (item.id === rowId ? { ...item, uploading: false } : item)),
      );
    }
  }

  function addRow() {
    if (rows.length >= 8) return;
    const id = nextRowId.current++;
    setRows((current) => [
      ...current,
      {
        id,
        type: type === "CONTRACTOR" ? "PORTFOLIO_OR_REFERENCE" : "TRADE_LICENSE",
        filename: "",
        uploading: false,
      },
    ]);
  }

  function removeRow(id: number) {
    setRows((current) => current.filter((row) => row.id !== id));
    setDocuments((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    fileInputs.current.delete(id);
  }

  function changeDocumentType(id: number, nextType: DocumentType) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, type: nextType, filename: "" } : row)),
    );
    setDocuments((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    const input = fileInputs.current.get(id);
    if (input) input.value = "";
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="documentsJson" value={JSON.stringify(Object.values(documents))} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${type}-applicantType`} label={t("verification.fields.applicantType")}>
          <NativeSelect
            id={`${type}-applicantType`}
            name="applicantType"
            defaultValue={initial?.applicantType ?? "BUSINESS"}
          >
            <NativeSelectOption value="BUSINESS">
              {t("verification.applicantTypes.business")}
            </NativeSelectOption>
            <NativeSelectOption value="INDIVIDUAL">
              {t("verification.applicantTypes.individual")}
            </NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field id={`${type}-legalName`} label={t("verification.fields.legalName")}>
          <Input
            id={`${type}-legalName`}
            name="legalName"
            required
            maxLength={120}
            defaultValue={initial?.legalName ?? ""}
          />
        </Field>
        <Field id={`${type}-businessName`} label={t("verification.fields.businessName")}>
          <Input
            id={`${type}-businessName`}
            name="businessName"
            maxLength={120}
            defaultValue={initial?.businessName ?? ""}
          />
        </Field>
        <Field id={`${type}-businessAddress`} label={t("verification.fields.businessAddress")}>
          <Input
            id={`${type}-businessAddress`}
            name="businessAddress"
            required
            maxLength={500}
            defaultValue={initial?.businessAddress ?? ""}
          />
        </Field>
        <Field
          id={`${type}-registrationNumber`}
          label={t("verification.fields.registrationNumber")}
        >
          <Input
            id={`${type}-registrationNumber`}
            name="registrationNumber"
            maxLength={100}
            defaultValue={initial?.registrationNumber ?? ""}
          />
        </Field>
        <Field
          id={`${type}-tradeLicenseNumber`}
          label={t("verification.fields.tradeLicenseNumber")}
        >
          <Input
            id={`${type}-tradeLicenseNumber`}
            name="tradeLicenseNumber"
            maxLength={100}
            defaultValue={initial?.tradeLicenseNumber ?? ""}
          />
        </Field>
        <Field id={`${type}-taxIdentifier`} label={t("verification.fields.taxIdentifier")}>
          <Input
            id={`${type}-taxIdentifier`}
            name="taxIdentifier"
            maxLength={100}
            defaultValue={initial?.taxIdentifier ?? ""}
          />
        </Field>
        <Field id={`${type}-serviceAreas`} label={t("verification.fields.serviceAreas")}>
          <Input
            id={`${type}-serviceAreas`}
            name="serviceAreas"
            maxLength={1200}
            defaultValue={initial?.serviceAreas.join(", ") ?? ""}
          />
        </Field>
        {type === "CONTRACTOR" ? (
          <>
            <Field id={`${type}-yearsExperience`} label={t("verification.fields.yearsExperience")}>
              <Input
                id={`${type}-yearsExperience`}
                name="yearsExperience"
                type="number"
                min="0"
                max="70"
                defaultValue={initial?.yearsExperience ?? ""}
              />
            </Field>
            <Field id={`${type}-teamSize`} label={t("verification.fields.teamSize")}>
              <Input
                id={`${type}-teamSize`}
                name="teamSize"
                type="number"
                min="1"
                max="1000"
                defaultValue={initial?.teamSize ?? ""}
              />
            </Field>
            <Field id={`${type}-specializations`} label={t("verification.fields.specializations")}>
              <Input
                id={`${type}-specializations`}
                name="specializations"
                maxLength={1200}
                defaultValue={initial?.specializations.join(", ") ?? ""}
              />
            </Field>
          </>
        ) : (
          <>
            <Field
              id={`${type}-materialCategories`}
              label={t("verification.fields.materialCategories")}
            >
              <Input
                id={`${type}-materialCategories`}
                name="materialCategories"
                maxLength={1200}
                defaultValue={initial?.materialCategories.join(", ") ?? ""}
              />
            </Field>
            <Field id={`${type}-brands`} label={t("verification.fields.brands")}>
              <Input
                id={`${type}-brands`}
                name="brands"
                maxLength={1200}
                defaultValue={initial?.brands.join(", ") ?? ""}
              />
            </Field>
          </>
        )}
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">{t("verification.fields.documents")}</legend>
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <Field
              id={`${type}-document-type-${row.id}`}
              label={t("verification.fields.documentType")}
            >
              <NativeSelect
                id={`${type}-document-type-${row.id}`}
                value={row.type}
                disabled={row.uploading || pending}
                onChange={(event) => changeDocumentType(row.id, event.target.value as DocumentType)}
              >
                {documentTypes[type].map((documentType) => (
                  <NativeSelectOption key={documentType} value={documentType}>
                    {t(`verification.documents.${verificationMessageKey(documentType)}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field id={`${type}-document-file-${row.id}`} label={t("verification.fields.file")}>
              <Input
                ref={(node) => {
                  if (node) fileInputs.current.set(row.id, node);
                  else fileInputs.current.delete(row.id);
                }}
                id={`${type}-document-file-${row.id}`}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={row.uploading || pending}
                onChange={(event) => void uploadDocument(row.id, event.currentTarget.files?.[0])}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rows.length === 1 || row.uploading || pending}
              onClick={() => removeRow(row.id)}
            >
              {t("verification.actions.remove")}
            </Button>
            {row.filename && (
              <p className="text-muted-foreground text-xs sm:col-span-2">
                {row.uploading ? t("verification.uploading") : row.filename}
              </p>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={rows.length >= 8 || pending}
          onClick={addRow}
        >
          {t("verification.actions.addDocument")}
        </Button>
      </fieldset>
      <p className="text-muted-foreground text-xs">{t("verification.provider.documentPrivacy")}</p>
      {uploadError && (
        <p role="alert" className="text-destructive text-sm">
          {t("verification.uploadError")}
        </p>
      )}
      <ActionFeedback state={state} />
      <Button
        type="submit"
        disabled={pending || rows.some((row) => row.uploading)}
        className="w-fit"
      >
        {pending ? t("common.loading") : t("verification.actions.submit")}
      </Button>
    </form>
  );
}
