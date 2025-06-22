import BigNumber from "bignumber.js";
import { capitalize } from "lodash";
import { v4 as uuidv4 } from "uuid";

import {
  AprRewardSummary,
  NORMALIZED_TREATS_COINTYPE,
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
import {
  NORMALIZED_LBTC_COINTYPE,
  NORMALIZED_flSUI_COINTYPE,
  NORMALIZED_jugSUI_COINTYPE,
  formatPercent,
  formatPoints,
  formatPrice,
  formatToken,
  isSendPoints,
} from "@suilend/sui-fe";

import AprRewardsBreakdownRow from "@/components/dashboard/AprRewardsBreakdownRow";
import FromToArrow from "@/components/shared/FromToArrow";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";
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
    coinType === "LIQ_AG"
      ? formatPoints(_value, { dp: 3 })
      : isSendPoints(coinType)
        ? formatPoints(_value, { dp: 3 })
        : formatToken(_value, { exact: false });

  return showChange && (newValue === undefined || !newValue.eq(value)) ? (
    <>
      {formatter(value)}
      <FromToArrow />
      {newValue === undefined ? "N/A" : formatter(newValue)}
    </>
  ) : (
    formatter(value)
  );
};

const formatAprPercent = (
  showChange: boolean,
  value: BigNumber,
  newValue?: BigNumber,
  stakingYieldAprPercent?: BigNumber,
) =>
  showChange && (newValue === undefined || !newValue.eq(value)) ? (
    <>
      {formatPercent(value, { useAccountingSign: true })}
      {stakingYieldAprPercent && "*"}
      <FromToArrow />
      {newValue === undefined ? (
        "N/A"
      ) : (
        <>
          {formatPercent(newValue, { useAccountingSign: true })}
          {stakingYieldAprPercent && "*"}
        </>
      )}
    </>
  ) : (
    <>
      {formatPercent(value, { useAccountingSign: true })}
      {stakingYieldAprPercent && "*"}
    </>
  );

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
  const { allAppData } = useLoadedAppContext();
  const { userData } = useLoadedUserContext();

  const rewards = userData.rewardMap[reserve.coinType]?.[side] ?? [];
  const filteredRewards = getFilteredRewards(rewards);
  if (side === Side.DEPOSIT) {
    if (
      [NORMALIZED_flSUI_COINTYPE, NORMALIZED_jugSUI_COINTYPE].includes(
        reserve.coinType,
      )
    )
      filteredRewards.push({
        stats: {
          id: uuidv4(),
          isActive: true,
          rewardIndex: -1, // Not used
          reserve,
          rewardCoinType: "LIQ_AG",
          mintDecimals: 0, // Not used
          symbol: "LiqAg Points",
          iconUrl: `${ASSETS_URL}/partners/LiqAg.png`,
          perDay: new BigNumber(0.036),
          side: Side.DEPOSIT,
        },
        obligationClaims: {},
      });
    if (reserve.coinType === NORMALIZED_LBTC_COINTYPE)
      filteredRewards.push({
        stats: {
          id: uuidv4(),
          isActive: true,
          rewardIndex: -1, // Not used
          reserve,
          rewardCoinType: "LOMBARD",
          mintDecimals: 0, // Not used
          symbol: "3x Lombard Lux",
          iconUrl: `${ASSETS_URL}/partners/Lombard Lux.png`,
          perDay: new BigNumber(0), // Not used, but must be defined
          side: Side.DEPOSIT,
        },
        obligationClaims: {},
      });
  }

  const stakingYieldAprPercent = getStakingYieldAprPercent(
    side,
    reserve.coinType,
    allAppData.lstAprPercentMap,
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

    // Assumes LM rewards are distributed proportionally to the reserve size
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

  return (
    <div>
      <Tooltip
        contentProps={{
          className: "px-4 py-4 flex-col flex gap-4 min-w-[280px]",
          style: { maxWidth: "max-content" },
        }}
        content={
          filteredRewards.length > 0 || stakingYieldAprPercent ? (
            <>
              {/* Title */}
              {filteredRewards.length > 0 && (
                <TLabelSans>
                  {capitalize(side)} {reserve.symbol}
                  {" and earn "}
                  {[
                    perDayRewards.length > 0 ? "points" : null,
                    perDayRewards.length > 0 && aprRewards.length > 0
                      ? "&"
                      : null,
                    aprRewards.length > 0 ? "rewards" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </TLabelSans>
              )}

              {/* Points */}
              {perDayRewards.length > 0 && (
                <div className="flex flex-col gap-2">
                  <TBodySans>Points</TBodySans>

                  {perDayRewards.map((reward, index) => (
                    <AprRewardsBreakdownRow
                      key={index}
                      isLast={index === perDayRewards.length - 1}
                      value={
                        reserve.coinType === NORMALIZED_LBTC_COINTYPE &&
                        reward.stats.rewardCoinType ===
                          "LOMBARD" ? undefined : (
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
                        )
                      }
                    >
                      <TokenLogo
                        token={{
                          coinType: reward.stats.rewardCoinType,
                          decimals: reward.stats.mintDecimals,
                          description: "",
                          iconUrl: reward.stats.iconUrl,
                          id: "",
                          name: "",
                          symbol: reward.stats.symbol,
                        }}
                        size={16}
                      />
                      <TLabelSans>{reward.stats.symbol}</TLabelSans>
                    </AprRewardsBreakdownRow>
                  ))}
                </div>
              )}

              {/* APR */}
              <div className="flex flex-col gap-2">
                {/* Total APR */}
                <div className="flex flex-row items-center justify-between gap-4">
                  <TBodySans>{capitalize(side)} APR</TBodySans>
                  <TBody className="font-bold">
                    {formatAprPercent(
                      showChange,
                      totalAprPercent,
                      newTotalAprPercent,
                    )}
                  </TBody>
                </div>

                {/* Interest */}
                <AprRewardsBreakdownRow
                  isLast={!stakingYieldAprPercent && aprRewards.length === 0}
                  value={formatAprPercent(
                    showChange,
                    aprPercent,
                    newAprPercent,
                  )}
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
                        {/* {reserve.coinType === NORMALIZED_LBTC_COINTYPE &&
                          reward.stats.rewardCoinType ===
                            NORMALIZED_DEEP_COINTYPE && (
                            <>
                              <br />
                              <span className="font-sans text-muted-foreground">
                                DEEP rewards will be distributed
                                <br /> directly to users once a day
                              </span>
                            </>
                          )} */}
                      </>
                    }
                  >
                    <TLabelSans>Rewards in</TLabelSans>
                    <TokenLogo
                      token={{
                        coinType: reward.stats.rewardCoinType,
                        decimals: reward.stats.mintDecimals,
                        description: "",
                        iconUrl: reward.stats.iconUrl,
                        id: "",
                        name: "",
                        symbol: reward.stats.symbol,
                      }}
                      size={16}
                    />
                    <TLabelSans>{reward.stats.symbol}</TLabelSans>
                  </AprRewardsBreakdownRow>
                ))}
              </div>
            </>
          ) : undefined
        }
      >
        <div className="relative flex flex-row items-center gap-1.5">
          <TokenLogos
            tokens={[...perDayRewards, ...aprRewards].map((reward) => ({
              coinType: reward.stats.rewardCoinType,
              decimals: reward.stats.mintDecimals,
              description: "",
              iconUrl: reward.stats.iconUrl,
              id: "",
              name: "",
              symbol: reward.stats.symbol,
            }))}
            size={16}
          />

          <TBody
            className={cn(
              filteredRewards.length > 0
                ? cn(
                    "text-primary-foreground decoration-primary-foreground/50",
                    hoverUnderlineClassName,
                  )
                : stakingYieldAprPercent
                  ? cn(
                      "text-foreground decoration-foreground/50",
                      hoverUnderlineClassName,
                    )
                  : null,
            )}
          >
            {formatAprPercent(
              showChange,
              totalAprPercent,
              newTotalAprPercent,
              stakingYieldAprPercent,
            )}
          </TBody>
        </div>
      </Tooltip>
    </div>
  );
}
