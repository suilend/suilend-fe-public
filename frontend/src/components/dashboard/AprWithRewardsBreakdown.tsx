import BigNumber from "bignumber.js";
import { capitalize } from "lodash";

import {
  NORMALIZED_TREATS_COINTYPE,
  isSendPoints,
} from "@suilend/frontend-sui";
import {
  AprRewardSummary,
  PerDayRewardSummary,
  getDedupedAprRewards,
  getDedupedPerDayRewards,
  getFilteredRewards,
  getStakingYieldAprPercent,
  getTotalAprPercent,
} from "@suilend/sdk";
import { Action, Side } from "@suilend/sdk/lib/types";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { linearlyInterpolate } from "@suilend/sdk/utils";

import AprRewardsBreakdownRow from "@/components/dashboard/AprRewardsBreakdownRow";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  formatPercent,
  formatPoints,
  formatPrice,
  formatToken,
} from "@/lib/format";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

const calculateUtilizationPercent = (reserve: ParsedReserve) =>
  reserve.depositedAmount.eq(0)
    ? new BigNumber(0)
    : reserve.borrowedAmount.div(reserve.depositedAmount).times(100);

const calculateBorrowAprPercent = (reserve: ParsedReserve) => {
  const utilizationPercent = calculateUtilizationPercent(reserve);

  if (utilizationPercent.gt(100)) return undefined;
  return linearlyInterpolate(
    reserve.config.interestRate,
    "utilPercent",
    "aprPercent",
    utilizationPercent,
  );
};

const calculateDepositAprPercent = (reserve: ParsedReserve) => {
  const utilizationPercent = calculateUtilizationPercent(reserve);
  const borrowAprPercent = calculateBorrowAprPercent(reserve);

  if (borrowAprPercent === undefined || utilizationPercent.gt(100))
    return undefined;
  return new BigNumber(utilizationPercent.div(100))
    .times(borrowAprPercent.div(100))
    .times(1 - reserve.config.spreadFeeBps / 10000)
    .times(100);
};

const formatPerDay = (
  coinType: string,
  showChange: boolean,
  value: BigNumber,
  newValue?: BigNumber,
) => {
  const formatter = (_value: BigNumber) =>
    isSendPoints(coinType)
      ? formatPoints(_value, { dp: 3 })
      : formatToken(_value, { exact: false });

  return showChange && (newValue === undefined || !newValue.eq(value))
    ? [
        formatter(value),
        "→",
        newValue === undefined ? "N/A" : formatter(newValue),
      ].join(" ")
    : formatter(value);
};

const formatAprPercent = (
  showChange: boolean,
  value: BigNumber,
  newValue?: BigNumber,
) =>
  showChange && (newValue === undefined || !newValue.eq(value))
    ? [
        formatPercent(value, { useAccountingSign: true }),
        "→",
        newValue === undefined
          ? "N/A"
          : formatPercent(newValue, { useAccountingSign: true }),
      ].join(" ")
    : formatPercent(value, { useAccountingSign: true });

interface AprWithRewardsBreakdownProps {
  side: Side;
  reserve: ParsedReserve;
  action?: Action;
  changeAmount?: BigNumber;
}

