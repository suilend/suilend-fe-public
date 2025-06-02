import BigNumber from "bignumber.js";

import { formatDuration } from "@suilend/sui-fe";

import { useLeaderboardContext } from "@/contexts/LeaderboardContext";

export default function LeaderboardDataLastUpdated() {
  const { updatedAt } = useLeaderboardContext();

  if (!updatedAt) return null;
  return (
    <>
      {"Last updated "}
      {formatDuration(
        new BigNumber((new Date().getTime() - updatedAt.getTime()) / 1000),
      )}
      {" ago"}
    </>
  );
}
