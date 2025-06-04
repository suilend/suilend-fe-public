import BigNumber from "bignumber.js";

import { formatDuration } from "@suilend/sui-fe";

import { useLeaderboardContext } from "@/contexts/LeaderboardContext";

interface PointsLeaderboardDataLastUpdatedProps {
  season: number;
}

export default function PointsLeaderboardDataLastUpdated({
  season,
}: PointsLeaderboardDataLastUpdatedProps) {
  const { points } = useLeaderboardContext();

  if (!points.updatedAtMap?.[season]) return null;
  return (
    <>
      {"Last updated "}
      {formatDuration(
        new BigNumber(
          (new Date().getTime() - points.updatedAtMap[season].getTime()) / 1000,
        ),
      )}
      {" ago"}
    </>
  );
}
