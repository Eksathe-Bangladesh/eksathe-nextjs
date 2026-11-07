"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";
import { useActionState } from "react";

import { updateAgricultureServiceRequestAction } from "@/app/actions/agriculture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { Link } from "@/i18n/navigation";
import { agricultureServiceRegistry } from "@/lib/agriculture/service-registry";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { AdminWorkspace } from "@/lib/workspaces";

type QueueRequest = AdminWorkspace["agricultureRequests"][number];
type QueueStaff = AdminWorkspace["agricultureStaff"][number];

export function AgricultureRequestsQueue({
  requests,
  staff,
  filters,
}: {
  requests: QueueRequest[];
  staff: QueueStaff[];
  filters: AdminWorkspace["agricultureFilters"];
}) {
  const t = useTranslations();
  return (
    <section id="agriculture-requests" className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{t("inline.agriculture_service_intake_13v216g")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("inline.review_requests_coordinate_follow_up_and_k_id40eo")}
        </p>
      </div>
      <form
        method="get"
        action="/admin#agriculture-requests"
        className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field id="ag-filter-service" label={t("inline.service_1m16zkb")}>
          <select
            id="ag-filter-service"
            name="agService"
            defaultValue={filters.serviceSlug ?? ""}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">{t("inline.all_services_1pdbxg7")}</option>
            {agricultureServiceRegistry.map((service) => (
              <option key={service.slug} value={service.slug}>
                {t(`agricultureServices.${service.slug}.title` as never)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ag-filter-district" label={t("inline.district_135um58")}>
          <Input id="ag-filter-district" name="agDistrict" defaultValue={filters.district ?? ""} />
        </Field>
        <Field id="ag-filter-status" label={t("inline.status_qhepgk")}>
          <select
            id="ag-filter-status"
            name="agStatus"
            defaultValue={filters.status ?? ""}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">{t("inline.all_statuses_153nc2f")}</option>
            {["NEW", "REVIEWING", "ASSIGNED", "COMPLETED", "REJECTED", "CANCELLED"].map(
              (status) => (
                <option key={status} value={status}>
                  {statusLabel(status, t)}
                </option>
              ),
            )}
          </select>
        </Field>
        <Field id="ag-filter-assignee" label={t("inline.assignee_1g6jeev")}>
          <select
            id="ag-filter-assignee"
            name="agAssignee"
            defaultValue={filters.assigneeId ?? ""}
            className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
          >
            <option value="">{t("inline.anyone_itav5z")}</option>
            {staff.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.email}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ag-filter-from" label={t("inline.from_date_172hp5u")}>
          <Input
            id="ag-filter-from"
            name="agFrom"
            type="date"
            defaultValue={filters.dateFrom ?? ""}
          />
        </Field>
        <Field id="ag-filter-to" label={t("inline.to_date_8xio37")}>
          <Input id="ag-filter-to" name="agTo" type="date" defaultValue={filters.dateTo ?? ""} />
        </Field>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" variant="outline">
            {t("inline.filter_requests_12do0dv")}
          </Button>
          <Link
            href="/admin#agriculture-requests"
            className="text-muted-foreground hover:bg-muted inline-flex h-9 items-center rounded-lg px-3 text-sm"
          >
            {t("inline.clear_193qb1d")}
          </Link>
        </div>
      </form>
      {requests.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
          {t("inline.no_agriculture_requests_match_these_filter_1wybrur")}
        </div>
      ) : (
        requests.map((request) => <RequestCard key={request.id} request={request} staff={staff} />)
      )}
    </section>
  );
}

function RequestCard({ request, staff }: { request: QueueRequest; staff: QueueStaff[] }) {
  const formatter = useFormatter();
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    updateAgricultureServiceRequestAction,
    initialWorkflowState,
  );
  const locale = useLocale();
  const english = locale === "en";
  const snapshot = request.fieldSnapshot as {
    fields?: Array<{
      name: string;
      labelBn: string;
      labelEn: string;
      options?: Array<{ value: string; labelBn: string; labelEn: string }>;
    }>;
  };
  const answers = request.answers as Record<string, string>;
  const choices = allowedStatuses(request.status);
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">
            {request.service.icon} {english ? request.service.titleEn : request.service.titleBn}
          </CardTitle>
          <CardDescription>
            {request.referenceCode ?? `AG-${request.id}`} · {request.customerName} ·{" "}
            {request.customerEmail} · {request.phone} · {request.district}
          </CardDescription>
          <CardDescription>
            {request.createdAt
              ? formatter.dateTime(new Date(request.createdAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Dhaka",
                })
              : ""}{" "}
            · {t("inline.assignee_1g6jeev")}:{" "}
            {request.assignedTo?.name ?? t("inline.not_assigned_jyfmtj")}
          </CardDescription>
        </div>
        <StatusBadge status={request.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium">{request.details}</p>
          {request.budget && (
            <p className="text-muted-foreground mt-1 text-xs">
              {t("inline.budget_1cc4s4c")}: ৳{request.budget}
            </p>
          )}
        </div>
        {snapshot.fields?.some((field) => answers[field.name]) && (
          <dl className="grid gap-2 sm:grid-cols-2">
            {snapshot.fields
              .filter((field) => answers[field.name])
              .map((field) => {
                const answer = answers[field.name];
                const option = field.options?.find((item) => item.value === answer);
                return (
                  <div key={field.name} className="rounded-lg border p-3">
                    <dt className="text-muted-foreground text-xs">
                      {english ? field.labelEn : field.labelBn}
                    </dt>
                    <dd className="mt-1 text-sm">
                      {option ? (english ? option.labelEn : option.labelBn) : answer}
                    </dd>
                  </div>
                );
              })}
          </dl>
        )}
        {request.attachments.length > 0 && (
          <div>
            <p className="text-sm font-semibold">{t("inline.private_attachments_fpiomb")}</p>
            {request.attachments.map((attachment) => (
              <a
                key={attachment.id}
                className="text-primary mt-1 block w-fit text-sm hover:underline"
                href={`/api/agriculture/requests/${request.id}/attachments/${attachment.id}`}
              >
                {attachment.filename}
              </a>
            ))}
          </div>
        )}
        {request.marketplaceRequest && (
          <p className="text-sm">
            {t("inline.marketplace_match_mo0a3k")}:{" "}
            {english
              ? request.marketplaceRequest.listing.titleEn
              : request.marketplaceRequest.listing.titleBn}
          </p>
        )}
        {request.updates.map((update) => (
          <div
            key={update.id}
            className={`rounded-lg p-3 text-sm ${update.visibility === "INTERNAL" ? "border border-amber-500/30 bg-amber-500/5" : "bg-muted/40 border"}`}
          >
            <p className="text-muted-foreground mb-1 text-xs font-semibold">
              {update.visibility === "INTERNAL"
                ? t("inline.internal_note_na2msi")
                : t("inline.customer_update_1i5e277")}
            </p>
            <p>
              {english
                ? (update.messageEn ?? update.messageBn)
                : (update.messageBn ?? update.messageEn)}
            </p>
          </div>
        ))}
        <form action={action} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="locale" value={locale} />
          <Field id={`ag-status-${request.id}`} label={t("inline.status_qhepgk")}>
            <select
              id={`ag-status-${request.id}`}
              name="status"
              defaultValue={request.status}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
            >
              {choices.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status, t)}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`ag-assignee-${request.id}`} label={t("inline.assign_to_staff_od32ej")}>
            <select
              id={`ag-assignee-${request.id}`}
              name="assignedToId"
              defaultValue={request.assignedTo?.id ?? staff[0]?.id ?? ""}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
              required
            >
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · {person.email}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id={`ag-market-match-${request.id}`}
            label={t("inline.matched_marketplace_request_id_optional_ek7ufe")}
          >
            <Input
              id={`ag-market-match-${request.id}`}
              name="marketplaceRequestId"
              maxLength={64}
              defaultValue={request.marketplaceRequest?.id ?? ""}
            />
          </Field>
          <Field
            id={`ag-public-message-${request.id}`}
            label={t("inline.customer_visible_update_1ix5pp7")}
          >
            <Textarea
              id={`ag-public-message-${request.id}`}
              name="publicMessage"
              maxLength={2000}
              rows={2}
            />
          </Field>
          <Field id={`ag-private-note-${request.id}`} label={t("inline.private_staff_note_84za12")}>
            <Textarea
              id={`ag-private-note-${request.id}`}
              name="privateNote"
              maxLength={2000}
              rows={2}
            />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <ActionFeedback state={state} />
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? t("inline.saving_4kkf1l") : t("inline.save_review_2j822r")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function allowedStatuses(status: string) {
  const transitions: Record<string, string[]> = {
    NEW: ["NEW", "REVIEWING", "REJECTED", "CANCELLED"],
    REVIEWING: ["REVIEWING", "ASSIGNED", "REJECTED", "CANCELLED"],
    ASSIGNED: ["ASSIGNED", "COMPLETED", "CANCELLED"],
    COMPLETED: ["COMPLETED"],
    REJECTED: ["REJECTED"],
    CANCELLED: ["CANCELLED"],
  };
  return transitions[status] ?? [status];
}

function statusLabel(status: string, t: ReturnType<typeof useTranslations>) {
  const key = `statuses.${status}` as never;
  return t.has(key) ? t(key) : status;
}
