import { ClassValue } from "clsx";

import { NORMALIZED_SEND_COINTYPE } from "@suilend/frontend-sui";
import { LENDING_MARKETS } from "@suilend/sdk";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface SendTokenLogoProps {
  className?: ClassValue;
}

export default function SendTokenLogo({ className }: SendTokenLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];

  const sendReserve = appData.reserveMap[NORMALIZED_SEND_COINTYPE];

  return (
    <TokenLogo
      className={cn("h-4 w-4", className)}
      token={{
        coinType: NORMALIZED_SEND_COINTYPE,
        symbol: sendReserve.token.symbol,
        iconUrl: sendReserve.token.iconUrl,
      }}
    />
  );
}
