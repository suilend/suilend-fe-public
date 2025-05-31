import BigNumber from "bignumber.js";

import { RewardMap, getBorrowShare, getDepositShare } from "@suilend/sdk";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

export const getPointsStats = (
  coinType: string,
  rewardMap: RewardMap,
  obligations?: ParsedObligation[],
) => {
  const totalPoints = {
    deposit: new BigNumber(0),
    borrow: new BigNumber(0),
    total: new BigNumber(0),
  };
  if (obligations === undefined || obligations.length === 0)
    return { totalPoints };

  const pointsRewards = {
    deposit: Object.values(rewardMap).flatMap((rewards) =>
      rewards.deposit.filter((r) => r.stats.rewardCoinType === coinType),
    ),
    borrow: Object.values(rewardMap).flatMap((rewards) =>
      rewards.borrow.filter((r) => r.stats.rewardCoinType === coinType),
    ),
  };

  obligations.forEach((obligation) => {
    pointsRewards.deposit.forEach((reward) => {
      totalPoints.deposit = totalPoints.deposit.plus(
        reward.obligationClaims[obligation.id]?.claimableAmount ??
          new BigNumber(0),
      );
    });

    pointsRewards.borrow.forEach((reward) => {
      totalPoints.borrow = totalPoints.borrow.plus(
        reward.obligationClaims[obligation.id]?.claimableAmount ??
          new BigNumber(0),
      );
    });
  });

  totalPoints.total = totalPoints.deposit.plus(totalPoints.borrow);

  return { totalPoints };
};
