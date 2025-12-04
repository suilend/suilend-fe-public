import {
  CSSProperties,
  PropsWithChildren,
  ReactElement,
  cloneElement,
} from "react";

import { ClassValue } from "clsx";

import { TTitle } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

export interface TitleWithIconProps extends PropsWithChildren {
  className?: ClassValue;
  style?: CSSProperties;
  icon?: ReactElement<{ className?: string }>;
}

export default function TitleWithIcon({
  className,
  style,
  icon,
  children,
}: TitleWithIconProps) {
  return (
    <TTitle
      className={cn("flex flex-row items-center gap-2 uppercase", className)}
      style={style}
    >
      {icon &&
        cloneElement(icon, {
          className: cn(icon.props.className, "w-4 h-4 shrink-0"),
        })}
      {children}
    </TTitle>
  );
}
