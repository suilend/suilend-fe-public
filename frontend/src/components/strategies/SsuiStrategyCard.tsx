import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { STRATEGY_SUI_LOOPING_SSUI } from "@suilend/sdk";
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

    defaultExposure,

    getExposure,
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

  // Stats - TVL
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // Stats - APR
  const aprPercent = getAprPercent(obligation, defaultExposure);

  // Stats - Health
  const healthPercent = getHealthPercent(obligation, defaultExposure);

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
                  value={formatPercent(healthPercent)}
                  horizontal
                />

                <div className="h-3 w-full bg-muted/20">
                  <div
                    className="h-full w-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    style={{
                      clipPath: `polygon(${[
                        "0% 0%",
                        `${healthPercent.decimalPlaces(2)}% 0%`,
                        `${healthPercent.decimalPlaces(2)}% 100%`,
                        "0% 100%",
                      ].join(", ")}`,
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SsuiStrategyDialog>
  );
}
