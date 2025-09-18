import { useCallback, useEffect, useRef, useState } from "react";

import BigNumber from "bignumber.js";

import { ParsedObligation } from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";

const useHistoricalTvlAmountMap = (
  strategyType: StrategyType,
  obligation?: ParsedObligation,
) => {
  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getBorrowReserve,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxBorrowedAmount,
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

  // Stats
  // Stats - Historical TVL
  const [historicalTvlAmountMap, setHistoricalTvlAmountMap] = useState<
    Record<string, BigNumber | undefined>
  >({});

  const fetchHistoricalTvlAmount = useCallback(async () => {
    try {
      const historicalTvlAmount = await getHistoricalTvlAmount(
        strategyType,
        obligation,
      );
      const result =
        historicalTvlAmount === undefined ? undefined : historicalTvlAmount;

      setHistoricalTvlAmountMap((prev) => ({
        ...prev,
        [obligation!.id]: result,
      }));
    } catch (err) {
      console.error(err);
    }
  }, [getHistoricalTvlAmount, strategyType, obligation]);

  const hasFetchedHistoricalTvlAmountMapRef = useRef<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    if (!obligation) return;

    if (hasFetchedHistoricalTvlAmountMapRef.current[obligation.id]) return;
    hasFetchedHistoricalTvlAmountMapRef.current[obligation.id] = true;

    fetchHistoricalTvlAmount();
  }, [obligation, fetchHistoricalTvlAmount]);

  return { historicalTvlAmountMap };
};

export default useHistoricalTvlAmountMap;
