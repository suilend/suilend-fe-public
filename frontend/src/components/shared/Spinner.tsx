import { VariantProps, cva } from "class-variance-authority";
import { ClassValue } from "clsx";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      default: "w-8 h-8",
      md: "w-6 h-6",
      sm: "w-4 h-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: ClassValue;
}

export default function Spinner({ className, size }: SpinnerProps) {
  return <Loader2 className={cn(className, spinnerVariants({ size }))} />;
}
