"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";
import { useActionState } from "react";

import { withdrawAgricultureServiceRequestAction } from "@/app/actions/agriculture";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { Link } from "@/i18n/navigation";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { getCustomerAgricultureRequest } from "@/lib/workspaces";

type RequestData = NonNullable<Awaited<ReturnType<typeof getCustomerAgricultureRequest>>>;

export function AgricultureRequestDetail({ request }: { request: RequestData }) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const [state, action, pending] = useActionState(
    withdrawAgricultureServiceRequestAction,
    initialWorkflowState,
  );
  const snapshot = request.fieldSnapshot as {
    fields?: Array<{
      name: string;
      labelBn: string;
      labelEn: string;
      options?: Array<{ value: string; labelBn: string; labelEn: string }>;
    }>;
  };
  const answers = request.answers as Record<string, string>;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/account#agriculture-requests"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← {t("account.agricultureRequest.backToAccount")}
      </Link>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span aria-hidden="true" className="text-4xl">
              {request.service.icon}
            </span>
            <div>
              <CardTitle className="text-2xl">
                {{ en: request.service.title, bn: request.service.title }[locale]}
              </CardTitle>
              <CardDescription className="mt-2">
                {request.referenceCode ?? `AG-${request.id}`} · {request.district} ·{" "}
                {request.createdAt
                  ? formatter.dateTime(new Date(request.createdAt), {
                      dateStyle: "medium",
                      timeZone: "Asia/Dhaka",
                    })
                  : ""}
              </CardDescription>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="bg-muted/50 grid gap-3 rounded-xl p-4 sm:grid-cols-2">
            <p className="text-sm">
              <span className="text-muted-foreground">{t("account.agricultureRequest.contact")}:</span>{" "}
              {request.customerName} · {request.phone}
            </p>
            {request.budget && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("common.labels.budget")}:</span> ৳
                {request.budget}
              </p>
            )}
            <p className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">{t("account.agricultureRequest.requirement")}:</span>{" "}
              {request.details}
            </p>
          </div>
          {snapshot.fields?.some((field) => answers[field.name]) && (
            <section>
              <h2 className="font-semibold">{t("account.agricultureRequest.submittedServiceDetails")}</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {snapshot.fields
                  .filter((field) => answers[field.name])
                  .map((field) => {
                    const answer = answers[field.name];
                    const option = field.options?.find((item) => item.value === answer);
                    return (
                      <div key={field.name} className="rounded-lg border p-3">
                        <dt className="text-muted-foreground text-xs">
                          {{ en: field.labelEn, bn: field.labelBn }[locale]}
                        </dt>
                        <dd className="mt-1 text-sm">
                          {option ? { en: option.labelEn, bn: option.labelBn }[locale] : answer}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </section>
          )}
          {request.attachments.length > 0 && (
            <section>
              <h2 className="font-semibold">{t("common.labels.privateAttachments")}</h2>
              <ul className="mt-2 space-y-2">
                {request.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      className="text-primary text-sm font-medium hover:underline"
                      href={`/api/agriculture/requests/${request.id}/attachments/${attachment.id}`}
                    >
                      {attachment.filename}
                    </a>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {(attachment.sizeBytes / 1_000_000).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="font-semibold">{t("common.labels.updates")}</h2>
            {request.updates.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">
                {t("account.agricultureRequest.noUpdatesYet")}
              </p>
            ) : (
              <ol className="mt-3 space-y-3 border-l pl-4">
                {request.updates.map((update) => (
                  <li key={update.id} className="relative">
                    <span className="bg-primary absolute top-1 left-[-21px] size-2 rounded-full" />
                    <p className="text-sm">
                      {({ en: update.message ?? update.message, bn: update.message ?? update.message }[locale])}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {update.createdAt
                        ? formatter.dateTime(new Date(update.createdAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Dhaka",
                          })
                        : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {(request.status === "NEW" || request.status === "REVIEWING") && (
            <form action={action} className="flex flex-col gap-2 border-t pt-4">
              <input type="hidden" name="requestId" value={request.id} />
              <ActionFeedback state={state} />
              <Button type="submit" variant="outline" disabled={pending} className="w-fit">
                {t("account.labels.withdrawRequest")}
              </Button>
            </form>
          )}
          <Link href="/agriculture" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("agriculture.services.all")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
