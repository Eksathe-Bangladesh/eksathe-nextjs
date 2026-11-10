import "server-only";
import { revalidatePath } from "next/cache";

import { locales } from "./locales";
import { localizedPath } from "./paths";

/** Revalidate a path across all supported locales. */
export function revalidateLocalizedPath(path: string, type?: "page" | "layout") {
  for (const locale of locales) {
    revalidatePath(localizedPath(locale, path), type);
  }
}
