import { LENDING_MARKET_ID } from "@suilend/sdk";
import { getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { POINTS_SEASON_MAP } from "@/contexts/LeaderboardContext";

interface PointsLogoProps {
  season: number;
  size: number;
}

export default function PointsLogo({ season, size }: PointsLogoProps) {
  const { allAppData } = useLoadedAppContext();

  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  return (
    <TokenLogo
      token={getToken(
        POINTS_SEASON_MAP[season].coinType,
        appDataMainMarket.coinMetadataMap[POINTS_SEASON_MAP[season].coinType],
      )}
      size={size}
    />
  );
}
