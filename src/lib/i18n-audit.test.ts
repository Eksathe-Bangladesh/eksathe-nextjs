import { describe, expect, mock, test } from "bun:test";

void mock.module("server-only", () => ({}));
import fs from "node:fs";
import path from "node:path";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";
import keyMigrations from "../../scripts/i18n/key-migrations.json";
import {
  fieldLabelKey,
  optionLabelKey,
  serviceDescriptionKey,
  serviceTitleKey,
} from "./agriculture/service-messages";
import { agricultureServiceRegistry } from "./agriculture/service-registry";
import {
  constructionServiceCategories,
  constructionServiceRegistry,
} from "./construction/service-registry";
import { auditTranslationReferences, translationReferences } from "./i18n/source-audit";
import { agricultureListings, constructionListings } from "./sectors";
const { parseAgricultureServiceAnswers } = await import("./validations/agriculture");

function flattenMessages(value: unknown, prefix = "", output = new Map<string, string>()) {
  if (typeof value === "string") {
    output.set(prefix, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => flattenMessages(item, `${prefix}.${index}`, output));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      flattenMessages(item, prefix ? `${prefix}.${key}` : key, output);
    }
  }
  return output;
}

const catalogs = {
  en: flattenMessages(en),
  bn: flattenMessages(bn),
};

// Namespaces whose keys are composed at runtime and cannot be resolved statically.
const REFERENCE_NAMESPACES = new Set([
  "metadata",
  "statuses",
  "sectors",
  "marketplaceServices",
  "agricultureServices",
  "constructionServices",
  "agricultureCategories",
  "constructionCategories",
]);
// These calls use validated helpers rather than directly visible template literals.
// Exact coverage is checked by registry parity and status-key tests.
const DYNAMIC_NAMESPACES = new Set(["agricultureServices", "statuses"]);

// Values that are intentionally identical across locales.
const UNTRANSLATED_ALLOWLIST = new Set(["common.brandName", "requestForm.phonePlaceholder"]);

const sourceRoot = path.resolve(import.meta.dir, "..");

function walk(directory: string, output: string[] = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      walk(full, output);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      output.push(full);
    }
  }
  return output;
}

function collectReferencedKeys() {
  const used = new Set<string>();
  const keys = new Set(catalogs.en.keys());
  const missing: string[] = [];
  for (const file of walk(sourceRoot)) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
    const source = fs.readFileSync(file, "utf8");
    const result = auditTranslationReferences(source, keys);
    for (const key of result.used) used.add(key);
    for (const key of result.missing) missing.push(`${path.relative(sourceRoot, file)}: ${key}`);
  }
  return { used, missing };
}

function expectedAgricultureServiceKeys() {
  const keys = new Set<string>();
  for (const service of agricultureServiceRegistry) {
    keys.add(serviceTitleKey(service.slug));
    keys.add(serviceDescriptionKey(service.slug));
    for (const field of service.fields) {
      keys.add(fieldLabelKey(service.slug, field.name));
      if ("options" in field && field.options) {
        field.options.forEach((_, index) => {
          keys.add(optionLabelKey(service.slug, field.name, index));
        });
      }
    }
  }
  return keys;
}

