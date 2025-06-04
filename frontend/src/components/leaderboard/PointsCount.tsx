import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { formatPoints } from "@suilend/sui-fe";

import PointsLogo from "@/components/leaderboard/PointsLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { POINTS_SEASON_MAP } from "@/contexts/LeaderboardContext";
import { cn } from "@/lib/utils";

interface PointsCountProps {
  labelClassName?: ClassValue;
  season: number;
  amount?: BigNumber;
}

export default function PointsCount({
  labelClassName,
  season,
  amount,
}: PointsCountProps) {
  const { appData } = useAppContext();

  const coinMetadata =
    appData?.coinMetadataMap[POINTS_SEASON_MAP[season].coinType];

  return (
    <div className="flex w-max flex-row items-center gap-1.5">
      <PointsLogo season={season} />

      {amount === undefined ? (
        <Skeleton className="h-5 w-10" />
      ) : amount.eq(-1) ? (
        <TBody className={cn(labelClassName)}>N/A</TBody>
      ) : (
        <Tooltip
          title={`${formatPoints(amount, { dp: coinMetadata?.decimals })} ${coinMetadata?.symbol}`}
        >
          <TBody className={cn(labelClassName)}>{formatPoints(amount)}</TBody>
        </Tooltip>
      )}
    </div>
  );
}
