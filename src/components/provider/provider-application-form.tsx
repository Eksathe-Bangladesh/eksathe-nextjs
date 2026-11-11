"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { applyProviderAction } from "@/app/actions/marketplace";
import { DistrictCombobox } from "@/components/forms/district-combobox";
import { FormField as Field } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field as ShadcnField,
  FieldLabel as ShadcnFieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { bangladeshDistrictNames } from "@/lib/bangladesh-districts";
import { agricultureListings, constructionListings, sectors } from "@/lib/sectors";
import { initialWorkflowState } from "@/lib/workflow-state";

const capabilityOptions = [
  ...agricultureListings.map((service) => ({
    sectorSlug: "agriculture-labor",
    kind: service.kind,
    slug: service.slug,
    icon: service.icon,
  })),
  ...constructionListings.map((service) => ({
    sectorSlug: "construction",
    kind: service.kind,
    slug: service.slug,
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
        <Field id="provider-name-bn" label={t("common.fields.nameBangla")}>
          <Input
            id="provider-name-bn"
            name="nameBn"
            defaultValue={initial?.nameBn}
            required
            maxLength={100}
          />
        </Field>
        <Field id="provider-name-en" label={t("common.fields.nameEnglish")}>
          <Input
            id="provider-name-en"
            name="nameEn"
            defaultValue={initial?.nameEn}
            required
            maxLength={100}
          />
        </Field>
        <Field id="provider-district" label={t("workflow.district")}>
          <DistrictCombobox
            id="provider-district"
            name="district"
            districts={bangladeshDistrictNames}
            defaultValue={initial?.district}
            placeholder={t("workflow.searchDistrict")}
            required
          />
        </Field>
        <Field id="provider-upazila" label={t("provider.application.upazilaOptional")}>
          <Input
            id="provider-upazila"
            name="upazila"
            defaultValue={initial?.upazila}
            maxLength={80}
          />
        </Field>
        <Field id="provider-bio-bn" label={t("provider.application.introductionBangla")}>
          <Textarea
            id="provider-bio-bn"
            name="bioBn"
            defaultValue={initial?.bioBn}
            maxLength={1200}
            rows={3}
          />
        </Field>
        <Field id="provider-bio-en" label={t("provider.application.introductionEnglish")}>
          <Textarea
            id="provider-bio-en"
            name="bioEn"
            defaultValue={initial?.bioEn}
            maxLength={1200}
            rows={3}
          />
        </Field>
      </div>
      <FieldSet className="flex flex-col gap-3">
        <FieldLegend>{t("workflow.capabilities")}</FieldLegend>
        {sectors
          .filter((sector) => sector.status === "live")
          .map((sector) => {
            const options = capabilityOptions.filter((option) => option.sectorSlug === sector.slug);
            return (
              <div key={sector.slug} className="border-border/70 rounded-xl border p-4">
                <h3 className="mb-3 text-sm font-semibold">{t(`sectors.${sector.slug}`)}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {options.map((option) => {
                    const token = `${option.sectorSlug}:${option.kind}`;
                    const id = `provider-capability-${option.sectorSlug}-${option.kind}`;
                    return (
                      <ShadcnField
                        key={token}
                        orientation="horizontal"
                        className="bg-muted/50 rounded-lg px-3 py-2"
                      >
                        <Checkbox
                          id={id}
                          name="capabilities"
                          value={token}
                          defaultChecked={initial?.capabilities.includes(token)}
                        />
                        <ShadcnFieldLabel htmlFor={id} className="flex items-center gap-3">
                          <span aria-hidden="true">{option.icon}</span>
                          <span>{t(`marketplaceServices.${option.slug}`)}</span>
                        </ShadcnFieldLabel>
                      </ShadcnField>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </FieldSet>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.submitApplication")}
      </Button>
    </form>
  );
}
