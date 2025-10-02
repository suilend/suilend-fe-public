import * as React from "react";

import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, indeterminate, onCheckedChange, ...props }, ref) => {
    return (
      <div
        className="relative cursor-pointer"
        onClick={() => onCheckedChange?.(!checked)}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          aria-checked={indeterminate ? "mixed" : checked ? "true" : "false"}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded-sm border border-foreground shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            (checked || indeterminate) &&
              "border-primary bg-primary text-primary-foreground",
            className,
          )}
        >
          {indeterminate && !checked ? (
            <div className="flex items-center justify-center">
              <Minus className="h-4 w-4" color="white" />
            </div>
          ) : checked ? (
            <div className="flex items-center justify-center">
              <Check className="h-4 w-4" color="white" />
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
