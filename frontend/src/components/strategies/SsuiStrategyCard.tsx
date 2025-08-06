import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import Color from "colorjs.io";

import { STRATEGY_SUI_LOOPING_SSUI } from "@suilend/sdk/lib/strategyOwnerCap";
import { formatPercent, formatToken } from "@suilend/sui-fe";

import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import SsuiStrategyDialog from "@/components/strategies/SsuiStrategyDialog";
import SsuiSuiStrategyHeader from "@/components/strategies/SsuiSuiStrategyHeader";
import { Separator } from "@/components/ui/separator";
import { useLoadedSsuiStrategyContext } from "@/contexts/SsuiStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function SsuiStrategyCard() {
  const { userData } = useLoadedUserContext();

  const {
    isObligationLooping,

    suiReserve,
    sSuiReserve,
    minExposure,
    maxExposure,
    defaultExposure,

    lstClient,
    suiBorrowFeePercent,
    suiToSsuiExchangeRate,
    sSuiToSuiExchangeRate,

    getSsuiMintFee,
    getSsuiRedeemFee,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxSsuiWithdrawnAmount,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,

    getHistoricalTvlSuiAmount,
    getTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedSsuiStrategyContext();

  // Obligation
  const strategyOwnerCap = userData.strategyOwnerCaps.find(
    (soc) => soc.strategyType === STRATEGY_SUI_LOOPING_SSUI,
  );
  const obligation = userData.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Stats - Historical TVL (TODO)
  const [historicalTvlSuiAmountMap, setHistoricalTvlSuiAmountMap] = useState<
    Record<string, BigNumber | undefined>
  >({});
  const historicalTvlSuiAmount = useMemo(
    () =>
      !obligation ? new BigNumber(0) : historicalTvlSuiAmountMap[obligation.id],
    [obligation, historicalTvlSuiAmountMap],
  );
  // console.log("XXX historicalTvlSuiAmount:", +historicalTvlSuiAmount);

  const fetchHistoricalTvlSuiAmount = useCallback(async () => {
    try {
      const amount = await getHistoricalTvlSuiAmount(obligation);

      setHistoricalTvlSuiAmountMap((prev) => ({
        ...prev,
        [obligation!.id]: amount,
      }));
    } catch (err) {
      console.error(err);
    }
  }, [getHistoricalTvlSuiAmount, obligation]);

  const hasFetchedHistoricalTvlSuiAmountMapRef = useRef<
    Record<string, boolean>
  >({});
  useEffect(() => {
    if (!obligation) return;

    if (hasFetchedHistoricalTvlSuiAmountMapRef.current[obligation.id]) return;
    hasFetchedHistoricalTvlSuiAmountMapRef.current[obligation.id] = true;

    fetchHistoricalTvlSuiAmount();
  }, [obligation, fetchHistoricalTvlSuiAmount]);

  // Stats - TVL
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // Stats - APR
  const aprPercent = getAprPercent(obligation, defaultExposure);

  // Stats - Health
  const healthPercent = getHealthPercent(obligation, defaultExposure);
  const healthColorRange = new Color("#ef4444").range("#22c55e"); // red-500 -> green-500

  return (
    <SsuiStrategyDialog>
      <div className="flex w-full cursor-pointer flex-col gap-4 rounded-sm border bg-card p-4 transition-colors hover:bg-muted/10">
        <div className="flex w-full flex-row justify-between">
          {/* Left */}
          <SsuiSuiStrategyHeader />

          {/* Right */}
          <div className="flex flex-row justify-end gap-6">
            {isObligationLooping(obligation) && (
              <div className="flex w-fit flex-col items-end gap-1">
                <TLabelSans>Deposited</TLabelSans>
                <Tooltip
                  title={`${formatToken(tvlSuiAmount, { dp: SUI_DECIMALS })} SUI`}
                >
                  <TBody className="text-right">
                    {formatToken(tvlSuiAmount, { exact: false })} SUI
                  </TBody>
                </Tooltip>
              </div>
            )}

            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>APR</TLabelSans>
              <TBody className="text-right">{formatPercent(aprPercent)}</TBody>
            </div>
          </div>
        </div>

        {isObligationLooping(obligation) && (
          <>
            <Separator />

            <div className="flex w-full flex-col gap-4">
              {/* Exposure */}
              <LabelWithValue
                label="Leverage"
                value={`${getExposure(
                  obligation!.deposits[0].depositedAmount,
                  obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
                ).toFixed(1)}x`}
                valueTooltip={`${getExposure(
                  obligation!.deposits[0].depositedAmount,
                  obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
                ).toFixed(6)}x`}
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
                      className="h-[16px] w-[2px] rounded-sm bg-muted/20"
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
    </SsuiStrategyDialog>
  );
}
