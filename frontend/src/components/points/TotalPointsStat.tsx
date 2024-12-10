import BigNumber from "bignumber.js";

import PointsCount from "@/components/points/PointsCount";
import { TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

interface TotalPointsStatProps {
  season: number;
  amount?: BigNumber | null;
  isCentered?: boolean;
}

export default function TotalPointsStat({
  season,
  amount,
  isCentered,
}: TotalPointsStatProps) {
  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        Total SEND Points
      </TLabelSans>

      <PointsCount season={season} amount={amount} />
    </div>
  );
}
