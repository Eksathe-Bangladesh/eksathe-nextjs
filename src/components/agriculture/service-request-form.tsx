"use client";

import { cn } from "cn";
import { useTranslations } from "next-intl";
import { useState, useActionState } from "react";

import { createAgricultureServiceRequestAction } from "@/app/actions/agriculture";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { Link } from "@/i18n/navigation";
import { fieldLabelKey, optionLabelKey } from "@/lib/agriculture/service-messages";
import type { AgricultureServiceWithContent } from "@/lib/agriculture/service-registry";
import { uploadPrivateFile } from "@/lib/client-upload";
import { initialWorkflowState } from "@/lib/workflow-state";

export function ServiceRequestForm({
  service,
  customer,
  emailVerified,
  routeBase,
}: {
  service: AgricultureServiceWithContent;
  customer: { name: string; phone: string } | null;
  emailVerified: boolean;
  routeBase: string;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    createAgricultureServiceRequestAction,
    initialWorkflowState,
  );
  const [photo, setPhoto] = useState<{
    key: string;
    contentType: string;
    sizeBytes: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const canSubmit = Boolean(customer && emailVerified);
  const returnTo = `${routeBase}/services/${service.slug}`;

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setPhoto(null);
    setUploadError(false);
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadPrivateFile(file, { purpose: "crop-disease-photo" });
      setPhoto({
        key: uploaded.key,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
      });
    } catch {
      event.currentTarget.value = "";
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="serviceSlug" value={service.slug} />
      <input type="hidden" name="routeBase" value={routeBase} />
      {photo && (
        <>
          <input type="hidden" name="diseasePhotoKey" value={photo.key} />
          <input type="hidden" name="diseasePhotoContentType" value={photo.contentType} />
          <input type="hidden" name="diseasePhotoSizeBytes" value={photo.sizeBytes} />
        </>
      )}
      {!canSubmit && (
        <div className="border-primary/20 bg-primary/5 flex flex-col gap-3 rounded-xl border p-4">
          <p className="text-sm leading-6">
            {t("inline.preview_the_fields_below_sign_in_and_verif")}
          </p>
          <div className="flex flex-wrap gap-2">
            {customer ? (
              <Link
                href={`/verify?next=${encodeURIComponent(returnTo)}`}
                className={buttonVariants({ size: "sm" })}
              >
                {t("inline.verify_email")}
              </Link>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(returnTo)}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {t("auth.signIn")}
                </Link>
                <Link
                  href={`/register?next=${encodeURIComponent(returnTo)}`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  {t("workflow.createAccount")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="service-customer-name"
          label={t("requestForm.fullName")}
          error={state.errors?.customerName?.[0]}
        >
          <Input
            id="service-customer-name"
            name="customerName"
            required
            maxLength={150}
            defaultValue={customer?.name ?? ""}
            disabled={!canSubmit}
          />
        </Field>
        <Field
          id="service-customer-phone"
          label={t("requestForm.phone")}
          error={state.errors?.phone?.[0]}
        >
          <Input
            id="service-customer-phone"
            name="phone"
            type="tel"
            required
            maxLength={30}
            defaultValue={customer?.phone ?? ""}
            disabled={!canSubmit}
          />
        </Field>
        <Field
          id="service-customer-district"
          label={t("requestForm.district")}
          error={state.errors?.district?.[0]}
        >
          <Input
            id="service-customer-district"
            name="district"
            required
            maxLength={100}
            placeholder={t("requestForm.districtPlaceholder")}
            disabled={!canSubmit}
          />
        </Field>
        <Field
          id="service-customer-budget"
          label={t("requestForm.budget")}
          error={state.errors?.budget?.[0]}
        >
          <Input
            id="service-customer-budget"
            name="budget"
            inputMode="decimal"
            placeholder={t("requestForm.budgetPlaceholder")}
            disabled={!canSubmit}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {service.fields.map((field) => {
          if (field.type === "file")
            return (
              <Field
                key={field.name}
                id={`answer-${field.name}`}
                label={t(fieldLabelKey(service.slug, field.name) as never)}
                help={t("inline.optional_jpeg_png_or_webp_up_to_5_mb")}
              >
                <Input
                  id={`answer-${field.name}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  disabled={!canSubmit}
                />
                {uploading && (
                  <p className="text-muted-foreground text-xs">
                    {t("inline.uploading_private_photo")}
                  </p>
                )}
                {photo && <p className="text-primary text-xs">{t("inline.photo_ready")}</p>}
                {uploadError && (
                  <p role="alert" className="text-destructive text-xs">
                    {t("workflow.uploadFailed")}
                  </p>
                )}
              </Field>
            );
          const label = t(fieldLabelKey(service.slug, field.name) as never);
          const error = state.errors?.[field.name]?.[0];
          if (field.type === "select")
            return (
              <Field key={field.name} id={`answer-${field.name}`} label={label} error={error}>
                <NativeSelect
                  id={`answer-${field.name}`}
                  name={`answer.${field.name}`}
                  required={field.required}
                  aria-invalid={Boolean(error)}
                  disabled={!canSubmit}
                  className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
                >
                  <NativeSelectOption value="">{t("inline.choose_an_option")}</NativeSelectOption>
                  {field.options?.map((option, index) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {t(optionLabelKey(service.slug, field.name, index) as never)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            );
          return (
            <Field key={field.name} id={`answer-${field.name}`} label={label} error={error}>
              <Input
                id={`answer-${field.name}`}
                name={`answer.${field.name}`}
                type={field.type}
                required={field.required}
                maxLength={
                  "maxLength" in field && typeof field.maxLength === "number"
                    ? field.maxLength
                    : undefined
                }
                step={
                  field.type === "number"
                    ? field.name.endsWith("_amount")
                      ? "0.01"
                      : "1"
                    : undefined
                }
                min={field.type === "number" ? "1" : undefined}
                aria-invalid={Boolean(error)}
                disabled={!canSubmit}
              />
            </Field>
          );
        })}
      </div>

      <Field
        id="service-request-details"
        label={t("requestForm.details")}
        error={state.errors?.details?.[0]}
      >
        <Textarea
          id="service-request-details"
          name="details"
          minLength={10}
          maxLength={5000}
          rows={4}
          required
          placeholder={t("requestForm.detailsPlaceholder")}
          disabled={!canSubmit}
        />
      </Field>
      <p className="text-muted-foreground text-xs leading-5">
        {t("inline.requesting_coordination_does_not_create_an")}
      </p>
      <ActionFeedback state={state} />
      {state.status === "success" && state.entityId && (
        <div className="border-primary/20 bg-primary/5 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
          <div>
            <p className="text-sm font-semibold">{t("inline.request_reference")}</p>
            <p className="text-primary mt-1 font-mono">{state.referenceCode}</p>
          </div>
          <Link
            href={`/account/agriculture-requests/${state.entityId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {t("inline.track_request")}
          </Link>
        </div>
      )}
      {canSubmit && state.status !== "success" && (
        <Button type="submit" disabled={pending || uploading} className="w-fit">
          {pending ? t("requestForm.submitting") : t("requestForm.submit")}
        </Button>
      )}
    </form>
  );
}

function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {help && <p className="text-muted-foreground text-xs">{help}</p>}
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
