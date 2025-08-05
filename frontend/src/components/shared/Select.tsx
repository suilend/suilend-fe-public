import { ReactNode } from "react";

import { SelectProps as SelectRootProps } from "@radix-ui/react-select";

import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  Select as SelectRoot,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectProps {
  rootProps?: SelectRootProps;
  trigger: ReactNode;
  items: {
    id: string;
    name: string;
  }[];
  value?: string;
  onChange: (value: string) => void;
  title?: string;
}

export default function Select({
  rootProps,
  trigger,
  items,
  value,
  onChange,
  title,
}: SelectProps) {
  return (
    <SelectRoot value={value} onValueChange={onChange} {...rootProps}>
      {trigger}
      <SelectContent
        className="rounded-md"
        align="end"
        scrollUpButton={{ className: "hidden" }}
        viewport={{ className: "p-4" }}
        scrollDownButton={{ className: "hidden" }}
        style={{
          maxHeight: "var(--radix-select-content-available-height)",
          overflowY: "auto",
          minWidth: "150px",
        }}
      >
        <SelectGroup>
          {title && (
            <SelectLabel className="mb-4 px-0 py-0 font-sans font-normal text-primary-foreground">
              {title}
            </SelectLabel>
          )}
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                className={cn(
                  "cursor-pointer border py-2 pl-3 pr-10 font-sans text-xs text-muted-foreground transition-colors focus:border-transparent focus:bg-muted/10 focus:text-foreground",
                  item.id === value &&
                    "border-transparent bg-muted/15 text-foreground",
                )}
                itemIndicatorContainer={{
                  className: "left-auto right-3 w-4 h-4",
                }}
              >
                {item.name}
              </SelectItem>
            ))}
          </div>
        </SelectGroup>
      </SelectContent>
    </SelectRoot>
  );
}
