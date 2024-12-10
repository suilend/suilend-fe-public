import PointsLogo from "@/components/points/PointsLogo";
import PointsRank from "@/components/points/PointsRank";
import { TLabelSans } from "@/components/shared/Typography";
import { usePointsContext } from "@/contexts/PointsContext";
import { cn } from "@/lib/utils";

interface RankStatProps {
  isCentered?: boolean;
}

export default function RankStat({ isCentered }: RankStatProps) {
  const { season, rankMap } = usePointsContext();

  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>Rank</TLabelSans>

      <div className="flex w-max flex-row items-center gap-1.5">
        <PointsLogo season={season} />
        <PointsRank
          season={season}
          rank={rankMap?.[season]}
          isCentered={isCentered}
        />
      </div>
    </div>
  );
}
