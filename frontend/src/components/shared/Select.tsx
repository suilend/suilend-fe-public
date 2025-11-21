import { ReactNode } from "react";

import { SelectProps as SelectRootProps } from "@radix-ui/react-select";
import { ClassValue } from "clsx";

import {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  Select as SelectRoot,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectProps {
  className?: ClassValue;
  viewportClassName?: ClassValue;
  itemsClassName?: ClassValue;
  itemClassName?: ClassValue;
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
  className,
  viewportClassName,
  itemsClassName,
  itemClassName,
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
        className={cn("rounded-md", className)}
        align="end"
        scrollUpButton={{ className: "hidden" }}
        viewport={{ className: cn("p-4", viewportClassName) }}
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
          <div className={cn("flex flex-col gap-2", itemsClassName)}>
            {items.map((item) => (
              <SelectItem
                key={item.id}
                value={item.id}
                className={cn(
                  "cursor-pointer border py-2 pl-3 pr-10 font-sans text-xs text-muted-foreground transition-colors focus:border-transparent focus:bg-muted/10 focus:text-foreground",
                  item.id === value &&
                    "border-transparent bg-muted/15 text-foreground",
                  itemClassName,
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
