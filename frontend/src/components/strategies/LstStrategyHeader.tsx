import { useMemo } from "react";

import { Info } from "lucide-react";

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

interface LstStrategyHeaderProps {
  strategyType: StrategyType;
}

export default function LstStrategyHeader({
  strategyType,
}: LstStrategyHeaderProps) {
  const { appData } = useLoadedAppContext();

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

  //
  //
  //

  return (
    <div className="flex h-10 flex-row items-center gap-3">
      <TokenLogos
        tokens={strategyInfo.coinTypes.map((coinType) =>
          getToken(coinType, appData.coinMetadataMap[coinType]),
        )}
        size={28}
      />

      <div className="-ml-[7px] flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <TBody>{strategyInfo.title}</TBody>
          <Tooltip title={strategyInfo.tooltip}>
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Tooltip>
        </div>

        <div className="flex h-5 w-max flex-row items-center rounded-full border border-muted/25 px-2">
          <TLabelSans>{strategyInfo.type}</TLabelSans>
        </div>
      </div>
    </div>
  );
}
