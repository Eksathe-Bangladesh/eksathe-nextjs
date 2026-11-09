// Shared implementation for the server-only resolver and standalone seed scripts.
// App code must import ./catalog so Next.js enforces the server boundary.
import bn from "../../messages/bn.json";
import en from "../../messages/en.json";

function read(source: unknown, key: string) {
  let current: unknown = source;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function resolveCatalogPair(key: string): { en: string; bn: string } {
  const enText = read(en, key);
  const bnText = read(bn, key);
  if (!enText || !bnText) throw new Error(`Missing catalog key: ${key}`);
  return { en: enText, bn: bnText };
}
