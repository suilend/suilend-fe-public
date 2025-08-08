import Head from "next/head";

import { STRATEGY_SUI_LOOPING_SSUI } from "@suilend/sdk/lib/strategyOwnerCap";

import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import SsuiStrategyCard from "@/components/strategies/SsuiStrategyCard";
import {
  SsuiStrategyContextProvider,
  useLoadedSsuiStrategyContext,
} from "@/contexts/SsuiStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

function Page() {
  const { userData } = useLoadedUserContext();

  const {
    isObligationLooping,

    suiReserve,
    sSuiReserve,
    minExposure,
    maxExposure,
    defaultExposure,

    lstClient,
    suiBorrowFeePercent,
    suiToSsuiExchangeRate,
    sSuiToSuiExchangeRate,

    getSsuiMintFee,
    getSsuiRedeemFee,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxSsuiWithdrawnAmount,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,

    getHistoricalTvlSuiAmount,
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

  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <TBodySans className="text-xl">Strategies</TBodySans>

        {/* Positions */}
        {isObligationLooping(obligation) && (
          <div className="flex w-full flex-col gap-3">
            <TBodySans className="text-lg">My positions</TBodySans>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isObligationLooping(obligation) && <SsuiStrategyCard />}
            </div>
          </div>
        )}

        {/* All strategies */}
        <div className="flex w-full flex-col gap-3">
          <TBodySans className="text-lg">All strategies</TBodySans>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {!isObligationLooping(obligation) ? (
              <SsuiStrategyCard />
            ) : (
              <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
                <TLabelSans>Coming soon</TLabelSans>
              </div>
            )}

            <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
              <TLabelSans>Coming soon</TLabelSans>
            </div>
            <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
              <TLabelSans>Coming soon</TLabelSans>
            </div>
            <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
              <TLabelSans>Coming soon</TLabelSans>
            </div>
            <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
              <TLabelSans>Coming soon</TLabelSans>
            </div>
            <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
              <TLabelSans>Coming soon</TLabelSans>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Strategies() {
  return (
    <SsuiStrategyContextProvider>
      <Page />
    </SsuiStrategyContextProvider>
  );
}
