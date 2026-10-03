"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"

export interface SearchOption {
  value: string
  label: string
}

export function SearchSelect({
  label,
  value,
  options,
  placeholder,
  empty,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: SearchOption[]
  placeholder: string
  empty: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const selected = options.find((item) => item.value === value) ?? null
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Combobox
        items={options}
        value={selected}
        disabled={disabled}
        itemToStringLabel={(item) => item.label}
        onValueChange={(next) => onChange(next?.value ?? "")}
        isItemEqualToValue={(left, right) => left.value === right.value}
      >
        <ComboboxInput className="w-full" placeholder={placeholder} disabled={disabled} aria-label={label} />
        <ComboboxContent>
          <ComboboxEmpty>{empty}</ComboboxEmpty>
          <ComboboxList>
            {(item: SearchOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
