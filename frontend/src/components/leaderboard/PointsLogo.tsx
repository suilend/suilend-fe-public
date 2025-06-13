import { getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { POINTS_SEASON_MAP } from "@/contexts/LeaderboardContext";

interface PointsLogoProps {
  season: number;
}

export default function PointsLogo({ season }: PointsLogoProps) {
  const { appData } = useLoadedAppContext();

  return (
    <TokenLogo
      className="h-4 w-4"
      token={getToken(
        POINTS_SEASON_MAP[season].coinType,
        appData.coinMetadataMap[POINTS_SEASON_MAP[season].coinType],
      )}
    />
  );
}
