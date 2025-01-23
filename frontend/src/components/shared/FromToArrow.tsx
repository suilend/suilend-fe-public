import { ClassValue } from "clsx";

import { cn } from "@/lib/utils";

interface FromToArrowProps {
  className?: ClassValue;
}

export default function FromToArrow({ className }: FromToArrowProps) {
  return (
    <span
      className={cn(
        "mx-2 inline-block font-sans text-xs text-muted-foreground",
        className,
      )}
    >
      {"→"}
    </span>
  );
}
