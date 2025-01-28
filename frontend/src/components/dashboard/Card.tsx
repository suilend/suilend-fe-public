import { PropsWithChildren, ReactElement, ReactNode } from "react";

import { ClassValue } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import Button from "@/components/shared/Button";
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
    titleClassName?: ClassValue;
    titleIcon?: ReactElement;
    title?: string | ReactNode;
    startContent?: ReactNode;
    endContent?: ReactNode;
    noSeparator?: boolean;
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
    false,
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
          <div className="flex h-5 flex-row items-center justify-between">
            {(headerProps.titleIcon ||
              headerProps.title ||
              headerProps.startContent) && (
              <div className="flex flex-row items-center gap-1">
                <div
                  className={cn(isCollapsible && "cursor-pointer")}
                  onClick={isCollapsible ? toggleIsCollapsed : undefined}
                >
                  <TitleWithIcon
                    className={cn("w-full", headerProps.titleClassName)}
                    icon={headerProps.titleIcon}
                  >
                    {headerProps.title}
                  </TitleWithIcon>
                </div>

                {headerProps.startContent}
              </div>
            )}

            {(headerProps.endContent || isCollapsible) && (
              <div className="flex flex-row items-center justify-end gap-1">
                {headerProps.endContent}

                {isCollapsible && (
                  <Button
                    className="text-muted-foreground"
                    icon={isCollapsed ? <ChevronDown /> : <ChevronUp />}
                    variant="ghost"
                    size="icon"
                    onClick={toggleIsCollapsed}
                  >
                    Toggle
                  </Button>
                )}
              </div>
            )}
          </div>

          {!isCollapsed && !headerProps.noSeparator && <Separator />}
        </CardHeader>
      )}

      {!isCollapsed && children}
    </CardRoot>
  );
}
