import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";

import PointsLogo from "@/components/points/PointsLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PointsCountProps {
  labelClassName?: ClassValue;
  points?: BigNumber;
}

export default function PointsCount({
  labelClassName,
  points,
}: PointsCountProps) {
  return (
    <div className="flex w-max flex-row items-center gap-1.5">
      <PointsLogo />
      {points !== undefined ? (
        <Tooltip title={formatPoints(points, { dp: 6 })}>
          <TBody className={cn(labelClassName)}>{formatPoints(points)}</TBody>
        </Tooltip>
      ) : (
        <Skeleton className="h-5 w-10" />
      )}
    </div>
  );
}
