"use client";

import { useTranslations } from "next-intl";
import { type SubmitEvent, useActionState, useEffect, useRef, useState } from "react";

import {
  addMilestoneAction,
  attachProjectDocumentAction,
  attachProjectPhotoAction,
  createProjectAction,
  createProjectPackageAction,
  recordProjectExpenseAction,
  updateMilestoneAction,
} from "@/app/actions/projects";
import { FormField as Field } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { useRouter } from "@/i18n/navigation";
import { uploadPrivateFile } from "@/lib/client-upload";
import { constructionServiceRegistry } from "@/lib/construction/service-registry";
import { initialWorkflowState } from "@/lib/workflow-state";

export function CreateProjectForm({
  context,
}: {
  context?: { serviceSlug?: string; listingId?: string };
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createProjectAction, initialWorkflowState);
  const router = useRouter();
  useEffect(() => {
    if (state.status === "success" && state.entityId)
      router.push(`/account/projects/${encodeURIComponent(state.entityId)}`);
  }, [router, state.entityId, state.status]);
  return (
    <form
      action={action}
      className="border-border/70 bg-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-2"
    >
      {context?.serviceSlug && (
        <input type="hidden" name="serviceSlug" value={context.serviceSlug} />
      )}
      {context?.listingId && <input type="hidden" name="listingId" value={context.listingId} />}
      <Field id="project-title" label={t("workflow.projectTitle")}>
        <Input id="project-title" name="title" maxLength={120} required />
      </Field>
      <Field id="project-type" label={t("workflow.projectType")}>
        <Input
          id="project-type"
          name="projectType"
          placeholder={t("projects.forms.projectTypePlaceholder")}
          maxLength={80}
          required
        />
      </Field>
      <Field id="project-district" label={t("workflow.district")}>
        <Input id="project-district" name="district" maxLength={80} required />
      </Field>
      <Field id="project-area" label={t("workflow.approximateArea")}>
        <Input id="project-area" name="approximateArea" maxLength={80} />
      </Field>
      <Field id="project-budget" label={t("workflow.budget")}>
        <Input id="project-budget" name="budget" type="number" min="0" step="0.01" />
      </Field>
      <Field id="project-start" label={t("workflow.startDate")}>
        <DatePicker id="project-start" name="startsAt" />
      </Field>
      <Field id="project-end" label={t("workflow.endDate")}>
        <DatePicker id="project-end" name="targetEndsAt" />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="project-description">{t("workflow.projectDescription")}</Label>
        <Textarea
          id="project-description"
          name="description"
          required
          maxLength={4000}
          rows={5}
          className="sm:col-span-2"
        />
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <ActionFeedback state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.createProject")}
        </Button>
      </div>
    </form>
  );
}

