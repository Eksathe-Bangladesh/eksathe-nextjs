"use client";

import { BellIcon, ChevronDownIcon, NewspaperIcon, PhoneCallIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";

interface DashboardHeaderProps {
  userName?: string;
  userRole?: string;
}

export function DashboardHeader({ userName, userRole = "admin" }: DashboardHeaderProps) {
  const t = useTranslations();
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [activeNotice, setActiveNotice] = useState<string | null>(null);
  const [role, setRole] = useState(userRole);
  const [roleOpen, setRoleOpen] = useState(false);

  const displayRole = role === "admin" ? t("dashboard.adminRole") : t("dashboard.guestRole");

  return (
    <>
      <header className="border-border/70 bg-card/95 sticky top-0 z-40 border-b shadow-xs backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-360 items-center justify-between gap-2 px-4 sm:px-6">
          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 font-bold tracking-tight text-[#0b5036] hover:opacity-90"
          >
            <span className="text-sm font-bold sm:text-base">{t("common.brandName")}</span>
          </Link>

          {/* Action buttons matching the image */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 sm:gap-2">
            {/* News Feed */}
            <button
              type="button"
              onClick={() => setActiveNotice(t("dashboard.newsFeed"))}
              className="border-input/70 bg-card text-foreground/90 hover:bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm"
            >
              <NewspaperIcon className="text-muted-foreground size-4" />
              <span className="hidden md:inline">{t("dashboard.newsFeed")}</span>
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => setActiveNotice(t("dashboard.notifications"))}
              className="border-input/70 bg-card text-foreground/90 hover:bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm"
            >
              <BellIcon className="text-muted-foreground size-4" />
              <span className="hidden md:inline">{t("dashboard.notifications")}</span>
            </button>

            {/* Profile */}
            <button
              type="button"
              onClick={() => setActiveNotice(t("dashboard.profile"))}
              className="border-input/70 bg-card text-foreground/90 hover:bg-muted inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm"
            >
              <UserIcon className="text-muted-foreground size-4" />
              <span className="hidden md:inline">{t("dashboard.profile")}</span>
            </button>

            {/* Emergency Call (Red button) */}
            <button
              type="button"
              onClick={() => setEmergencyOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#b91c1c] active:scale-95 sm:text-sm"
            >
              <PhoneCallIcon className="size-4 fill-white" />
              <span>{t("dashboard.emergencyCall")}</span>
            </button>

            {/* Role selector dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleOpen(!roleOpen)}
                className="border-input/70 bg-card text-foreground/90 hover:bg-muted inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm"
              >
                <span>{userName ?? displayRole}</span>
                <ChevronDownIcon className="text-muted-foreground size-3.5" />
              </button>

              {roleOpen && (
                <div className="border-border bg-card absolute top-full right-0 z-50 mt-1.5 w-36 rounded-xl border p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setRole("admin");
                      setRoleOpen(false);
                    }}
                    className="hover:bg-muted w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
                  >
                    {t("dashboard.adminRole")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRole("guest");
                      setRoleOpen(false);
                    }}
                    className="hover:bg-muted w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
                  >
                    {t("dashboard.guestRole")}
                  </button>
                </div>
              )}
            </div>

            {/* Language Toggle */}
            <LanguageToggle variant="muted" />

            {/* Theme Toggle */}
            <ThemeToggle variant="muted" />
          </nav>
        </div>
      </header>

      {/* Emergency Helpline Dialog */}
      <Dialog open={emergencyOpen} onOpenChange={setEmergencyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("emergency.modalTitle")}</DialogTitle>
            <DialogDescription>{t("emergency.modalSubtitle")}</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{t("emergency.modalDescription")}</p>
        </DialogContent>
      </Dialog>

      {/* Simple Information Dialog for Header Actions */}
      <Dialog open={!!activeNotice} onOpenChange={() => setActiveNotice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeNotice}</DialogTitle>
            <DialogDescription>{t("dashboard.demoNotice")}</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {activeNotice} module is part of the prototype workspace. Interactive features and
            real-time feeds will connect to this hub.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
