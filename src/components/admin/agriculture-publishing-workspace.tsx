"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import { saveAgriculturePublicationAction } from "@/app/actions/agriculture-publishing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import type {
  AgricultureMarketPriceRecord,
  AgriculturePublishingWorkspaceData,
  AgricultureUpdateRecord,
} from "@/lib/agriculture/publishing-types";
import { initialWorkflowState } from "@/lib/workflow-state";

export function AgriculturePublishingWorkspace({
  data,
  isSuperAdmin,
}: {
  data: AgriculturePublishingWorkspaceData;
  isSuperAdmin: boolean;
}) {
  const t = useTranslations();
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">
            {t("inline.agriculture_operations")}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {t("inline.publish_prices_and_updates")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-6">
            {t("inline.review_submitted_information_add_a_source")}
          </p>
        </div>
        <Link href="/admin" className="text-primary text-sm font-medium hover:underline">
          {t("inline.back_to_administration")}
        </Link>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="price-heading">
        <div>
          <h2 id="price-heading" className="text-xl font-bold">
            {t("inline.market_prices")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("inline.price_submissions_awaiting_review")}
          </p>
        </div>
        {data.requests.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {data.requests.map((request) => (
              <Card key={request.id} size="sm">
                <CardHeader>
                  <CardTitle className="text-base">
                    {request.referenceCode ?? `#${request.id}`} · {request.district}
                  </CardTitle>
                  <CardDescription>
                    {t("inline.submitted_price_information")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/60 max-h-36 overflow-auto rounded-lg p-3 text-xs wrap-break-word whitespace-pre-wrap">
                    {JSON.stringify(request.answers, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {data.prices.map((price) => (
          <PriceForm key={price.id} initial={price} requests={data.requests} />
        ))}
        <PriceForm requests={data.requests} />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="updates-heading">
        <div>
          <h2 id="updates-heading" className="text-xl font-bold">
            {t("inline.news_advice_and_weather_alerts")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("inline.weather_alerts_require_an_expiry_date")}
          </p>
        </div>
        {data.updates.map((update) => (
          <UpdateForm key={update.id} initial={update} />
        ))}
        <UpdateForm />
      </section>

      {isSuperAdmin && <SupportForm initial={data.support} />}
    </main>
  );
}

function PriceForm({
  initial,
  requests,
}: {
  initial?: AgricultureMarketPriceRecord;
  requests: AgriculturePublishingWorkspaceData["requests"];
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    saveAgriculturePublicationAction,
    initialWorkflowState,
  );
  const locale = useLocale();
  const english = locale === "en";
  const prefix = `market-price-${initial?.id ?? "new"}`;
  const sourceOptions: [string, string][] = [
    ["", t("inline.no_linked_request")],
    ...requests.map(
      (request) =>
        [
          String(request.id),
          `${request.referenceCode ?? `#${request.id}`} · ${request.district}`,
        ] as [string, string],
    ),
  ];
  if (
    initial?.sourceRequestId &&
    !requests.some((request) => String(request.id) === initial.sourceRequestId)
  )
    sourceOptions.push([
      initial.sourceRequestId,
      `${t("inline.linked_request")} #${initial.sourceRequestId}`,
    ]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {initial
            ? english
              ? `Edit ${initial.product}`
              : `${initial.product} সম্পাদনা`
            : t("inline.add_market_price")}
        </CardTitle>
        <CardDescription>
          {english
            ? `${initial?.status ?? "DRAFT"} · linked submissions remain an audit reference`
            : `${initial?.status ?? "DRAFT"} · জমা দেওয়া অনুরোধের সঙ্গে সংযোগ অডিটের জন্য থাকবে`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="type" value="price" />
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField
              id={`${prefix}-product-bn`}
              name="productBn"
              label={t("inline.product_name_bangla")}
              defaultValue={initial?.product}
              required
            />
            <TextField
              id={`${prefix}-product-en`}
              name="productEn"
              label={t("inline.product_name_english")}
              defaultValue={initial?.product}
              required
            />
            <TextField
              id={`${prefix}-market`}
              name="market"
              label={t("panels.categories.market")}
              defaultValue={initial?.market}
              required
            />
            <TextField
              id={`${prefix}-district`}
              name="district"
              label={t("workflow.district")}
              defaultValue={initial?.district}
              required
            />
            <TextField
              id={`${prefix}-unit`}
              name="unit"
              label={t("inline.unit_e_g_kg")}
              defaultValue={initial?.unit}
              required
            />
            <TextField
              id={`${prefix}-price`}
              name="price"
              label={t("inline.price_bdt")}
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.price}
              required
            />
            <DateField
              id={`${prefix}-observed`}
              name="observedAt"
              label={t("inline.observed_on")}
              defaultValue={initial?.observedAt}
              required
            />
            <TextField
              id={`${prefix}-source`}
              name="source"
              label={t("inline.source")}
              defaultValue={initial?.source}
              required
            />
            <SelectField
              id={`${prefix}-status`}
              name="status"
              label={t("inline.publication_status")}
              defaultValue={initial?.status ?? "DRAFT"}
              options={[
                ["DRAFT", t("inline.draft")],
                ["PUBLISHED", t("inline.published")],
              ]}
            />
            <SelectField
              id={`${prefix}-request`}
              name="sourceRequestId"
              label={t("inline.link_a_price_submission")}
              defaultValue={initial?.sourceRequestId ?? ""}
              options={sourceOptions}
            />
          </FieldGroup>
          <FormFeedback state={state.status} />
          <Button type="submit" disabled={pending}>
            {pending ? t("inline.saving") : t("inline.save_market_price")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UpdateForm({ initial }: { initial?: AgricultureUpdateRecord }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    saveAgriculturePublicationAction,
    initialWorkflowState,
  );
  const locale = useLocale();
  const english = locale === "en";
  const prefix = `agriculture-update-${initial?.id ?? "new"}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {initial
            ? english
              ? `Edit ${initial.title}`
              : `${initial.title} সম্পাদনা`
            : t("inline.add_an_update")}
        </CardTitle>
        <CardDescription>
          {english
            ? `${initial?.status ?? "DRAFT"} · ${initial?.kind ?? "NEWS"}`
            : `${initial?.status ?? "DRAFT"} · ${initial?.kind ?? "NEWS"}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="type" value="update" />
          {initial && <input type="hidden" name="id" value={initial.id} />}
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id={`${prefix}-kind`}
              name="kind"
              label={t("inline.type")}
              defaultValue={initial?.kind ?? "NEWS"}
              options={[
                ["NEWS", t("inline.news")],
                ["ADVICE", t("inline.advice")],
                ["WEATHER_ALERT", t("inline.weather_alert")],
              ]}
            />
            <SelectField
              id={`${prefix}-status`}
              name="status"
              label={t("inline.publication_status")}
              defaultValue={initial?.status ?? "DRAFT"}
              options={[
                ["DRAFT", t("inline.draft")],
                ["PUBLISHED", t("inline.published")],
              ]}
            />
            <TextField
              id={`${prefix}-title-bn`}
              name="titleBn"
              label={t("workflow.titleBn")}
              defaultValue={initial?.title}
              required
            />
            <TextField
              id={`${prefix}-title-en`}
              name="titleEn"
              label={t("workflow.titleEn")}
              defaultValue={initial?.title}
              required
            />
            <DateField
              id={`${prefix}-published`}
              name="publishedAt"
              label={t("inline.publication_date")}
              defaultValue={initial?.publishedAt}
              required
            />
            <DateField
              id={`${prefix}-expiry`}
              name="expiresAt"
              label={t("inline.expiry_date_required_for_weather_alerts")}
              defaultValue={initial?.expiresAt}
            />
            <TextField
              id={`${prefix}-source`}
              name="source"
              label={t("inline.source")}
              defaultValue={initial?.source}
              required
            />
            <TextAreaField
              className="sm:col-span-2"
              id={`${prefix}-body-bn`}
              name="bodyBn"
              label={t("inline.content_bangla")}
              defaultValue={initial?.body}
              required
            />
            <TextAreaField
              className="sm:col-span-2"
              id={`${prefix}-body-en`}
              name="bodyEn"
              label={t("inline.content_english")}
              defaultValue={initial?.body}
              required
            />
          </FieldGroup>
          <FormFeedback state={state.status} />
          <Button type="submit" disabled={pending}>
            {pending ? t("inline.saving") : t("inline.save_update")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SupportForm({ initial }: { initial: AgriculturePublishingWorkspaceData["support"] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    saveAgriculturePublicationAction,
    initialWorkflowState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("inline.agriculture_support_contact")}</CardTitle>
        <CardDescription>
          {t("inline.these_details_appear_publicly_on_the_agric")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="type" value="support" />
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="agriculture-support-phone"
              name="phone"
              label={t("inline.phone")}
              defaultValue={initial?.phone}
            />
            <TextField
              id="agriculture-support-email"
              name="email"
              type="email"
              label={t("inline.email")}
              defaultValue={initial?.email}
            />
            <TextAreaField
              className="sm:col-span-2"
              id="agriculture-support-bn"
              name="messageBn"
              label={t("inline.support_message_bangla")}
              defaultValue={initial?.messageBn}
            />
            <TextAreaField
              className="sm:col-span-2"
              id="agriculture-support-en"
              name="messageEn"
              label={t("inline.support_message_english")}
              defaultValue={initial?.messageEn}
            />
          </FieldGroup>
          <FormFeedback state={state.status} />
          <Button type="submit" disabled={pending}>
            {pending ? t("inline.saving") : t("inline.save_support_details")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TextField({
  id,
  name,
  label,
  type = "text",
  defaultValue,
  required,
  min,
  step,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
      />
    </Field>
  );
}

function DateField({
  id,
  name,
  label,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DatePicker id={id} name={name} defaultValue={defaultValue} required={required} />
    </Field>
  );
}

function TextAreaField({
  id,
  name,
  label,
  defaultValue,
  required,
  className,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} name={name} defaultValue={defaultValue} required={required} rows={4} />
    </Field>
  );
}

function SelectField({
  id,
  name,
  label,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  options: [string, string][];
}) {
  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="border-input bg-background h-9 w-full rounded-lg border px-3 text-sm"
      >
        <NativeSelectOptGroup label={label}>
          {options.map(([value, title]) => (
            <NativeSelectOption key={`${value}-${title}`} value={value}>
              {title}
            </NativeSelectOption>
          ))}
        </NativeSelectOptGroup>
      </NativeSelect>
    </Field>
  );
}

function FormFeedback({ state }: { state: "idle" | "success" | "error" }) {
  const t = useTranslations();
  if (state === "idle") return null;
  return (
    <p
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
      className={state === "error" ? "text-destructive text-sm" : "text-primary text-sm"}
    >
      {state === "error"
        ? t("inline.could_not_save_check_the_fields_and_try_ag")
        : t("inline.saved")}
    </p>
  );
}
