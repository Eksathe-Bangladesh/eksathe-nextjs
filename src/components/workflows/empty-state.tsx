import { cn } from "cn";
import type { ReactNode } from "react";

import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";

export function EmptyState({
  text,
  className,
  action,
}: {
  text: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Empty className={cn("border border-border", className)}>
      <EmptyHeader>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}
