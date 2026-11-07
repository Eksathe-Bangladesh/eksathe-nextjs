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
          <p className="font-semibold">{t("inline.estimate_a_project_transaction_46xmln")}</p>
          <Badge variant="secondary">
            {t("inline.estimate_30h8pe")}
            {estimate ? ` · ${ratePercent}%` : ""}
          </Badge>
        </div>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="construction-eligible-amount">
              {t("inline.work_or_material_amount_bdt_zxk6k3")}
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
              {t("inline.separate_transport_charge_bdt_wgejjp")}
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
          {t("inline.transport_is_excluded_from_the_commission__el9w8u")}
        </p>
        {estimate ? (
          <div className="flex flex-col gap-3 border-t pt-4 text-sm">
            <Result
              label={t("inline.estimated_platform_commission_kq60y6")}
              value={format(estimate.commissionCents)}
            />
            <Result
              label={t("inline.estimated_provider_amount_including_transp_mxn5v4")}
              value={format(estimate.providerCents)}
            />
          </div>
        ) : (
          <p role="status" className="text-muted-foreground text-sm">
            {t("inline.the_construction_commission_rate_is_not_av_1sfmign")}
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
