import Head from "next/head";

import { STRATEGY_SUI_LOOPING_SSUI } from "@suilend/sdk/lib/strategyOwnerCap";

import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import SsuiStrategyCard from "@/components/strategies/SsuiStrategyCard";
import {
  SsuiStrategyContextProvider,
  useLoadedSsuiStrategyContext,
} from "@/contexts/SsuiStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

function ComingSoonStrategyCard() {
  return (
    <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm bg-card opacity-50">
      <TLabelSans>Coming soon</TLabelSans>
    </div>
  );
}

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

        {/* My positions/All strategies */}
        <div className="flex w-full flex-col gap-3">
          <TBodySans className="text-lg">
            {isObligationLooping(obligation)
              ? "My positions"
              : "All strategies"}
          </TBodySans>

          {/* Min card width: 360px */}
          <div className="grid grid-cols-1 gap-4 min-[820px]:grid-cols-2 min-[1196px]:grid-cols-3">
            <SsuiStrategyCard />
            {!isObligationLooping(obligation) && (
              <>
                <ComingSoonStrategyCard />
                <ComingSoonStrategyCard />
                <ComingSoonStrategyCard />
                <ComingSoonStrategyCard />
                <ComingSoonStrategyCard />
              </>
            )}
          </div>
        </div>

        {/* All strategies */}
        {isObligationLooping(obligation) && (
          <div className="flex w-full flex-col gap-3">
            <TBodySans className="text-lg">All strategies</TBodySans>

            {/* Min card width: 360px */}
            <div className="grid grid-cols-1 gap-4 min-[820px]:grid-cols-2 min-[1196px]:grid-cols-3">
              <ComingSoonStrategyCard />
              <ComingSoonStrategyCard />
              <ComingSoonStrategyCard />
              <ComingSoonStrategyCard />
              <ComingSoonStrategyCard />
            </div>
          </div>
        )}
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
