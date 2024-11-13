import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";

import { issSui } from "@suilend/frontend-sui";
import { WAD } from "@suilend/sdk/constants";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedPoolReward, ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Side } from "@suilend/sdk/types";

import { msPerYear } from "@/lib/constants";

export type RewardMap = {
  [coinType: string]: {
    deposit: RewardSummary[];
    borrow: RewardSummary[];
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
  obligations?: ParsedObligation[],
) => {
  const currentTime = new Date().getTime();
  const rewardMap: RewardMap = {};

  const getRewardSummary = (
    reserve: ParsedReserve,
    poolReward: ParsedPoolReward,
    side: Side,
  ) => {
    const rewardReserve = parsedReserveMap[poolReward.coinType];
    const rewardCoinMetadata = coinMetadataMap[poolReward.coinType];

    const isActive =
      currentTime >= poolReward.startTimeMs &&
      currentTime < poolReward.endTimeMs;

    const aprPercent = rewardReserve
      ? poolReward.totalRewards
          .times(rewardReserve.price)
          .times(
            new BigNumber(msPerYear).div(
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
    const perDay = rewardReserve
      ? undefined
      : poolReward.totalRewards
          .times(
            new BigNumber(msPerYear).div(
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
        price: rewardReserve?.price,
        symbol: rewardCoinMetadata.symbol,
        iconUrl: rewardCoinMetadata.iconUrl,
        aprPercent,
        perDay,
        side,
      },
      obligationClaims: Object.fromEntries(
        (obligations
          ?.map((ob) => {
            const claim = getObligationClaims(
              ob,
              poolReward,
              side === Side.DEPOSIT
                ? reserve.depositsPoolRewardManager.id
                : reserve.borrowsPoolRewardManager.id,
              reserve.arrayIndex,
            );
            if (!claim) {
              return undefined;
            }
            return [ob.id, claim];
          })
          .filter(Boolean) as [string, ObligationClaim][]) ?? [],
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
      deposit: depositRewards,
      borrow: borrowRewards,
    };
  });

  return rewardMap;
};

const getObligationClaims = (
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
    // TODO: earnedRewards is refreshed via simulate.ts to only show unclaimed rewards.
    // Lifetime earned amount is not available right yet as a result.
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

const getRewardsAprPercent = (side: Side, filteredRewards: RewardSummary[]) =>
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
) => {
  const aprPercentWeightedDepositedAmountUsd = obligation.deposits.reduce(
    (acc, deposit) => {
      const baseAprPercentWeightedDepositedAmountUsd =
        deposit.reserve.depositAprPercent.times(deposit.depositedAmountUsd);
      const rewardsAprPercentWeightedDepositedAmountUsd = getRewardsAprPercent(
        Side.DEPOSIT,
        getFilteredRewards(rewardMap[deposit.reserve.coinType].deposit),
      ).times(
        getDepositShareUsd(
          deposit.reserve,
          new BigNumber(deposit.userRewardManager.share.toString()),
        ),
      );

      return acc
        .plus(baseAprPercentWeightedDepositedAmountUsd)
        .plus(rewardsAprPercentWeightedDepositedAmountUsd);
    },
    new BigNumber(0),
  );

  const aprPercentWeightedBorrowedAmountUsd = obligation.borrows.reduce(
    (acc, borrow) => {
      const baseAprPercentWeightedBorrowedAmountUsd =
        borrow.reserve.borrowAprPercent.times(borrow.borrowedAmountUsd);
      const rewardsAprPercentWeightedBorrowedAmountUsd = getRewardsAprPercent(
        Side.BORROW,
        getFilteredRewards(rewardMap[borrow.reserve.coinType].borrow),
      ).times(
        getBorrowShareUsd(
          borrow.reserve,
          new BigNumber(borrow.userRewardManager.share.toString()),
        ),
      );

      return acc
        .plus(baseAprPercentWeightedBorrowedAmountUsd)
        .plus(rewardsAprPercentWeightedBorrowedAmountUsd);
    },
    new BigNumber(0),
  );

  const aprPercentWeightedNetValueUsd =
    aprPercentWeightedDepositedAmountUsd.minus(
      aprPercentWeightedBorrowedAmountUsd,
    );
  return !obligation.netValueUsd.eq(0)
    ? aprPercentWeightedNetValueUsd.div(obligation.netValueUsd)
    : new BigNumber(0);
};
