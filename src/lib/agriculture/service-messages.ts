import type { Messages } from "@/i18n/message-keys";

import { agricultureServiceRegistry } from "./service-registry";

type Services = Messages["agricultureServices"];
export type AgricultureServiceSlug = keyof Services;
type FieldName<Slug extends AgricultureServiceSlug> = Slug extends AgricultureServiceSlug
  ? keyof Services[Slug]["fields"] & string
  : never;
type OptionFieldName<Slug extends AgricultureServiceSlug> = Slug extends AgricultureServiceSlug
  ? {
      [Field in keyof Services[Slug]["fields"]]: Services[Slug]["fields"][Field] extends {
        options: object;
      }
        ? Field
        : never;
    }[keyof Services[Slug]["fields"]] &
      string
  : never;
type FieldLabelKey = {
  [
    Slug in AgricultureServiceSlug
  ]: `agricultureServices.${Slug}.fields.${keyof Services[Slug]["fields"] & string}.label`;
}[AgricultureServiceSlug];
type OptionLabelKey = {
  [Slug in AgricultureServiceSlug]: {
    [Field in keyof Services[Slug]["fields"]]: Services[Slug]["fields"][Field] extends {
      options: infer Options;
    }
      ? `agricultureServices.${Slug}.fields.${Field & string}.options.${keyof Options & string}`
      : never;
  }[keyof Services[Slug]["fields"]];
}[AgricultureServiceSlug];
type OptionFieldId<
  Slug extends AgricultureServiceSlug,
  Field extends OptionFieldName<Slug>,
> = Slug extends AgricultureServiceSlug
  ? Field extends keyof Services[Slug]["fields"]
    ? Services[Slug]["fields"][Field] extends { options: infer Options }
      ? keyof Options & string
      : never
    : never
  : never;

export function serviceTitleKey<Slug extends AgricultureServiceSlug>(slug: Slug) {
  return `agricultureServices.${slug}.title` as const;
}

export function serviceDescriptionKey<Slug extends AgricultureServiceSlug>(slug: Slug) {
  return `agricultureServices.${slug}.description` as const;
}

function requireField(slug: AgricultureServiceSlug, name: string) {
  const service = agricultureServiceRegistry.find((item) => item.slug === slug);
  const field = service?.fields.find((item) => item.name === name);
  if (!field) throw new Error(`Unknown agriculture field: ${slug}.${name}`);
  return field;
}

export function fieldLabelKey<Slug extends AgricultureServiceSlug>(
  slug: Slug,
  field: FieldName<Slug>,
): FieldLabelKey {
  // Union-typed services lose slug/field correlation in loops. Validate that pair
  // against structure before narrowing to a catalog key; no catalog enters JS.
  requireField(slug, field);
  return `agricultureServices.${slug}.fields.${field}.label` as FieldLabelKey;
}

export function optionLabelKey<
  Slug extends AgricultureServiceSlug,
  Field extends OptionFieldName<Slug>,
>(slug: Slug, field: Field, optionId: OptionFieldId<Slug, Field>): OptionLabelKey {
  const definition = requireField(slug, field);
  if (!("options" in definition) || !definition.options.some((option) => option.id === optionId)) {
    throw new Error(`Unknown agriculture option: ${slug}.${field}.${optionId}`);
  }
  return `agricultureServices.${slug}.fields.${field}.options.${optionId}` as OptionLabelKey;
}
