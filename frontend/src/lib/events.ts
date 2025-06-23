import {
  MoveCallSuiTransaction,
  SuiClient,
  SuiTransaction,
} from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { chunk } from "lodash";

import { ApiClaimRewardEvent, Side } from "@suilend/sdk/lib/types";
import { ParsedDownsampledApiReserveAssetDataEvent } from "@suilend/sdk/parsers/apiReserveAssetDataEvent";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { API_URL, MS_PER_YEAR } from "@suilend/sui-fe";

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
  CLAIM_AND_DEPOSIT_REWARDS = "claimAndDepositRewards",
  OBLIGATION_DATA = "obligationData",

  DEPOSIT_SUB_ROW = "depositSubRow",
  CLAIM_REWARD_SUB_ROW = "claimRewardSubRow",
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
  [EventType.CLAIM_AND_DEPOSIT_REWARDS]: "Claim and deposit",
  [EventType.OBLIGATION_DATA]: "Obligation data",

  [EventType.DEPOSIT_SUB_ROW]: "",
  [EventType.CLAIM_REWARD_SUB_ROW]: "",
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
            new BigNumber(MS_PER_YEAR).div(
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

export const fetchClaimRewardEvents = async (
  suiClient: SuiClient,
  address: string,
  obligationId: string,
) => {
  const url = `${API_URL}/events?${new URLSearchParams({
    eventTypes: EventType.CLAIM_REWARD,
    obligationId,
  })}`;
  const res = await fetch(url);
  const json: {
    claimReward: ApiClaimRewardEvent[];
  } = await res.json();

  const allDigests = Array.from(
    new Set(
      json.claimReward
        .slice()
        .sort(apiEventSortDesc)
        .filter((event) => event.sender !== address)
        .map((t) => t.digest),
    ),
  );
  const chunkedDigests = chunk(allDigests, 50);

  const autoclaimDigests = (
    await Promise.all(
      chunkedDigests.map((digests) =>
        (async () =>
          (
            await suiClient.multiGetTransactionBlocks({
              digests,
              options: {
                showInput: true,
              },
            })
          )
            .filter((transaction) =>
              (
                transaction.transaction?.data.transaction as any
              )?.transactions?.some(
                (t: SuiTransaction) =>
                  ((t as any)?.MoveCall as MoveCallSuiTransaction)?.function ===
                  "claim_rewards_and_deposit",
              ),
            )
            .map((transaction) => transaction.digest))(),
      ),
    )
  ).flat();

  return {
    claimReward: json.claimReward,
    autoclaimDigests,
  };
};
