import type { ReactNode } from "react";

import { CommerceWorkspaceNavigation } from "@/components/commerce/commerce-workspace-navigation";

export default function CommerceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CommerceWorkspaceNavigation />
      {children}
    </>
  );
}
