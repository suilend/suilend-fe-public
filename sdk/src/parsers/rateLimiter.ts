import BigNumber from "bignumber.js";

import { RateLimiter } from "../_generated/suilend/rate-limiter/structs";
import { WAD } from "../constants";

export type ParsedRateLimiter = ReturnType<typeof parseRateLimiter>;
export type ParsedRateLimiterConfig = ReturnType<typeof parseRateLimiterConfig>;

export const parseRateLimiter = (
  rateLimiter: RateLimiter,
  currentTime: number,
) => {
  const config = parseRateLimiterConfig(rateLimiter);

  const $typeName = rateLimiter.$typeName;
  const prevQty = rateLimiter.prevQty.value;
  const windowStart = rateLimiter.windowStart;
  const curQty = rateLimiter.curQty.value;

  // Custom
  const prevWeight = new BigNumber(config.windowDuration.toString())
    .minus((BigInt(currentTime) - windowStart + BigInt(1)).toString())
    .div(config.windowDuration.toString());
  const currentOutflow = prevWeight
    .times(new BigNumber(prevQty.toString()))
    .plus(new BigNumber(curQty.toString()))
    .div(WAD);

  const remainingOutflow = currentOutflow.gt(config.maxOutflow.toString())
    ? new BigNumber(0)
    : new BigNumber(config.maxOutflow.toString()).minus(currentOutflow);

  return {
    config,

    $typeName,
    prevQty,
    windowStart,
    curQty,

    remainingOutflow,
  };
};

export const parseRateLimiterConfig = (rateLimiter: RateLimiter) => {
  const config = rateLimiter.config;
  if (!config) throw new Error("Rate limiter config not found");

  const windowDuration = config.windowDuration;
  const maxOutflow = config.maxOutflow;

  return {
    windowDuration,
    maxOutflow,
  };
};
