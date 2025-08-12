import Head from "next/head";

import { ParsedObligation, StrategyOwnerCap } from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import StrategyCard from "@/components/strategies/SsuiStrategyCard";
import StrategyDialog from "@/components/strategies/SsuiStrategyDialog";
import {
  LstStrategyContextProvider,
  useLoadedLstStrategyContext,
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

    getHistoricalTvlSuiAmount,
    getTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedLstStrategyContext();

  // Obligations
  const strategyOwnerCapObligationMap: Record<
    StrategyType,
    { strategyOwnerCap: StrategyOwnerCap; obligation: ParsedObligation }
  > = Object.values(StrategyType).reduce(
    (acc, strategyType) => {
      const strategyOwnerCap: StrategyOwnerCap | undefined =
        userData.strategyOwnerCaps.find(
          (soc) => soc.strategyType === strategyType,
        );
      const obligation: ParsedObligation | undefined =
        userData.strategyObligations.find(
          (so) => so.id === strategyOwnerCap?.obligationId,
        );
      if (!strategyOwnerCap || !obligation) return acc;

      return {
        ...acc,
        [strategyType]: { strategyOwnerCap, obligation },
      };
    },
    {} as Record<
      StrategyType,
      { strategyOwnerCap: StrategyOwnerCap; obligation: ParsedObligation }
    >,
  );

  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      {Object.values(StrategyType).map((strategyType) => (
        <StrategyDialog key={strategyType} strategyType={strategyType} />
      ))}

      <div className="flex w-full flex-col gap-6">
        <TBodySans className="text-xl">Strategies</TBodySans>

        {/* My positions */}
        {Object.values(strategyOwnerCapObligationMap).some(({ obligation }) =>
          hasPosition(obligation),
        ) && (
          <div className="flex w-full flex-col gap-3">
            <TBodySans className="text-lg">My positions</TBodySans>

            {/* Min card width: 400px */}
            <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
              {Object.values(StrategyType).map((strategyType) => {
                const obligation =
                  strategyOwnerCapObligationMap[strategyType as StrategyType]
                    ?.obligation;

                if (!obligation || !hasPosition(obligation)) return null;
                return (
                  <StrategyCard
                    key={strategyType}
                    strategyType={strategyType as StrategyType}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* All strategies */}
        <div className="flex w-full flex-col gap-3">
          <TBodySans className="text-lg">All strategies</TBodySans>

          {/* Min card width: 400px */}
          <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
            {Object.values(StrategyType).map((strategyType) => {
              const obligation =
                strategyOwnerCapObligationMap[strategyType as StrategyType]
                  ?.obligation;

              if (!obligation || !hasPosition(obligation))
                return (
                  <StrategyCard
                    key={strategyType}
                    strategyType={strategyType as StrategyType}
                  />
                );
              return null;
            })}

            <ComingSoonStrategyCard />
            <ComingSoonStrategyCard />
            <ComingSoonStrategyCard />
            <ComingSoonStrategyCard />
          </div>
        </div>
      </div>
    </>
  );
}

export default function Strategies() {
  return (
    <LstStrategyContextProvider>
      <Page />
    </LstStrategyContextProvider>
  );
}
