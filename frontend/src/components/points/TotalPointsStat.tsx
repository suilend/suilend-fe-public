import BigNumber from "bignumber.js";

import PointsCount from "@/components/points/PointsCount";
import { TLabelSans } from "@/components/shared/Typography";
import { usePointsContext } from "@/contexts/PointsContext";
import { cn } from "@/lib/utils";

interface TotalPointsStatProps {
  amount: BigNumber;
  isCentered?: boolean;
}

export default function TotalPointsStat({
  amount,
  isCentered,
}: TotalPointsStatProps) {
  const { season } = usePointsContext();

  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        Total SEND Points
      </TLabelSans>

      <PointsCount season={season} amount={amount} />
    </div>
  );
}
