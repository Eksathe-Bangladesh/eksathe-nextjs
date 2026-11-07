"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  deleteAgricultureUserAction,
  createAgricultureUserAction,
  setAgriculturePanelActiveAction,
  updateAgriculturePanelAction,
  updateAgricultureUserAction,
} from "@/app/actions/agriculture-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { AgricultureAdminWorkspace } from "@/lib/agriculture/admin";
import {
  agricultureAccountStatuses,
  agricultureAccountTypes,
  type AgricultureAccountStatus,
  type AgricultureAccountType,
} from "@/lib/agriculture/account-types";

export function AgroAdminWorkspace({ data }: { data: AgricultureAdminWorkspace }) {
  const t = useTranslations();
  const locale = useLocale();
  const formatter = useFormatter();
  const accountTypeOptions = [
    { value: "customer", label: t("workflow.customerAccount") },
    { value: "farmer", label: t("workflow.farmerAccount") },
    { value: "agro_laborer", label: t("workflow.agroLaborerAccount") },
    { value: "agronomist", label: t("workflow.agronomistAccount") },
    { value: "veterinarian", label: t("workflow.veterinarianAccount") },
    { value: "agro_seller", label: t("workflow.agroSellerAccount") },
    {
      value: "agriculture_professional",
      label: t("workflow.agricultureProfessionalAccount"),
    },
  ] satisfies { value: AgricultureAccountType; label: string }[];
  const statusOptions = [
    { value: "active", label: t("workflow.activeAccount") },
    { value: "pending", label: t("workflow.pendingAccount") },
    { value: "suspended", label: t("workflow.suspendedAccount") },
  ] satisfies { value: AgricultureAccountStatus; label: string }[];

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-semibold text-primary">{t("workflow.agroAdmin")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {t("workflow.agricultureManagement")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === "bn"
            ? "কৃষি বিভাগের অ্যাক্সেস সুপার অ্যাডমিন নির্ধারণ করেন। এই প্যানেলে অ্যাডমিন অ্যাকাউন্ট বা অন্য বিভাগের অনুমতি পরিবর্তন করা যায় না।"
            : "Agriculture access is granted by a Super Admin. This workspace cannot change admin accounts or permissions for other sectors."}
        </p>
      </header>

      {data.canManageUsers && (
        <section id="users" className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">{t("workflow.agricultureUserManagement")}</h2>
          <CreateUserForm accountTypeOptions={accountTypeOptions} />
          {data.users.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {t("workflow.noManagedAccounts")}
            </p>
          ) : (
            data.users.map((user) => {
              const accountType = agricultureAccountTypes.find(
                (value) => value === user.accountType,
              );
              const status = agricultureAccountStatuses.find((value) => value === user.status);
              return (
                <Card key={user.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <CardDescription>
                      {user.email} · {user.phone} ·{" "}
                      {formatter.dateTime(new Date(user.createdAt), { dateStyle: "medium" })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <UserUpdateForm
                      userId={user.id}
                      accountType={accountType ?? "customer"}
                      status={status ?? "pending"}
                      accountTypeOptions={accountTypeOptions}
                      statusOptions={statusOptions}
                    />
                    {user.hasBusinessData ? (
                      <p className="text-sm text-muted-foreground">
                        {t("workflow.agricultureAccountHasData")}
                      </p>
                    ) : (
                      <DeleteAccountForm userId={user.id} />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>
      )}

      {data.canManagePanels && (
        <section id="panels" className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">{t("workflow.agriculturePanelManagement")}</h2>
          {data.panels.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {t("workflow.noServicePanels")}
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.panels.map((panel) => (
                <PanelStatusForm key={panel.id} panel={panel} />
              ))}
            </div>
          )}
        </section>
      )}

      {data.canViewReports && data.report && (
        <section id="reports" className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">{t("workflow.agricultureReports")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("workflow.totalRequests")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-3xl font-bold">
                  {formatter.number(
                    data.report.requestGroups.reduce((total, group) => total + group.count, 0),
                  )}
                </p>
                {data.report.requestGroups.map((group) => (
                  <p key={group.status} className="text-sm text-muted-foreground">
                    {group.status}: {formatter.number(group.count)}
                  </p>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("workflow.totalCommissions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatter.number(Number(data.report.commissionTotal), {
                    style: "currency",
                    currency: "BDT",
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatter.number(data.report.commissionCount)} {t("workflow.commissionsDue")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

function DeleteAccountForm({ userId }: { userId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    deleteAgricultureUserAction,
    initialWorkflowState,
  );
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
              `${t("workflow.confirmAccountDelete")} (${userId})?`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {t("workflow.deleteAccount")}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

function CreateUserForm({
  accountTypeOptions,
}: {
  accountTypeOptions: { value: AgricultureAccountType; label: string }[];
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    createAgricultureUserAction,
    initialWorkflowState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("workflow.createStandardAccount")}</CardTitle>
        <CardDescription>{t("workflow.agricultureAccountCreated")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <FieldGroup className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="agro-user-name">{t("workflow.accountName")}</FieldLabel>
              <Input id="agro-user-name" name="name" autoComplete="name" minLength={2} maxLength={150} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="agro-user-email">{t("workflow.accountEmail")}</FieldLabel>
              <Input id="agro-user-email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="agro-user-phone">{t("workflow.accountPhone")}</FieldLabel>
              <Input id="agro-user-phone" name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={30} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="agro-user-account-type">{t("workflow.accountType")}</FieldLabel>
              <select
                id="agro-user-account-type"
                name="accountType"
                defaultValue="customer"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGroup>
          <div className="flex flex-col gap-2">
            <ActionFeedback state={state} />
            <Button type="submit" className="w-fit" disabled={pending}>
              {pending ? t("common.loading") : t("workflow.createAccount")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UserUpdateForm({
  userId,
  accountType,
  status,
  accountTypeOptions,
  statusOptions,
}: {
  userId: string;
  accountType: AgricultureAccountType;
  status: AgricultureAccountStatus;
  accountTypeOptions: { value: AgricultureAccountType; label: string }[];
  statusOptions: { value: AgricultureAccountStatus; label: string }[];
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    updateAgricultureUserAction,
    initialWorkflowState,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <FieldGroup className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Field>
          <FieldLabel htmlFor={`account-type-${userId}`}>{t("workflow.accountType")}</FieldLabel>
          <select
            id={`account-type-${userId}`}
            name="accountType"
            defaultValue={accountType}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {accountTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`account-status-${userId}`}>{t("workflow.accountStatus")}</FieldLabel>
          <select
            id={`account-status-${userId}`}
            name="status"
            defaultValue={status}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit" disabled={pending} className="self-end">
          {pending ? t("common.loading") : t("inline.update_1raohb6")}
        </Button>
      </FieldGroup>
      <ActionFeedback state={state} />
    </form>
  );
}

function PanelStatusForm({
  panel,
}: {
  panel: AgricultureAdminWorkspace["panels"][number];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, action, pending] = useActionState(
    setAgriculturePanelActiveAction,
    initialWorkflowState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateAgriculturePanelAction,
    initialWorkflowState,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{locale === "bn" ? panel.titleBn : panel.titleEn}</CardTitle>
        <CardDescription>{panel.slug}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={updateAction} className="flex flex-col gap-3">
          <input type="hidden" name="panelId" value={panel.id} />
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`panel-title-bn-${panel.id}`}>{t("workflow.titleBn")}</FieldLabel>
              <Input
                id={`panel-title-bn-${panel.id}`}
                name="titleBn"
                defaultValue={panel.titleBn}
                maxLength={120}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`panel-title-en-${panel.id}`}>{t("workflow.titleEn")}</FieldLabel>
              <Input
                id={`panel-title-en-${panel.id}`}
                name="titleEn"
                defaultValue={panel.titleEn}
                maxLength={120}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`panel-description-bn-${panel.id}`}>
                {t("workflow.descriptionBn")}
              </FieldLabel>
              <Textarea
                id={`panel-description-bn-${panel.id}`}
                name="descriptionBn"
                defaultValue={panel.descriptionBn}
                maxLength={1200}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`panel-description-en-${panel.id}`}>
                {t("workflow.descriptionEn")}
              </FieldLabel>
              <Textarea
                id={`panel-description-en-${panel.id}`}
                name="descriptionEn"
                defaultValue={panel.descriptionEn}
                maxLength={1200}
                required
              />
            </Field>
          </FieldGroup>
          <ActionFeedback state={updateState} />
          <Button type="submit" className="w-fit" disabled={updatePending}>
            {updatePending ? t("common.loading") : t("inline.update_1raohb6")}
          </Button>
        </form>
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="panelId" value={panel.id} />
          <input type="hidden" name="isActive" value={String(!panel.isActive)} />
          <ActionFeedback state={state} />
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {panel.isActive ? t("workflow.inactivePanel") : t("workflow.activePanel")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
