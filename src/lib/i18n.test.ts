import { describe, expect, test } from "bun:test";

import {
  isArgumentElement,
  isDateElement,
  isNumberElement,
  isPluralElement,
  isSelectElement,
  isTagElement,
  isTimeElement,
  parse,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

import bn from "../../messages/bn.json";
import en from "../../messages/en.json";
import { resolveTranslation, translationLocalesFor } from "../i18n/content";
import { getLocaleOrDefault, isLocale } from "../i18n/locales";

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

function argumentNames(elements: MessageFormatElement[], output = new Set<string>()) {
  for (const element of elements) {
    if (
      isArgumentElement(element) ||
      isNumberElement(element) ||
      isDateElement(element) ||
      isTimeElement(element) ||
      isPluralElement(element) ||
      isSelectElement(element)
    ) {
      output.add(element.value);
    }
    if (isPluralElement(element) || isSelectElement(element)) {
      for (const option of Object.values(element.options)) argumentNames(option.value, output);
    }
    if (isTagElement(element)) argumentNames(element.children, output);
  }
  return output;
}

describe("locale configuration", () => {
  test("database translations fall back safely when Bangla is missing", () => {
    const english = { locale: "en", title: "English only" };
    const bangla = { locale: "bn", title: "বাংলা" };
    expect(resolveTranslation([english, bangla], "en", "bn")).toBe(english);
    expect(resolveTranslation([english, bangla], "fr", "bn")).toBe(bangla);
    expect(resolveTranslation([english], "bn", "bn")).toBe(english);
    expect(resolveTranslation([], "bn", "bn")).toBeUndefined();
    expect(translationLocalesFor("bn")).toEqual(["bn", "en"]);
    expect(translationLocalesFor("en")).toEqual(["en", "bn"]);
  });

  test("accepts only supported locales and defaults missing or invalid values to Bangla", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("bn")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(getLocaleOrDefault("en")).toBe("en");
    expect(getLocaleOrDefault("bn")).toBe("bn");
    expect(getLocaleOrDefault(undefined)).toBe("bn");
    expect(getLocaleOrDefault("invalid")).toBe("bn");
  });
});

describe("translation catalogs", () => {
  test("have matching keys and value shapes", () => {
    const enMessages = flattenMessages(en);
    const bnMessages = flattenMessages(bn);
    expect([...bnMessages.keys()].sort()).toEqual([...enMessages.keys()].sort());
  });

  test("contain valid ICU messages with matching arguments", () => {
    const enMessages = flattenMessages(en);
    const bnMessages = flattenMessages(bn);
    for (const [key, enText] of enMessages) {
      const bnText = bnMessages.get(key)!;
      let enArguments: Set<string>;
      let bnArguments: Set<string>;
      try {
        enArguments = argumentNames(parse(enText));
        bnArguments = argumentNames(parse(bnText));
      } catch (error) {
        throw new Error(`Invalid ICU message at ${key}: ${String(error)}`);
      }
      expect([...bnArguments].sort(), key).toEqual([...enArguments].sort());
    }
  });
});
