import { useCallback, useEffect, useRef, useState } from "react";

import BigNumber from "bignumber.js";

import { ParsedObligation } from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";

const usePnlSuiAmountMap = (
  strategyType: StrategyType,
  obligation?: ParsedObligation,
) => {
  const {
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

    getTvlSuiAmount,
    getHistoricalTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedLstStrategyContext();

  // Stats
  // Stats - TVL
  const tvlSuiAmount = getTvlSuiAmount(strategyType, obligation);

  // Stats - PnL
  const [pnlSuiAmountMap, setPnlSuiAmountMap] = useState<
    Record<string, BigNumber | undefined>
  >({});

  const fetchHistoricalTvlSuiAmount = useCallback(async () => {
    try {
      const historicalTvlSuiAmount = await getHistoricalTvlSuiAmount(
        strategyType,
        obligation,
      );
      const result =
        historicalTvlSuiAmount === undefined
          ? undefined
          : tvlSuiAmount.minus(historicalTvlSuiAmount);

      setPnlSuiAmountMap((prev) => ({
        ...prev,
        [obligation!.id]: result,
      }));
    } catch (err) {
      console.error(err);
    }
  }, [getHistoricalTvlSuiAmount, strategyType, obligation, tvlSuiAmount]);

  const hasFetchedHistoricalTvlSuiAmountMapRef = useRef<
    Record<string, boolean>
  >({});
  useEffect(() => {
    if (!obligation) return;

    if (hasFetchedHistoricalTvlSuiAmountMapRef.current[obligation.id]) return;
    hasFetchedHistoricalTvlSuiAmountMapRef.current[obligation.id] = true;

    fetchHistoricalTvlSuiAmount();
  }, [obligation, fetchHistoricalTvlSuiAmount]);

  return { pnlSuiAmountMap };
};

export default usePnlSuiAmountMap;
