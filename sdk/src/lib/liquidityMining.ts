import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";

import { MS_PER_YEAR } from "@suilend/frontend-sui";

import { ParsedObligation, ParsedPoolReward, ParsedReserve } from "../parsers";

import { WAD } from "./constants";
import { Side } from "./types";

export type RewardMap = {
  [coinType: string]: {
    [Side.DEPOSIT]: RewardSummary[];
    [Side.BORROW]: RewardSummary[];
  };
};

type ObligationClaim = {
  claimableAmount: BigNumber;
  reserveArrayIndex: bigint;
};

export type RewardSummary = {
  stats: {
    id: string;
    isActive: boolean;
    rewardIndex: number;
    reserve: ParsedReserve;
    rewardCoinType: string;
    mintDecimals: number;
    price?: BigNumber;
    symbol: string;
    iconUrl?: string | null;
    aprPercent?: BigNumber;
    perDay?: BigNumber;
    side: Side;
  };
  obligationClaims: {
    [obligationId: string]: ObligationClaim;
  };
};

export type AprRewardSummary = Omit<RewardSummary, "stats"> & {
  stats: RewardSummary["stats"] & {
    aprPercent: BigNumber;
    price: BigNumber;
  };
};

export type PerDayRewardSummary = Omit<RewardSummary, "stats"> & {
  stats: RewardSummary["stats"] & {
    perDay: BigNumber;
  };
};

export const getDepositShare = (reserve: ParsedReserve, share: BigNumber) =>
  share.div(10 ** reserve.mintDecimals).times(reserve.cTokenExchangeRate);
const getDepositShareUsd = (reserve: ParsedReserve, share: BigNumber) =>
  getDepositShare(reserve, share).times(reserve.price);

export const getBorrowShare = (reserve: ParsedReserve, share: BigNumber) =>
  share.div(10 ** reserve.mintDecimals).times(reserve.cumulativeBorrowRate);
const getBorrowShareUsd = (reserve: ParsedReserve, share: BigNumber) =>
  getBorrowShare(reserve, share).times(reserve.price);

export const formatRewards = (
  parsedReserveMap: Record<string, ParsedReserve>,
  coinMetadataMap: Record<string, CoinMetadata>,
  priceMap: Record<string, BigNumber | undefined>,
  obligations?: ParsedObligation[],
) => {
  const nowMs = Date.now();
  const rewardMap: RewardMap = {};

  const getRewardSummary = (
    reserve: ParsedReserve,
    poolReward: ParsedPoolReward,
    side: Side,
  ) => {
    const rewardCoinMetadata = coinMetadataMap[poolReward.coinType];
    const rewardPrice = priceMap?.[poolReward.coinType];

    const isActive =
      nowMs >= poolReward.startTimeMs && nowMs < poolReward.endTimeMs;

    const aprPercent = rewardPrice
      ? poolReward.totalRewards
          .times(rewardPrice)
          .times(
            new BigNumber(MS_PER_YEAR).div(
              poolReward.endTimeMs - poolReward.startTimeMs,
            ),
          )
          .div(
            side === Side.DEPOSIT
              ? getDepositShareUsd(
                  reserve,
                  new BigNumber(
                    reserve.depositsPoolRewardManager.totalShares.toString(),
                  ),
                )
              : getBorrowShareUsd(
                  reserve,
                  new BigNumber(
                    reserve.borrowsPoolRewardManager.totalShares.toString(),
                  ),
                ),
          )
          .times(100)
      : undefined;
    const perDay = rewardPrice
      ? undefined
      : poolReward.totalRewards
          .times(
            new BigNumber(MS_PER_YEAR).div(
              poolReward.endTimeMs - poolReward.startTimeMs,
            ),
          )
          .div(365)
          .div(
            side === Side.DEPOSIT
              ? getDepositShare(
                  reserve,
                  new BigNumber(
                    reserve.depositsPoolRewardManager.totalShares.toString(),
                  ),
                )
              : getBorrowShare(
                  reserve,
                  new BigNumber(
                    reserve.borrowsPoolRewardManager.totalShares.toString(),
                  ),
                ),
          );

    return {
      stats: {
        id: poolReward.id,
        isActive,
        rewardIndex: poolReward.rewardIndex,
        reserve,
        rewardCoinType: poolReward.coinType,
        mintDecimals: poolReward.mintDecimals,
        price: rewardPrice,
        symbol: rewardCoinMetadata.symbol,
        iconUrl: rewardCoinMetadata.iconUrl,
        aprPercent,
        perDay,
        side,
      },
      obligationClaims: Object.fromEntries(
        (obligations ?? [])
          .map((obligation) => {
            const claim = getObligationClaim(
              obligation,
              poolReward,
              side === Side.DEPOSIT
                ? reserve.depositsPoolRewardManager.id
                : reserve.borrowsPoolRewardManager.id,
              reserve.arrayIndex,
            );
            if (!claim) return undefined;

            return [obligation.id, claim];
          })
          .filter(Boolean) as [string, ObligationClaim][],
      ),
    };
  };

  Object.values(parsedReserveMap).forEach((reserve) => {
    const depositRewards = reserve.depositsPoolRewardManager.poolRewards.map(
      (poolReward) => getRewardSummary(reserve, poolReward, Side.DEPOSIT),
    ) as RewardSummary[];

    const borrowRewards = reserve.borrowsPoolRewardManager.poolRewards.map(
      (poolReward) => getRewardSummary(reserve, poolReward, Side.BORROW),
    ) as RewardSummary[];

    rewardMap[reserve.coinType] = {
      [Side.DEPOSIT]: depositRewards,
      [Side.BORROW]: borrowRewards,
    };
  });

  return rewardMap;
};

