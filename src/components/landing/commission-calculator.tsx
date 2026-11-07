"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatMoney(value: number, formatter: ReturnType<typeof useFormatter>) {
  return formatter.number(value, {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CommissionCalculator() {
  const [gross, setGross] = useState("1000");
  const formatter = useFormatter();
  const t = useTranslations();

  const amount = Math.max(0, Number(gross) || 0);
  const commission = amount * 0.1;
  const provider = amount * 0.9;

  return (
    <div className="bg-card rounded-2xl border p-6 shadow-sm">
      <Label htmlFor="grossAmount">{t("commission.amountLabel")}</Label>
      <Input
        id="grossAmount"
        type="number"
        min={0}
        step="0.01"
        value={gross}
        onChange={(event) => setGross(event.target.value)}
        className="mt-2 h-11 text-lg"
      />

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t("commission.platformShare")}</span>
          <strong className="text-base">{formatMoney(commission, formatter)}</strong>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t("commission.providerShare")}</span>
          <strong className="text-base">{formatMoney(provider, formatter)}</strong>
        </div>
      </div>
    </div>
  );
}
