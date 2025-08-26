import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

import BigNumber from "bignumber.js";
import Color from "colorjs.io";

import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { formatPercent, formatToken } from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";

import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { QueryParams as LstStrategyDialogQueryParams } from "@/components/strategies/LstStrategyDialog";
import LstStrategyHeader from "@/components/strategies/LstStrategyHeader";
import PnlLabelWithValue from "@/components/strategies/PnlLabelWithValue";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useHistoricalTvlAmountMap from "@/hooks/useHistoricalTvlAmountMap";
import { cn } from "@/lib/utils";

interface LstStrategyCardProps {
  strategyType: StrategyType;
}

export default function LstStrategyCard({
  strategyType,
}: LstStrategyCardProps) {
  const router = useRouter();

  const { appData } = useLoadedAppContext();
  const { userData } = useLoadedUserContext();

  const {
    isMoreParametersOpen,
    setIsMoreParametersOpen,

    hasPosition,

    suiReserve,
    suiBorrowFeePercent,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getDefaultCurrencyReserve,

    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getUnclaimedRewardsAmount,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
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

  // LST
  const lst = useMemo(
    () => lstMap[strategyInfo.depositLstCoinType],
    [lstMap, strategyInfo.depositLstCoinType],
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
  // Stats - TVL
  const tvlAmount = getTvlAmount(strategyType, obligation);

  // Stats - APR
  const aprPercent = getAprPercent(strategyType, obligation, defaultExposure);

  // Stats - Realized PnL
  const { historicalTvlAmountMap } = useHistoricalTvlAmountMap(
    strategyType,
    obligation,
  );
  const realizedPnlAmount = useMemo(
    () =>
      !!obligation && hasPosition(obligation)
        ? historicalTvlAmountMap[obligation.id] === undefined
          ? undefined
          : tvlAmount.minus(historicalTvlAmountMap[obligation.id]!)
        : new BigNumber(0),
    [obligation, hasPosition, historicalTvlAmountMap, tvlAmount],
  );

  // Stats - Total PnL
  const unclaimedRewardsAmount = getUnclaimedRewardsAmount(
    strategyType,
    obligation,
  );

  const totalPnlAmount = useMemo(
    () =>
      realizedPnlAmount === undefined
        ? undefined
        : realizedPnlAmount.plus(unclaimedRewardsAmount),
    [realizedPnlAmount, unclaimedRewardsAmount],
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
      className="flex w-full cursor-pointer flex-col gap-4 rounded-sm border bg-card p-4 transition-colors hover:bg-muted/10"
      onClick={openLstStrategyDialog}
    >
      <div className="flex w-full flex-row justify-between">
        {/* Left */}
        <LstStrategyHeader strategyType={strategyType} />

        {/* Right */}
        <div className="flex flex-row justify-end gap-6">
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
          <Separator />

          <div className="flex w-full flex-col gap-3">
            {/* Equity */}
            <LabelWithValue
              label="Equity"
              labelTooltip={
                <>
                  Equity is calculated as the sum of the net amount deposited,
                  deposit interest, LST staking yield, and claimed rewards,
                  minus borrow interest.
                  <br />
                  <span className="mt-2 block">
                    Equity does not include unclaimed rewards.
                  </span>
                </>
              }
              value={`${formatToken(tvlAmount, { exact: false })} ${defaultCurrencyReserve.token.symbol}`}
              valueTooltip={`${formatToken(tvlAmount, {
                dp: defaultCurrencyReserve.token.decimals,
              })} ${defaultCurrencyReserve.token.symbol}`}
              horizontal
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
                          unclaimedRewardsAmount.gt(0) && "text-success",
                          unclaimedRewardsAmount.lt(0) && "text-destructive",
                        )}
                      >
                        {new BigNumber(unclaimedRewardsAmount).eq(0)
                          ? null
                          : new BigNumber(unclaimedRewardsAmount).gte(0)
                            ? "+"
                            : "-"}
                        {formatToken(unclaimedRewardsAmount.abs(), {
                          dp: defaultCurrencyReserve.token.decimals,
                        })}{" "}
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
  );
}
