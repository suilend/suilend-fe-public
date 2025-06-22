import { LENDING_MARKETS } from "@suilend/sdk";
import { NORMALIZED_USDC_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface UsdcTokenLogoProps {
  size: number;
}

export default function UsdcTokenLogo({ size }: UsdcTokenLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appData = allAppData.allLendingMarketData[LENDING_MARKETS[0].id];

  return (
    <TokenLogo
      token={getToken(
        NORMALIZED_USDC_COINTYPE,
        appData.coinMetadataMap[NORMALIZED_USDC_COINTYPE],
      )}
      size={size}
    />
  );
}
