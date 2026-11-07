"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";
import { type FormEvent, useActionState, useEffect, useRef, useState } from "react";

import {
  confirmPaymentAction,
  progressOrderAction,
  raiseDisputeAction,
  recordPaymentAction,
  requestOrderCancellationAction,
  reviewOrderAction,
} from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { StatusBadge } from "@/components/workflows/status-badge";
import { uploadPrivateFile } from "@/lib/client-upload";
import { initialWorkflowState } from "@/lib/workflow-state";

type Payment = {
  id: string;
  amount: string;
  method: string;
  reference: string | null;
  paidAt: string | null;
  submittedById: string;
  buyerConfirmedAt: string | null;
  providerConfirmedAt: string | null;
  refundAmount?: string | null;
  hasReceipt?: boolean;
};

export type WorkspaceOrder = {
  id: string;
  status: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  subtotal: string;
  transportFee: string;
  commissionAmount: string;
  listing: { titleBn: string; titleEn: string; kind: string; unit: string };
  provider?: { nameBn: string; nameEn: string; userId: string };
  buyerName?: string;
  booking: { startsAt: string | null; endsAt: string | null } | null;
  cancellationReason: string | null;
  cancelRequestedById: string | null;
  payments: Payment[];
  commission: { status: string; amount: string } | null;
  hasReview?: boolean;
};

