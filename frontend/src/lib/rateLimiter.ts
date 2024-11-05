import BigNumber from "bignumber.js";

import { maxU64 } from "@suilend/sdk/constants";
import { ParsedRateLimiter } from "@suilend/sdk/parsers/rateLimiter";

import { formatDuration, formatUsd } from "@/lib/format";

export const getFormattedMaxOutflow = (rateLimiter: ParsedRateLimiter) => {
  const {
    config: { windowDuration, maxOutflow },
    remainingOutflow,
  } = rateLimiter;

  const isMax = new BigNumber(maxOutflow.toString()).eq(maxU64);

  const formattedMaxOutflow = isMax
    ? "∞"
    : `${formatUsd(new BigNumber(maxOutflow.toString()))} per ${formatDuration(new BigNumber(windowDuration.toString()))}`;
  const maxOutflowTooltip = isMax
    ? "There is no limit on the amounts being withdrawn or borrowed from the pool."
    : `For the safety of the pool, amounts being withdrawn or borrowed from the pool are limited by this rate. Remaining outflow this window: ${remainingOutflow ? formatUsd(remainingOutflow) : "N/A"}`;

  return {
    formattedMaxOutflow,
    maxOutflowTooltip,
  };
};
