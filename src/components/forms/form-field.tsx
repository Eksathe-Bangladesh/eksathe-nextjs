import type { ReactNode } from "react";

import { Field, FieldLabel } from "@/components/ui/field";

export function FormField({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className={icon ? "flex items-center gap-2" : undefined}>
        {icon}
        {label}
      </FieldLabel>
      {children}
    </Field>
  );
}
