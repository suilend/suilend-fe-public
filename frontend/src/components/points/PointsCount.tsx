import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import { formatPoints } from "@suilend/frontend-sui";

import PointsLogo from "@/components/points/PointsLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { usePointsContext } from "@/contexts/PointsContext";
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
  const { seasonMap } = usePointsContext();

  const coinMetadata = appData?.coinMetadataMap[seasonMap[season].coinType];

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