export default function AprWithRewardsBreakdown({
  side,
  reserve,
  action,
  changeAmount,
}: AprWithRewardsBreakdownProps) {
  const { data } = useLoadedAppContext();

  const rewards = data.rewardMap[reserve.coinType]?.[side] ?? [];
  const filteredRewards = getFilteredRewards(rewards);

  const stakingYieldAprPercent = getStakingYieldAprPercent(
    side,
    reserve,
    data.lstAprPercentMap,
  );

  const aprPercent =
    side === Side.DEPOSIT
      ? reserve.depositAprPercent
      : reserve.borrowAprPercent;
  let newAprPercent: BigNumber | undefined = aprPercent;

  let rewardsAprMultiplier = new BigNumber(1);
  let isRewardsAprMultiplierValid = true;

  const showChange =
    action !== undefined && changeAmount !== undefined && changeAmount.gt(0);
  if (showChange) {
    const newReserve = {
      ...reserve,
      depositedAmount:
        side === Side.DEPOSIT
          ? BigNumber.max(
              reserve.depositedAmount.plus(
                action === Action.DEPOSIT
                  ? changeAmount
                  : changeAmount.negated(),
              ),
              0,
            )
          : reserve.depositedAmount,
      borrowedAmount:
        side === Side.BORROW
          ? BigNumber.max(
              reserve.borrowedAmount.plus(
                action === Action.BORROW
                  ? changeAmount
                  : changeAmount.negated(),
              ),
              0,
            )
          : reserve.borrowedAmount,
    };
    newAprPercent =
      side === Side.DEPOSIT
        ? calculateDepositAprPercent(newReserve)
        : calculateBorrowAprPercent(newReserve);

    const totalAmount =
      side === Side.DEPOSIT ? reserve.depositedAmount : reserve.borrowedAmount;
    const newTotalAmount =
      side === Side.DEPOSIT
        ? newReserve.depositedAmount
        : newReserve.borrowedAmount;

    // Assumes LM rewards are distributed proportionally to the pool size
    rewardsAprMultiplier = newTotalAmount.eq(0)
      ? new BigNumber(-1)
      : totalAmount.div(newTotalAmount);
    isRewardsAprMultiplierValid = !rewardsAprMultiplier.eq(-1);
  }

  // Per day rewards
  const perDayRewards = getDedupedPerDayRewards(filteredRewards);
  const newPerDayRewards = perDayRewards.map((r) => ({
    ...r,
    stats: {
      ...r.stats,
      perDay: isRewardsAprMultiplierValid
        ? r.stats.perDay.times(rewardsAprMultiplier)
        : undefined,
    },
  })) as PerDayRewardSummary[];

  // APR rewards
  const aprRewards = getDedupedAprRewards(filteredRewards);
  const newAprRewards = aprRewards.map((r) => ({
    ...r,
    stats: {
      ...r.stats,
      aprPercent: isRewardsAprMultiplierValid
        ? r.stats.aprPercent.times(rewardsAprMultiplier)
        : undefined,
    },
  })) as AprRewardSummary[];

  // Total APR
  const totalAprPercent = getTotalAprPercent(
    side,
    aprPercent,
    filteredRewards,
    stakingYieldAprPercent,
  );
  const newTotalAprPercent =
    newAprPercent === undefined ||
    newAprRewards.some((reward) => reward.stats.aprPercent === undefined)
      ? undefined
      : getTotalAprPercent(
          side,
          newAprPercent,
          newAprRewards,
          stakingYieldAprPercent,
        );

  if (filteredRewards.length === 0 && !stakingYieldAprPercent)
    return (
      <TBody>
        {formatAprPercent(showChange, totalAprPercent, newTotalAprPercent)}
      </TBody>
    );
  return (
    <div>
      <Tooltip
        contentProps={{
          className: "px-4 py-4 flex-col flex gap-4 min-w-[280px]",
          style: { maxWidth: "max-content" },
        }}
        content={
          <>
            {filteredRewards.length > 0 && (
              <TLabelSans>
                {capitalize(side)} {reserve.symbol}
                {" and earn "}
                {perDayRewards.length > 0 && (
                  <>points{aprRewards.length > 0 && " & "}</>
                )}
                {aprRewards.length > 0 && "rewards"}
              </TLabelSans>
            )}

            {perDayRewards.length > 0 && (
              <div className="flex flex-col gap-2">
                <TBodySans>Points</TBodySans>

                {perDayRewards.map((reward, index) => (
                  <AprRewardsBreakdownRow
                    key={index}
                    isLast={index === perDayRewards.length - 1}
                    value={
                      <>
                        {formatPerDay(
                          reward.stats.rewardCoinType,
                          showChange,
                          reward.stats.perDay,
                          newPerDayRewards[index].stats.perDay,
                        )}
                        <br />
                        <span className="font-sans text-muted-foreground">
                          {"Per "}
                          {reserve.symbol}
                          {" per day"}
                        </span>
                      </>
                    }
                  >
                    <TokenLogo
                      className="h-4 w-4"
                      token={{
                        coinType: reward.stats.rewardCoinType,
                        symbol: reward.stats.symbol,
                        iconUrl: reward.stats.iconUrl,
                      }}
                    />
                    <TLabelSans>{reward.stats.symbol}</TLabelSans>
                  </AprRewardsBreakdownRow>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between gap-4">
                <TBodySans>{capitalize(side)} APR</TBodySans>
                <TBody>
                  {formatAprPercent(
                    showChange,
                    totalAprPercent,
                    newTotalAprPercent,
                  )}
                </TBody>
              </div>

              {/* Interest */}
              <AprRewardsBreakdownRow
                isLast={aprRewards.length === 0 && !stakingYieldAprPercent}
                value={formatAprPercent(showChange, aprPercent, newAprPercent)}
              >
                <TLabelSans>Interest</TLabelSans>
              </AprRewardsBreakdownRow>

              {/* Staking yield */}
              {stakingYieldAprPercent && (
                <AprRewardsBreakdownRow
                  isLast={aprRewards.length === 0}
                  value={formatAprPercent(false, stakingYieldAprPercent)}
                >
                  <TLabelSans>Staking yield*</TLabelSans>
                </AprRewardsBreakdownRow>
              )}

              {/* Apr rewards */}
              {aprRewards.map((reward, index) => (
                <AprRewardsBreakdownRow
                  key={index}
                  isLast={index === aprRewards.length - 1}
                  value={
                    <>
                      {formatAprPercent(
                        showChange,
                        reward.stats.aprPercent.times(
                          side === Side.DEPOSIT ? 1 : -1,
                        ),
                        newAprRewards[index].stats.aprPercent !== undefined
                          ? newAprRewards[index].stats.aprPercent.times(
                              side === Side.DEPOSIT ? 1 : -1,
                            )
                          : undefined,
                      )}
                      {reward.stats.rewardCoinType ===
                        NORMALIZED_TREATS_COINTYPE && (
                        <>
                          <br />
                          <span className="font-sans text-muted-foreground">
                            at {formatPrice(reward.stats.price)}/
                            {reward.stats.symbol}
                          </span>
                        </>
                      )}
                    </>
                  }
                >
                  <TLabelSans>Rewards in</TLabelSans>
                  <TokenLogo
                    className="h-4 w-4"
                    token={{
                      coinType: reward.stats.rewardCoinType,
                      symbol: reward.stats.symbol,
                      iconUrl: reward.stats.iconUrl,
                    }}
                  />
                  <TLabelSans>{reward.stats.symbol}</TLabelSans>
                </AprRewardsBreakdownRow>
              ))}
            </div>
          </>
        }
      >
        <div className="relative flex flex-row items-center">
          <TokenLogos
            className="h-4 w-4"
            tokens={[...perDayRewards, ...aprRewards].map((reward) => ({
              coinType: reward.stats.rewardCoinType,
              symbol: reward.stats.symbol,
              iconUrl: reward.stats.iconUrl,
            }))}
          />

          <TBody
            className={cn(
              "ml-1.5 text-primary-foreground decoration-primary-foreground/50",
              hoverUnderlineClassName,
            )}
          >
            {formatAprPercent(showChange, totalAprPercent, newTotalAprPercent)}
            {stakingYieldAprPercent && "*"}
          </TBody>
        </div>
      </Tooltip>
    </div>
  );
}
