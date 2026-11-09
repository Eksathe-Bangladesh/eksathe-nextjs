export function serviceTitleKey(slug: string) {
  return `agricultureServices.${slug}.title`;
}

export function serviceDescriptionKey(slug: string) {
  return `agricultureServices.${slug}.description`;
}

export function fieldLabelKey(slug: string, field: string) {
  return `agricultureServices.${slug}.fields.${field}.label`;
}

export function optionLabelKey(slug: string, field: string, index: number) {
  return `agricultureServices.${slug}.fields.${field}.options.${index}.label`;
}
