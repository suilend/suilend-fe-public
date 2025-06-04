import { Trophy } from "lucide-react";

import { formatRank } from "@suilend/sui-fe";

import PointsLeaderboardDataLastUpdated from "@/components/leaderboard/PointsLeaderboardDataLastUpdated";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface PointsRankProps {
  season: number;
  rank?: number;
  noTooltip?: boolean;
  isCentered?: boolean;
  isRightAligned?: boolean;
}

export default function PointsRank({
  season,
  rank,
  noTooltip,
  isCentered,
  isRightAligned,
}: PointsRankProps) {
  return (
    <div
      className={cn(
        "flex flex-row",
        isCentered && "justify-center",
        isRightAligned && "justify-end",
      )}
      style={{
        width: `${Math.ceil(8.4 * formatRank(99999).length)}px`,
      }}
    >
      {rank === undefined ? (
        <Skeleton className="h-5 w-full" />
      ) : (
        <Tooltip
          title={
            !noTooltip && <PointsLeaderboardDataLastUpdated season={season} />
          }
        >
          {rank === -1 ? (
            <TBody
              className={cn(
                !noTooltip &&
                  cn("decoration-foreground/50", hoverUnderlineClassName),
              )}
            >
              N/A
            </TBody>
          ) : (
            <TBody
              className={cn(
                "flex flex-row items-center gap-1",
                !noTooltip &&
                  cn("decoration-foreground/50", hoverUnderlineClassName),
                rank === 1 && "text-gold",
                rank === 2 && "text-silver",
                rank === 3 && "text-bronze",
              )}
            >
              {formatRank(rank)}
              {[1, 2, 3].includes(rank) && <Trophy className="h-3 w-3" />}
            </TBody>
          )}
        </Tooltip>
      )}
    </div>
  );
}
