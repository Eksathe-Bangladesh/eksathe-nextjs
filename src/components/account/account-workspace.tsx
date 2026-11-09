"use client";

import {
  BellIcon,
  ClipboardListIcon,
  HardHatIcon,
  MailIcon,
  PhoneIcon,
  ShoppingBagIcon,
  UserRoundIcon,
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { useActionState } from "react";

import { markNotificationReadAction, updateProfileAction } from "@/app/actions/account";
import { acceptQuoteAction, cancelMarketplaceRequestAction } from "@/app/actions/marketplace";
import { MilestoneList } from "@/components/projects/milestone-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { OrderCard } from "@/components/workflows/order-card";
import { StatusBadge } from "@/components/workflows/status-badge";
import { WorkspaceNavigation } from "@/components/workspaces/workspace-navigation";
import { Link } from "@/i18n/navigation";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { CustomerWorkspace } from "@/lib/workspaces";

export function AccountWorkspace({
  workspace,
  user,
}: {
  workspace: CustomerWorkspace;
  user: { id: string; name: string; email: string; phone: string };
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const formatMoney = (value: string | number) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });

  return (
    <WorkspaceNavigation
      label={t("account.workspace.accountNavigation")}
      items={[
        { id: "profile", label: t("dashboard.profile"), icon: UserRoundIcon },
        {
          id: "agriculture-requests",
          label: t("account.workspace.agricultureServiceRequests"),
          navLabel: t("account.workspace.agricultureServiceRequests"),
          icon: ClipboardListIcon,
        },
        { id: "requests", label: t("common.labels.requests"), icon: ClipboardListIcon },
        { id: "orders", label: t("common.labels.orders"), icon: ShoppingBagIcon },
        {
          id: "projects",
          label: t("workflow.projectTitle"),
          navLabel: t("workflow.projectTitle"),
          icon: HardHatIcon,
        },
        { id: "notifications", label: t("dashboard.notifications"), icon: BellIcon },
      ]}
    >
      <div>
        <p className="text-primary text-sm">{t("account.workspace.yourAccount")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t("account.workspace.welcome", { name: user.name })}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>
      </div>

      <section id="profile" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundIcon aria-hidden="true" className="text-primary size-5" />
              {t("dashboard.profile")}
            </CardTitle>
            <CardDescription>
              {t("account.profile.usageNotice")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>
      </section>

      <section id="agriculture-requests" className="flex scroll-mt-24 flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold">{t("account.workspace.agricultureServiceRequests")}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("account.requests.description")}
          </p>
        </div>
        {workspace.agricultureRequests.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          workspace.agricultureRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    {request.service.title}
                  </CardTitle>
                  <CardDescription>
                    {request.referenceCode ?? `AG-${request.id}`} · {request.district} ·{" "}
                    {request.createdAt
                      ? formatter.dateTime(new Date(request.createdAt), {
                          dateStyle: "medium",
                          timeZone: "Asia/Dhaka",
                        })
                      : ""}
                  </CardDescription>
                </div>
                <StatusBadge status={request.status} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-muted-foreground line-clamp-2 text-sm">{request.details}</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/account/agriculture-requests/${request.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("account.workspace.viewRequest")}
                  </Link>
                  {request.updates[0] && (
                    <span className="text-muted-foreground self-center text-xs">
                      {request.updates[0].message}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section id="requests" className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold">{t("account.workspace.requestsAndQuotes")}</h2>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("nav.browse")}
          </Link>
        </div>
        {workspace.requests.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          workspace.requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">
                    {request.listing.title}
                  </CardTitle>
                  <CardDescription>
                    {request.provider.name} ·{" "}
                    {request.district} · {request.quantity} {request.listing.unit}
                  </CardDescription>
                </div>
                <StatusBadge status={request.status} />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm">
                  {request.details || t("common.labels.noAdditionalDetailsProvided")}
                </p>
                {request.requestedStart && request.requestedEnd && (
                  <p className="text-sm">
                    {t("workflow.startDate")}: {request.requestedStart.slice(0, 10)} –{" "}
                    {request.requestedEnd.slice(0, 10)}
                  </p>
                )}
                {request.quote && (
                  <div className="border-primary/20 bg-primary/5 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold">{t("account.workspace.providerQuote")}</h3>
                      <StatusBadge status={request.quote.status} />
                    </div>
                    <p className="mt-2 text-sm">
                      {t("workflow.quantity")}: {request.quote.quantity} {request.listing.unit} ×{" "}
                      {formatMoney(request.quote.unitPrice)}
                    </p>
                    {Number(request.quote.transportFee) > 0 && (
                      <p className="mt-1 text-sm">
                        {t("workflow.transportFee")}: {formatMoney(request.quote.transportFee)}
                      </p>
                    )}
                    <p className="mt-1 text-sm">
                      {t("account.workspace.quotedTotal")}:{" "}
                      <strong>
                        {formatMoney(
                          Number(request.quote.quantity) * Number(request.quote.unitPrice) +
                            Number(request.quote.transportFee),
                        )}
                      </strong>
                    </p>
                    {request.quote.note && (
                      <p className="text-muted-foreground mt-2 text-sm whitespace-pre-line">
                        {request.quote.note}
                      </p>
                    )}
                    {request.quote.expiresAt && (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {t("common.labels.expires")}:{" "}
                        {formatter.dateTime(new Date(request.quote.expiresAt), {
                          dateStyle: "medium",
                          timeZone: "Asia/Dhaka",
                        })}
                      </p>
                    )}
                    {request.status === "QUOTED" && <AcceptQuoteForm requestId={request.id} />}
                  </div>
                )}
                {(request.status === "OPEN" || request.status === "QUOTED") && (
                  <CancelRequestForm requestId={request.id} />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section id="orders" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-xl font-bold">{t("common.labels.ordersAndBookings")}</h2>
        {workspace.orders.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          workspace.orders.map((order) => (
            <OrderCard key={order.id} order={order} actorId={user.id} perspective="buyer" />
          ))
        )}
      </section>

      <section id="projects" className="flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{t("workflow.projectTitle")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("account.projects.description")}
            </p>
          </div>
          <Link href="/account/projects/new" className={buttonVariants({ size: "sm" })}>
            {t("workflow.createProject")}
          </Link>
        </div>
        {workspace.projects.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          workspace.projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{project.title}</CardTitle>
                  <CardDescription>
                    {project.projectType} · {project.district}
                    {project.approximateArea ? ` · ${project.approximateArea}` : ""}
                  </CardDescription>
                </div>
                <StatusBadge status={project.status} />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-muted-foreground text-sm whitespace-pre-line">
                  {project.description}
                </p>
                {project.budget && (
                  <p className="text-sm">
                    {t("workflow.budget")}: {formatMoney(project.budget)}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    {t("account.workspace.acceptedQuoteOrders", { count: project.orders.length })} ·{" "}
                    {t("projects.milestones.count", { count: project.milestones.length })}
                  </p>
                  <Link
                    href={`/account/projects/${project.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {t("account.workspace.openProject")}
                  </Link>
                </div>
                {project.milestones.length > 0 && (
                  <MilestoneList milestones={project.milestones} owner />
                )}
                {project.documents.length > 0 && (
                  <div>
                    <h3 className="font-semibold">{t("workflow.projectDocuments")}</h3>
                    {project.documents.map((document) => (
                      <p key={document.id} className="mt-1 text-sm">
                        {document.filename}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section id="notifications" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="text-xl font-bold">{t("dashboard.notifications")}</h2>
        {workspace.notifications.length === 0 ? (
          <Empty text={t("workflow.noRecords")} />
        ) : (
          workspace.notifications.map((notification) => (
            <div
              key={notification.id}
              className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {notification.title}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {notification.message}
                </p>
              </div>
              {notification.href && (
                <Link
                  href={notification.href}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  {t("account.workspace.open")}
                </Link>
              )}
              {!notification.readAt && <MarkReadForm notificationId={notification.id} />}
            </div>
          ))
        )}
      </section>
    </WorkspaceNavigation>
  );
}

function ProfileForm({ user }: { user: { name: string; email: string; phone: string } }) {
  const [state, action, pending] = useActionState(updateProfileAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field
        id="account-name"
        label={t("auth.name")}
        icon={<UserRoundIcon aria-hidden="true" className="size-4" />}
      >
        <Input
          id="account-name"
          name="name"
          autoComplete="name"
          defaultValue={user.name}
          required
          maxLength={120}
        />
      </Field>
      <Field
        id="account-phone"
        label={t("auth.phone")}
        icon={<PhoneIcon aria-hidden="true" className="size-4" />}
      >
        <Input
          id="account-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={user.phone}
          required
          maxLength={30}
        />
      </Field>
      <Field
        id="account-email"
        label={t("auth.email")}
        icon={<MailIcon aria-hidden="true" className="size-4" />}
      >
        <Input id="account-email" type="email" autoComplete="email" value={user.email} readOnly />
      </Field>
      <div className="flex flex-col justify-end gap-2">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("auth.submit")}
        </Button>
      </div>
    </form>
  );
}

function AcceptQuoteForm({ requestId }: { requestId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(acceptQuoteAction, initialWorkflowState);
  return (
    <form action={action} className="mt-4 flex flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <ActionFeedback state={state} />
      <p className="text-muted-foreground text-xs">
        {t("account.requests.acceptanceNotice")}
      </p>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("common.loading") : t("workflow.acceptQuote")}
      </Button>
    </form>
  );
}

function CancelRequestForm({ requestId }: { requestId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    cancelMarketplaceRequestAction,
    initialWorkflowState,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <ActionFeedback state={state} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-muted-foreground w-fit"
      >
        {t("account.labels.withdrawRequest")}
      </Button>
    </form>
  );
}

function MarkReadForm({ notificationId }: { notificationId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(markNotificationReadAction, initialWorkflowState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="notificationId" value={notificationId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {t("account.workspace.markRead")}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
      {text}
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
