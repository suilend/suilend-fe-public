import { useCallback, useEffect, useRef, useState } from "react";

import BigNumber from "bignumber.js";

import { ParsedObligation } from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";

const useHistoricalTvlSuiAmountMap = (
  strategyType: StrategyType,
  obligation?: ParsedObligation,
) => {
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
    getStepMaxWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getDepositedSuiAmount,
    getBorrowedSuiAmount,
    getTvlSuiAmount,
    getHistoricalTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedLstStrategyContext();

  // Stats
  // Stats - TVL
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // Stats - Historical TVL
  const [historicalTvlSuiAmountMap, setHistoricalTvlSuiAmountMap] = useState<
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
          : historicalTvlSuiAmount;

      setHistoricalTvlSuiAmountMap((prev) => ({
        ...prev,
        [obligation!.id]: result,
      }));
    } catch (err) {
      console.error(err);
    }
  }, [getHistoricalTvlSuiAmount, strategyType, obligation]);

  const hasFetchedHistoricalTvlSuiAmountMapRef = useRef<
    Record<string, boolean>
  >({});
  useEffect(() => {
    if (!obligation) return;

    if (hasFetchedHistoricalTvlSuiAmountMapRef.current[obligation.id]) return;
    hasFetchedHistoricalTvlSuiAmountMapRef.current[obligation.id] = true;

    fetchHistoricalTvlSuiAmount();
  }, [obligation, fetchHistoricalTvlSuiAmount]);

  return { historicalTvlSuiAmountMap };
};

export default useHistoricalTvlSuiAmountMap;
