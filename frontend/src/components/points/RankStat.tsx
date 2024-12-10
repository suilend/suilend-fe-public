import PointsLogo from "@/components/points/PointsLogo";
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
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>Rank</TLabelSans>

      <div className="flex w-max flex-row items-center gap-1.5">
        <PointsLogo season={season} />
        <PointsRank season={season} rank={rank} isCentered={isCentered} />
      </div>
    </div>
  );
}
