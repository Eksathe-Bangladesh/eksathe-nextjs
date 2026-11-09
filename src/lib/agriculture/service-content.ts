import { resolveCatalogPair } from "@/i18n/catalog";
import { fieldLabelKey, optionLabelKey } from "@/lib/agriculture/service-messages";
import type {
  AgricultureService,
  AgricultureServiceFieldWithContent,
  AgricultureServiceWithContent,
} from "@/lib/agriculture/service-registry";

export function withAgricultureServiceContent(
  service: AgricultureService,
  content: { title: string; description: string; icon: string },
): AgricultureServiceWithContent {
  return {
    ...service,
    titleBn: content.title,
    titleEn: content.title,
    descriptionBn: content.description,
    descriptionEn: content.description,
    icon: content.icon,
    fields: service.fields.map((field) => {
      const label = resolveCatalogPair(fieldLabelKey(service.slug, field.name));
      const options =
        "options" in field
          ? field.options.map((option) => {
              const optionLabel = resolveCatalogPair(
                optionLabelKey(service.slug, field.name, option.id),
              );
              return {
                ...option,
                labelBn: optionLabel.bn,
                labelEn: optionLabel.en,
              };
            })
          : undefined;
      return {
        ...field,
        labelBn: label.bn,
        labelEn: label.en,
        ...(options === undefined ? {} : { options }),
      } as AgricultureServiceFieldWithContent;
    }),
  };
}
