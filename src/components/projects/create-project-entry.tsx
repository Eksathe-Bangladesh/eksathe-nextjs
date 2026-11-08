"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { CreateProjectForm } from "@/components/projects/project-forms";
import { Link } from "@/i18n/navigation";

export function CreateProjectEntry({
  context,
}: {
  context?: { serviceSlug?: string; listingId?: string; labelBn?: string; labelEn?: string };
}) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/account#projects"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("inline.my_projects_1y5pp50")}
      </Link>
      <div>
        <p className="text-primary text-sm">{t("home.construction")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("workflow.createProject")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("inline.describe_the_work_you_can_invite_construct_uh0wsm")}
        </p>
      </div>
      {context?.labelBn && context.labelEn && (
        <p className="border-border/70 bg-muted/40 rounded-xl border p-4 text-sm">
          {t("inline.selected_service_sg3nvd")}:{" "}
          <strong>{({ en: context.labelEn, bn: context.labelBn }[locale])}</strong>
        </p>
      )}
      <CreateProjectForm context={context} />
    </div>
  );
}
