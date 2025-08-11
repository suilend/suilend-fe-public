import { useCallback, useEffect, useRef, useState } from "react";

import { ParsedObligation } from "@suilend/sdk";

import { useLoadedSsuiStrategyContext } from "@/contexts/SsuiStrategyContext";

const usePnlSuiAmountMap = (obligation?: ParsedObligation) => {
  const { getHistoricalTvlSuiAmount, getTvlSuiAmount } =
    useLoadedSsuiStrategyContext();

  // TVL
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // PnL
  const [pnlSuiAmountMap, setPnlSuiAmountMap] = useState<
    Record<string, BigNumber | undefined>
  >({});

  const fetchHistoricalTvlSuiAmount = useCallback(async () => {
    try {
      const historicalTvlSuiAmount =
        await getHistoricalTvlSuiAmount(obligation);
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
  }, [getHistoricalTvlSuiAmount, obligation, tvlSuiAmount]);

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
