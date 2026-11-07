"use client";

import type { LucideIcon } from "lucide-react";

export type WorkspaceNavItem = { id: string; label: string; icon?: LucideIcon };

export function WorkspaceNavigation({
  items,
  children,
  label,
}: {
  items: WorkspaceNavItem[];
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav
        aria-label={label}
        className="border-border/70 bg-background/95 lg:bg-card sticky top-16 z-20 -mx-4 overflow-x-auto border-y px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:overflow-visible lg:rounded-2xl lg:border lg:p-3"
      >
        <ul className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
          {items.map(({ id, label: itemLabel, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-offset-2 transition focus-visible:outline-2 lg:w-full"
              >
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                {itemLabel}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex min-w-0 flex-col gap-7">{children}</main>
    </div>
  );
}
