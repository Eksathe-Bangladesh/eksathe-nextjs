"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useActionState, useEffect, useRef, useState } from "react";

import { updateProviderStorefrontAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { uploadPrivateFile } from "@/lib/client-upload";
import { initialWorkflowState } from "@/lib/workflow-state";

export type StorefrontValues = {
  id: string;
  nameBn: string;
  nameEn: string;
  bioBn: string;
  bioEn: string;
  district: string;
  upazila: string | null;
  hasProfileImage: boolean;
  hasCoverImage: boolean;
};

export function StorefrontForm({ profile }: { profile: StorefrontValues }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    updateProviderStorefrontAction,
    initialWorkflowState,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const profileFile = useRef<HTMLInputElement>(null);
  const coverFile = useRef<HTMLInputElement>(null);
  const uploaded = useRef<{ profile: File | null; cover: File | null }>({
    profile: null,
    cover: null,
  });

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      uploaded.current = { profile: null, cover: null };
    }
  }, [state.status]);

  async function prepareUpload(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const files = [
      {
        type: "profile" as const,
        input: profileFile.current,
        key: "profileImageKey",
        contentType: "profileImageContentType",
        size: "profileImageSizeBytes",
      },
      {
        type: "cover" as const,
        input: coverFile.current,
        key: "coverImageKey",
        contentType: "coverImageContentType",
        size: "coverImageSizeBytes",
      },
    ];
    const selected = files.filter(
      (item) => item.input?.files?.[0] && uploaded.current[item.type] !== item.input.files[0],
    );
    if (!selected.length) return;
    event.preventDefault();
    setUploading(true);
    setUploadError(false);
    try {
      for (const item of selected) {
        const file = item.input?.files?.[0];
        if (!file) continue;
        const result = await uploadPrivateFile(file, {
          purpose: "provider-storefront-image",
          imageType: item.type,
        });
        for (const [name, value] of [
          [item.key, result.key],
          [item.contentType, result.contentType],
          [item.size, result.sizeBytes],
        ] as const) {
          const field = form.elements.namedItem(name);
          if (field instanceof HTMLInputElement) field.value = value;
        }
        uploaded.current[item.type] = file;
      }
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
      onSubmit={prepareUpload}
      className="border-border/70 flex flex-col gap-4 rounded-xl border p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="storefront-name-bn" label={t("inline.store_name_bangla_1iauw33")}>
          <Input
            id="storefront-name-bn"
            name="nameBn"
            defaultValue={profile.nameBn}
            required
            maxLength={100}
          />
        </Field>
        <Field id="storefront-name-en" label={t("inline.store_name_english_xbvqo3")}>
          <Input
            id="storefront-name-en"
            name="nameEn"
            defaultValue={profile.nameEn}
            required
            maxLength={100}
          />
        </Field>
        <Field id="storefront-district" label={t("inline.district_135um58")}>
          <Input
            id="storefront-district"
            name="district"
            defaultValue={profile.district}
            required
            maxLength={80}
          />
        </Field>
        <Field id="storefront-upazila" label={t("inline.upazila_1am4ti5")}>
          <Input
            id="storefront-upazila"
            name="upazila"
            defaultValue={profile.upazila ?? ""}
            maxLength={80}
          />
        </Field>
      </div>
      <Field id="storefront-bio-bn" label={t("inline.about_the_store_bangla_yoi7rq")}>
        <textarea
          id="storefront-bio-bn"
          name="bioBn"
          rows={3}
          maxLength={1200}
          defaultValue={profile.bioBn}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </Field>
      <Field id="storefront-bio-en" label={t("inline.about_the_store_english_1sljttu")}>
        <textarea
          id="storefront-bio-en"
          name="bioEn"
          rows={3}
          maxLength={1200}
          defaultValue={profile.bioEn}
          className="border-input bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="storefront-profile-image" label={t("inline.profile_photo_1exrcqq")}>
          <Input
            ref={profileFile}
            id="storefront-profile-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || pending}
          />
        </Field>
        <Field id="storefront-cover-image" label={t("inline.cover_photo_hatt38")}>
          <Input
            ref={coverFile}
            id="storefront-cover-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading || pending}
          />
        </Field>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("inline.jpg_png_or_webp_up_to_5_mb_leave_blank_to__yke761")} ·{" "}
        {profile.hasProfileImage
          ? t("inline.profile_photo_set_1kznhvi")
          : t("inline.no_profile_photo_1qv9bkr")}
      </p>
      {(
        [
          "profileImageKey",
          "profileImageContentType",
          "profileImageSizeBytes",
          "coverImageKey",
          "coverImageContentType",
          "coverImageSizeBytes",
        ] as const
      ).map((name) => (
        <input key={name} type="hidden" name={name} defaultValue="" />
      ))}
      {uploadError && (
        <p role="alert" className="text-destructive text-sm">
          {t("inline.the_image_could_not_be_uploaded_please_try_bnuvif")}
        </p>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending || uploading}>
        {uploading || pending ? t("inline.saving_1s7ccbq") : t("inline.save_storefront_1k0d8u9")}
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
