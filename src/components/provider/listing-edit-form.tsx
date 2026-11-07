"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useActionState, useEffect, useRef, useState } from "react";

import { updateListingAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { uploadPrivateFile } from "@/lib/client-upload";
import { initialWorkflowState } from "@/lib/workflow-state";

export type EditableListing = {
  id: string;
  sectorSlug: string;
  kind: string;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  category: string;
  district: string;
  unit: string;
  unitPrice: string;
  stock: string;
  availableFrom: string | null;
  hasImage: boolean;
};

export function ListingEditForm({ listing }: { listing: EditableListing }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateListingAction, initialWorkflowState);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadedFile = useRef<File | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      uploadedFile.current = null;
    }
  }, [state]);

  async function prepareListingImage(event: FormEvent<HTMLFormElement>) {
    const file = fileInput.current?.files?.[0] ?? null;
    if (!file || uploadedFile.current === file) return;
    event.preventDefault();
    const form = event.currentTarget;
    setUploading(true);
    setUploadError(false);
    try {
      const result = await uploadPrivateFile(file, {
        purpose: "listing-image",
        sectorSlug: listing.sectorSlug,
        kind: listing.kind,
      });
      for (const [name, value] of [
        ["imageKey", result.key],
        ["imageContentType", result.contentType],
        ["imageSizeBytes", result.sizeBytes],
      ] as const) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = value;
      }
      uploadedFile.current = file;
      form.requestSubmit();
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={prepareListingImage}
      className="border-border/70 flex flex-col gap-4 rounded-xl border p-4"
    >
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="sectorSlug" value={listing.sectorSlug} />
      <input type="hidden" name="kind" value={listing.kind} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`edit-title-bn-${listing.id}`} label={t("inline.name_bangla_1lm9czd")}>
          <Input
            id={`edit-title-bn-${listing.id}`}
            name="titleBn"
            required
            maxLength={120}
            defaultValue={listing.titleBn}
          />
        </Field>
        <Field id={`edit-title-en-${listing.id}`} label={t("inline.name_english_1odtjyj")}>
          <Input
            id={`edit-title-en-${listing.id}`}
            name="titleEn"
            required
            maxLength={120}
            defaultValue={listing.titleEn}
          />
        </Field>
        <Field id={`edit-category-${listing.id}`} label={t("inline.category_s1i10e")}>
          <Input
            id={`edit-category-${listing.id}`}
            name="category"
            list={`agriculture-category-options-${listing.id}`}
            required
            maxLength={80}
            defaultValue={listing.category}
          />
          <datalist id={`agriculture-category-options-${listing.id}`}>
            <option value="Grains / শস্য" />
            <option value="Vegetables / সবজি" />
            <option value="Fruits / ফল" />
            <option value="Dairy / দুগ্ধজাত" />
            <option value="Fish / মাছ" />
            <option value="Spices / মসলা" />
            <option value="Other / অন্যান্য" />
          </datalist>
        </Field>
        <Field id={`edit-district-${listing.id}`} label={t("inline.district_135um58")}>
          <Input
            id={`edit-district-${listing.id}`}
            name="district"
            required
            maxLength={80}
            defaultValue={listing.district}
          />
        </Field>
        <Field id={`edit-unit-${listing.id}`} label={t("inline.unit_x8dt8s")}>
          <Input
            id={`edit-unit-${listing.id}`}
            name="unit"
            required
            maxLength={30}
            defaultValue={listing.unit}
          />
        </Field>
        <Field id={`edit-price-${listing.id}`} label={t("inline.price_per_unit_bdt_y28nlq")}>
          <Input
            id={`edit-price-${listing.id}`}
            name="unitPrice"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={listing.unitPrice}
          />
        </Field>
        {listing.kind === "PRODUCE" || listing.kind === "CONSTRUCTION_MATERIAL" ? (
          <Field id={`edit-stock-${listing.id}`} label={t("inline.available_quantity_qdx72n")}>
            <Input
              id={`edit-stock-${listing.id}`}
              name="stock"
              type="number"
              min="0.001"
              step="0.001"
              required
              defaultValue={listing.stock}
            />
          </Field>
        ) : (
          <input type="hidden" name="stock" value={listing.stock} />
        )}
        <Field
          id={`edit-available-${listing.id}`}
          label={t("inline.available_from_optional_dlhs2f")}
        >
          <Input
            id={`edit-available-${listing.id}`}
            name="availableFrom"
            type="date"
            defaultValue={listing.availableFrom?.slice(0, 10) ?? ""}
          />
        </Field>
      </div>
      <Field id={`edit-description-bn-${listing.id}`} label={t("inline.description_bangla_q8mmem")}>
        <textarea
          id={`edit-description-bn-${listing.id}`}
          name="descriptionBn"
          rows={3}
          maxLength={2000}
          defaultValue={listing.descriptionBn}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </Field>
      <Field
        id={`edit-description-en-${listing.id}`}
        label={t("inline.description_english_kxac9w")}
      >
        <textarea
          id={`edit-description-en-${listing.id}`}
          name="descriptionEn"
          rows={3}
          maxLength={2000}
          defaultValue={listing.descriptionEn}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </Field>
      <Field id={`edit-image-${listing.id}`} label={t("inline.replace_photo_optional_nnrkdd")}>
        <Input
          ref={fileInput}
          id={`edit-image-${listing.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading || pending}
        />
      </Field>
      <p className="text-muted-foreground text-xs">
        {t("inline.content_and_photo_edits_unpublish_the_list_o1vsj9")}{" "}
        {listing.hasImage ? t("inline.the_current_photo_stays_if_you_do_not_choo_1inaw9o") : ""}
      </p>
      <input type="hidden" name="imageKey" defaultValue="" />
      <input type="hidden" name="imageContentType" defaultValue="" />
      <input type="hidden" name="imageSizeBytes" defaultValue="" />
      {uploadError && (
        <p role="alert" className="text-destructive text-sm">
          {t("inline.the_image_could_not_be_uploaded_please_try_bnuvif")}
        </p>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={pending || uploading}>
        {uploading || pending ? t("inline.saving_1s7ccbq") : t("inline.save_for_review_mqzadk")}
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
