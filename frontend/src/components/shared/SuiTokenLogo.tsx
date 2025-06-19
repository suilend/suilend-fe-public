import { ClassValue } from "clsx";

import { LENDING_MARKETS } from "@suilend/sdk";
import { NORMALIZED_SUI_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface SuiTokenLogoProps {
  className?: ClassValue;
}

export default function SuiTokenLogo({ className }: SuiTokenLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];

  return (
    <TokenLogo
      className={cn("h-4 w-4", className)}
      token={getToken(
        NORMALIZED_SUI_COINTYPE,
        appData.coinMetadataMap[NORMALIZED_SUI_COINTYPE],
      )}
    />
  );
}
