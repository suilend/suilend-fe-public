import { CSSProperties, PropsWithChildren, ReactNode } from "react";

import { ClassValue } from "clsx";

import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import { cn } from "@/lib/utils";

interface SectionTitle extends PropsWithChildren {
  barSegmentClassName?: ClassValue;
  barSegmentStyle?: CSSProperties;
  labelClassName?: ClassValue;
  tooltip?: ReactNode;
  labelEndDecorator?: ReactNode;
}

export default function SectionTitle({
  barSegmentClassName,
  barSegmentStyle,
  labelClassName,
  tooltip,
  labelEndDecorator,
  children,
}: SectionTitle) {
  return (
    <div className="flex flex-row items-center gap-1.5">
      <div
        className={cn("h-3 w-1", barSegmentClassName)}
        style={barSegmentStyle}
      />
      <LabelWithTooltip
        className={labelClassName}
        tooltip={tooltip}
        endDecorator={labelEndDecorator}
      >
        {children}
      </LabelWithTooltip>
    </div>
  );
}
