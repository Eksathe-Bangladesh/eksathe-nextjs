"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { reviewProviderVerificationAction } from "@/app/actions/provider-verification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { EmptyState } from "@/components/workflows/empty-state";
import { StatusBadge } from "@/components/workflows/status-badge";
import { verificationMessageKey } from "@/lib/construction/verification-labels";
import { initialWorkflowState } from "@/lib/workflow-state";
import type { AdminWorkspace } from "@/lib/workspaces";

type VerificationApplication = AdminWorkspace["verificationApplications"][number];

export function ProviderVerificationReviewQueue({
  applications,
}: {
  applications: VerificationApplication[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <section id="construction-verifications" className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{t("verification.admin.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t("verification.admin.description")}</p>
      </div>
      {!applications.length ? (
        <EmptyState text={t("workflow.noRecords")} />
      ) : (
        applications.map((application) => (
          <VerificationApplicationCard
            key={application.id}
            application={application}
            locale={locale}
          />
        ))
      )}
    </section>
  );
}

function VerificationApplicationCard({
  application,
  locale,
}: {
  application: VerificationApplication;
  locale: string;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    reviewProviderVerificationAction,
    initialWorkflowState,
  );
  const [note, setNote] = useState(application.reviewNote ?? "");
  const [documents, setDocuments] = useState(
    application.documents.map((document) => ({
      id: document.id,
      status: document.status,
      note: document.reviewNote ?? "",
    })),
  );
  const canReview = application.status === "SUBMITTED" || application.status === "IN_REVIEW";
  const canRevoke = application.status === "APPROVED";

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">
            {application.providerName} ·{" "}
            {t(`verification.types.${verificationMessageKey(application.type)}`)}
          </CardTitle>
          <CardDescription>
            {application.email} · {application.phone} · {application.district} · v
            {application.version}
          </CardDescription>
        </div>
        <StatusBadge status={application.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">{t("verification.fields.applicantType")}:</span>{" "}
            {t(`verification.applicantTypes.${verificationMessageKey(application.applicantType)}`)}
          </p>
          <p>
            <span className="font-medium">{t("verification.fields.legalName")}:</span>{" "}
            {application.legalName}
          </p>
          {application.businessName && (
            <p>
              <span className="font-medium">{t("verification.fields.businessName")}:</span>{" "}
              {application.businessName}
            </p>
          )}
          <p>
            <span className="font-medium">{t("verification.fields.businessAddress")}:</span>{" "}
            {application.businessAddress}
          </p>
          {application.registrationNumber && (
            <p>
              <span className="font-medium">{t("verification.fields.registrationNumber")}:</span>{" "}
              {application.registrationNumber}
            </p>
          )}
          {application.tradeLicenseNumber && (
            <p>
              <span className="font-medium">{t("verification.fields.tradeLicenseNumber")}:</span>{" "}
              {application.tradeLicenseNumber}
            </p>
          )}
          {application.taxIdentifier && (
            <p>
              <span className="font-medium">{t("verification.fields.taxIdentifier")}:</span>{" "}
              {application.taxIdentifier}
            </p>
          )}
          <p>
            <span className="font-medium">{t("verification.fields.serviceAreas")}:</span>{" "}
            {application.serviceAreas.join(", ") || t("common.labels.notProvided")}
          </p>
          {application.type === "CONTRACTOR" ? (
            <>
              {application.yearsExperience !== null && (
                <p>
                  <span className="font-medium">{t("verification.fields.yearsExperience")}:</span>{" "}
                  {application.yearsExperience}
                </p>
              )}
              {application.teamSize !== null && (
                <p>
                  <span className="font-medium">{t("verification.fields.teamSize")}:</span>{" "}
                  {application.teamSize}
                </p>
              )}
              <p>
                <span className="font-medium">{t("verification.fields.specializations")}:</span>{" "}
                {application.specializations.join(", ") || t("common.labels.notProvided")}
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-medium">{t("verification.fields.materialCategories")}:</span>{" "}
                {application.materialCategories.join(", ") || t("common.labels.notProvided")}
              </p>
              <p>
                <span className="font-medium">{t("verification.fields.brands")}:</span>{" "}
                {application.brands.join(", ") || t("common.labels.notProvided")}
              </p>
            </>
          )}
        </div>

        {application.documents.length ? (
          <div className="flex flex-col gap-3">
            <h3 className="font-semibold">{t("verification.admin.documents")}</h3>
            {application.documents.map((document) => {
              const decision = documents.find((item) => item.id === document.id);
              return (
                <div
                  key={document.id}
                  className="border-border/70 grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_180px]"
                >
                  <div className="min-w-0">
                    <a
                      href={`/api/provider-verification/documents/${encodeURIComponent(document.id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-sm font-medium break-all hover:underline"
                    >
                      {t(`verification.documents.${verificationMessageKey(document.documentType)}`)}{" "}
                      · {document.filename}
                    </a>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("verification.admin.fileDetails", {
                        size: Math.ceil(document.sizeBytes / 1024),
                        type: document.contentType,
                      })}
                    </p>
                    {document.reviewNote && (
                      <p className="text-muted-foreground mt-1 text-xs">{document.reviewNote}</p>
                    )}
                  </div>
                  {canReview ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`verification-document-${document.id}`}>
                        {t("verification.admin.documentDecision")}
                      </Label>
                      <NativeSelect
                        id={`verification-document-${document.id}`}
                        value={decision?.status ?? document.status}
                        onChange={(event) =>
                          setDocuments((current) =>
                            current.map((item) =>
                              item.id === document.id
                                ? { ...item, status: event.target.value as typeof item.status }
                                : item,
                            ),
                          )
                        }
                      >
                        {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
                          <NativeSelectOption key={status} value={status}>
                            {t(`verification.documentStatuses.${verificationMessageKey(status)}`)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <Label htmlFor={`verification-document-note-${document.id}`}>
                        {t("verification.admin.documentNote")}
                      </Label>
                      <Textarea
                        id={`verification-document-note-${document.id}`}
                        value={decision?.note ?? ""}
                        maxLength={500}
                        rows={2}
                        onChange={(event) =>
                          setDocuments((current) =>
                            current.map((item) =>
                              item.id === document.id
                                ? { ...item, note: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="text-xs"
                      />
                    </div>
                  ) : (
                    <StatusBadge status={document.status} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-destructive text-sm">{t("verification.admin.noDocuments")}</p>
        )}

        {application.reviews.length > 0 && (
          <details className="border-border/70 rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("verification.admin.history")}
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
              {application.reviews.map((review, index) => (
                <li key={`${review.createdAt}-${index}`} className="text-muted-foreground text-xs">
                  {t(`verification.statuses.${verificationMessageKey(review.action)}`)} ·{" "}
                  {review.actorName} · {new Date(review.createdAt ?? "").toLocaleString(locale)}
                  {review.note ? ` — ${review.note}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}

        {(canReview || canRevoke) && (
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="applicationId" value={application.id} />
            <input type="hidden" name="documentDecisionsJson" value={JSON.stringify(documents)} />
            <div className="flex flex-col gap-2">
              <Label htmlFor={`verification-note-${application.id}`}>
                {t("verification.admin.reviewNote")}
              </Label>
              <Textarea
                id={`verification-note-${application.id}`}
                name="reviewNote"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={1200}
              />
            </div>
            <ActionFeedback state={state} />
            <div className="flex flex-wrap gap-2">
              {canReview && application.status === "SUBMITTED" && (
                <DecisionButton decision="IN_REVIEW" pending={pending} />
              )}
              {canReview && <DecisionButton decision="APPROVED" pending={pending} />}
              {canReview && <DecisionButton decision="CHANGES_REQUESTED" pending={pending} />}
              {canReview && <DecisionButton decision="REJECTED" pending={pending} />}
              {canRevoke && <DecisionButton decision="REVOKED" pending={pending} />}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function DecisionButton({
  decision,
  pending,
}: {
  decision: "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED" | "REVOKED";
  pending: boolean;
}) {
  const t = useTranslations();
  const variant = decision === "APPROVED" ? "default" : "outline";
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      variant={variant}
      size="sm"
      disabled={pending}
    >
      {pending
        ? t("common.loading")
        : t(`verification.actions.${verificationMessageKey(decision)}`)}
    </Button>
  );
}
