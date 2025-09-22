import { useMemo } from "react";

import { Info } from "lucide-react";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { getToken } from "@suilend/sui-fe";

import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";

interface StrategyHeaderProps {
  strategyType: StrategyType;
}

export default function StrategyHeader({ strategyType }: StrategyHeaderProps) {
  const { allAppData } = useLoadedAppContext();

  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

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
  const borrowReserve = useMemo(
    () => getBorrowReserve(strategyType),
    [getBorrowReserve, strategyType],
  );
  const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

  //
  //
  //

  return (
    <div className="flex h-10 flex-row items-center gap-3">
      <TokenLogos
        tokens={strategyInfo.header.coinTypes.map((coinType) =>
          getToken(coinType, appDataMainMarket.coinMetadataMap[coinType]),
        )}
        size={28}
      />

      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <TBody>{strategyInfo.header.title}</TBody>
          <Tooltip title={strategyInfo.header.tooltip}>
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Tooltip>
        </div>

        <div className="flex h-5 w-max flex-row items-center rounded-full border border-muted/25 px-2">
          <TLabelSans>{strategyInfo.header.type}</TLabelSans>
        </div>
      </div>
    </div>
  );
}
