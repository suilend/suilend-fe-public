import BigNumber from "bignumber.js";

import PointsCount from "@/components/points/PointsCount";
import { TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { getIsLooping, getWasLooping } from "@/lib/looping";
import { cn } from "@/lib/utils";

interface PointsPerDayStatProps {
  season: number;
  amount?: BigNumber | null;
  isCentered?: boolean;
}

export default function PointsPerDayStat({
  season,
  amount,
  isCentered,
}: PointsPerDayStatProps) {
  const { data, obligation } = useLoadedAppContext();

  const isLooping = getIsLooping(data, obligation);
  const wasLooping = getWasLooping(data, obligation);

  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        Points per day
      </TLabelSans>

      <PointsCount
        labelClassName={cn((isLooping || wasLooping) && "text-warning")}
        season={season}
        amount={amount}
      />
    </div>
  );
}
