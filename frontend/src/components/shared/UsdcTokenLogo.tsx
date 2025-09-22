import { LENDING_MARKET_ID } from "@suilend/sdk";
import { NORMALIZED_USDC_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface UsdcTokenLogoProps {
  size: number;
}

export default function UsdcTokenLogo({ size }: UsdcTokenLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  return (
    <TokenLogo
      token={getToken(
        NORMALIZED_USDC_COINTYPE,
        appDataMainMarket.coinMetadataMap[NORMALIZED_USDC_COINTYPE],
      )}
      size={size}
    />
  );
}
