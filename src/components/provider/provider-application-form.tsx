"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { applyProviderAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { agricultureListings, constructionListings, sectors } from "@/lib/sectors";
import { initialWorkflowState } from "@/lib/workflow-state";

const capabilityOptions = [
  ...agricultureListings.map((service) => ({
    sectorSlug: "agriculture-labor",
    kind: service.kind,
    slug: service.slug,
    titleEn: service.titleEn,
    titleBn: service.titleBn,
    icon: service.icon,
  })),
  ...constructionListings.map((service) => ({
    sectorSlug: "construction",
    kind: service.kind,
    slug: service.slug,
    titleEn: service.titleEn,
    titleBn: service.titleBn,
    icon: service.icon,
  })),
];

export function ProviderApplicationForm({
  initial,
}: {
  initial?: {
    nameBn: string;
    nameEn: string;
    bioBn: string;
    bioEn: string;
    district: string;
    upazila: string;
    capabilities: string[];
  };
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(applyProviderAction, initialWorkflowState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="provider-name-bn" label={t("workflow.providerNameBn")}>
          <Input
            id="provider-name-bn"
            name="nameBn"
            defaultValue={initial?.nameBn}
            required
            maxLength={100}
          />
        </Field>
        <Field id="provider-name-en" label={t("workflow.providerNameEn")}>
          <Input
            id="provider-name-en"
            name="nameEn"
            defaultValue={initial?.nameEn}
            required
            maxLength={100}
          />
        </Field>
        <Field id="provider-district" label={t("workflow.district")}>
          <Input
            id="provider-district"
            name="district"
            defaultValue={initial?.district}
            required
            maxLength={80}
          />
        </Field>
        <Field id="provider-upazila" label={t("inline.upazila_optional_1sd5g73")}>
          <Input
            id="provider-upazila"
            name="upazila"
            defaultValue={initial?.upazila}
            maxLength={80}
          />
        </Field>
        <Field id="provider-bio-bn" label={t("inline.introduction_bangla_1chcalt")}>
          <textarea
            id="provider-bio-bn"
            name="bioBn"
            defaultValue={initial?.bioBn}
            maxLength={1200}
            rows={3}
            className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
        <Field id="provider-bio-en" label={t("inline.introduction_english_1b79c5l")}>
          <textarea
            id="provider-bio-en"
            name="bioEn"
            defaultValue={initial?.bioEn}
            maxLength={1200}
            rows={3}
            className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
          />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">{t("workflow.capabilities")}</legend>
        {sectors
          .filter((sector) => sector.status === "live")
          .map((sector) => {
            const options = capabilityOptions.filter((option) => option.sectorSlug === sector.slug);
            return (
              <div key={sector.slug} className="border-border/70 rounded-xl border p-4">
                <h3 className="mb-3 text-sm font-semibold">
                  {t(`sectors.${sector.slug}` as never)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((option) => {
                    const token = `${option.sectorSlug}:${option.kind}`;
                    return (
                      <label
                        key={token}
                        className="bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="capabilities"
                          value={token}
                          defaultChecked={initial?.capabilities.includes(token)}
                          className="accent-primary size-4"
                        />
                        <span aria-hidden="true">{option.icon}</span>
                        <span>{t(`marketplaceServices.${option.slug}` as never)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </fieldset>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.submitApplication")}
      </Button>
    </form>
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
