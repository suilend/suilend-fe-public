import { ReactElement, ReactNode, cloneElement, forwardRef } from "react";

import { TooltipContentProps } from "@radix-ui/react-tooltip";
import { ClassValue } from "clsx";

import Tooltip from "@/components/shared/Tooltip";
import { TLabel } from "@/components/shared/Typography";
import {
  Button as ButtonComponent,
  ButtonProps as ButtonComponentProps,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonComponentProps {
  labelClassName?: ClassValue;
  tooltip?: string | ReactNode;
  tooltipAlign?: TooltipContentProps["align"];
  startIcon?: ReactElement;
  icon?: ReactElement;
  endIcon?: ReactElement;
  tag?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      labelClassName,
      tooltip,
      tooltipAlign,
      startIcon,
      icon,
      endIcon,
      tag,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <Tooltip title={tooltip} contentProps={{ align: tooltipAlign }}>
        <ButtonComponent
          className={cn("gap-1", className)}
          ref={ref}
          tag={tag}
          {...props}
        >
          {startIcon &&
            cloneElement(startIcon, {
              className: cn(
                "w-3 h-3 shrink-0 transition-colors",
                startIcon.props.className,
              ),
            })}

          {icon ? (
            <>
              {cloneElement(icon, {
                className: cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  icon.props.className,
                ),
              })}
              <span className="sr-only">{children}</span>
            </>
          ) : (
            <TLabel
              className={cn(
                "text-sm text-inherit transition-colors",
                labelClassName,
              )}
            >
              {children}
            </TLabel>
          )}

          {endIcon &&
            cloneElement(endIcon, {
              className: cn(
                "w-3 h-3 shrink-0 transition-colors",
                endIcon.props.className,
              ),
            })}
        </ButtonComponent>
      </Tooltip>
    );
  },
);
Button.displayName = "Button";

export default Button;
