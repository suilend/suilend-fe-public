import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import {
  NORMALIZED_BETA_SEND_POINTS_COINTYPE,
  RewardMap,
  getBorrowShare,
  getDepositShare,
} from "@suilend/frontend-sui";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

export const roundPoints = (value: BigNumber) =>
  value.decimalPlaces(0, BigNumber.ROUND_HALF_UP);

export const getPointsStats = (
  rewardMap: RewardMap,
  obligations?: ParsedObligation[],
) => {
  const totalPoints = {
    deposit: new BigNumber(0),
    borrow: new BigNumber(0),
    total: new BigNumber(0),
  };
  const pointsPerDay = {
    deposit: new BigNumber(0),
    borrow: new BigNumber(0),
    total: new BigNumber(0),
  };
  if (obligations === undefined || obligations.length === 0)
    return { totalPoints, pointsPerDay };

  const pointsRewards = {
    deposit: Object.values(rewardMap).flatMap((rewards) =>
      rewards.deposit.filter(
        (r) =>
          normalizeStructTag(r.stats.rewardCoinType) ===
          NORMALIZED_BETA_SEND_POINTS_COINTYPE, // TODO
      ),
    ),
    borrow: Object.values(rewardMap).flatMap((rewards) =>
      rewards.borrow.filter(
        (r) =>
          normalizeStructTag(r.stats.rewardCoinType) ===
          NORMALIZED_BETA_SEND_POINTS_COINTYPE, // TODO
      ),
    ),
  };

  obligations.forEach((obligation) => {
    pointsRewards.deposit.forEach((reward) => {
      const deposit = obligation.deposits.find(
        (d) => d.coinType === reward.stats.reserve.coinType,
      );

      totalPoints.deposit = totalPoints.deposit.plus(
        reward.obligationClaims[obligation.id]?.claimableAmount ??
          new BigNumber(0),
      );

      if (deposit && reward.stats.isActive) {
        pointsPerDay.deposit = pointsPerDay.deposit.plus(
          getDepositShare(
            reward.stats.reserve,
            new BigNumber(deposit.userRewardManager.share.toString()),
          ).times(reward.stats.perDay ?? new BigNumber(0)),
        );
      }
    });

    pointsRewards.borrow.forEach((reward) => {
      const borrow = obligation.borrows.find(
        (b) => b.coinType === reward.stats.reserve.coinType,
      );

      totalPoints.borrow = totalPoints.borrow.plus(
        reward.obligationClaims[obligation.id]?.claimableAmount ??
          new BigNumber(0),
      );

      if (borrow && reward.stats.isActive) {
        pointsPerDay.borrow = pointsPerDay.borrow.plus(
          getBorrowShare(
            reward.stats.reserve,
            new BigNumber(borrow.userRewardManager.share.toString()),
          ).times(reward.stats.perDay ?? new BigNumber(0)),
        );
      }
    });
  });

  totalPoints.total = totalPoints.deposit.plus(totalPoints.borrow);
  pointsPerDay.total = pointsPerDay.deposit.plus(pointsPerDay.borrow);

  return { totalPoints, pointsPerDay };
};
