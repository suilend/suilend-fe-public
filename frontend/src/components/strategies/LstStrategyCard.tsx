import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";

import { SUI_DECIMALS } from "@mysten/sui/utils";
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
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useHistoricalTvlSuiAmountMap from "@/hooks/useHistoricalTvlSuiAmountMap";
import { cn } from "@/lib/utils";

interface LstStrategyCardProps {
  strategyType: StrategyType;
}

export default function LstStrategyCard({
  strategyType,
}: LstStrategyCardProps) {
  const router = useRouter();

  const { userData } = useLoadedUserContext();

  const {
    isMoreParametersOpen,
    setIsMoreParametersOpen,

    hasPosition,

    suiReserve,
    suiBorrowFeePercent,

    getLstReserve,
    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxLstWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,

    getDepositedSuiAmount,
    getBorrowedSuiAmount,
    getTvlSuiAmount,
    getUnclaimedRewardsSuiAmount,
    getHistoricalTvlSuiAmount,
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
  const lstReserve = useMemo(
    () => getLstReserve(strategyType),
    [getLstReserve, strategyType],
  );
  const lst = useMemo(
    () => lstMap[lstReserve.coinType],
    [lstMap, lstReserve.coinType],
  );

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
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // Stats - APR
  const aprPercent = getAprPercent(strategyType, obligation, defaultExposure);

  // Stats - Realized PnL
  const { historicalTvlSuiAmountMap } = useHistoricalTvlSuiAmountMap(
    strategyType,
    obligation,
  );
  const realizedPnlSuiAmount = useMemo(
    () =>
      !!obligation && hasPosition(obligation)
        ? historicalTvlSuiAmountMap[obligation.id] === undefined
          ? undefined
          : tvlSuiAmount.minus(historicalTvlSuiAmountMap[obligation.id]!)
        : new BigNumber(0),
    [obligation, hasPosition, historicalTvlSuiAmountMap, tvlSuiAmount],
  );

  // Stats - Total PnL
  const unclaimedRewardsSuiAmount = getUnclaimedRewardsSuiAmount(obligation);

  const totalPnlSuiAmount = useMemo(
    () =>
      realizedPnlSuiAmount === undefined
        ? undefined
        : realizedPnlSuiAmount.plus(unclaimedRewardsSuiAmount),
    [realizedPnlSuiAmount, unclaimedRewardsSuiAmount],
  );

  // Stats - Exposure
  const exposure = useMemo(
    () => getExposure(obligation),
    [getExposure, obligation],
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
              value={`${formatToken(tvlSuiAmount, { exact: false })} SUI`}
              valueTooltip={`${formatToken(tvlSuiAmount, { dp: SUI_DECIMALS })} SUI`}
              horizontal
            />

            {/* Total PnL */}
            <PnlLabelWithValue
              reserve={suiReserve}
              label="Total PnL"
              labelTooltip="Total PnL is the difference between the sum of your Equity and unclaimed rewards, and the net amount deposited."
              pnlAmount={totalPnlSuiAmount}
              pnlTooltip={
                realizedPnlSuiAmount === undefined ||
                totalPnlSuiAmount === undefined ? undefined : (
                  <div className="flex flex-col gap-2">
                    {/* Realized PnL */}
                    <div className="flex flex-row items-center justify-between gap-4">
                      <TLabelSans>Realized PnL</TLabelSans>
                      <TBody
                        className={cn(
                          realizedPnlSuiAmount.gt(0) && "text-success",
                          realizedPnlSuiAmount.lt(0) && "text-destructive",
                        )}
                      >
                        {new BigNumber(realizedPnlSuiAmount).eq(0)
                          ? null
                          : new BigNumber(realizedPnlSuiAmount).gte(0)
                            ? "+"
                            : "-"}
                        {formatToken(realizedPnlSuiAmount.abs(), {
                          dp: suiReserve.token.decimals,
                        })}{" "}
                        {suiReserve.token.symbol}
                      </TBody>
                    </div>

                    {/* Unclaimed rewards */}
                    <div className="flex flex-row items-center justify-between gap-4">
                      <TLabelSans>Unclaimed rewards</TLabelSans>
                      <TBody
                        className={cn(
                          unclaimedRewardsSuiAmount.gt(0) && "text-success",
                          unclaimedRewardsSuiAmount.lt(0) && "text-destructive",
                        )}
                      >
                        {new BigNumber(unclaimedRewardsSuiAmount).eq(0)
                          ? null
                          : new BigNumber(unclaimedRewardsSuiAmount).gte(0)
                            ? "+"
                            : "-"}
                        {formatToken(unclaimedRewardsSuiAmount.abs(), {
                          dp: suiReserve.token.decimals,
                        })}{" "}
                        {suiReserve.token.symbol}
                      </TBody>
                    </div>

                    <Separator />

                    {/* Total PnL */}
                    <div className="flex flex-row items-center justify-between gap-4">
                      <TLabelSans>Total PnL</TLabelSans>
                      <TBody
                        className={cn(
                          totalPnlSuiAmount.gt(0) && "text-success",
                          totalPnlSuiAmount.lt(0) && "text-destructive",
                        )}
                      >
                        {new BigNumber(totalPnlSuiAmount).eq(0)
                          ? null
                          : new BigNumber(totalPnlSuiAmount).gte(0)
                            ? "+"
                            : "-"}
                        {formatToken(totalPnlSuiAmount.abs(), {
                          dp: suiReserve.token.decimals,
                        })}{" "}
                        {suiReserve.token.symbol}
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