const getObligationClaim = (
  obligation: ParsedObligation,
  poolReward: ParsedPoolReward,
  reservePoolManagerId: string,
  reserveArrayIndex: bigint,
) => {
  const userRewardManager = obligation.original.userRewardManagers.find(
    (urm) => urm.poolRewardManagerId === reservePoolManagerId,
  );
  if (!userRewardManager) return;

  const userReward = userRewardManager.rewards[poolReward.rewardIndex];
  if (!userReward) return;

  return {
    claimableAmount: userReward?.earnedRewards
      ? new BigNumber(userReward.earnedRewards.value.toString())
          .div(WAD)
          .div(10 ** poolReward.mintDecimals)
      : new BigNumber(0),
    reserveArrayIndex,
  };
};

export const getFilteredRewards = (rewards: RewardSummary[]): RewardSummary[] =>
  rewards.filter((r) => r.stats.isActive);

export const getDedupedAprRewards = (
  filteredRewards: RewardSummary[],
): AprRewardSummary[] => {
  const aprRewards = filteredRewards.filter(
    (r) => r.stats.aprPercent !== undefined,
  ) as AprRewardSummary[];

  const result: AprRewardSummary[] = [];
  for (const reward of aprRewards) {
    const index = result.findIndex(
      (r) => r.stats.rewardCoinType === reward.stats.rewardCoinType,
    );

    if (index > -1) {
      result[index].stats.aprPercent = result[index].stats.aprPercent.plus(
        reward.stats.aprPercent,
      );
    } else result.push(cloneDeep(reward));
  }

  return result;
};

export const getDedupedPerDayRewards = (
  filteredRewards: RewardSummary[],
): PerDayRewardSummary[] => {
  const perDayRewards = filteredRewards.filter(
    (r) => r.stats.perDay !== undefined,
  ) as PerDayRewardSummary[];

  const result: PerDayRewardSummary[] = [];
  for (const reward of perDayRewards) {
    const index = result.findIndex(
      (r) => r.stats.rewardCoinType === reward.stats.rewardCoinType,
    );

    if (index > -1) {
      result[index].stats.perDay = result[index].stats.perDay.plus(
        reward.stats.perDay,
      );
    } else result.push(cloneDeep(reward));
  }

  return result;
};

export const getRewardsAprPercent = (
  side: Side,
  filteredRewards: RewardSummary[],
) =>
  getDedupedAprRewards(filteredRewards).reduce(
    (acc, reward) =>
      acc.plus(reward.stats.aprPercent.times(side === Side.DEPOSIT ? 1 : -1)),
    new BigNumber(0),
  );

export const getStakingYieldAprPercent = (
  side: Side,
  reserve: ParsedReserve,
  lstAprPercentMap: Record<string, BigNumber>,
) => (side === Side.DEPOSIT ? lstAprPercentMap[reserve.coinType] : undefined);

export const getTotalAprPercent = (
  side: Side,
  aprPercent: BigNumber,
  filteredRewards: RewardSummary[],
  stakingYieldAprPercent?: BigNumber,
) =>
  aprPercent
    .plus(getRewardsAprPercent(side, filteredRewards))
    .plus(stakingYieldAprPercent ?? 0);

export const getNetAprPercent = (
  obligation: ParsedObligation,
  rewardMap: RewardMap,
  lstAprPercentMap: Record<string, BigNumber>,
) => {
  const weightedDepositedAmountUsd_aprPercent = obligation.deposits.reduce(
    (acc, deposit) => {
      const weightedDepositedAmountUsd_baseAprPercent =
        deposit.reserve.depositAprPercent.times(deposit.depositedAmountUsd);
      const weightedDepositedAmountUsd_stakingYieldAprPercent = new BigNumber(
        getStakingYieldAprPercent(
          Side.DEPOSIT,
          deposit.reserve,
          lstAprPercentMap,
        ) ?? 0,
      ).times(deposit.depositedAmountUsd);

      const weightedDepositedAmountUsd_rewardsAprPercent = getRewardsAprPercent(
        Side.DEPOSIT,
        getFilteredRewards(rewardMap[deposit.reserve.coinType].deposit),
      ).times(
        getDepositShareUsd(
          deposit.reserve,
          new BigNumber(deposit.userRewardManager.share.toString()),
        ),
      );

      return acc
        .plus(weightedDepositedAmountUsd_baseAprPercent)
        .plus(weightedDepositedAmountUsd_stakingYieldAprPercent)
        .plus(weightedDepositedAmountUsd_rewardsAprPercent);
    },
    new BigNumber(0),
  );

  const weightedBorrowedAmountUsd_aprPercent = obligation.borrows.reduce(
    (acc, borrow) => {
      const weightedBorrowedAmountUsd_baseAprPercent =
        borrow.reserve.borrowAprPercent.times(borrow.borrowedAmountUsd);

      const weightedBorrowedAmountUsd_rewardsAprPercent = getRewardsAprPercent(
        Side.BORROW,
        getFilteredRewards(rewardMap[borrow.reserve.coinType].borrow),
      ).times(
        getBorrowShareUsd(
          borrow.reserve,
          new BigNumber(borrow.userRewardManager.share.toString()),
        ),
      );

      return acc
        .plus(weightedBorrowedAmountUsd_baseAprPercent)
        .plus(weightedBorrowedAmountUsd_rewardsAprPercent);
    },
    new BigNumber(0),
  );

  const aprPercentWeightedNetValueUsd =
    weightedDepositedAmountUsd_aprPercent.minus(
      weightedBorrowedAmountUsd_aprPercent,
    );
  return !obligation.netValueUsd.eq(0)
    ? aprPercentWeightedNetValueUsd.div(obligation.netValueUsd)
    : new BigNumber(0);
};
