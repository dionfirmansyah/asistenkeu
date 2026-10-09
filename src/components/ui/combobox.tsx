import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Item {
  value: string;
  label: string;
}

export function ComboboxField({
  items,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  items: Item[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((i) => i.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn("inline-flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm hover:bg-accent/50 disabled:opacity-50", !selected && "text-muted-foreground", className)}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--anchor-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Ketik untuk mencari…" />
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.value}
                  value={it.label}
                  onSelect={() => {
                    onChange(it.value === value ? "" : it.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 size-4", value === it.value ? "opacity-100" : "opacity-0")} />
                  {it.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
