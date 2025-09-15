import { useRouter } from "next/router";
import { useCallback, useMemo, useRef } from "react";

import BigNumber from "bignumber.js";
import Color from "colorjs.io";

import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { formatPercent, formatToken, formatUsd } from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";

import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { QueryParams as LstStrategyDialogQueryParams } from "@/components/strategies/LstStrategyDialog";
import PnlLabelWithValue from "@/components/strategies/PnlLabelWithValue";
import StrategyHeader from "@/components/strategies/StrategyHeader";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useHistoricalTvlAmountMap from "@/hooks/useHistoricalTvlAmountMap";
import { ASSETS_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  strategyType: StrategyType;
}

export default function StrategyCard({ strategyType }: StrategyCardProps) {
  const router = useRouter();

  const { userData } = useLoadedUserContext();

  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,
    suiBorrowFeePercent,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxWithdrawnAmount,

    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getGlobalTvlAmountUsd,
    getUnclaimedRewardsAmount,
    getHistory,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
  } = useLoadedLstStrategyContext();

  // Strategy
  const strategyInfo = useMemo(
    () => STRATEGY_TYPE_INFO_MAP[strategyType],
    [strategyType],
  );

  const minExposure = useMemo(
    () => exposureMap[strategyType].min,
    [strategyType, exposureMap],
  );
  const maxExposure = useMemo(
    () => exposureMap[strategyType].max,
    [strategyType, exposureMap],
  );
  const defaultExposure = useMemo(
    () => exposureMap[strategyType].default,
    [strategyType, exposureMap],
  );

  // Reserves
  const depositReserves = useMemo(
    () => getDepositReserves(strategyType),
    [getDepositReserves, strategyType],
  );
  const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

  // Open
  const openLstStrategyDialog = useCallback(() => {
    shallowPushQuery(router, {
      ...router.query,
      [LstStrategyDialogQueryParams.STRATEGY_NAME]: strategyInfo.queryParam,
    });
  }, [router, strategyInfo.queryParam]);

  //
  //
  //

  // Obligation
  const strategyOwnerCap = userData.strategyOwnerCaps.find(
    (soc) => soc.strategyType === strategyType,
  );
  const obligation = userData.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Stats
  // Stats - Global TVL
  const globalTvlAmountUsd = getGlobalTvlAmountUsd(strategyType);

  // Stats - TVL
  const tvlAmount = getTvlAmount(strategyType, obligation);
  const tvlAmountSnapshotRef = useRef<BigNumber>(tvlAmount);

  // Stats - APR
  const aprPercent = getAprPercent(strategyType, obligation, maxExposure);

  // Stats - Unclaimed rewards
  const unclaimedRewardsAmountSnapshotRef = useRef<BigNumber>(
    getUnclaimedRewardsAmount(strategyType, obligation),
  );

  // Stats - Realized PnL
  const { historicalTvlAmountMap } = useHistoricalTvlAmountMap(
    strategyType,
    obligation,
  );
  const historicalTvlAmount = useMemo(
    () =>
      !obligation || !hasPosition(obligation)
        ? undefined
        : historicalTvlAmountMap[obligation.id],
    [obligation, hasPosition, historicalTvlAmountMap],
  );

  const realizedPnlAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    return historicalTvlAmount === undefined
      ? undefined
      : tvlAmountSnapshotRef.current.minus(historicalTvlAmount);
  }, [obligation, hasPosition, historicalTvlAmount]);

  // Stats - Total PnL
  const totalPnlAmount = useMemo(
    () =>
      realizedPnlAmount === undefined
        ? undefined
        : realizedPnlAmount.plus(unclaimedRewardsAmountSnapshotRef.current),
    [realizedPnlAmount],
  );

  // Stats - Exposure
  const exposure = useMemo(
    () => getExposure(strategyType, obligation),
    [getExposure, strategyType, obligation],
  );

  // Stats - Health
  const healthPercent = getHealthPercent(
    strategyType,
    obligation,
    defaultExposure,
  );
  const healthColorRange = new Color("#ef4444").range("#22c55e"); // red-500 -> green-500

  return (
    <div
      className="group relative w-full cursor-pointer rounded-[4px] bg-gradient-to-tr from-border via-border to-[#457AE4] p-[1px]"
      onClick={openLstStrategyDialog}
    >
      <div className="relative z-[3] flex flex-col gap-4 rounded-[3px] p-4">
        <div className="flex w-full flex-row justify-between">
          {/* Left */}
          <StrategyHeader strategyType={strategyType} />

          {/* Right */}
          <div className="flex flex-row justify-end gap-6">
            {/* Global TVL */}
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>TVL</TLabelSans>
              {globalTvlAmountUsd === undefined ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <Tooltip
                  title={
                    globalTvlAmountUsd !== null
                      ? formatUsd(globalTvlAmountUsd, { exact: true })
                      : undefined
                  }
                >
                  <TBody className="text-right">
                    {globalTvlAmountUsd !== null
                      ? formatUsd(globalTvlAmountUsd)
                      : "--"}
                  </TBody>
                </Tooltip>
              )}
            </div>

            {/* APR/Max APR */}
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>
                {!!obligation && hasPosition(obligation) ? "APR" : "Max APR"}
              </TLabelSans>
              <TBody className="text-right">{formatPercent(aprPercent)}</TBody>
            </div>
          </div>
        </div>

        {!!obligation && hasPosition(obligation) && (
          <>
            <Separator className="bg-gradient-to-r from-border via-border to-[#457AE4]" />

            <div className="flex w-full flex-col gap-3">
              {/* Equity */}
              <LabelWithValue
                label="Equity"
                labelTooltip={
                  <>
                    Equity is calculated as the sum of the net amount deposited,
                    deposit interest, LST staking yield (if applicable), and
                    claimed rewards, minus borrow interest.
                    <br />
                    <span className="mt-2 block">
                      Equity does not include unclaimed rewards.
                    </span>
                  </>
                }
                value="0"
                horizontal
                customChild={
                  <div className="flex flex-row items-baseline gap-2">
                    <Tooltip
                      title={`${formatUsd(
                        tvlAmount.times(defaultCurrencyReserve.price),
                        { exact: true },
                      )}`}
                    >
                      <TLabel>
                        {formatUsd(
                          tvlAmount.times(defaultCurrencyReserve.price),
                        )}
                      </TLabel>
                    </Tooltip>

                    <Tooltip
                      title={`${formatToken(tvlAmount, {
                        dp: defaultCurrencyReserve.token.decimals,
                      })} ${defaultCurrencyReserve.token.symbol}`}
                    >
                      <TBody>
                        {formatToken(tvlAmount, { exact: false })}{" "}
                        {defaultCurrencyReserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>
                }
              />

              {/* Total PnL */}
              <PnlLabelWithValue
                reserve={defaultCurrencyReserve}
                label="Total PnL"
                labelTooltip="Total PnL is the difference between the sum of your Equity and unclaimed rewards, and the net amount deposited."
                pnlAmount={totalPnlAmount}
                pnlTooltip={
                  realizedPnlAmount === undefined ||
                  totalPnlAmount === undefined ? undefined : (
                    <div className="flex flex-col gap-2">
                      {/* Realized PnL */}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>Realized PnL</TLabelSans>
                        <TBody
                          className={cn(
                            realizedPnlAmount.gt(0) && "text-success",
                            realizedPnlAmount.lt(0) && "text-destructive",
                          )}
                        >
                          {new BigNumber(realizedPnlAmount).eq(0)
                            ? null
                            : new BigNumber(realizedPnlAmount).gte(0)
                              ? "+"
                              : "-"}
                          {formatToken(realizedPnlAmount.abs(), {
                            dp: defaultCurrencyReserve.token.decimals,
                          })}{" "}
                          {defaultCurrencyReserve.token.symbol}
                        </TBody>
                      </div>

                      {/* Unclaimed rewards */}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>Unclaimed rewards</TLabelSans>
                        <TBody
                          className={cn(
                            unclaimedRewardsAmountSnapshotRef.current.gt(0) &&
                              "text-success",
                            unclaimedRewardsAmountSnapshotRef.current.lt(0) &&
                              "text-destructive",
                          )}
                        >
                          {new BigNumber(
                            unclaimedRewardsAmountSnapshotRef.current,
                          ).eq(0)
                            ? null
                            : new BigNumber(
                                  unclaimedRewardsAmountSnapshotRef.current,
                                ).gte(0)
                              ? "+"
                              : "-"}
                          {formatToken(
                            unclaimedRewardsAmountSnapshotRef.current.abs(),
                            { dp: defaultCurrencyReserve.token.decimals },
                          )}{" "}
                          {defaultCurrencyReserve.token.symbol}
                        </TBody>
                      </div>

                      <Separator />

                      {/* Total PnL */}
                      <div className="flex flex-row items-center justify-between gap-4">
                        <TLabelSans>Total PnL</TLabelSans>
                        <TBody
                          className={cn(
                            totalPnlAmount.gt(0) && "text-success",
                            totalPnlAmount.lt(0) && "text-destructive",
                          )}
                        >
                          {new BigNumber(totalPnlAmount).eq(0)
                            ? null
                            : new BigNumber(totalPnlAmount).gte(0)
                              ? "+"
                              : "-"}
                          {formatToken(totalPnlAmount.abs(), {
                            dp: defaultCurrencyReserve.token.decimals,
                          })}{" "}
                          {defaultCurrencyReserve.token.symbol}
                        </TBody>
                      </div>
                    </div>
                  )
                }
              />

              {/* Exposure */}
              <LabelWithValue
                label="Leverage"
                value={`${exposure.toFixed(1)}x`}
                valueTooltip={`${exposure.toFixed(6)}x`}
                horizontal
              />

              {/* Health */}
              <div className="flex w-full flex-col gap-2">
                <LabelWithValue
                  label="Health"
                  value={formatPercent(healthPercent, { dp: 0 })}
                  horizontal
                />

                <div className="flex w-full flex-row justify-between">
                  {Array.from({ length: 50 + 1 }).map((_, i, arr) => (
                    <div
                      key={i}
                      className="h-[16px] w-[max(0.5%,2px)] rounded-sm bg-muted/20"
                      style={{
                        backgroundColor: healthPercent.gte(
                          i * (100 / (arr.length - 1)),
                        )
                          ? healthColorRange(i / (arr.length - 1)).toString()
                          : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className="absolute inset-px z-[2] rounded-[3px] opacity-40 transition-opacity group-hover:opacity-50"
        style={{
          backgroundImage: `url('${ASSETS_URL}/strategies/card-bg.png')`,
          backgroundPosition: "top right",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute inset-px z-[1] rounded-[3px] bg-card" />
    </div>
  );
}
