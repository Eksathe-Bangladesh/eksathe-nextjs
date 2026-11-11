"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { archiveListingAction, updateListingStockAction } from "@/app/actions/marketplace";
import { MilestoneList } from "@/components/projects/milestone-list";
import { ListingEditForm } from "@/components/provider/listing-edit-form";
import { ListingForm } from "@/components/provider/listing-form";
import { ProviderApplicationForm } from "@/components/provider/provider-application-form";
import { ProviderVerificationPanel } from "@/components/provider/provider-verification-form";
import { QuoteForm } from "@/components/provider/quote-form";
import { StorefrontForm } from "@/components/provider/storefront-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { EmptyState } from "@/components/workflows/empty-state";
import { OrderCard } from "@/components/workflows/order-card";
import { StatusBadge } from "@/components/workflows/status-badge";
import { WorkspaceNavigation } from "@/components/workspaces/workspace-navigation";
import { Link } from "@/i18n/navigation";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { ProviderWorkspace as ProviderWorkspaceData } from "@/lib/workspaces";

export function ProviderWorkspace({
  workspace,
  actorId,
}: {
  workspace: ProviderWorkspaceData;
  actorId: string;
}) {
  const t = useTranslations();
  const capabilities = workspace.capabilities.filter(
    (capability) => capability.status === "APPROVED",
  );

  return (
    <WorkspaceNavigation
      label={t("provider.workspace.providerNavigation")}
      items={[
        ...(workspace.profile.status === "APPROVED" && capabilities.length > 0
          ? [{ id: "listings", label: t("common.labels.listings") }]
          : []),
        { id: "requests", label: t("common.labels.requests") },
        { id: "orders", label: t("common.labels.orders") },
        ...(workspace.projectMilestones.length > 0
          ? [{ id: "project-milestones", label: t("workflow.milestones") }]
          : []),
        { id: "commissions", label: t("common.labels.commissions") },
        ...(workspace.profile.status === "APPROVED"
          ? [{ id: "storefront", label: t("provider.workspace.storefront") }]
          : []),
        {
          id: "application",
          label: t("workflow.providerApplication"),
          navLabel: t("workflow.providerApplication"),
        },
      ]}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-sm">{t("provider.workspace.businessOperations")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("nav.provider")}</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {workspace.profile.name} · {workspace.profile.district}
          </p>
        </div>
        <StatusBadge status={workspace.profile.status} />
      </div>

      {workspace.profile.status === "PENDING" && (
        <div className="border-border/70 bg-muted/40 text-muted-foreground rounded-xl border p-4 text-sm">
          {t("workflow.pendingApproval")}
        </div>
      )}
      {workspace.profile.status === "SUSPENDED" && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
          {t("provider.workspace.suspendedNotice")}
        </div>
      )}

      <ProviderVerificationPanel
        applications={workspace.verificationApplications}
        capabilityTypes={Array.from(
          new Set(
            workspace.capabilities
              .filter(
                (capability) =>
                  capability.sectorSlug === "construction" &&
                  (capability.kind === "CONSTRUCTION_SERVICE" ||
                    capability.kind === "CONSTRUCTION_MATERIAL"),
              )
              .map((capability) =>
                capability.kind === "CONSTRUCTION_SERVICE" ? "CONTRACTOR" : "SUPPLIER",
              ),
          ),
        )}
      />

      {workspace.profile.status === "APPROVED" && capabilities.length > 0 && (
        <section id="listings" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>{t("workflow.createListing")}</CardTitle>
              <CardDescription>{t("provider.workspace.moderationNotice")}</CardDescription>
            </CardHeader>
            <CardContent>
              <details>
                <summary className="text-primary mb-4 cursor-pointer text-sm font-semibold">
                  {t("provider.workspace.addAListing")}
                </summary>
                <ListingForm capabilities={capabilities} />
              </details>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {workspace.listings.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("workflow.noRecords")}</p>
                ) : (
                  workspace.listings.map((listing) => (
                    <ListingStockCard key={listing.id} listing={listing} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section id="requests" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-xl font-bold">{t("workflow.incomingRequests")}</h2>
        {workspace.requests.length === 0 ? (
          <EmptyState text={t("workflow.noRecords")} />
        ) : (
          workspace.requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{request.listing.title}</CardTitle>
                  <CardDescription>
                    {request.buyerName} · {request.district} · {request.quantity}{" "}
                    {request.listing.unit}
                  </CardDescription>
                </div>
                <StatusBadge status={request.status} />
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {request.details || t("common.labels.noAdditionalDetailsProvided")}
                </p>
                {(request.requestedStart || request.requestedEnd) && (
                  <p className="mt-2 text-sm">
                    {t("workflow.startDate")}: {request.requestedStart?.slice(0, 10)} –{" "}
                    {request.requestedEnd?.slice(0, 10)}
                  </p>
                )}
                {request.status !== "ACCEPTED" && <QuoteForm request={request} />}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section id="orders" className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold">{t("common.labels.ordersAndBookings")}</h2>
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/account">
            {t("provider.workspace.customerWorkspace")}
          </Link>
        </div>
        {workspace.orders.length === 0 ? (
          <EmptyState text={t("workflow.noRecords")} />
        ) : (
          workspace.orders.map((order) => (
            <OrderCard key={order.id} order={order} actorId={actorId} perspective="provider" />
          ))
        )}
      </section>

      {workspace.projectMilestones.length > 0 && (
        <section id="project-milestones" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="text-xl font-bold">{t("workflow.milestones")}</h2>
          {Array.from(
            new Set(workspace.projectMilestones.map((milestone) => milestone.projectId)),
          ).map((projectId) => {
            const milestones = workspace.projectMilestones.filter(
              (milestone) => milestone.projectId === projectId,
            );
            const first = milestones[0];
            return (
              <Card key={projectId}>
                <CardHeader>
                  <CardTitle className="text-lg">{first.projectTitle}</CardTitle>
                  <CardDescription>{first.district}</CardDescription>
                </CardHeader>
                <CardContent>
                  <MilestoneList milestones={milestones} provider />
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <section id="commissions" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-xl font-bold">{t("provider.workspace.commissionRecords")}</h2>
        {workspace.orders.filter((order) => order.commission).length === 0 ? (
          <EmptyState text={t("workflow.noRecords")} />
        ) : (
          workspace.orders
            .filter((order) => order.commission)
            .map((order) => (
              <div
                key={order.id}
                className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
              >
                <span>
                  {order.listing.title} · {order.commission?.amount} BDT
                </span>
                <StatusBadge status={order.commission?.status ?? "DUE"} />
              </div>
            ))
        )}
      </section>

      {workspace.profile.status === "APPROVED" && (
        <section id="storefront" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>{t("provider.workspace.yourStorefront")}</CardTitle>
              <CardDescription>{t("provider.storefront.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-3">
                {capabilities.some(
                  (capability) => capability.sectorSlug === "agriculture-labor",
                ) && (
                  <Link
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    href={`/agriculture/providers/${workspace.profile.id}`}
                  >
                    {t("provider.workspace.previewAgricultureStorefront")}
                  </Link>
                )}
                {capabilities.some((capability) => capability.sectorSlug === "construction") && (
                  <Link
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    href={`/dashboard/construction/providers/${workspace.profile.id}`}
                  >
                    {t("provider.workspace.previewConstructionProfile")}
                  </Link>
                )}
              </div>
              <StorefrontForm profile={workspace.profile} />
            </CardContent>
          </Card>
        </section>
      )}

      <Card id="application">
        <CardHeader>
          <CardTitle>{t("workflow.providerApplication")}</CardTitle>
          <CardDescription>{t("provider.capabilities.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <details>
            <summary className="text-primary mb-4 cursor-pointer text-sm font-semibold">
              {t("provider.workspace.updateProfileOrRequestCapabilities")}
            </summary>
            <ProviderApplicationForm
              initial={{
                nameBn: workspace.profile.name ?? "",
                nameEn: workspace.profile.name ?? "",
                bioBn: workspace.profile.bio ?? "",
                bioEn: workspace.profile.bio ?? "",
                district: workspace.profile.district,
                upazila: workspace.profile.upazila ?? "",
                capabilities: workspace.capabilities.map(
                  (capability) => `${capability.sectorSlug}:${capability.kind}`,
                ),
              }}
            />
          </details>
        </CardContent>
      </Card>

      {workspace.notifications.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{t("dashboard.notifications")}</h2>
          {workspace.notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              className="border-border/70 bg-card rounded-lg border px-4 py-3 text-sm"
            >
              <p className="font-medium">{notification.title}</p>
              <p className="text-muted-foreground mt-1">{notification.message}</p>
            </div>
          ))}
        </section>
      )}
    </WorkspaceNavigation>
  );
}

function ListingStockCard({ listing }: { listing: ProviderWorkspaceData["listings"][number] }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateListingStockAction, initialWorkflowState);
  const tracksStock = listing.kind === "PRODUCE" || listing.kind === "CONSTRUCTION_MATERIAL";
  return (
    <div className="border-border/70 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{listing.title}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {tracksStock
              ? `${listing.stock} ${listing.unit}`
              : t("provider.listings.availabilityNotice")}{" "}
            · {listing.unitPrice} BDT/{listing.unit}
          </p>
        </div>
        <StatusBadge status={listing.moderationStatus} />
      </div>
      {listing.archivedAt ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {t("provider.listings.archivedNotice")}
        </p>
      ) : (
        <>
          {tracksStock && (
            <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="listingId" value={listing.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor={`stock-${listing.id}`}>{t("workflow.stock")}</Label>
                <Input
                  id={`stock-${listing.id}`}
                  name="stock"
                  type="number"
                  min="0"
                  step="0.001"
                  defaultValue={listing.stock}
                  className="w-40"
                />
              </div>
              <Button size="sm" variant="outline" type="submit" disabled={pending}>
                {pending ? t("common.loading") : t("provider.workspace.saveQuantity")}
              </Button>
            </form>
          )}
          <details className="mt-4">
            <summary className="text-primary cursor-pointer text-sm font-semibold">
              {t("provider.workspace.editListing")}
            </summary>
            <div className="mt-3">
              <ListingEditForm listing={listing} />
            </div>
          </details>
          <ListingArchiveControl listingId={listing.id} />
        </>
      )}
      <ActionFeedback state={state} />
    </div>
  );
}

function ListingArchiveControl({ listingId }: { listingId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(archiveListingAction, initialWorkflowState);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <form action={action}>
        <input type="hidden" name="listingId" value={listingId} />
        <Button size="sm" variant="ghost" type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("provider.workspace.archiveListing")}
        </Button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}
