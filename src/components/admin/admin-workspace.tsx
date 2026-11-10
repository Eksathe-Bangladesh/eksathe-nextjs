"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";
import { useActionState } from "react";

import {
  grantStaffAccessAction,
  markCommissionCollectedAction,
  moderateListingAction,
  moderateProviderCapabilityAction,
  recordRefundAction,
  resolveDisputeAction,
  revokeStaffAccessAction,
  updateSectorCommissionRateAction,
} from "@/app/actions/admin";
import { AgricultureRequestsQueue } from "@/components/admin/agriculture-requests-queue";
import { ProviderVerificationReviewQueue } from "@/components/admin/provider-verification-review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { WorkspaceNavigation } from "@/components/workspaces/workspace-navigation";
import { Link } from "@/i18n/navigation";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { AdminWorkspace as AdminWorkspaceData } from "@/lib/workspaces";

export function AdminWorkspace({ data }: { data: AdminWorkspaceData }) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const formatMoney = (value: string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const operationsEnabled = data.access.operationSectors.length > 0;
  const constructionOperationsEnabled = data.access.operationSectors.includes("construction");
  const agricultureOperationsEnabled = data.access.operationSectors.includes("agriculture-labor");
  const financeEnabled = data.access.financeSectors.length > 0;
  const agricultureManagementEnabled = [
    ...data.access.userManagementSectors,
    ...data.access.panelManagementSectors,
    ...data.access.reportSectors,
  ].includes("agriculture-labor");

  return (
    <WorkspaceNavigation
      label={t("admin.workspace.administrationNavigation")}
      items={[
        ...(operationsEnabled
          ? [
              { id: "provider-approvals", label: t("workflow.adminApprovals") },
              { id: "listing-moderation", label: t("common.labels.listings") },
              { id: "requests", label: t("workflow.adminRequests") },
              { id: "disputes", label: t("admin.workspace.disputes") },
            ]
          : []),
        ...(constructionOperationsEnabled
          ? [
              {
                id: "construction-verifications",
                label: t("verification.admin.title"),
                navLabel: t("verification.admin.title"),
              },
            ]
          : []),
        ...(agricultureOperationsEnabled
          ? [
              {
                id: "agriculture-requests",
                label: t("admin.workspace.agricultureIntake"),
                navLabel: t("admin.workspace.agricultureIntake"),
              },
            ]
          : []),
        ...(financeEnabled
          ? [
              {
                id: "payment-mismatches",
                label: t("admin.workspace.payments"),
                navLabel: t("admin.workspace.payments"),
              },
              { id: "commission", label: t("common.labels.commissions") },
            ]
          : []),
        ...(data.access.isSuperAdmin
          ? [
              {
                id: "commission-settings",
                label: t("admin.workspace.rates"),
                navLabel: t("admin.workspace.rates"),
              },
              {
                id: "staff-access",
                label: t("workflow.manageStaff"),
                navLabel: t("workflow.manageStaff"),
              },
            ]
          : []),
      ]}
    >
      <div>
        <p className="text-primary text-sm">{t("admin.workspace.platformOperations")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {agricultureManagementEnabled && !operationsEnabled && !financeEnabled
            ? t("workflow.agroAdmin")
            : t("nav.admin")}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("workflow.sectorsSummary", {
            sectors:
              [
                ...new Set([
                  ...data.access.operationSectors,
                  ...data.access.financeSectors,
                  ...data.access.userManagementSectors,
                  ...data.access.panelManagementSectors,
                  ...data.access.reportSectors,
                ]),
              ].join(", ") || t("workflow.platformWide"),
          })}
        </p>
        {agricultureManagementEnabled && (
          <Link
            href="/admin/agriculture/management"
            className="border-primary/30 text-primary hover:bg-primary/5 mt-3 inline-flex w-fit items-center rounded-lg border px-3 py-2 text-sm font-medium"
          >
            {t("workflow.agricultureManagement")}
          </Link>
        )}
        {agricultureOperationsEnabled && (
          <Link
            href="/admin/agriculture/publishing"
            className="border-primary/30 text-primary hover:bg-primary/5 mt-3 inline-flex w-fit items-center rounded-lg border px-3 py-2 text-sm font-medium"
          >
            {t("admin.workspace.publishAgriculturePricesAndUpdates")}
          </Link>
        )}
      </div>

      {operationsEnabled && (
        <>
          <section id="provider-approvals" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("workflow.adminApprovals")}</h2>
            {data.capabilities.length === 0 ? (
              <Empty text={t("workflow.noRecords")} />
            ) : (
              data.capabilities.map((capability) => (
                <Card key={capability.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {{ en: capability.name, bn: capability.name }[locale]}
                      </CardTitle>
                      <CardDescription>
                        {capability.email} · {capability.phone} ·{" "}
                        {{ en: capability.sectorTitle, bn: capability.sectorTitle }[locale]} ·{" "}
                        {capability.kind}
                      </CardDescription>
                    </div>
                    <StatusBadge status="PENDING" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-sm">{capability.bio}</p>
                    <p className="text-sm">
                      {t("workflow.district")}: {capability.district}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <CapabilityDecisionForm id={capability.id} decision="APPROVED" />
                      <CapabilityDecisionForm id={capability.id} decision="REJECTED" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          {constructionOperationsEnabled && (
            <ProviderVerificationReviewQueue applications={data.verificationApplications} />
          )}

          <section id="listing-moderation" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("admin.workspace.listingModeration")}</h2>
            {data.listings.length === 0 ? (
              <Empty text={t("workflow.noRecords")} />
            ) : (
              data.listings.map((listing) => (
                <Card key={listing.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {{ en: listing.title, bn: listing.title }[locale]}
                      </CardTitle>
                      <CardDescription>
                        {listing.kind} · {listing.category} · {listing.district}
                      </CardDescription>
                    </div>
                    <StatusBadge status="PENDING" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-sm">
                      {{ en: listing.providerName, bn: listing.providerName }[locale]}
                    </p>
                    <p className="text-sm">
                      {formatMoney(listing.unitPrice)} / {listing.unit} · {listing.stock}{" "}
                      {listing.unit}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ListingDecisionForm id={listing.id} decision="APPROVED" />
                      <ListingDecisionForm id={listing.id} decision="REJECTED" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section id="requests" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("workflow.adminRequests")}</h2>
            {data.requests.length === 0 ? (
              <Empty text={t("workflow.noRecords")} />
            ) : (
              data.requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {{ en: request.title, bn: request.title }[locale]}
                      </CardTitle>
                      <CardDescription>
                        {request.buyerName} ·{" "}
                        {{ en: request.providerName, bn: request.providerName }[locale]} ·{" "}
                        {request.sectorSlug}
                      </CardDescription>
                    </div>
                    <StatusBadge status={request.status} />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {(request.packageLabel || request.projectTitle) && (
                      <p className="text-sm font-medium">
                        {request.projectTitle ?? request.packageLabel}
                        {request.projectTitle && request.packageLabel
                          ? ` · ${request.packageLabel}`
                          : ""}
                      </p>
                    )}
                    {request.details && (
                      <p className="text-muted-foreground text-sm">{request.details}</p>
                    )}
                    <p className="text-sm">
                      {request.district} · {request.quantity} {request.unit}
                      {request.requestedStart
                        ? ` · ${t("admin.workspace.starts")}: ${formatter.dateTime(new Date(request.requestedStart), { dateStyle: "medium", timeZone: "Asia/Dhaka" })}`
                        : ""}
                      {request.requestedEnd
                        ? ` · ${t("admin.workspace.ends")}: ${formatter.dateTime(new Date(request.requestedEnd), { dateStyle: "medium", timeZone: "Asia/Dhaka" })}`
                        : ""}
                    </p>
                    {request.quote && (
                      <p className="text-sm">
                        {t("admin.workspace.quote")}: {formatMoney(request.quote.unitPrice)} /{" "}
                        {request.unit} · {t("admin.workspace.transport")}:{" "}
                        {formatMoney(request.quote.transportFee)}
                      </p>
                    )}
                    <Link
                      href={`/dashboard/${request.sectorSlug}/providers/${request.providerId}`}
                      className="text-primary w-fit text-sm font-medium hover:underline"
                    >
                      {t("admin.workspace.viewProviderProfile")}
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section id="disputes" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("admin.workspace.disputes")}</h2>
            {data.disputes.length === 0 ? (
              <Empty text={t("workflow.noRecords")} />
            ) : (
              data.disputes.map((dispute) => (
                <Card key={dispute.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {{ en: dispute.title, bn: dispute.title }[locale]}
                      </CardTitle>
                      <CardDescription>
                        {dispute.buyerName} ·{" "}
                        {{ en: dispute.providerName, bn: dispute.providerName }[locale]} ·{" "}
                        {dispute.sectorSlug}
                      </CardDescription>
                    </div>
                    <StatusBadge status="DISPUTED" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-sm">{dispute.cancellationReason}</p>
                    <DisputeResolutionForm orderId={dispute.id} />
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        </>
      )}

      {agricultureOperationsEnabled && (
        <AgricultureRequestsQueue
          requests={data.agricultureRequests}
          staff={data.agricultureStaff}
          filters={data.agricultureFilters}
        />
      )}

      {financeEnabled && (
        <>
          <section id="payment-mismatches" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("admin.workspace.paymentConfirmations")}</h2>
            {data.paymentMismatches.length === 0 ? (
              <Empty text={t("workflow.noRecords")} />
            ) : (
              data.paymentMismatches.map((payment) => (
                <Card key={payment.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {{ en: payment.title, bn: payment.title }[locale]}
                      </CardTitle>
                      <CardDescription>
                        {payment.buyerName} ·{" "}
                        {{ en: payment.providerName, bn: payment.providerName }[locale]} ·{" "}
                        {payment.sectorSlug}
                      </CardDescription>
                    </div>
                    <StatusBadge status="PENDING" />
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-sm">
                      {formatMoney(payment.amount)}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                    {payment.hasReceipt && (
                      <a
                        className="text-primary w-fit text-sm font-medium hover:underline"
                        href={`/api/orders/${payment.orderId}/payments/${payment.id}/receipt`}
                      >
                        {t("workflow.viewReceipt")}
                      </a>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {t("workflow.confirmationSummary", {
                        buyer: payment.buyerConfirmed ? t("workflow.yes") : t("workflow.no"),
                        provider: payment.providerConfirmed ? t("workflow.yes") : t("workflow.no"),
                      })}
                    </p>
                    <RefundForm paymentId={payment.id} />
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <section id="commission" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("workflow.commissionsDue")}</h2>
            {data.commissions.length === 0 ? (
              <Empty text={t("workflow.noRecords")} />
            ) : (
              data.commissions.map((commission) => (
                <Card key={commission.id}>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        {{ en: commission.title, bn: commission.title }[locale]}
                      </CardTitle>
                      <CardDescription>
                        {commission.buyerName} ·{" "}
                        {{ en: commission.providerName, bn: commission.providerName }[locale]} ·{" "}
                        {commission.sectorSlug}
                      </CardDescription>
                    </div>
                    <StatusBadge status="DUE" />
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 text-sm font-semibold">{formatMoney(commission.amount)}</p>
                    <CommissionReceiptForm commissionId={commission.id} />
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        </>
      )}

      {data.access.isSuperAdmin && (
        <>
          <section id="commission-settings" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("admin.workspace.sectorCommissionSettings")}</h2>
            {data.sectors.map((sector) => (
              <CommissionRateForm key={sector.slug} sector={sector} />
            ))}
          </section>
          <section id="staff-access" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-xl font-bold">{t("workflow.manageStaff")}</h2>
            <StaffGrantForm />
            {data.staffGrants.map((grant) => (
              <StaffGrantRow key={grant.id} grant={grant} />
            ))}
          </section>
        </>
      )}
    </WorkspaceNavigation>
  );
}

function CapabilityDecisionForm({
  id,
  decision,
}: {
  id: number;
  decision: "APPROVED" | "REJECTED";
}) {
  const [state, action, pending] = useActionState(
    moderateProviderCapabilityAction,
    initialWorkflowState,
  );
  const t = useTranslations();
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <ActionFeedback state={state} />
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        variant={decision === "APPROVED" ? "default" : "outline"}
      >
        {pending
          ? t("common.loading")
          : decision === "APPROVED"
            ? t("workflow.approve")
            : t("workflow.reject")}
      </Button>
    </form>
  );
}

function ListingDecisionForm({ id, decision }: { id: string; decision: "APPROVED" | "REJECTED" }) {
  const [state, action, pending] = useActionState(moderateListingAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <ActionFeedback state={state} />
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        variant={decision === "APPROVED" ? "default" : "outline"}
      >
        {pending
          ? t("common.loading")
          : decision === "APPROVED"
            ? t("workflow.approve")
            : t("workflow.reject")}
      </Button>
    </form>
  );
}

function DisputeResolutionForm({ orderId }: { orderId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(resolveDisputeAction, initialWorkflowState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
      <input type="hidden" name="orderId" value={orderId} />
      <Field id={`dispute-outcome-${orderId}`} label={t("admin.workspace.resolution")}>
        <NativeSelect
          id={`dispute-outcome-${orderId}`}
          name="decision"
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="COMPLETE">
            {t("admin.workspace.markCompleted")}
          </NativeSelectOption>
          <NativeSelectOption value="CANCEL">
            {t("admin.workspace.cancelAndReleaseStock")}
          </NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field id={`dispute-note-${orderId}`} label={t("workflow.details")}>
        <Input id={`dispute-note-${orderId}`} name="note" maxLength={1000} />
      </Field>
      <div className="flex flex-col gap-2 sm:justify-end">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("admin.workspace.recordDecision")}
        </Button>
      </div>
    </form>
  );
}

function CommissionReceiptForm({ commissionId }: { commissionId: string }) {
  const [state, action, pending] = useActionState(
    markCommissionCollectedAction,
    initialWorkflowState,
  );
  const t = useTranslations();
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="commissionId" value={commissionId} />
      <Field id={`commission-reference-${commissionId}`} label={t("workflow.reference")}>
        <Input id={`commission-reference-${commissionId}`} name="reference" maxLength={120} />
      </Field>
      <div className="flex flex-col gap-2 sm:justify-end">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.markCollected")}
        </Button>
      </div>
    </form>
  );
}

function RefundForm({ paymentId }: { paymentId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(recordRefundAction, initialWorkflowState);
  return (
    <details className="border-border/70 rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        {t("admin.workspace.recordARefund")}
      </summary>
      <form action={action} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="paymentId" value={paymentId} />
        <Field id={`refund-amount-${paymentId}`} label={t("workflow.paymentAmount")}>
          <Input
            id={`refund-amount-${paymentId}`}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
        </Field>
        <Field id={`refund-reference-${paymentId}`} label={t("workflow.reference")}>
          <Input id={`refund-reference-${paymentId}`} name="reference" maxLength={120} />
        </Field>
        <div className="flex flex-col gap-2 sm:justify-end">
          <ActionFeedback state={state} />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? t("common.loading") : t("admin.workspace.recordRefund")}
          </Button>
        </div>
      </form>
    </details>
  );
}

function CommissionRateForm({ sector }: { sector: AdminWorkspaceData["sectors"][number] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    updateSectorCommissionRateAction,
    initialWorkflowState,
  );
  const locale = useLocale();
  return (
    <form
      action={action}
      className="border-border/70 bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]"
    >
      <input type="hidden" name="sectorSlug" value={sector.slug} />
      <div>
        <p className="font-semibold">{{ en: sector.title, bn: sector.title }[locale]}</p>
        <p className="text-muted-foreground text-xs">{sector.slug}</p>
      </div>
      <Field id={`commission-rate-${sector.slug}`} label={t("admin.workspace.commissionRate")}>
        <Input
          id={`commission-rate-${sector.slug}`}
          name="rate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={sector.commissionRate}
          required
        />
      </Field>
      <div className="flex flex-col gap-2 sm:justify-end">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("common.actions.update")}
        </Button>
      </div>
    </form>
  );
}

function StaffGrantForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(grantStaffAccessAction, initialWorkflowState);
  return (
    <form
      action={action}
      className="border-border/70 bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-3"
    >
      <Field id="staff-email" label={t("workflow.staffEmail")}>
        <Input id="staff-email" name="email" type="email" required />
      </Field>
      <Field id="staff-permission" label={t("workflow.staffPermission")}>
        <NativeSelect
          id="staff-permission"
          name="permission"
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="OPERATIONS">
            {t("admin.workspace.operations")}
          </NativeSelectOption>
          <NativeSelectOption value="FINANCE">
            {t("admin.workspace.financeLabel")}
          </NativeSelectOption>
          <NativeSelectOption value="USERS">{t("workflow.permissionUsers")}</NativeSelectOption>
          <NativeSelectOption value="PANELS">{t("workflow.permissionPanels")}</NativeSelectOption>
          <NativeSelectOption value="REPORTS">{t("workflow.permissionReports")}</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field id="staff-scope" label={t("workflow.staffScope")}>
        <NativeSelect
          id="staff-scope"
          name="scope"
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="global">
            {t("admin.workspace.platformWide")}
          </NativeSelectOption>
          <NativeSelectOption value="agriculture-labor">
            {t("sectors.agriculture-labor")}
          </NativeSelectOption>
          <NativeSelectOption value="construction">{t("sectors.construction")}</NativeSelectOption>
        </NativeSelect>
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-3">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("admin.workspace.grantAccess")}
        </Button>
      </div>
    </form>
  );
}

function StaffGrantRow({ grant }: { grant: AdminWorkspaceData["staffGrants"][number] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(revokeStaffAccessAction, initialWorkflowState);
  return (
    <form
      action={action}
      className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
    >
      <input type="hidden" name="id" value={grant.id} />
      <p className="text-sm">
        <strong>{grant.name}</strong> · {grant.email} · {grant.permission} · {grant.scopeKey}
      </p>
      <div className="flex items-center gap-3">
        <ActionFeedback state={state} />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? t("common.loading") : t("admin.workspace.revoke")}
        </Button>
      </div>
    </form>
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

function Empty({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
      {text}
    </div>
  );
}
