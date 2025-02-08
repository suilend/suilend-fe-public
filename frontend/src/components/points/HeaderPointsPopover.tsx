import NextLink from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { formatPoints } from "@suilend/frontend-sui";

import PointsCount from "@/components/points/PointsCount";
import PointsLogo from "@/components/points/PointsLogo";
import PointsRank from "@/components/points/PointsRank";
import Button from "@/components/shared/Button";
import Popover from "@/components/shared/Popover";
import TitleWithIcon from "@/components/shared/TitleWithIcon";
import { TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { usePointsContext } from "@/contexts/PointsContext";
import { useUserContext } from "@/contexts/UserContext";
import { POINTS_URL } from "@/lib/navigation";
import { getPointsStats } from "@/lib/points";

export default function PointsCountPopover() {
  const router = useRouter();

  const { userData } = useUserContext();
  const { season, seasonMap, addressRowMap } = usePointsContext();

  // Points
  const pointsStats = userData
    ? getPointsStats(
        seasonMap[season].coinType,
        userData.rewardMap,
        userData.obligations,
      )
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
          startIcon={<PointsLogo season={season} />}
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
        <TitleWithIcon
          icon={<PointsLogo season={season} />}
          style={{ color: seasonMap[season].color }}
        >
          SEND points Season {season}
        </TitleWithIcon>

        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-row items-center justify-between gap-4">
            <TLabelSans>Rank</TLabelSans>
            <PointsRank
              season={season}
              rank={addressRowMap?.[season].rank}
              isRightAligned
            />
          </div>

          <div className="flex flex-row items-center justify-between gap-4">
            <TLabelSans>Total points</TLabelSans>
            <PointsCount
              season={season}
              amount={pointsStats?.totalPoints.total}
            />
          </div>

          <div className="flex flex-row items-center justify-between gap-4">
            <TLabelSans>Points per day</TLabelSans>
            <PointsCount
              season={season}
              amount={pointsStats?.pointsPerDay.total}
            />
          </div>
        </div>

        {!router.asPath.startsWith(POINTS_URL) && (
          <NextLink href={POINTS_URL} className="w-full">
            <Button
              className="w-full border-secondary text-primary-foreground"
              labelClassName="uppercase"
              variant="secondaryOutline"
              onClick={() => setIsOpen(false)}
            >
              Leaderboard
            </Button>
          </NextLink>
        )}
      </div>
    </Popover>
  );
}
