import * as React from "react";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
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
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            checked && "bg-primary text-primary-foreground",
            className,
          )}
        >
          {checked && (
            <div className="flex items-center justify-center">
              <Check className="h-4 w-4" color="white" />
            </div>
          )}
        </div>
      </div>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
