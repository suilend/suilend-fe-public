import { SUI_DECIMALS } from "@mysten/sui/utils";

import { formatPercent, formatToken } from "@suilend/sui-fe";

import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import SsuiStrategyDialog from "@/components/strategies/SsuiStrategyDialog";
import SsuiSuiStrategyHeader from "@/components/strategies/SsuiSuiStrategyHeader";
import { Separator } from "@/components/ui/separator";
import { useSsuiStrategyContext } from "@/contexts/SsuiStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function SsuiStrategyCard() {
  const { userData } = useLoadedUserContext();

  const {
    isObligationLooping,
    getTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useSsuiStrategyContext();

  // Obligation
  const OBLIGATION_ID =
    "0xf8dfef417a82155d5cbf485c4e7e061ff11dc1ddfa1370c6a46f0d7dfe4017f0";
  const obligation = userData.obligations.find((o) => o.id === OBLIGATION_ID);

  // Stats - TVL
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // Stats - APR
  const aprPercent = getAprPercent(obligation);

  // Stats - Health
  const healthPercent = getHealthPercent(obligation);

  return (
    <SsuiStrategyDialog>
      <div className="flex w-full cursor-pointer flex-col gap-4 rounded-sm border bg-card p-4 transition-colors hover:bg-muted/10">
        <div className="flex w-full flex-row justify-between">
          {/* Left */}
          <SsuiSuiStrategyHeader />

          {/* Right */}
          <div className="flex flex-row justify-end gap-6">
            {tvlSuiAmount.gt(0) && (
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

        {/* Health */}
        {isObligationLooping(obligation) && (
          <>
            <Separator />

            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full flex-row items-center justify-between gap-2">
                <TLabelSans>Health</TLabelSans>
                <TBody>{formatPercent(healthPercent)}</TBody>
              </div>

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
          </>
        )}
      </div>
    </SsuiStrategyDialog>
  );
}
