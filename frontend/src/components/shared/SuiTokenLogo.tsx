import { LENDING_MARKET_ID } from "@suilend/sdk";
import { NORMALIZED_SUI_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface SuiTokenLogoProps {
  size: number;
}

export default function SuiTokenLogo({ size }: SuiTokenLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  return (
    <TokenLogo
      token={getToken(
        NORMALIZED_SUI_COINTYPE,
        appData.coinMetadataMap[NORMALIZED_SUI_COINTYPE],
      )}
      size={size}
    />
  );
}
