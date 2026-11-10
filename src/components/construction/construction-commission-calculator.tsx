"use client";

import { useTranslations, useFormatter } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { estimateCommission } from "@/lib/commission-estimate";

export function ConstructionCommissionCalculator({ ratePercent }: { ratePercent: string | null }) {
  const formatter = useFormatter();
  const t = useTranslations();
  const [amount, setAmount] = useState("100000");
  const [transport, setTransport] = useState("0");
  const estimate = ratePercent === null ? null : estimateCommission(amount, transport, ratePercent);
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
          <p className="font-semibold">
            {t("construction.commissionCalculator.estimateAProjectTransaction")}
          </p>
          <Badge variant="secondary">
            {t("common.labels.estimate")}
            {estimate ? ` · ${ratePercent}%` : ""}
          </Badge>
        </div>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="construction-eligible-amount">
              {t("construction.commissionCalculator.workOrMaterialAmountBdt")}
            </FieldLabel>
            <Input
              id="construction-eligible-amount"
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
            <FieldLabel htmlFor="construction-transport-amount">
              {t("common.labels.separateTransportChargeBdt")}
            </FieldLabel>
            <Input
              id="construction-transport-amount"
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
          {t("construction.commissionCalculator.transportNotice")}
        </p>
        {estimate ? (
          <div className="flex flex-col gap-3 border-t pt-4 text-sm">
            <Result
              label={t("common.labels.estimatedPlatformCommission")}
              value={format(estimate.commissionCents)}
            />
            <Result
              label={t("common.commissionCalculator.providerAmount")}
              value={format(estimate.providerCents)}
            />
          </div>
        ) : (
          <p role="status" className="text-muted-foreground text-sm">
            {t("construction.commissionCalculator.rateUnavailable")}
          </p>
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
