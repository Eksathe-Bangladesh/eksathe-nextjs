"use client";

import { Combobox } from "@base-ui/react/combobox";
import { cn } from "cn";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { bangladeshDistricts } from "@/lib/bangladesh-districts";

type DistrictOption = {
  value: string;
  label: string;
};

export function DistrictCombobox({
  id,
  name,
  districts,
  defaultValue,
  placeholder,
  emptyOptionLabel,
  required = false,
}: {
  id: string;
  name: string;
  districts: readonly string[];
  defaultValue?: string;
  placeholder: string;
  emptyOptionLabel?: string;
  required?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("workflow");

  const options = useMemo(() => {
    const districtValues = Array.from(
      new Set([...districts, ...(defaultValue ? [defaultValue] : [])]),
    );
    const districtOptions = districtValues.map((value) => {
      const knownDistrict = bangladeshDistricts.find((district) => district.value === value);
      return {
        value,
        label: locale === "bn" ? (knownDistrict?.bn ?? value) : value,
      };
    });

    return emptyOptionLabel
      ? [{ value: "", label: emptyOptionLabel }, ...districtOptions]
      : districtOptions;
  }, [defaultValue, districts, emptyOptionLabel, locale]);

  const selectedOption = options.find((option) => option.value === (defaultValue ?? ""));

  return (
    <Combobox.Root
      items={options}
      name={name}
      required={required}
      defaultValue={selectedOption}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      filter={(option, query) => {
        const normalizedQuery = query.trim().toLocaleLowerCase(locale);
        return (
          option.label.toLocaleLowerCase(locale).includes(normalizedQuery) ||
          option.value.toLocaleLowerCase(locale).includes(normalizedQuery)
        );
      }}
    >
      <Combobox.InputGroup className="group/combobox relative w-full">
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-8 w-full min-w-0 rounded-lg border py-1 pr-8 pl-2.5 text-sm transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3"
        />
        <ChevronDownIcon
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        />
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup className="border-border bg-popover text-popover-foreground w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-lg border py-1 shadow-lg outline-none">
            <Combobox.Empty>
              <p className="text-muted-foreground px-3 py-2 text-sm">{t("noDistrictsFound")}</p>
            </Combobox.Empty>
            <Combobox.List className="max-h-60 overflow-y-auto p-1 outline-none">
              {(option: DistrictOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className={cn(
                    "relative flex min-h-8 cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    "data-[selected]:font-medium",
                  )}
                >
                  <Combobox.ItemIndicator className="text-primary flex size-4 shrink-0 items-center justify-center">
                    <CheckIcon aria-hidden="true" className="size-4" />
                  </Combobox.ItemIndicator>
                  <span>{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
