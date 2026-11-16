"use client";

import { ClipboardListIcon, ShoppingBagIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useActionState } from "react";

import { acceptQuoteAction } from "@/app/actions/marketplace";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { EmptyState } from "@/components/workflows/empty-state";
import { OrderCard } from "@/components/workflows/order-card";
import { StatusBadge } from "@/components/workflows/status-badge";
import { WorkspaceNavigation } from "@/components/workspaces/workspace-navigation";
import { Link } from "@/i18n/navigation";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { CustomerWorkspace } from "@/lib/workspaces";

export function ConstructionWorkspace({
  workspace,
  userId,
}: {
  workspace: CustomerWorkspace;
  userId: string;
}) {
  const t = useTranslations();
  const formatter = useFormatter();
  const requests = workspace.requests.filter((request) => request.sectorSlug === "construction");
  const orders = workspace.orders.filter((order) =>
    ["CONSTRUCTION_MATERIAL", "CONSTRUCTION_SERVICE"].includes(order.listing.kind),
  );
  const formatMoney = (amount: string | number) =>
    formatter.number(Number(amount), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });

  return (
    <WorkspaceNavigation
      label={t("constructionMaterials.requestWorkspace")}
      items={[
        { id: "requests", label: t("constructionMaterials.requests"), icon: ClipboardListIcon },
        { id: "orders", label: t("constructionMaterials.orders"), icon: ShoppingBagIcon },
      ]}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("constructionMaterials.requestWorkspace")}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            {t("constructionMaterials.requestWorkspaceDescription")}
          </p>
        </div>
        <Link href="/construction/market" className={buttonVariants({ variant: "outline" })}>
          {t("nav.browse")}
        </Link>
      </header>

      <section id="requests" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-xl font-bold">{t("constructionMaterials.requests")}</h2>
        {requests.length === 0 ? (
          <EmptyState text={t("workflow.noRecords")} />
        ) : (
          requests.map((request) => {
            const isMaterial = request.listing.kind === "CONSTRUCTION_MATERIAL";
            const unloadingKey =
              request.unloadingArrangement === "CUSTOMER"
                ? "constructionMaterials.unloadingCustomer"
                : request.unloadingArrangement === "SUPPLIER"
                  ? "constructionMaterials.unloadingSupplier"
                  : request.unloadingArrangement === "AGREE"
                    ? "constructionMaterials.unloadingAgree"
                    : null;
            return (
              <Card id={`request-${request.id}`} key={request.id} className="scroll-mt-28">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{request.listing.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {request.provider.name} · {request.district} · {request.quantity}{" "}
                      {request.listing.unit}
                    </CardDescription>
                  </div>
                  <StatusBadge status={request.status} />
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {request.details && (
                    <p className="text-sm whitespace-pre-wrap">{request.details}</p>
                  )}
                  {isMaterial && (
                    <div className="bg-muted/50 flex flex-col gap-2 rounded-xl p-4 text-sm">
                      <h3 className="font-semibold">
                        {t("constructionMaterials.deliveryDetails")}
                      </h3>
                      <p className="break-words whitespace-pre-wrap">
                        {request.deliveryAddress ||
                          t("constructionMaterials.deliveryAddressMissing")}
                      </p>
                      {request.requestedDeliveryDate && (
                        <p>
                          {t("constructionMaterials.preferredDate")}:{" "}
                          {formatter.dateTime(new Date(request.requestedDeliveryDate), {
                            dateStyle: "medium",
                            timeZone: "Asia/Dhaka",
                          })}
                        </p>
                      )}
                      {unloadingKey && (
                        <p>
                          {t("constructionMaterials.unloading")}: {t(unloadingKey)}
                        </p>
                      )}
                      {request.deliveryInstructions && (
                        <p className="text-muted-foreground break-words whitespace-pre-wrap">
                          {request.deliveryInstructions}
                        </p>
                      )}
                    </div>
                  )}
                  {request.quote && (
                    <div className="border-primary/20 bg-primary/5 flex flex-col gap-2 rounded-xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-semibold">{t("account.workspace.providerQuote")}</h3>
                        <StatusBadge status={request.quote.status} />
                      </div>
                      <p className="text-sm">
                        {t("workflow.quantity")}: {request.quote.quantity} {request.listing.unit} ×{" "}
                        {formatMoney(request.quote.unitPrice)}
                      </p>
                      {Number(request.quote.transportFee) > 0 && (
                        <p className="text-sm">
                          {t("workflow.transportFee")}: {formatMoney(request.quote.transportFee)}
                        </p>
                      )}
                      <p className="text-sm">
                        {t("account.workspace.quotedTotal")}:{" "}
                        <strong>
                          {formatMoney(
                            Number(request.quote.quantity) * Number(request.quote.unitPrice) +
                              Number(request.quote.transportFee),
                          )}
                        </strong>
                      </p>
                      {request.quote.note && (
                        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                          {request.quote.note}
                        </p>
                      )}
                      {request.status === "QUOTED" && <AcceptQuote requestId={request.id} />}
                    </div>
                  )}
                  {request.order && (
                    <Link
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                      href="#orders"
                    >
                      {t("constructionMaterials.orders")}
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>

      <section id="orders" className="flex scroll-mt-24 flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("constructionMaterials.orders")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("account.workspace.serviceOrdersDescription")}
          </p>
        </div>
        {orders.length === 0 ? (
          <EmptyState text={t("workflow.noRecords")} />
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} actorId={userId} perspective="buyer" />
          ))
        )}
      </section>
    </WorkspaceNavigation>
  );
}

function AcceptQuote({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(acceptQuoteAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.acceptQuote")}
      </Button>
    </form>
  );
}
