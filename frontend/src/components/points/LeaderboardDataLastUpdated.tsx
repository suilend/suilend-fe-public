import BigNumber from "bignumber.js";

import { usePointsContext } from "@/contexts/PointsContext";
import { formatDuration } from "@/lib/format";

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
