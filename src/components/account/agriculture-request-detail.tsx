"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useActionState } from "react";

import { withdrawAgricultureServiceRequestAction } from "@/app/actions/agriculture";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { getCustomerAgricultureRequest } from "@/lib/workspaces";

type RequestData = NonNullable<Awaited<ReturnType<typeof getCustomerAgricultureRequest>>>;

export function AgricultureRequestDetail({ request }: { request: RequestData }) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const english = locale === "en";
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
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t("inline.back_to_account_k3epiu")}
      </Link>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span aria-hidden="true" className="text-4xl">
              {request.service.icon}
            </span>
            <div>
              <CardTitle className="text-2xl">
                {english ? request.service.titleEn : request.service.titleBn}
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
          <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-2">
            <p className="text-sm">
              <span className="text-muted-foreground">{t("inline.contact_kqf8cd")}:</span>{" "}
              {request.customerName} · {request.phone}
            </p>
            {request.budget && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("inline.budget_1cc4s4c")}:</span> ৳
                {request.budget}
              </p>
            )}
            <p className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">{t("inline.requirement_14zq66t")}:</span>{" "}
              {request.details}
            </p>
          </div>
          {snapshot.fields?.some((field) => answers[field.name]) && (
            <section>
              <h2 className="font-semibold">{t("inline.submitted_service_details_1wb3h0i")}</h2>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {snapshot.fields
                  .filter((field) => answers[field.name])
                  .map((field) => {
                    const answer = answers[field.name];
                    const option = field.options?.find((item) => item.value === answer);
                    return (
                      <div key={field.name} className="rounded-lg border p-3">
                        <dt className="text-xs text-muted-foreground">
                          {english ? field.labelEn : field.labelBn}
                        </dt>
                        <dd className="mt-1 text-sm">
                          {option ? (english ? option.labelEn : option.labelBn) : answer}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </section>
          )}
          {request.attachments.length > 0 && (
            <section>
              <h2 className="font-semibold">{t("inline.private_attachments_fpiomb")}</h2>
              <ul className="mt-2 space-y-2">
                {request.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      className="text-sm font-medium text-primary hover:underline"
                      href={`/api/agriculture/requests/${request.id}/attachments/${attachment.id}`}
                    >
                      {attachment.filename}
                    </a>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(attachment.sizeBytes / 1_000_000).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="font-semibold">{t("inline.updates_12jzrl0")}</h2>
            {request.updates.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("inline.no_updates_yet_105bcq2")}
              </p>
            ) : (
              <ol className="mt-3 space-y-3 border-l pl-4">
                {request.updates.map((update) => (
                  <li key={update.id} className="relative">
                    <span className="absolute top-1 left-[-21px] size-2 rounded-full bg-primary" />
                    <p className="text-sm">
                      {english
                        ? (update.messageEn ?? update.messageBn)
                        : (update.messageBn ?? update.messageEn)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                {t("inline.withdraw_request_16j3pnu")}
              </Button>
            </form>
          )}
          <Link href="/agriculture" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("inline.all_agriculture_services_170e4nu")}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
