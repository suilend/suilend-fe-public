import BigNumber from "bignumber.js";

import { formatDuration } from "@suilend/sui-fe";

import { useLeaderboardContext } from "@/contexts/LeaderboardContext";

export default function TvlLeaderboardDataLastUpdated() {
  const { tvl } = useLeaderboardContext();

  if (!tvl.updatedAt) return null;
  return (
    <>
      {"Last updated "}
      {formatDuration(
        new BigNumber((new Date().getTime() - tvl.updatedAt.getTime()) / 1000),
      )}
      {" ago"}
    </>
  );
}
