"use client"

import * as React from "react"
import { cn } from "cn"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function parseDate(value: string | undefined) {
  if (!value) return undefined
  const date = parse(value, "yyyy-MM-dd", new Date())
  return isValid(date) ? date : undefined
}

export function DatePicker({
  id,
  name,
  defaultValue,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = "Pick a date",
  className,
}: {
  id: string
  name: string
  defaultValue?: string
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const [value, setValue] = React.useState(defaultValue ?? "")
  const [open, setOpen] = React.useState(false)
  const date = parseDate(value)
  const minDate = parseDate(min)
  const maxDate = parseDate(max)

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              data-empty={!date}
              aria-required={required}
              className={cn(
                "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
                className,
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              setValue(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "")
              setOpen(false)
            }}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}
