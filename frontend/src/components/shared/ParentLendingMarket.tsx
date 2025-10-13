import { PropsWithChildren, ReactNode } from "react";

import BigNumber from "bignumber.js";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import Button from "@/components/shared/Button";
import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";

interface ParentLendingMarketProps extends PropsWithChildren {
  id: string;
  lendingMarketId: string;
  count: BigNumber;
  countFormatter: (count: BigNumber) => string;
  startContent?: ReactNode;
}

export default function ParentLendingMarket({
  id,
  lendingMarketId,
  count,
  countFormatter,
  startContent,
  children,
}: ParentLendingMarketProps) {
  const { allAppData } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[lendingMarketId];

  // Collapsed
  const [isCollapsed, setIsCollapsed] = useLocalStorage<boolean>(id, false);
  const toggleIsCollapsed = () => setIsCollapsed((is) => !is);

  return (
    <>
      <div className="relative w-full">
        <div className="relative z-[2] flex h-8 flex-row items-center justify-between gap-2 px-4">
          <div className="flex flex-row items-center gap-2">
            <TBody
              className="cursor-pointer uppercase"
              onClick={toggleIsCollapsed}
            >
              {appData.lendingMarket.name}
            </TBody>

            <TLabel className="text-xs text-muted-foreground">
              {countFormatter(count)}
            </TLabel>

            {startContent}
          </div>

          <Button
            className="text-muted-foreground"
            icon={isCollapsed ? <ChevronDown /> : <ChevronUp />}
            variant="ghost"
            size="icon"
            onClick={toggleIsCollapsed}
          >
            Toggle
          </Button>
        </div>

        <div
          className="absolute inset-0 z-[1] bg-gradient-to-r from-primary/20 to-transparent"
          style={{
            maskImage:
              "linear-gradient(to right, rgba(0, 0, 0, 0.25) 0%, black 64px)",
          }}
        />
      </div>

      {isCollapsed && count.gt(0) && (
        <LendingMarketContextProvider lendingMarketId={lendingMarketId}>
          {children}
        </LendingMarketContextProvider>
      )}
    </>
  );
}
