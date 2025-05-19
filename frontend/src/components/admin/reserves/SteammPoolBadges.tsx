import BigNumber from "bignumber.js";

import { formatPercent } from "@suilend/frontend-sui";

import { getQuoterName } from "@/lib/admin";

interface SteammPoolBadgesProps {
  poolInfo: any;
}

export default function SteammPoolBadges({ poolInfo }: SteammPoolBadgesProps) {
  return (
    <>
      <span className="rounded-[20px] bg-muted/15 px-2 py-0.5 text-xs text-foreground">
        {getQuoterName(poolInfo.quoterType)}
      </span>{" "}
      <span className="rounded-[20px] bg-muted/15 px-2 py-0.5 text-xs text-foreground">
        {formatPercent(new BigNumber(poolInfo.swapFeeBps).div(100))}
      </span>
    </>
  );
}
