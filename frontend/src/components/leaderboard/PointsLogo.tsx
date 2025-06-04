import { COINTYPE_LOGO_MAP, COINTYPE_SYMBOL_MAP } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { POINTS_SEASON_MAP } from "@/contexts/LeaderboardContext";

interface PointsLogoProps {
  season: number;
}

export default function PointsLogo({ season }: PointsLogoProps) {
  return (
    <TokenLogo
      className="h-4 w-4"
      token={{
        coinType: POINTS_SEASON_MAP[season].coinType,
        symbol: COINTYPE_SYMBOL_MAP[POINTS_SEASON_MAP[season].coinType],
        iconUrl: COINTYPE_LOGO_MAP[POINTS_SEASON_MAP[season].coinType],
      }}
    />
  );
}