export function OrderCard({
  order,
  actorId,
  perspective,
}: {
  order: WorkspaceOrder;
  actorId: string;
  perspective: "buyer" | "provider";
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  const total = Number(order.subtotal) + Number(order.transportFee);
  const confirmedPaid = order.payments.reduce(
    (sum, payment) =>
      payment.buyerConfirmedAt && payment.providerConfirmedAt
        ? sum + Number(payment.amount) - Number(payment.refundAmount ?? 0)
        : sum,
    0,
  );
  const recorded = order.payments.reduce(
    (sum, payment) => sum + Number(payment.amount) - Number(payment.refundAmount ?? 0),
    0,
  );
  const due = Math.max(0, total - recorded);
  const formatMoney = (value: number | string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const startsAt = order.booking?.startsAt
    ? formatter.dateTime(new Date(order.booking.startsAt), {
        dateStyle: "medium",
        timeZone: "Asia/Dhaka",
      })
    : null;
  const endsAt = order.booking?.endsAt
    ? formatter.dateTime(new Date(new Date(order.booking.endsAt).getTime() - 86_400_000), {
        dateStyle: "medium",
        timeZone: "Asia/Dhaka",
      })
    : null;
  const title = locale === "bn" ? order.listing.titleBn : order.listing.titleEn;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="mt-1">
            {t("inline.order_116i1m4")} · {order.id}
          </CardDescription>
        </div>
        <StatusBadge status={order.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="bg-muted/50 grid gap-3 rounded-xl p-4 text-sm sm:grid-cols-2">
          <p>
            {t("inline.quantity_fuyc1w")}:{" "}
            <strong>
              {order.quantity} {order.unit}
            </strong>
          </p>
          <p>
            {t("inline.unit_price_1v7hlen")}:{" "}
            <strong>
              {formatMoney(order.unitPrice)} / {order.unit}
            </strong>
          </p>
          {order.buyerName && (
            <p>
              {t("inline.customer_126xmgu")}: <strong>{order.buyerName}</strong>
            </p>
          )}
          {order.provider && (
            <p>
              {t("inline.provider_1jmkj9t")}:{" "}
              <strong>{locale === "bn" ? order.provider.nameBn : order.provider.nameEn}</strong>
            </p>
          )}
          {startsAt && (
            <p>
              {t("workflow.startDate")}:{" "}
              <strong>
                {startsAt} – {endsAt}
              </strong>
            </p>
          )}
          <p>
            {t("inline.items_or_service_9cbaqx")}: <strong>{formatMoney(order.subtotal)}</strong>
          </p>
          {Number(order.transportFee) > 0 && (
            <p>
              {t("workflow.transportFee")}: <strong>{formatMoney(order.transportFee)}</strong>
            </p>
          )}
          <p>
            {t("inline.total_bldkfh")}: <strong>{formatMoney(total)}</strong>
          </p>
          <p>
            {t("inline.confirmed_paid_1skg95y")}: <strong>{formatMoney(confirmedPaid)}</strong>
          </p>
          <p>
            {t("inline.balance_due_tadetd")}: <strong>{formatMoney(due)}</strong>
          </p>
        </div>

        {perspective === "provider" && order.status === "CONFIRMED" && (
          <ProgressForm orderId={order.id} intent="start" />
        )}
        {perspective === "provider" && order.status === "IN_PROGRESS" && (
          <ProgressForm orderId={order.id} intent="submit" />
        )}
        {perspective === "buyer" && order.status === "AWAITING_CONFIRMATION" && (
          <ProgressForm orderId={order.id} intent="confirm" />
        )}

        {order.status !== "CANCELLED" && order.status !== "DISPUTED" && due > 0 && (
          <PaymentForm orderId={order.id} due={due} />
        )}
        {order.payments.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{t("inline.payment_records_dd9a94")}</h3>
            {order.payments.map((payment) => (
              <div
                key={payment.id}
                className="border-border/70 flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <p>
                  {formatMoney(payment.amount)} · {paymentMethod(payment.method, locale)}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </p>
                <div className="flex items-center gap-2">
                  {payment.hasReceipt && (
                    <a
                      className="text-primary text-xs font-medium hover:underline"
                      href={`/api/orders/${order.id}/payments/${payment.id}/receipt`}
                    >
                      {t("workflow.viewReceipt")}
                    </a>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {payment.buyerConfirmedAt && payment.providerConfirmedAt
                      ? t("inline.confirmed_by_both_parties_1xd4wdp")
                      : t("inline.awaiting_confirmation_1m2idbp")}
                  </span>
                  {payment.submittedById !== actorId &&
                    ((perspective === "buyer" && !payment.buyerConfirmedAt) ||
                      (perspective === "provider" && !payment.providerConfirmedAt)) && (
                      <PaymentConfirmationForm orderId={order.id} paymentId={payment.id} />
                    )}
                </div>
              </div>
            ))}
          </section>
        )}

        {order.commission && (
          <div className="border-border/70 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span>
              {t("inline.platform_commission_1lexk9r")}: {formatMoney(order.commission.amount)}
            </span>
            <StatusBadge status={order.commission.status} />
          </div>
        )}

        {perspective === "buyer" && order.status === "COMPLETED" && !order.hasReview && (
          <ReviewForm orderId={order.id} />
        )}

        {order.cancelRequestedById &&
        order.cancelRequestedById !== actorId &&
        order.status !== "CANCELLED" ? (
          <CancelOrderForm orderId={order.id} agree />
        ) : order.cancelRequestedById === actorId ? (
          <p className="bg-muted text-muted-foreground rounded-lg px-3 py-2 text-sm">
            {t("workflow.cancellationPending")}
          </p>
        ) : order.status !== "COMPLETED" &&
          order.status !== "CANCELLED" &&
          order.status !== "DISPUTED" ? (
          <CancelOrderForm orderId={order.id} />
        ) : null}

        {order.status !== "COMPLETED" &&
          order.status !== "CANCELLED" &&
          order.status !== "DISPUTED" && <DisputeForm orderId={order.id} />}
      </CardContent>
    </Card>
  );
}

function ProgressForm({
  orderId,
  intent,
}: {
  orderId: string;
  intent: "start" | "submit" | "confirm";
}) {
  const [state, action, pending] = useActionState(progressOrderAction, initialWorkflowState);
  const t = useTranslations();
  const label =
    intent === "start"
      ? t("workflow.requestInProgress")
      : intent === "submit"
        ? t("workflow.completeWork")
        : t("workflow.confirmComplete");
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="intent" value={intent} />
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("common.loading") : label}
      </Button>
    </form>
  );
}

function PaymentForm({ orderId, due }: { orderId: string; due: number }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(recordPaymentAction, initialWorkflowState);
  const [uploadError, setUploadError] = useState<"uploadFailed" | "invalidUpload" | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadedFile = useRef<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
    uploadedFile.current = null;
  }, [state.status]);

  async function prepareReceipt(event: FormEvent<HTMLFormElement>) {
    const selectedFile = fileInput.current?.files?.[0] ?? null;
    if (!selectedFile || uploadedFile.current === selectedFile) return;
    event.preventDefault();
    const form = event.currentTarget;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadPrivateFile(selectedFile, { purpose: "payment-receipt", orderId });
      for (const [name, value] of [
        ["receiptKey", result.key],
        ["receiptContentType", result.contentType],
        ["receiptSizeBytes", result.sizeBytes],
      ] as const) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = value;
      }
      uploadedFile.current = selectedFile;
      form.requestSubmit();
    } catch (error) {
      setUploadError(
        error instanceof Error && error.message === "invalid-file"
          ? "invalidUpload"
          : "uploadFailed",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={prepareReceipt}
      className="border-border/70 grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="receiptKey" defaultValue="" />
      <input type="hidden" name="receiptContentType" defaultValue="" />
      <input type="hidden" name="receiptSizeBytes" defaultValue="" />
      <Field id={`payment-amount-${orderId}`} label={`${t("workflow.paymentAmount")} (BDT)`}>
        <Input
          id={`payment-amount-${orderId}`}
          name="amount"
          type="number"
          min="0.01"
          max={due.toFixed(2)}
          step="0.01"
          required
        />
      </Field>
      <Field id={`payment-method-${orderId}`} label={t("workflow.paymentMethod")}>
        <select
          id={`payment-method-${orderId}`}
          name="method"
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <option value="CASH">{t("inline.cash_1yvb5lv")}</option>
          <option value="BANK_TRANSFER">{t("inline.bank_transfer_1wr4ny5")}</option>
          <option value="MOBILE_WALLET">{t("inline.mobile_wallet_o4hwx8")}</option>
          <option value="OTHER">{t("inline.other_meu6yg")}</option>
        </select>
      </Field>
      <Field id={`payment-reference-${orderId}`} label={t("workflow.paymentReference")}>
        <Input id={`payment-reference-${orderId}`} name="reference" maxLength={120} />
      </Field>
      <Field id={`payment-receipt-${orderId}`} label={t("workflow.paymentReceipt")}>
        <Input
          ref={fileInput}
          id={`payment-receipt-${orderId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
          disabled={uploading || pending}
          onChange={(event) => {
            setUploadError(null);
            uploadedFile.current = null;
            const form = event.currentTarget.form;
            for (const name of ["receiptKey", "receiptContentType", "receiptSizeBytes"]) {
              const field = form?.elements.namedItem(name);
              if (field instanceof HTMLInputElement) field.value = "";
            }
          }}
        />
      </Field>
      <div className="flex flex-col justify-end gap-2">
        <ActionFeedback state={state} />
        {uploadError && (
          <p role="alert" className="text-destructive text-sm">
            {t(`workflow.${uploadError}` as never)}
          </p>
        )}
        <Button type="submit" disabled={pending || uploading}>
          {pending || uploading ? t("common.loading") : t("workflow.submitPayment")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs sm:col-span-2">
        {t("workflow.paymentReceiptHelp")}
      </p>
      <p className="text-muted-foreground text-xs sm:col-span-2">
        {t("inline.pay_the_provider_directly_the_payment_is_n_4e9pq4")}
      </p>
    </form>
  );
}

function PaymentConfirmationForm({ orderId, paymentId }: { orderId: string; paymentId: string }) {
  const [state, action, pending] = useActionState(confirmPaymentAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <ActionFeedback state={state} />
      <Button size="sm" variant="outline" type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.confirmPayment")}
      </Button>
    </form>
  );
}

function ReviewForm({ orderId }: { orderId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(reviewOrderAction, initialWorkflowState);
  return (
    <form
      action={action}
      className="border-border/70 grid gap-3 rounded-xl border p-4 sm:grid-cols-[140px_minmax(0,1fr)_auto]"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <Field id={`review-rating-${orderId}`} label={t("workflow.reviewRating")}>
        <select
          id={`review-rating-${orderId}`}
          name="rating"
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating} / 5
            </option>
          ))}
        </select>
      </Field>
      <Field id={`review-comment-${orderId}`} label={t("workflow.reviewText")}>
        <Input id={`review-comment-${orderId}`} name="comment" maxLength={1200} />
      </Field>
      <div className="flex flex-col gap-2 sm:justify-end">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.submitReview")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs sm:col-span-3">
        {t("inline.you_can_leave_one_review_for_each_complete_1sswryh")}
      </p>
    </form>
  );
}

function CancelOrderForm({ orderId, agree = false }: { orderId: string; agree?: boolean }) {
  const [state, action, pending] = useActionState(
    requestOrderCancellationAction,
    initialWorkflowState,
  );
  const t = useTranslations();
  return (
    <form action={action} className="border-border/70 flex flex-col gap-2 rounded-xl border p-4">
      <input type="hidden" name="orderId" value={orderId} />
      {agree ? (
        <input type="hidden" name="reason" value="Agreed to the cancellation" />
      ) : (
        <Field id={`cancel-reason-${orderId}`} label={t("workflow.cancelOrder")}>
          <textarea
            id={`cancel-reason-${orderId}`}
            name="reason"
            required
            maxLength={1000}
            rows={2}
            className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending} variant="outline" className="w-fit">
        {pending
          ? t("common.loading")
          : agree
            ? t("workflow.agreeCancellation")
            : t("workflow.cancelOrder")}
      </Button>
    </form>
  );
}

function DisputeForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(raiseDisputeAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <details className="border-border/70 rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-medium">{t("workflow.raiseDispute")}</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="orderId" value={orderId} />
        <Field id={`dispute-reason-${orderId}`} label={t("workflow.dispute")}>
          <textarea
            id={`dispute-reason-${orderId}`}
            name="reason"
            required
            maxLength={1000}
            rows={3}
            className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
        <ActionFeedback state={state} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.raiseDispute")}
        </Button>
      </form>
    </details>
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

function paymentMethod(method: string, locale: "bn" | "en") {
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
