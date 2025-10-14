import { PropsWithChildren, ReactNode } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";

interface ParentLendingMarketProps extends PropsWithChildren {
  id: string;
  lendingMarketId: string;
  count?: ReactNode;
  startContent?: ReactNode;
  noHeader?: boolean;
}

export default function ParentLendingMarket({
  id,
  lendingMarketId,
  count,
  startContent,
  noHeader,
  children,
}: ParentLendingMarketProps) {
  const { allAppData } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[lendingMarketId];

  // Collapsed
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(id, false);
  const toggleIsCollapsed = () => setIsCollapsed((is) => !is);

  return (
    <>
      {!noHeader && (
        <button
          className="relative w-full cursor-pointer"
          onClick={toggleIsCollapsed}
        >
          <div className="relative z-[2] flex h-8 flex-row items-center justify-between gap-2 px-4">
            <div className="flex flex-row items-center gap-2">
              <TBody
                className="cursor-pointer uppercase"
                onClick={toggleIsCollapsed}
              >
                {appData.lendingMarket.name}
              </TBody>

              {count && (
                <TLabel className="text-xs text-muted-foreground">
                  {count}
                </TLabel>
              )}

              {startContent}
            </div>

            <div className="flex h-8 w-8 flex-row items-center justify-center">
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          <div
            className="absolute inset-0 z-[1] bg-gradient-to-r from-primary/20 to-transparent"
            style={{
              maskImage:
                "linear-gradient(to right, rgba(0, 0, 0, 0.25) 0%, black 64px)",
            }}
          />
        </button>
      )}

      {(!noHeader ? !isCollapsed : true) && (
        <LendingMarketContextProvider lendingMarketId={lendingMarketId}>
          {children}
        </LendingMarketContextProvider>
      )}
    </>
  );
}
