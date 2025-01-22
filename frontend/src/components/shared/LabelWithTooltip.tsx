import { PropsWithChildren, ReactNode } from "react";

import { ClassValue } from "clsx";

import Tooltip, { TooltipProps } from "@/components/shared/Tooltip";
import { TLabel, TLabelSans } from "@/components/shared/Typography";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface LabelProps extends PropsWithChildren {
  className?: ClassValue;
  tooltip?: string | ReactNode;
  tooltipContentProps?: TooltipProps["contentProps"];
  startDecorator?: ReactNode;
  endDecorator?: ReactNode;
  isMono?: boolean;
}

export default function LabelWithTooltip({
  className,
  tooltip,
  tooltipContentProps,
  startDecorator,
  endDecorator,
  isMono,
  children,
}: LabelProps) {
  const Component = isMono ? TLabel : TLabelSans;

  return (
    <Tooltip title={tooltip} contentProps={tooltipContentProps}>
      <Component
        className={cn(
          "w-max",
          (!!startDecorator || !!endDecorator) &&
            "flex flex-row items-center gap-1",
          className,
          !!tooltip &&
            cn("decoration-muted-foreground/50", hoverUnderlineClassName),
        )}
      >
        {startDecorator}
        {children}
        {endDecorator}
      </Component>
    </Tooltip>
  );
}
