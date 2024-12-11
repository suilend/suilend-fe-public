import PointsRank from "@/components/points/PointsRank";
import { TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

interface RankStatProps {
  season: number;
  rank?: number | null;
  isCentered?: boolean;
}

export default function RankStat({ season, rank, isCentered }: RankStatProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isCentered ? "items-center" : "items-end",
      )}
    >
      <TLabelSans className={cn(isCentered ? "text-center" : "text-right")}>
        Rank
      </TLabelSans>

      <PointsRank season={season} rank={rank} isCentered={isCentered} />
    </div>
  );
}
