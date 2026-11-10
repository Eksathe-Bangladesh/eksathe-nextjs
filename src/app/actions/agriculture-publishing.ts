"use server";
import { revalidateTag } from "next/cache";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { saveAgriculturePublication } from "@/lib/agriculture/publishing";
import { cacheTags } from "@/lib/cache-tags";
import { requireStaff } from "@/lib/dal";
import { logError } from "@/lib/logging";
export type PublishingState = { status: "idle" | "success" | "error" };
export async function saveAgriculturePublicationAction(
  _state: PublishingState,
  form: FormData,
): Promise<PublishingState> {
  const actor = await requireStaff("OPERATIONS", "agriculture-labor");
  const values = Object.fromEntries(
    Array.from(form.entries()).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  try {
    await saveAgriculturePublication(actor, values.type, values);
    for (const path of [
      "/agriculture",
      "/dashboard/agriculture",
      "/agriculture/updates",
      "/dashboard/agriculture/updates",
      "/agriculture/market-prices",
      "/dashboard/agriculture/market-prices",
      "/admin/agriculture/publishing",
    ])
      revalidateLocalizedPath(path);
    revalidateTag(cacheTags.agriculturePublic, "max");
    return { status: "success" };
  } catch (error) {
    logError("agriculture.publication_save_failed", error);
    return { status: "error" };
  }
}
