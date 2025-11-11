import { PropsWithChildren, ReactElement, ReactNode } from "react";

import { ClassValue } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import TitleWithIcon from "@/components/shared/TitleWithIcon";
import {
  CardHeader,
  Card as CardRoot,
  CardProps as CardRootProps,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface CardProps extends PropsWithChildren, CardRootProps {
  id?: string;
  headerProps?: {
    className?: ClassValue;
    titleContainerClassName?: ClassValue;
    titleClassName?: ClassValue;
    titleIcon?: ReactElement;
    title?: string | ReactNode;
    startContent?: ReactNode;
    endContent?: ReactNode;
    noSeparator?: boolean;
    isInitiallyCollapsed?: boolean;
  };
}

export default function Card({
  id,
  headerProps,
  children,
  ...props
}: CardProps) {
  const { className, ...restProps } = props;

  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(
    id ?? "",
    headerProps?.isInitiallyCollapsed ?? false,
  );
  const toggleIsCollapsed = () => setIsCollapsed((is) => !is);

  const isCollapsible = !!id;

  return (
    <CardRoot
      className={cn(
        "text-unset w-full overflow-hidden rounded-sm shadow-none",
        className,
      )}
      {...restProps}
    >
      {headerProps && (
        <CardHeader
          className={cn("flex flex-col gap-2 space-y-0", headerProps.className)}
        >
          <div
            className={cn(
              "flex h-5 flex-row items-center justify-between",
              isCollapsible && "cursor-pointer",
              headerProps.titleContainerClassName,
            )}
            onClick={isCollapsible ? toggleIsCollapsed : undefined}
          >
            {(headerProps.titleIcon ||
              headerProps.title ||
              headerProps.startContent) && (
              <div className="flex flex-row items-center gap-2">
                <TitleWithIcon
                  className={cn("w-full", headerProps.titleClassName)}
                  icon={headerProps.titleIcon}
                >
                  {headerProps.title}
                </TitleWithIcon>

                {headerProps.startContent}
              </div>
            )}

            {(headerProps.endContent || isCollapsible) && (
              <div className="flex flex-row items-center justify-end gap-2">
                {headerProps.endContent}

                {isCollapsible && (
                  <div className="flex h-8 w-8 flex-row items-center justify-center">
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {(isCollapsible ? !isCollapsed : true) &&
            !headerProps.noSeparator && <Separator />}
        </CardHeader>
      )}

      {(isCollapsible ? !isCollapsed : true) && children}
    </CardRoot>
  );
}
