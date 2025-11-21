import { useState } from "react";

import { ClassValue } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";

import Select, { SelectProps } from "@/components/shared/Select";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StandardSelectProps extends Omit<SelectProps, "root" | "trigger"> {
  className?: ClassValue;
  viewportClassName?: ClassValue;
  itemsClassName?: ClassValue;
  itemClassName?: ClassValue;
  triggerClassName?: ClassValue;
  triggerOpenClassName?: ClassValue;
  triggerIconClassName?: ClassValue;
  triggerIconOpenClassName?: ClassValue;
}

export default function StandardSelect({
  className,
  viewportClassName,
  itemsClassName,
  itemClassName,
  triggerClassName,
  triggerOpenClassName,
  triggerIconClassName,
  triggerIconOpenClassName,
  ...props
}: StandardSelectProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <Select
      className={className}
      viewportClassName={viewportClassName}
      itemsClassName={itemsClassName}
      itemClassName={itemClassName}
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <SelectTrigger
          className={cn(
            "h-8 min-w-[80px] gap-1 rounded-sm border-border bg-transparent px-3 py-0 font-sans text-muted-foreground ring-offset-transparent transition-colors hover:border-secondary hover:bg-secondary/5 hover:text-primary-foreground focus:ring-transparent",
            triggerClassName,
            isOpen &&
              cn(
                "border-secondary bg-secondary/5 text-primary-foreground",
                triggerOpenClassName,
              ),
          )}
          icon={
            <Icon
              className={cn(
                "h-3 w-3",
                triggerIconClassName,
                isOpen && triggerIconOpenClassName,
              )}
            />
          }
        >
          <SelectValue />
        </SelectTrigger>
      }
      {...props}
    />
  );
}
