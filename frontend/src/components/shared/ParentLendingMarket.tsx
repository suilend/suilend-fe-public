import { PropsWithChildren, ReactNode } from "react";

import { ClassValue } from "clsx";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import { cn } from "@/lib/utils";

interface ParentLendingMarketProps extends PropsWithChildren {
  className?: ClassValue;
  contentClassName?: ClassValue;
  id?: string;
  lendingMarketId: string;
  count?: ReactNode;
  startContent?: ReactNode;
  endContent?: ReactNode;
  noHeader?: boolean;
}

export default function ParentLendingMarket({
  className,
  contentClassName,
  id,
  lendingMarketId,
  count,
  startContent,
  endContent,
  noHeader,
  children,
}: ParentLendingMarketProps) {
  const { allAppData } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[lendingMarketId];

  // Collapsed
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(
    id ?? "",
    false,
  );
  const toggleIsCollapsed = () => setIsCollapsed((is) => !is);

  const isCollapsible = !!id;

  return (
    <>
      {!noHeader && (
        <div
          className={cn(
            "relative w-full",
            isCollapsible && "cursor-pointer",
            className,
          )}
          onClick={isCollapsible ? toggleIsCollapsed : undefined}
        >
          <div
            className={cn(
              "relative z-[2] flex h-8 flex-row items-center justify-between gap-2 px-4",
              contentClassName,
            )}
          >
            <div className="flex flex-row items-center gap-2">
              <TBody className="uppercase">{appData.lendingMarket.name}</TBody>

              {count && (
                <TLabel className="text-xs text-muted-foreground">
                  {count}
                </TLabel>
              )}

              {startContent}
            </div>

            {(endContent || isCollapsible) && (
              <div className="flex flex-row items-center justify-end gap-2">
                {endContent}

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

          <div
            className="absolute inset-0 z-[1] bg-gradient-to-r from-primary/20 to-transparent"
            style={{
              maskImage:
                "linear-gradient(to right, rgba(0, 0, 0, 0.25) 0%, black 64px)",
            }}
          />
        </div>
      )}

      {(!noHeader ? (isCollapsible ? !isCollapsed : true) : true) && (
        <LendingMarketContextProvider lendingMarketId={lendingMarketId}>
          {children}
        </LendingMarketContextProvider>
      )}
    </>
  );
}