describe("i18n catalog audit", () => {
  test("construction and marketplace reference data has translations in both catalogs", () => {
    const keys = [
      ...constructionServiceRegistry.flatMap((service) => [
        `constructionServices.${service.slug}.title`,
        `constructionServices.${service.slug}.description`,
      ]),
      ...constructionServiceCategories.map((category) => `constructionCategories.${category.id}`),
      ...[...agricultureListings, ...constructionListings].map(
        (listing) => `marketplaceServices.${listing.slug}`,
      ),
    ];
    for (const messages of Object.values(catalogs)) {
      for (const key of keys) expect(messages.has(key), `Missing reference key: ${key}`).toBe(true);
    }
  });

  test("reference registries do not duplicate translated display text", () => {
    function check(value: unknown) {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        expect(key).not.toMatch(/^(?:title|description|section|label)(?:En|Bn)$/);
        check(child);
      }
    }
    check(agricultureServiceRegistry);
    check(constructionServiceRegistry);
    check(constructionServiceCategories);
    check(agricultureListings);
    check(constructionListings);
  });

  test("every registry service, field, and option has a catalog key in both locales", () => {
    for (const locale of ["en", "bn"] as const) {
      const messages = catalogs[locale];
      for (const key of expectedAgricultureServiceKeys()) {
        expect(messages.has(key), `${locale} is missing ${key}`).toBe(true);
      }
    }
  });

  test("the agricultureServices namespace contains no keys outside the registry", () => {
    const expected = expectedAgricultureServiceKeys();
    const actual = [...catalogs.en.keys()].filter((key) => key.startsWith("agricultureServices."));
    expect(actual.filter((key) => !expected.has(key))).toEqual([]);
    expect([...expected].filter((key) => !catalogs.en.has(key))).toEqual([]);
  });

  test("no catalog value is left untranslated", () => {
    const untranslated: string[] = [];
    for (const [key, enText] of catalogs.en) {
      if (UNTRANSLATED_ALLOWLIST.has(key)) continue;
      if (catalogs.bn.get(key) === enText) untranslated.push(key);
    }
    expect(untranslated).toEqual([]);
  });

  test("no catalog key is unreferenced", () => {
    const { used, missing } = collectReferencedKeys();
    expect(missing).toEqual([]);
    const unused = [...catalogs.en.keys()].filter(
      (key) => !used.has(key) && !DYNAMIC_NAMESPACES.has(key.split(".")[0]),
    );
    expect(unused).toEqual([]);
  });

  test("migration aliases point to canonical keys and retired namespaces stay removed", () => {
    const retired = new Set([
      "inline",
      "panels",
      "requestForm",
      "commission",
      "marketAndPolicy",
      "emergency",
      "categoryGrid",
    ]);
    for (const [before, after] of Object.entries(keyMigrations)) {
      expect(catalogs.en.has(before)).toBe(false);
      expect(
        [...catalogs.en.keys()].some((key) => key === after || key.startsWith(`${after}.`)),
        after,
      ).toBe(true);
    }
    for (const key of catalogs.en.keys()) {
      const namespace = key.split(".")[0];
      expect(retired.has(namespace), key).toBe(false);
      if (REFERENCE_NAMESPACES.has(namespace)) continue;
      for (const segment of key.split("."))
        expect(segment, key).toMatch(/^(?:[a-z][A-Za-z0-9]*|\d+)$/);
    }
    for (const file of walk(sourceRoot)) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\bas never\b/);
      for (const reference of translationReferences(source)) {
        if (reference.kind !== "template")
          expect(retired.has(reference.key.split(".")[0]), file).toBe(false);
      }
    }
  });

  test("catalog-backed reference data stays out of client component imports", () => {
    const catalogData = path.join(sourceRoot, "i18n", "catalog-data.ts");
    const catalogEntry = path.join(sourceRoot, "i18n", "catalog.ts");
    const sources = new Map(
      walk(sourceRoot)
        .filter((file) => !/\.test\.tsx?$/.test(file))
        .map((file) => [file, fs.readFileSync(file, "utf8")]),
    );
    const clientImports: string[] = [];

    function imports(file: string) {
      const source = sources.get(file) ?? "";
      const dependencies: string[] = [];
      for (const match of source.matchAll(
        /(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g,
      )) {
        const specifier = match[1] ?? match[2];
        if (!specifier.startsWith("@/") && !specifier.startsWith(".")) continue;
        const base = specifier.startsWith("@/")
          ? path.join(sourceRoot, specifier.slice(2))
          : path.resolve(path.dirname(file), specifier);
        const dependency = [
          base,
          `${base}.ts`,
          `${base}.tsx`,
          path.join(base, "index.ts"),
          path.join(base, "index.tsx"),
        ].find((candidate) => sources.has(candidate));
        if (dependency) dependencies.push(dependency);
      }
      return dependencies;
    }

    function reachesCatalog(file: string, seen = new Set<string>()): boolean {
      if (file === catalogEntry || file === catalogData) return true;
      if (seen.has(file)) return false;
      seen.add(file);
      // Server Actions imported by clients are RPC boundaries, not browser code.
      if (/^\s*["']use server["'];?/m.test(sources.get(file) ?? "")) return false;
      return imports(file).some((dependency) => reachesCatalog(dependency, seen));
    }

    for (const [file, source] of sources) {
      // The seed-only implementation must not bypass the app's server-only entry point.
      if (file !== catalogEntry) expect(imports(file)).not.toContain(catalogData);
      if (/^\s*["']use client["'];?/m.test(source) && reachesCatalog(file)) {
        clientImports.push(path.relative(sourceRoot, file));
      }
    }

    expect(sources.get(catalogEntry)).toContain('import "server-only"');
    expect(clientImports).toEqual([]);
  });

  test("agriculture answer snapshots include bilingual field and option labels", () => {
    for (const service of agricultureServiceRegistry) {
      const result = parseAgricultureServiceAnswers(service.slug, new FormData());
      expect(result.snapshot).toEqual({
        serviceSlug: service.slug,
        formVersion: service.formVersion,
        titleEn: catalogs.en.get(serviceTitleKey(service.slug)),
        titleBn: catalogs.bn.get(serviceTitleKey(service.slug)),
        fields: service.fields.map((field) => ({
          name: field.name,
          type: field.type,
          required: field.required,
          labelEn: catalogs.en.get(fieldLabelKey(service.slug, field.name)),
          labelBn: catalogs.bn.get(fieldLabelKey(service.slug, field.name)),
          options:
            "options" in field
              ? field.options.map((option, index) => ({
                  value: option.value,
                  labelEn: catalogs.en.get(optionLabelKey(service.slug, field.name, index)),
                  labelBn: catalogs.bn.get(optionLabelKey(service.slug, field.name, index)),
                }))
              : [],
        })),
      });
    }
  });
});
