"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  navLabel?: string;
  icon?: LucideIcon;
};

export function WorkspaceNavigation({
  items,
  children,
  label,
}: {
  items: WorkspaceNavItem[];
  children: React.ReactNode;
  label: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id);
  const pendingId = useRef<string | null>(null);
  const pendingTimeout = useRef<number | null>(null);

  useEffect(() => {
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) return;

    const findActiveSection = () => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY >= maxScroll - 2) return sections[sections.length - 1];

      const marker = window.scrollY + Math.min(window.innerHeight * 0.3, 240);
      return (
        sections.findLast(
          (section) => section.getBoundingClientRect().top + window.scrollY <= marker,
        ) ?? sections[0]
      );
    };

    const updateActiveSection = () => {
      const activeSection = findActiveSection();
      if (activeSection) {
        setActiveId((currentId) => (currentId === activeSection.id ? currentId : activeSection.id));
      }
    };

    const finishPendingNavigation = () => {
      const targetId = pendingId.current;
      if (!targetId) return;
      pendingId.current = null;
      if (pendingTimeout.current !== null) {
        window.clearTimeout(pendingTimeout.current);
        pendingTimeout.current = null;
      }
      setActiveId(targetId);
    };

    let frame: number | null = null;
    const handleScroll = () => {
      if (pendingId.current) return;
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    window.addEventListener("scrollend", finishPendingNavigation);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (pendingTimeout.current !== null) window.clearTimeout(pendingTimeout.current);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("scrollend", finishPendingNavigation);
    };
  }, [items]);

  const handleNavigationClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    pendingId.current = id;
    if (pendingTimeout.current !== null) window.clearTimeout(pendingTimeout.current);
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    pendingTimeout.current = window.setTimeout(() => {
      pendingId.current = null;
      pendingTimeout.current = null;
      setActiveId(id);
    }, 1200);
  };

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <nav
        aria-label={label}
        className="border-border/70 bg-background/95 lg:bg-card sticky top-16 z-20 -mx-4 overflow-x-auto border-y px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-24 lg:mx-0 lg:overflow-visible lg:rounded-2xl lg:border lg:p-3"
      >
        <ul className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
          {items.map(({ id, label, navLabel, icon: Icon }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(event) => handleNavigationClick(event, id)}
                aria-current={activeId === id ? "location" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-offset-2 transition focus-visible:outline-2 focus-visible:outline-primary lg:w-full",
                  activeId === id
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                {navLabel ?? label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex min-w-0 flex-col gap-7">{children}</main>
    </div>
  );
}
