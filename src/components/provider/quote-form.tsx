"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { submitQuoteAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { initialWorkflowState } from "@/lib/workflow-state";

export function QuoteForm({
  request,
}: {
  request: {
    id: string;
    quantity: string;
    quote: null | { quantity: string; unitPrice: string; transportFee: string; note: string };
  };
}) {
  const [state, action, pending] = useActionState(submitQuoteAction, initialWorkflowState);
  const t = useTranslations();
  const formatter = useFormatter();
  const [quantity, setQuantity] = useState(Number(request.quote?.quantity ?? request.quantity));
  const [unitPrice, setUnitPrice] = useState(Number(request.quote?.unitPrice ?? 0));
  const [transportFee, setTransportFee] = useState(Number(request.quote?.transportFee ?? 0));
  return (
    <form action={action} className="bg-muted/50 mt-4 grid gap-3 rounded-xl p-4 sm:grid-cols-2">
      <input type="hidden" name="requestId" value={request.id} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`quote-quantity-${request.id}`}>{t("workflow.quantity")}</Label>
        <Input
          id={`quote-quantity-${request.id}`}
          name="quantity"
          type="number"
          min="0.001"
          step="0.001"
          max={request.quantity}
          defaultValue={request.quote?.quantity ?? request.quantity}
          onChange={(event) => setQuantity(Number(event.target.value) || 0)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`quote-price-${request.id}`}>{t("workflow.quotePrice")}</Label>
        <Input
          id={`quote-price-${request.id}`}
          name="unitPrice"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={request.quote?.unitPrice ?? ""}
          onChange={(event) => setUnitPrice(Number(event.target.value) || 0)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`quote-transport-${request.id}`}>{t("workflow.transportFee")}</Label>
        <Input
          id={`quote-transport-${request.id}`}
          name="transportFee"
          type="number"
          min="0"
          step="0.01"
          defaultValue={request.quote?.transportFee ?? "0"}
          onChange={(event) => setTransportFee(Number(event.target.value) || 0)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`quote-expiry-${request.id}`}>{t("common.labels.expires")}</Label>
        <DatePicker id={`quote-expiry-${request.id}`} name="expiresAt" />
      </div>
      <p aria-live="polite" className="bg-background rounded-lg px-3 py-2 text-sm sm:col-span-2">
        {t("account.workspace.quotedTotal")}:{" "}
        <strong>
          {formatter.number(quantity * unitPrice + transportFee, {
            style: "currency",
            currency: "BDT",
            maximumFractionDigits: 2,
          })}
        </strong>
      </p>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor={`quote-note-${request.id}`}>{t("workflow.quoteNote")}</Label>
        <Textarea
          id={`quote-note-${request.id}`}
          name="note"
          rows={3}
          maxLength={1200}
          defaultValue={request.quote?.note ?? ""}
        />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.sendQuote")}
        </Button>
      </div>
    </form>
  );
}
