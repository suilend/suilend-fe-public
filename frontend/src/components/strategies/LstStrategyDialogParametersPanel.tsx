import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";

interface LstStrategyDialogParametersPanelProps {
  strategyType: StrategyType;
}

export default function LstStrategyDialogParametersPanel({
  strategyType,
}: LstStrategyDialogParametersPanelProps) {
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

    getUnclaimedRewardsAmount,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
  } = useLoadedLstStrategyContext();

  return (
    <>
      <div className="flex flex-col gap-3 md:-m-4 md:overflow-y-auto md:p-4">
        {/* Learn more */}
        <div className="flex w-full flex-col gap-4">
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
                }[strategyType]
              }{" "}
              are auto-claimed and redeposited every 2 weeks.
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
