"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { useActionState } from "react";

import { acceptQuoteAction } from "@/app/actions/marketplace";
import { confirmProjectHandoverAction } from "@/app/actions/projects";
import { MilestoneList } from "@/components/projects/milestone-list";
import {
  AddMilestoneForm,
  CreateProjectPackageForm,
  ProjectDocumentUploadForm,
  ProjectExpenseForm,
  ProjectPhotoUploadForm,
} from "@/components/projects/project-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { Link } from "@/i18n/navigation";
import { getConstructionService } from "@/lib/construction/service-registry";
import type { PublicListing } from "@/lib/listings";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { ProjectWorkspace as ProjectWorkspaceData } from "@/lib/workspaces";

export function ProjectDetail({
  project,
  listings,
  listingsUnavailable,
}: {
  project: ProjectWorkspaceData | null;
  listings: PublicListing[];
  listingsUnavailable: boolean;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  if (!project)
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-5 text-sm"
        >
          {t("workflow.permissionDenied")}
        </p>
      </div>
    );
  const formatMoney = (value: string | number) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const milestoneProviders = [
    ...new Map(
      project.orders
        .filter((order) => order.kind === "CONSTRUCTION_SERVICE" && order.status !== "CANCELLED")
        .map((order) => [
          order.providerId,
          { id: order.providerId, name: order.providerName },
        ]),
    ).values(),
  ];
  const canUploadProjectPhotos =
    project.isOwner ||
    project.orders.some(
      (order) => order.kind === "CONSTRUCTION_SERVICE" && order.status !== "CANCELLED",
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6">
      <Link
        href="/account#projects"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("projects.labels.myProjects")}
      </Link>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-3xl">{project.title}</CardTitle>
            <CardDescription>
              {project.projectType} · {project.district}
              {project.approximateArea ? ` · ${project.approximateArea}` : ""}
            </CardDescription>
          </div>
          <StatusBadge status={project.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm leading-7 whitespace-pre-line">
            {project.description}
          </p>
          <div className="bg-muted/50 grid gap-3 rounded-xl p-4 text-sm sm:grid-cols-3">
            <p>
              {t("workflow.budget")}:{" "}
              <strong>
                {project.budget ? formatMoney(project.budget) : t("projects.detail.notSpecified")}
              </strong>
            </p>
            <p>
              {t("workflow.startDate")}: <strong>{project.startsAt?.slice(0, 10) ?? "—"}</strong>
            </p>
            <p>
              {t("workflow.endDate")}: <strong>{project.targetEndsAt?.slice(0, 10) ?? "—"}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {project.isOwner && project.status !== "COMPLETED" && project.status !== "CANCELLED" && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-bold">{t("projects.detail.workPackages")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("projects.packages.description")}
            </p>
          </div>
          <CreateProjectPackageForm projectId={project.id} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("projects.detail.quotesAndWorkPackages")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("projects.quotes.description")}
          </p>
        </div>
        {project.packages.length === 0 ? (
          <Empty text={t("projects.packages.requiredNotice")} />
        ) : (
          project.packages.map((workPackage) => {
            const requests = project.requests.filter(
              (request) => request.packageId === workPackage.id,
            );
            const acceptedOrder = project.orders.find(
              (order) => order.packageId === workPackage.id && order.status !== "CANCELLED",
            );
            const invitedListingIds = new Set(
              requests
                .filter((request) => request.order?.status !== "CANCELLED")
                .map((request) => request.listing.id),
            );
            const service = workPackage.serviceSlug
              ? getConstructionService(workPackage.serviceSlug)
              : undefined;
            const sameKindListings = listings.filter(
              (listing) =>
                (!workPackage.kind || listing.kind === workPackage.kind) &&
                !invitedListingIds.has(listing.id),
            );
            const serviceMatches = service
              ? sameKindListings.filter((listing) => {
                  const text =
                    `${listing.category} ${listing.title} ${listing.description}`.toLocaleLowerCase();
                  return service.searchTerms.some((term) =>
                    text.includes(term.toLocaleLowerCase()),
                  );
                })
              : [];
            const candidates = [
              ...(serviceMatches.length > 0 ? serviceMatches : sameKindListings),
            ].sort(
              (left, right) =>
                Number(right.id === workPackage.preferredListingId) -
                Number(left.id === workPackage.preferredListingId),
            );
            const localizedPackageLabel = service
              ? t(`constructionServices.${service.slug}.title`)
              : workPackage.label;
            return (
              <section
                key={workPackage.id}
                className="bg-muted/30 flex flex-col gap-4 rounded-2xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{localizedPackageLabel}</h3>
                    {workPackage.description && (
                      <p className="text-muted-foreground mt-1 max-w-3xl text-sm whitespace-pre-line">
                        {workPackage.description}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {workPackage.kind === "CONSTRUCTION_MATERIAL"
                        ? t("constructionServices.building-materials.title")
                        : workPackage.kind === "CONSTRUCTION_SERVICE"
                          ? t("construction.serviceDetail.label")
                          : t("projects.detail.definedWork")}
                    </p>
                  </div>
                  {acceptedOrder && <StatusBadge status={acceptedOrder.status} />}
                </div>
                {requests.length === 0 ? (
                  <Empty text={t("projects.packages.noInvitations")} />
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {requests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">
                              {request.listing.title}
                            </CardTitle>
                            <CardDescription>
                              <Link
                                href={`/construction/providers/${request.providerId}`}
                                className="hover:underline"
                              >
                                {request.providerName}
                              </Link>{" "}
                              · {request.listing.kind}
                            </CardDescription>
                          </div>
                          <StatusBadge status={request.status} />
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                          <p className="text-muted-foreground text-sm">
                            {request.details || t("projects.detail.noAdditionalScopeDetails")}
                          </p>
                          {(request.requestedStart || request.requestedEnd) && (
                            <p className="text-sm">
                              {t("workflow.startDate")}: {request.requestedStart?.slice(0, 10)} –{" "}
                              {request.requestedEnd?.slice(0, 10)}
                            </p>
                          )}
                          {request.quote ? (
                            <div className="border-border/70 bg-muted/30 grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  {t("workflow.quantity")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {request.quote.quantity} {request.listing.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  {t("workflow.quotePrice")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatMoney(request.quote.unitPrice)} / {request.listing.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  {t("workflow.transportFee")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatMoney(request.quote.transportFee)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  {t("common.labels.total")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatMoney(
                                    Number(request.quote.quantity) *
                                      Number(request.quote.unitPrice) +
                                      Number(request.quote.transportFee),
                                  )}
                                </p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-muted-foreground text-sm whitespace-pre-line">
                                  {request.quote.note}
                                </p>
                                {request.quote.expiresAt && (
                                  <p className="text-muted-foreground mt-1 text-xs">
                                    {t("common.labels.expires")}:{" "}
                                    {request.quote.expiresAt.slice(0, 10)}
                                  </p>
                                )}
                              </div>
                              {project.isOwner && request.status === "QUOTED" && !acceptedOrder && (
                                <div className="sm:col-span-2">
                                  <AcceptQuoteForm requestId={request.id} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              {t("projects.detail.waitingForAProviderQuote")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {project.isOwner && !acceptedOrder && (
                  <div className="border-border/70 flex flex-col gap-3 border-t pt-4">
                    <h4 className="font-semibold">{t("projects.detail.inviteMoreProviders")}</h4>
                    {listingsUnavailable ? (
                      <p
                        role="alert"
                        className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm"
                      >
                        {t("workflow.dataUnavailable")}
                      </p>
                    ) : candidates.length === 0 ? (
                      <Empty text={t("workflow.noRecords")} />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {candidates.map((listing) => (
                          <div
                            key={listing.id}
                            className="border-border/70 bg-card flex items-center justify-between gap-3 rounded-xl border p-4"
                          >
                            <div>
                              <p className="font-semibold">
                                {listing.title}
                              </p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {listing.providerName}{" "}
                                · {listing.district}
                              </p>
                              <p className="text-primary mt-1 text-sm">
                                {formatMoney(listing.unitPrice)} / {listing.unit}
                              </p>
                            </div>
                            <Link
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "shrink-0 gap-1",
                              )}
                              href={`/construction/listings/${listing.id}?${new URLSearchParams({ projectId: project.id, packageId: workPackage.id }).toString()}`}
                            >
                              {t("projects.detail.invite")}
                              <ArrowRightIcon aria-hidden="true" className="size-4" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("workflow.milestones")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("projects.milestones.approvalNotice")}
          </p>
        </div>
        {project.milestones.length > 0 ? (
          <MilestoneList
            milestones={project.milestones}
            owner={project.isOwner}
            provider={!project.isOwner}
          />
        ) : (
          <Empty text={t("workflow.noRecords")} />
        )}
        {project.isOwner &&
          (milestoneProviders.length > 0 ? (
            <AddMilestoneForm projectId={project.id} providers={milestoneProviders} />
          ) : (
            <p className="border-border text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
              {t("projects.milestones.quoteRequired")}
            </p>
          ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("projects.detail.engagedProvidersAndMaterials")}</h2>
        {project.orders.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          project.orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    {{ en: order.title, bn: order.title }[locale]}
                  </CardTitle>
                  <CardDescription>
                    {{ en: order.providerName, bn: order.providerName }[locale]} ·{" "}
                    {formatMoney(order.subtotal)}
                    {Number(order.transportFee) > 0
                      ? ` + ${formatMoney(order.transportFee)} ${t("workflow.transportFee")}`
                      : ""}
                  </CardDescription>
                </div>
                <StatusBadge status={order.status} />
              </CardHeader>
              {order.payments.length > 0 && (
                <CardContent className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">{t("workflow.projectPaymentHistory")}</h3>
                  {order.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="border-border/70 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div>
                        <p>
                          {formatMoney(payment.amount)} ·{" "}
                          {paymentMethodText(payment.method, locale)}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {payment.confirmed
                            ? t("common.labels.confirmedByBothParties")
                            : t("common.labels.awaitingConfirmation")}
                          {payment.refundAmount
                            ? ` · ${t("projects.detail.refunded")}: ${formatMoney(payment.refundAmount)}`
                            : ""}
                        </p>
                      </div>
                      {payment.hasReceipt && (
                        <a
                          className="text-primary text-xs font-medium hover:underline"
                          href={`/api/orders/${order.id}/payments/${payment.id}/receipt`}
                        >
                          {t("workflow.viewReceipt")}
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </section>

      {project.isOwner && project.status === "ACTIVE" && (
        <ProjectHandoverForm projectId={project.id} />
      )}
      {project.status === "COMPLETED" && project.handedOverAt && (
        <p className="border-primary/20 bg-primary/5 rounded-xl border p-4 text-sm">
          {t("workflow.handoverConfirmed")} ·{" "}
          {formatter.dateTime(new Date(project.handedOverAt), {
            dateStyle: "medium",
            timeZone: "Asia/Dhaka",
          })}
        </p>
      )}

      {project.isOwner && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold">{t("workflow.expenses")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("projects.expenses.visibilityNotice")}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-sm">
            <p>
              {t("projects.detail.recordedProjectExpenses")}:{" "}
              <strong>
                {formatMoney(
                  project.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
                )}
              </strong>
            </p>
          </div>
          {project.expenses.length === 0 ? (
            <Empty text={t("workflow.noRecords")} />
          ) : (
            project.expenses.map((expense) => (
              <div
                key={expense.id}
                className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
              >
                <span>
                  {expense.description} · {expense.occurredAt?.slice(0, 10)}
                </span>
                <strong>{formatMoney(expense.amount)}</strong>
              </div>
            ))
          )}
          <ProjectExpenseForm projectId={project.id} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("workflow.projectDocuments")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("workflow.projectDocumentsHelp")}</p>
        </div>
        {project.documents.length === 0 ? (
          <Empty text={t("projects.files.empty")} />
        ) : (
          project.documents.map((document) => (
            <a
              key={document.id}
              href={`/api/projects/${project.id}/documents/${document.id}`}
              className="border-border/70 bg-card text-primary rounded-lg border px-4 py-3 text-sm font-medium hover:underline"
            >
              {document.filename}
            </a>
          ))
        )}
        {project.isOwner && <ProjectDocumentUploadForm projectId={project.id} />}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("workflow.projectPhotos")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t("workflow.projectPhotosHelp")}</p>
        </div>
        {project.photos.length === 0 ? (
          <Empty text={t("projects.photos.empty")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.photos.map((photo) => (
              <a
                key={photo.id}
                href={`/api/projects/${project.id}/photos/${photo.id}`}
                className="border-border/70 bg-card overflow-hidden rounded-xl border"
              >
                <Image
                  src={`/api/projects/${project.id}/photos/${photo.id}`}
                  alt={photo.filename}
                  width={720}
                  height={405}
                  unoptimized
                  className="aspect-video w-full object-cover"
                />
                <p className="p-3 text-sm">{photo.filename}</p>
              </a>
            ))}
          </div>
        )}
        {canUploadProjectPhotos && <ProjectPhotoUploadForm projectId={project.id} />}
      </section>
    </div>
  );
}

function ProjectHandoverForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    confirmProjectHandoverAction,
    initialWorkflowState,
  );
  const t = useTranslations();
  return (
    <form
      action={action}
      className="border-primary/20 bg-primary/5 flex flex-col gap-3 rounded-2xl border p-5"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <h2 className="text-lg font-semibold">{t("workflow.confirmHandover")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("workflow.handoverBlocked")}</p>
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.confirmHandover")}
      </Button>
    </form>
  );
}

function AcceptQuoteForm({ requestId }: { requestId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(acceptQuoteAction, initialWorkflowState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <ActionFeedback state={state} />
      <p className="text-muted-foreground text-xs">
        {t("projects.packages.acceptanceNotice")}
      </p>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.acceptQuote")}
      </Button>
    </form>
  );
}

function paymentMethodText(method: string, locale: "bn" | "en") {
  if (locale === "bn")
    return (
      (
        {
          CASH: "নগদ",
          BANK_TRANSFER: "ব্যাংক ট্রান্সফার",
          MOBILE_WALLET: "মোবাইল ওয়ালেট",
          OTHER: "অন্যান্য",
        } as Record<string, string>
      )[method] ?? method
    );
  return (
    (
      {
        CASH: "Cash",
        BANK_TRANSFER: "Bank transfer",
        MOBILE_WALLET: "Mobile wallet",
        OTHER: "Other",
      } as Record<string, string>
    )[method] ?? method
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
      {text}
    </div>
  );
}
