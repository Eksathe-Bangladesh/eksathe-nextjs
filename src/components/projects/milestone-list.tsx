"use client";

import { useLocale, useTranslations, useFormatter } from "next-intl";

import { MilestoneStatusForm } from "@/components/projects/project-forms";
import { StatusBadge } from "@/components/workflows/status-badge";

export function MilestoneList({
  milestones,
  owner = false,
  provider = false,
}: {
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    amount: string | null;
    dueAt: string | null;
    status: string;
    assignedProvider?: { nameBn: string; nameEn: string } | null;
  }>;
  owner?: boolean;
  provider?: boolean;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-2">
      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="border-border/70 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium">{milestone.title}</p>
            {milestone.description && (
              <p className="text-muted-foreground mt-1 text-sm">{milestone.description}</p>
            )}
            {milestone.assignedProvider && (
              <p className="text-muted-foreground mt-1 text-xs">
                {t("workflow.assignedProvider")}:{" "}
                {locale === "bn"
                  ? milestone.assignedProvider.nameBn
                  : milestone.assignedProvider.nameEn}
              </p>
            )}
            {milestone.dueAt && (
              <p className="text-muted-foreground mt-1 text-xs">
                {t("inline.due_1yneuku")}:{" "}
                {formatter.dateTime(new Date(milestone.dueAt), {
                  dateStyle: "medium",
                  timeZone: "Asia/Dhaka",
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={milestone.status} />
            {owner && milestone.status === "REVIEW" && (
              <MilestoneStatusForm milestoneId={milestone.id} intent="approve" />
            )}
            {provider && ["PENDING", "IN_PROGRESS"].includes(milestone.status) && (
              <MilestoneStatusForm milestoneId={milestone.id} intent="submit" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
