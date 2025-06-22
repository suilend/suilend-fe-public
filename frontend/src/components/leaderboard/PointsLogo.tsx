import { getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { POINTS_SEASON_MAP } from "@/contexts/LeaderboardContext";

interface PointsLogoProps {
  season: number;
  size: number;
}

export default function PointsLogo({ season, size }: PointsLogoProps) {
  const { appData } = useLoadedAppContext();

  return (
    <TokenLogo
      token={getToken(
        POINTS_SEASON_MAP[season].coinType,
        appData.coinMetadataMap[POINTS_SEASON_MAP[season].coinType],
      )}
      size={size}
    />
  );
}
