import { COINTYPE_LOGO_MAP, COINTYPE_SYMBOL_MAP } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { usePointsContext } from "@/contexts/PointsContext";

interface PointsLogoProps {
  season: number;
}

export default function PointsLogo({ season }: PointsLogoProps) {
  const { seasonMap } = usePointsContext();

  return (
    <TokenLogo
      className="h-4 w-4"
      token={{
        coinType: seasonMap[season].coinType,
        symbol: COINTYPE_SYMBOL_MAP[seasonMap[season].coinType],
        iconUrl: COINTYPE_LOGO_MAP[seasonMap[season].coinType],
      }}
    />
  );
}
