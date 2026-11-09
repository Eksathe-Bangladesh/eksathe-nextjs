"use client";

import { useTranslations, useFormatter } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { estimateAgricultureCommission } from "@/lib/agriculture/commission-estimate";

export function AgricultureCommissionCalculator({ ratePercent }: { ratePercent: string | null }) {
  const formatter = useFormatter();
  const t = useTranslations();
  const [amount, setAmount] = useState("1000");
  const [transport, setTransport] = useState("0");
  const estimate =
    ratePercent === null ? null : estimateAgricultureCommission(amount, transport, ratePercent);
  const commissionCents = estimate?.commissionCents ?? null;
  const providerCents = estimate?.providerCents ?? null;
  const format = (cents: number) =>
    formatter.number(cents / 100, {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">{t("inline.estimate_the_split")}</p>
          <Badge variant="secondary">
            {t("inline.estimate")}
            {estimate ? ` · ${ratePercent}%` : ""}
          </Badge>
        </div>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="agriculture-eligible-amount">
              {t("inline.goods_or_service_amount_bdt")}
            </FieldLabel>
            <Input
              id="agriculture-eligible-amount"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="agriculture-transport-amount">
              {t("inline.separate_transport_charge_bdt")}
            </FieldLabel>
            <Input
              id="agriculture-transport-amount"
              type="number"
              min="0"
              max="9999999999.99"
              step="0.01"
              inputMode="decimal"
              value={transport}
              onChange={(event) => setTransport(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <p className="text-muted-foreground text-xs leading-5">
          {t("inline.agriculture_transport_commission_notice")}
        </p>
        {commissionCents === null || providerCents === null ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t("inline.the_agriculture_commission_rate_is_not_ava")}
          </p>
        ) : (
          <div className="flex flex-col gap-3 border-t pt-4 text-sm">
            <Result
              label={t("inline.estimated_platform_commission")}
              value={format(commissionCents)}
            />
            <Result
              label={t("inline.estimated_provider_amount_including_transp")}
              value={format(providerCents)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