export function CreateProjectPackageForm({ projectId }: { projectId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(createProjectPackageAction, initialWorkflowState);
  return (
    <form
      action={action}
      className="border-border/70 bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Field id={`package-label-${projectId}`} label={t("workflow.workPackage")}>
        <Input id={`package-label-${projectId}`} name="label" maxLength={120} required />
      </Field>
      <Field id={`package-kind-${projectId}`} label={t("projects.forms.packageType")}>
        <NativeSelect
          id={`package-kind-${projectId}`}
          name="serviceSlug"
          defaultValue=""
          required
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="" disabled>
            {t("projects.forms.chooseWorkType")}
          </NativeSelectOption>
          {constructionServiceRegistry.map((service) => (
            <NativeSelectOption key={service.slug} value={service.slug}>
              {t(`constructionServices.${service.slug}.title`)} ·{" "}
              {service.kind === "CONSTRUCTION_MATERIAL"
                ? t("constructionCategories.materials")
                : t("projects.forms.professionalService")}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`package-description-${projectId}`} label={t("workflow.projectDescription")}>
        <Input id={`package-description-${projectId}`} name="description" maxLength={1200} />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <ActionFeedback state={state} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? t("common.loading") : t("projects.forms.addWorkPackage")}
        </Button>
      </div>
    </form>
  );
}

export function AddMilestoneForm({
  projectId,
  providers,
}: {
  projectId: string;
  providers: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(addMilestoneAction, initialWorkflowState);
  return (
    <form
      action={action}
      className="border-border/70 grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Field id={`milestone-provider-${projectId}`} label={t("workflow.assignedProvider")}>
        <NativeSelect
          id={`milestone-provider-${projectId}`}
          name="assignedProviderId"
          required
          className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
        >
          <NativeSelectOption value="">{t("projects.forms.chooseAProvider")}</NativeSelectOption>
          {providers.map((provider) => (
            <NativeSelectOption key={provider.id} value={provider.id}>
              {provider.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`milestone-title-${projectId}`} label={t("workflow.milestoneTitle")}>
        <Input id={`milestone-title-${projectId}`} name="title" required maxLength={120} />
      </Field>
      <Field id={`milestone-amount-${projectId}`} label={t("workflow.budget")}>
        <Input
          id={`milestone-amount-${projectId}`}
          name="amount"
          type="number"
          min="0"
          step="0.01"
        />
      </Field>
      <Field id={`milestone-due-${projectId}`} label={t("projects.forms.dueDate")}>
        <DatePicker id={`milestone-due-${projectId}`} name="dueAt" />
      </Field>
      <Field id={`milestone-description-${projectId}`} label={t("workflow.milestoneDescription")}>
        <Input id={`milestone-description-${projectId}`} name="description" maxLength={1200} />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <ActionFeedback state={state} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.addMilestone")}
        </Button>
      </div>
    </form>
  );
}

export function ProjectExpenseForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(recordProjectExpenseAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <form
      action={action}
      className="border-border/70 bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Field id={`expense-description-${projectId}`} label={t("workflow.expenseDescription")}>
        <Input
          id={`expense-description-${projectId}`}
          name="description"
          maxLength={240}
          required
        />
      </Field>
      <Field id={`expense-amount-${projectId}`} label={t("workflow.paymentAmount")}>
        <Input
          id={`expense-amount-${projectId}`}
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </Field>
      <Field id={`expense-date-${projectId}`} label={t("workflow.startDate")}>
        <DatePicker id={`expense-date-${projectId}`} name="occurredAt" />
      </Field>
      <div className="flex flex-col justify-end gap-2">
        <ActionFeedback state={state} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? t("common.loading") : t("workflow.recordExpense")}
        </Button>
      </div>
    </form>
  );
}

export function MilestoneStatusForm({
  milestoneId,
  intent,
}: {
  milestoneId: string;
  intent: "submit" | "approve";
}) {
  const [state, action, pending] = useActionState(updateMilestoneAction, initialWorkflowState);
  const t = useTranslations();
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <input type="hidden" name="intent" value={intent} />
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending
          ? t("common.loading")
          : intent === "submit"
            ? t("workflow.completeWork")
            : t("workflow.approveMilestone")}
      </Button>
    </form>
  );
}

export function ProjectDocumentUploadForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(
    attachProjectDocumentAction,
    initialWorkflowState,
  );
  const t = useTranslations();
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

  async function prepareDocument(event: SubmitEvent<HTMLFormElement>) {
    const selectedFile = fileInput.current?.files?.[0] ?? null;
    if (selectedFile && uploadedFile.current === selectedFile) return;
    event.preventDefault();
    if (!selectedFile) {
      setUploadError("invalidUpload");
      return;
    }
    const form = event.currentTarget;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadPrivateFile(selectedFile, {
        purpose: "project-document",
        projectId,
      });
      const keyField = form.elements.namedItem("storageKey");
      const filenameField = form.elements.namedItem("filename");
      const sizeField = form.elements.namedItem("sizeBytes");
      if (keyField instanceof HTMLInputElement) keyField.value = result.key;
      if (filenameField instanceof HTMLInputElement) filenameField.value = selectedFile.name;
      if (sizeField instanceof HTMLInputElement) sizeField.value = result.sizeBytes;
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
      onSubmit={prepareDocument}
      className="border-border/70 bg-card flex flex-col gap-3 rounded-xl border p-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="storageKey" defaultValue="" />
      <input type="hidden" name="filename" defaultValue="" />
      <input type="hidden" name="sizeBytes" defaultValue="" />
      <Input
        ref={fileInput}
        type="file"
        accept="application/pdf,.pdf"
        disabled={uploading || pending}
        onChange={(event) => {
          setUploadError(null);
          uploadedFile.current = null;
          const form = event.currentTarget.form;
          for (const name of ["storageKey", "filename", "sizeBytes"]) {
            const field = form?.elements.namedItem(name);
            if (field instanceof HTMLInputElement) field.value = "";
          }
        }}
        aria-label={t("workflow.projectDocuments")}
      />
      {uploadError && (
        <p role="alert" className="text-destructive text-sm">
          {t(`workflow.${uploadError}`)}
        </p>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={pending || uploading}>
        {pending || uploading ? t("common.loading") : t("workflow.attachDocument")}
      </Button>
    </form>
  );
}

export function ProjectPhotoUploadForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(attachProjectPhotoAction, initialWorkflowState);
  const t = useTranslations();
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

  async function preparePhoto(event: SubmitEvent<HTMLFormElement>) {
    const selectedFile = fileInput.current?.files?.[0] ?? null;
    if (selectedFile && uploadedFile.current === selectedFile) return;
    event.preventDefault();
    if (!selectedFile) {
      setUploadError("invalidUpload");
      return;
    }
    const form = event.currentTarget;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadPrivateFile(selectedFile, { purpose: "project-photo", projectId });
      const fields: Record<string, string> = {
        storageKey: result.key,
        filename: selectedFile.name,
        contentType: result.contentType,
        sizeBytes: result.sizeBytes,
      };
      for (const [name, value] of Object.entries(fields)) {
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
      onSubmit={preparePhoto}
      className="border-border/70 bg-card flex flex-col gap-3 rounded-xl border p-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="storageKey" defaultValue="" />
      <input type="hidden" name="filename" defaultValue="" />
      <input type="hidden" name="contentType" defaultValue="" />
      <input type="hidden" name="sizeBytes" defaultValue="" />
      <Input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading || pending}
        onChange={(event) => {
          setUploadError(null);
          uploadedFile.current = null;
          const form = event.currentTarget.form;
          for (const name of ["storageKey", "filename", "contentType", "sizeBytes"]) {
            const field = form?.elements.namedItem(name);
            if (field instanceof HTMLInputElement) field.value = "";
          }
        }}
        aria-label={t("workflow.projectPhotos")}
      />
      {uploadError && (
        <p role="alert" className="text-destructive text-sm">
          {t(`workflow.${uploadError}`)}
        </p>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={pending || uploading}>
        {pending || uploading ? t("common.loading") : t("workflow.projectPhotos")}
      </Button>
    </form>
  );
}
