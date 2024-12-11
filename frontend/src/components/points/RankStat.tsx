import PointsRank from "@/components/points/PointsRank";
import { TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

interface RankStatProps {
  season: number;
  rank?: number | null;
  isCentered?: boolean;
  isRightAligned?: boolean;
}

export default function RankStat({
  season,
  rank,
  isCentered,
  isRightAligned,
}: RankStatProps) {
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
        Rank
      </TLabelSans>

      <PointsRank
        season={season}
        rank={rank}
        isCentered={isCentered}
        isRightAligned={isRightAligned}
      />
    </div>
  );
}
