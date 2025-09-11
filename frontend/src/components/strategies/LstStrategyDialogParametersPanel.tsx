import { useMemo } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { NORMALIZED_SUI_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";
import { cn } from "@/lib/utils";

interface LstStrategyDialogParametersPanelProps {
  strategyType: StrategyType;
}

export default function LstStrategyDialogParametersPanel({
  strategyType,
}: LstStrategyDialogParametersPanelProps) {
  const { appData } = useLoadedAppContext();

  const {
    isLearnMoreOpen,
    setIsLearnMoreOpen,

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

  return (
    <>
      <div className="flex flex-col gap-3 md:-m-4 md:overflow-y-auto md:p-4">
        {/* Learn more */}
        <div className="flex w-full flex-col gap-4">
          {/* How does it work? */}
          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>How does it work?</TBodySans>
            <TLabelSans>
              The following flowchart explains how the{" "}
              {strategyInfo.header.title} {strategyInfo.header.type} strategy
              works:
            </TLabelSans>

            <div className="flex w-full min-w-[250px] flex-col gap-0 pt-1">
              {/* Top */}
              <div className="relative z-[2] flex h-[160px] w-full flex-row gap-0">
                {/* Base (left) */}
                {depositReserves.base !== undefined && (
                  <div className="relative h-full w-20">
                    <div className="absolute inset-y-4 left-10 w-px border-l border-dashed border-muted" />

                    {/* Base (left-top) */}
                    <div
                      className={cn(
                        "absolute left-10 top-4",
                        "flex h-0 w-0 flex-row items-center justify-center",
                      )}
                    >
                      <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                        <TokenLogo
                          token={depositReserves.base.token}
                          size={20}
                        />
                        <TBody>{depositReserves.base.token.symbol}</TBody>
                      </div>
                    </div>

                    {/* Borrow (left-bottom) */}
                    <div
                      className={cn(
                        "absolute bottom-4 left-10",
                        "flex h-0 w-0 flex-row items-center justify-center",
                      )}
                    >
                      <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                        <TBody className="w-max uppercase">Borrow</TBody>
                      </div>

                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-popover pb-0.5">
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )}

                {/* LST/SUI Looping (right) */}
                <div className="relative h-full flex-1">
                  <div className="absolute inset-x-10 inset-y-4 rounded-[16px] border border-dashed border-muted" />

                  {/* LST (center-top) */}
                  <div
                    className={cn(
                      "absolute left-1/2 top-4 -translate-x-1/2",
                      "flex h-0 w-0 flex-row items-center justify-center",
                    )}
                  >
                    <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                      <TokenLogo token={depositReserves.lst.token} size={20} />
                      <TBody>{depositReserves.lst.token.symbol}</TBody>
                    </div>
                  </div>

                  {/* Borrow (right-center) */}
                  <div
                    className={cn(
                      "absolute right-10 top-1/2 -translate-y-1/2",
                      "flex h-0 w-0 flex-row items-center justify-center",
                    )}
                  >
                    <div className="flex h-8 flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                      <TBody className="w-max uppercase">Borrow</TBody>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-popover pb-0.5">
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* SUI (center-bottom) */}
                  <div
                    className={cn(
                      "absolute bottom-4 left-1/2 -translate-x-1/2",
                      "flex h-0 w-0 flex-row items-center justify-center",
                    )}
                  >
                    <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                      <TokenLogo
                        token={getToken(
                          NORMALIZED_SUI_COINTYPE,
                          appData.coinMetadataMap[NORMALIZED_SUI_COINTYPE],
                        )}
                        size={20}
                      />
                      <TBody>SUI</TBody>
                    </div>

                    {depositReserves.base !== undefined && (
                      <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-popover pt-0.5">
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Stake (left-center) */}
                  <div
                    className={cn(
                      "absolute left-10 top-1/2 -translate-y-1/2",
                      "flex h-0 w-0 flex-row items-center justify-center",
                    )}
                  >
                    <div className="flex h-8 flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                      <TBody className="w-max uppercase">Stake</TBody>
                    </div>

                    <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-popover pt-0.5">
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom */}
              {depositReserves.base !== undefined && (
                <div className="relative z-[1] flex h-[40px] w-full flex-row gap-0">
                  {/* Left */}
                  <div className="relative h-full w-20">
                    <div className="absolute inset-y-0 left-10 right-0 rounded-bl-[16px] border border-r-0 border-t-0 border-dashed border-muted" />
                  </div>

                  {/* Right */}
                  <div className="relative h-full flex-1">
                    <div className="absolute inset-y-0 left-0 right-1/2 rounded-br-[16px] border border-l-0 border-t-0 border-dashed border-muted" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>How do I manage or claim rewards?</TBodySans>
            <TLabelSans>
              {
                {
                  [StrategyType.sSUI_SUI_LOOPING]:
                    "sSUI rewards (from depositing sSUI, and borrowing SUI)",
                  [StrategyType.stratSUI_SUI_LOOPING]:
                    "STRAT rewards (from depositing stratSUI) and sSUI rewards (from borrowing SUI)",
                  [StrategyType.USDC_sSUI_SUI_LOOPING]:
                    "sSUI rewards (from borrowing SUI)",
                  [StrategyType.AUSD_sSUI_SUI_LOOPING]:
                    "sSUI rewards (from depositing AUSD, and borrowing SUI)",
                }[strategyType]
              }{" "}
              are autoclaimed and redeposited every 2 weeks.
              <br />
              <br />
              You can also claim them manually at any time by clicking the{" "}
              {`"Claim rewards"`} button.
            </TLabelSans>
          </div>
        </div>
      </div>
    </>
  );
}
