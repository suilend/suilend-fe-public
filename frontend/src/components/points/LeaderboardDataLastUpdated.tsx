import BigNumber from "bignumber.js";

import { formatDuration } from "@suilend/sui-fe";

import { usePointsContext } from "@/contexts/PointsContext";

interface LeaderboardDataLastUpdatedProps {
  season: number;
}

export default function LeaderboardDataLastUpdated({
  season,
}: LeaderboardDataLastUpdatedProps) {
  const { updatedAtMap } = usePointsContext();

  if (!updatedAtMap?.[season]) return null;
  return (
    <>
      {"Last updated "}
      {formatDuration(
        new BigNumber(
          (new Date().getTime() - updatedAtMap[season].getTime()) / 1000,
        ),
      )}
      {" ago"}
    </>
  );
}
