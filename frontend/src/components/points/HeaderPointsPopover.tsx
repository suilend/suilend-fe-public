import NextLink from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import PointsCount from "@/components/points/PointsCount";
import PointsIcon from "@/components/points/PointsIcon";
import PointsRank from "@/components/points/PointsRank";
import Button from "@/components/shared/Button";
import Popover from "@/components/shared/Popover";
import TitleWithIcon from "@/components/shared/TitleWithIcon";
import { TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { usePointsContext } from "@/contexts/PointsContext";
import { formatPoints } from "@/lib/format";
import { POINTS_URL } from "@/lib/navigation";
import { getPointsStats } from "@/lib/points";

export default function PointsCountPopover() {
  const router = useRouter();

  const { data } = useAppContext();
  const { rank } = usePointsContext();

  // Points
  const pointsStats = data
    ? getPointsStats(data.rewardMap, data.obligations)
    : undefined;

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Popover
      id="header-points"
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="gap-1.5 bg-muted/15"
          startIcon={<PointsIcon className="h-4 w-4" />}
          variant="ghost"
          role="combobox"
        >
          {pointsStats ? (
            formatPoints(pointsStats.totalPoints.total)
          ) : (
            <Skeleton className="h-5 w-10" />
          )}
        </Button>
      }
      contentProps={{
        align: "end",
        className: "w-[280px]",
      }}
    >
      <div className="flex flex-col gap-4">
        <TitleWithIcon icon={<PointsIcon />}>SEND points</TitleWithIcon>

        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-row items-center justify-between gap-4">
            <TLabelSans>Total Points</TLabelSans>
            <PointsCount points={pointsStats?.totalPoints.total} />
          </div>

          <div className="flex flex-row items-center justify-between gap-4">
            <TLabelSans>Points per day</TLabelSans>
            <PointsCount points={pointsStats?.pointsPerDay.total} />
          </div>

          <div className="flex flex-row items-center justify-between gap-4">
            <TLabelSans>Rank</TLabelSans>
            <PointsRank rank={rank} isRightAligned />
          </div>
        </div>

        {!router.asPath.startsWith(POINTS_URL) && (
          <NextLink href={POINTS_URL} className="w-full">
            <Button
              className="w-full border-secondary"
              labelClassName="uppercase text-primary-foreground"
              variant="secondaryOutline"
              onClick={() => setIsOpen(false)}
            >
              View leaderboard
            </Button>
          </NextLink>
        )}
      </div>
    </Popover>
  );
}
