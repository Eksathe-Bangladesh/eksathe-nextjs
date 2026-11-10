import { cacheLife } from "next/cache";
import { Suspense } from "react";

import { FooterContent } from "@/components/footer-content";

async function getCurrentYear() {
  "use cache";
  cacheLife("days");

  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await getCurrentYear();

  return (
    <Suspense fallback={null}>
      <FooterContent year={year} />
    </Suspense>
  );
}
