import { useState } from "react";

import { ClassValue } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";

import Select, { SelectProps } from "@/components/shared/Select";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StandardSelectProps extends Omit<SelectProps, "root" | "trigger"> {
  className?: ClassValue;
}

export default function StandardSelect({
  className,
  ...props
}: StandardSelectProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  return (
    <Select
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <SelectTrigger
          className={cn(
            "h-8 min-w-[120px] gap-1 rounded-sm border-border bg-transparent px-3 py-0 font-sans text-muted-foreground ring-offset-transparent transition-colors hover:border-secondary hover:bg-secondary/5 hover:text-primary-foreground focus:ring-transparent",
            className,
            isOpen && "border-secondary bg-secondary/5 text-primary-foreground",
          )}
          icon={<Icon className="h-3 w-3" />}
        >
          <SelectValue />
        </SelectTrigger>
      }
      {...props}
    />
  );
}
