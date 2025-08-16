import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { formatPercent } from "@suilend/sui-fe";

import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";

interface LstStrategyDialogParametersPanelProps {
  strategyType: StrategyType;
}

export default function LstStrategyDialogParametersPanel({
  strategyType,
}: LstStrategyDialogParametersPanelProps) {
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
    getUnclaimedRewardsSuiAmount,
    getHistoricalTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedLstStrategyContext();

  return (
    <>
      <div className="flex flex-col gap-3 md:-m-4 md:overflow-y-auto md:p-4">
        {/* Learn more */}
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>Where does the yield come from? </TBodySans>
            <TLabelSans>
              Yield comes from{" "}
              <span className="font-medium">staking yield</span> plus additional{" "}
              {
                {
                  [StrategyType.sSUI_SUI_LOOPING]: "sSUI",
                  [StrategyType.stratSUI_SUI_LOOPING]: "STRAT and sSUI",
                }[strategyType]
              }{" "}
              rewards.
              <br />
              <br />
              By borrowing SUI against your{" "}
              {
                {
                  [StrategyType.sSUI_SUI_LOOPING]: "sSUI",
                  [StrategyType.stratSUI_SUI_LOOPING]: "stratSUI",
                }[strategyType]
              }{" "}
              and looping, you increase your exposure to both.
              <br />
              <br />
              Example: <span className="font-medium">
                3x leverage ≈ 3x
              </span>{" "}
              staking yield (minus borrowing costs and fees).
            </TLabelSans>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>How does it work?</TBodySans>
            <TLabelSans>
              The {STRATEGY_TYPE_INFO_MAP[strategyType].title}{" "}
              {STRATEGY_TYPE_INFO_MAP[strategyType].type} strategy works as
              follows:
              <br />
              <br />
              1. <span className="font-medium">Deposit</span> SUI (auto-staked
              to{" "}
              {
                appData.coinMetadataMap[
                  STRATEGY_TYPE_INFO_MAP[strategyType].lstCoinType
                ].symbol
              }
              )<br />
              2. <span className="font-medium">Adjust</span> leverage (up to{" "}
              {exposureMap[strategyType].max.toFixed(1)}x)
              <br />
              3. <span className="font-medium">Withdraw</span> anytime
              <br />
              <br />
              All actions are managed through an easy UI. The strategy takes
              care of the LST minting, borrowing, and unstaking behind the
              scenes.
            </TLabelSans>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>Are there any fees?</TBodySans>
            <TLabelSans>
              The {STRATEGY_TYPE_INFO_MAP[strategyType].title}{" "}
              {STRATEGY_TYPE_INFO_MAP[strategyType].type} strategy is currently
              almost free to run.
              <br />
              <br />
              - No borrow fees on Suilend
              <br />- No asset management fees
              <br />
              -The only cost incurred is a{" "}
              {formatPercent(
                lstMap[STRATEGY_TYPE_INFO_MAP[strategyType].lstCoinType]
                  .redeemFeePercent,
              )}{" "}
              unstake fee when converting{" "}
              {
                appData.coinMetadataMap[
                  STRATEGY_TYPE_INFO_MAP[strategyType].lstCoinType
                ].symbol
              }{" "}
              back to SUI when you withdraw funds.
              <br />
              <br />
              All applicable fees are shown in the UI.
            </TLabelSans>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>How do I manage or claim rewards?</TBodySans>
            <TLabelSans>
              {
                {
                  [StrategyType.sSUI_SUI_LOOPING]: "sSUI",
                  [StrategyType.stratSUI_SUI_LOOPING]: "STRAT and sSUI",
                }[strategyType]
              }{" "}
              rewards are auto-claimed and re-deposited every 2 weeks.
            </TLabelSans>
          </div>

          <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
            <TBodySans>
              What are the risks associated with this strategy?
            </TBodySans>
            <TLabelSans>
              - No oracle risk: The SUI Pyth price feed is used for both assets,
              as individual feeds for SUI derivative assets are less reliable.
              Using a unified SUI price feed avoids oracle issues that have
              occurred in the past (eg. mSOL on Solana).
            </TLabelSans>
          </div>
        </div>
      </div>
    </>
  );
}
