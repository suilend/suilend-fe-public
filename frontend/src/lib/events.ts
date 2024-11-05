import BigNumber from "bignumber.js";

import { ParsedDownsampledApiReserveAssetDataEvent } from "@suilend/sdk/parsers/apiReserveAssetDataEvent";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Side } from "@suilend/sdk/types";

import { msPerYear } from "@/lib/constants";

export enum EventType {
  INTEREST_UPDATE = "interestUpdate",
  RESERVE_ASSET_DATA = "reserveAssetData",
  MINT = "mint",
  REDEEM = "redeem",
  DEPOSIT = "deposit",
  BORROW = "borrow",
  WITHDRAW = "withdraw",
  REPAY = "repay",
  LIQUIDATE = "liquidate",
  CLAIM_REWARD = "claimReward",
  OBLIGATION_DATA = "obligationData",
}

export const EventTypeNameMap: Record<EventType, string> = {
  [EventType.INTEREST_UPDATE]: "Interest update",
  [EventType.RESERVE_ASSET_DATA]: "Reserve asset data",
  [EventType.MINT]: "Mint",
  [EventType.REDEEM]: "Redeem",
  [EventType.DEPOSIT]: "Deposit",
  [EventType.BORROW]: "Borrow",
  [EventType.WITHDRAW]: "Withdraw",
  [EventType.REPAY]: "Repay",
  [EventType.LIQUIDATE]: "Liquidation",
  [EventType.CLAIM_REWARD]: "Claim rewards",
  [EventType.OBLIGATION_DATA]: "Obligation data",
};

type EventRow = {
  timestamp: number;
  eventIndex: number;
};

export const apiEventSortDesc = (a: EventRow, b: EventRow) => {
  const aDate = new Date(a.timestamp * 1000).getTime();
  const bDate = new Date(b.timestamp * 1000).getTime();
  if (aDate !== bDate) return bDate - aDate;

  return b.eventIndex - a.eventIndex;
};

export const eventSortAsc = (a: EventRow, b: EventRow) =>
  -1 * apiEventSortDesc(a, b);

// DownsampledApiReserveAssetDataEvent
export const DAY_S = 24 * 60 * 60;

export type Days = 1 | 7 | 30;
export const DAYS: Days[] = [1, 7, 30];
export const RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP: Record<Days, number> = {
  1: 15 * 60,
  7: 2 * 60 * 60,
  30: 8 * 60 * 60,
};

export const calculateRewardAprPercent = (
  side: Side,
  event: ParsedDownsampledApiReserveAssetDataEvent,
  rewardEvents: ParsedDownsampledApiReserveAssetDataEvent[],
  reserve: ParsedReserve,
) => {
  if (rewardEvents.length === 0) return 0;

  const rewardEvent = rewardEvents.findLast(
    (e) => e.sampleTimestampS <= event.sampleTimestampS,
  );
  if (!rewardEvent) return 0;

  const rewardCoinType = rewardEvent.coinType;

  const allPoolRewards = [
    ...(side === Side.DEPOSIT
      ? reserve.depositsPoolRewardManager.poolRewards
      : reserve.borrowsPoolRewardManager.poolRewards),
  ];

  const poolRewards = allPoolRewards.filter(
    (poolReward) =>
      poolReward.coinType === rewardCoinType &&
      event.timestampS >= poolReward.startTimeMs / 1000 &&
      event.timestampS < poolReward.endTimeMs / 1000,
  );
  if (poolRewards.length === 0) return 0;

  const rewardAprPercent = poolRewards.reduce(
    (acc: BigNumber, poolReward) =>
      acc.plus(
        poolReward.totalRewards
          .times(rewardEvent.price)
          .times(
            new BigNumber(msPerYear).div(
              poolReward.endTimeMs - poolReward.startTimeMs,
            ),
          )
          .div(
            side === Side.DEPOSIT
              ? event.depositedAmountUsd
              : event.borrowedAmountUsd,
          )
          .times(100)
          .times(side === Side.DEPOSIT ? 1 : -1),
      ),
    new BigNumber(0),
  );

  return +rewardAprPercent;
};
