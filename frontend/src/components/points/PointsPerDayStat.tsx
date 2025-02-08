import BigNumber from "bignumber.js";

import PointsCount from "@/components/points/PointsCount";
import { TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { getIsLooping, getWasLooping } from "@/lib/looping";
import { cn } from "@/lib/utils";

interface PointsPerDayStatProps {
  season: number;
  amount?: BigNumber;
  isCentered?: boolean;
  isRightAligned?: boolean;
}

export default function PointsPerDayStat({
  season,
  amount,
  isCentered,
  isRightAligned,
}: PointsPerDayStatProps) {
  const { appData } = useLoadedAppContext();
  const { obligation } = useLoadedUserContext();

  const isLooping = getIsLooping(appData, obligation);
  const wasLooping = getWasLooping(appData, obligation);

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isCentered && "items-center",
        isRightAligned && "items-end",
      )}
    >
      <TLabelSans
        className={cn(
          isCentered && "text-center",
          isRightAligned && "text-right",
        )}
      >
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
