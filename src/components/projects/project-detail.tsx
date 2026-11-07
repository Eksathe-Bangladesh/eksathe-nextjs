"use client";

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useLocale, useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
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
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
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
          { id: order.providerId, nameBn: order.providerNameBn, nameEn: order.providerNameEn },
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
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("inline.my_projects_1y5pp50")}
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
          <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
            {project.description}
          </p>
          <div className="grid gap-3 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
            <p>
              {t("workflow.budget")}:{" "}
              <strong>
                {project.budget ? formatMoney(project.budget) : t("inline.not_specified_1i7krq7")}
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
            <h2 className="text-xl font-bold">{t("inline.work_packages_9k9nnr")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("inline.compare_several_quotes_per_package_create__fpfw5a")}
            </p>
          </div>
          <CreateProjectPackageForm projectId={project.id} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("inline.quotes_and_work_packages_15oqs9u")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("inline.compare_scope_quantity_transport_price_and_9wp0fg")}
          </p>
        </div>
        {project.packages.length === 0 ? (
          <Empty text={t("inline.create_a_work_package_before_inviting_prov_qs0v6e")} />
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
                    `${listing.category} ${listing.titleBn} ${listing.titleEn} ${listing.descriptionBn} ${listing.descriptionEn}`.toLocaleLowerCase();
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
              ? t(`marketplaceServices.${service.slug}` as never)
              : workPackage.label;
            return (
              <section
                key={workPackage.id}
                className="flex flex-col gap-4 rounded-2xl bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{localizedPackageLabel}</h3>
                    {workPackage.description && (
                      <p className="mt-1 max-w-3xl text-sm whitespace-pre-line text-muted-foreground">
                        {workPackage.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {workPackage.kind === "CONSTRUCTION_MATERIAL"
                        ? t("inline.building_materials_j98vuw")
                        : workPackage.kind === "CONSTRUCTION_SERVICE"
                          ? t("inline.construction_service_gx1wej")
                          : t("inline.defined_work_fcku54")}
                    </p>
                  </div>
                  {acceptedOrder && <StatusBadge status={acceptedOrder.status} />}
                </div>
                {requests.length === 0 ? (
                  <Empty text={t("inline.no_provider_invitations_have_been_sent_for_1h88727")} />
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {requests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">
                              {locale === "bn" ? request.listing.titleBn : request.listing.titleEn}
                            </CardTitle>
                            <CardDescription>
                              <Link
                                href={`/construction/providers/${request.providerId}`}
                                className="hover:underline"
                              >
                                {locale === "bn" ? request.providerNameBn : request.providerNameEn}
                              </Link>{" "}
                              · {request.listing.kind}
                            </CardDescription>
                          </div>
                          <StatusBadge status={request.status} />
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                          <p className="text-sm text-muted-foreground">
                            {request.details || t("inline.no_additional_scope_details_gxl1ia")}
                          </p>
                          {(request.requestedStart || request.requestedEnd) && (
                            <p className="text-sm">
                              {t("workflow.startDate")}: {request.requestedStart?.slice(0, 10)} –{" "}
                              {request.requestedEnd?.slice(0, 10)}
                            </p>
                          )}
                          {request.quote ? (
                            <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 sm:grid-cols-2">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("workflow.quantity")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {request.quote.quantity} {request.listing.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("workflow.quotePrice")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatMoney(request.quote.unitPrice)} / {request.listing.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("workflow.transportFee")}
                                </p>
                                <p className="mt-1 font-semibold">
                                  {formatMoney(request.quote.transportFee)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {t("inline.total_bldkfh")}
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
                                <p className="text-sm whitespace-pre-line text-muted-foreground">
                                  {request.quote.note}
                                </p>
                                {request.quote.expiresAt && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {t("inline.expires_w9jxxl")}:{" "}
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
                            <p className="text-sm text-muted-foreground">
                              {t("inline.waiting_for_a_provider_quote_1bh4h77")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {project.isOwner && !acceptedOrder && (
                  <div className="flex flex-col gap-3 border-t border-border/70 pt-4">
                    <h4 className="font-semibold">{t("inline.invite_more_providers_6k9q6")}</h4>
                    {listingsUnavailable ? (
                      <p
                        role="alert"
                        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
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
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4"
                          >
                            <div>
                              <p className="font-semibold">
                                {locale === "bn" ? listing.titleBn : listing.titleEn}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {locale === "bn" ? listing.providerNameBn : listing.providerNameEn}{" "}
                                · {listing.district}
                              </p>
                              <p className="mt-1 text-sm text-primary">
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
                              {t("inline.invite_1vsiiih")}
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
          <p className="mt-1 text-sm text-muted-foreground">
            {t("inline.providers_submit_progress_for_your_approva_ac16we")}
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
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("inline.accept_a_construction_service_provider_s_q_1s1mhp0")}
            </p>
          ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("inline.engaged_providers_and_materials_1dmhtj6")}</h2>
        {project.orders.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          project.orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    {locale === "bn" ? order.titleBn : order.titleEn}
                  </CardTitle>
                  <CardDescription>
                    {locale === "bn" ? order.providerNameBn : order.providerNameEn} ·{" "}
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
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                    >
                      <div>
                        <p>
                          {formatMoney(payment.amount)} ·{" "}
                          {paymentMethodText(payment.method, locale)}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.confirmed
                            ? t("inline.confirmed_by_both_parties_1xd4wdp")
                            : t("inline.awaiting_confirmation_1m2idbp")}
                          {payment.refundAmount
                            ? ` · ${t("inline.refunded_61yfyo")}: ${formatMoney(payment.refundAmount)}`
                            : ""}
                        </p>
                      </div>
                      {payment.hasReceipt && (
                        <a
                          className="text-xs font-medium text-primary hover:underline"
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
        <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
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
            <p className="mt-1 text-sm text-muted-foreground">
              {t("inline.these_records_are_visible_only_to_the_proj_3oruu6")}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-sm">
            <p>
              {t("inline.recorded_project_expenses_gx0grz")}:{" "}
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm"
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
          <p className="mt-1 text-sm text-muted-foreground">{t("workflow.projectDocumentsHelp")}</p>
        </div>
        {project.documents.length === 0 ? (
          <Empty text={t("inline.no_project_files_have_been_added_yet_10su81e")} />
        ) : (
          project.documents.map((document) => (
            <a
              key={document.id}
              href={`/api/projects/${project.id}/documents/${document.id}`}
              className="rounded-lg border border-border/70 bg-card px-4 py-3 text-sm font-medium text-primary hover:underline"
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
          <p className="mt-1 text-sm text-muted-foreground">{t("workflow.projectPhotosHelp")}</p>
        </div>
        {project.photos.length === 0 ? (
          <Empty text={t("inline.no_project_photos_have_been_added_yet_615c8n")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.photos.map((photo) => (
              <a
                key={photo.id}
                href={`/api/projects/${project.id}/photos/${photo.id}`}
                className="overflow-hidden rounded-xl border border-border/70 bg-card"
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
      className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <h2 className="text-lg font-semibold">{t("workflow.confirmHandover")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("workflow.handoverBlocked")}</p>
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
      <p className="text-xs text-muted-foreground">
        {t("inline.only_one_quote_can_be_accepted_for_this_wo_1yxvd9d")}
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
    <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
