import Head from "next/head";
import Link from "next/link";

import { ParsedObligation, StrategyOwnerCap } from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import TextLink from "@/components/shared/TextLink";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import LstStrategyCard from "@/components/strategies/LstStrategyCard";
import LstStrategyDialog from "@/components/strategies/LstStrategyDialog";
import {
  LstStrategyContextProvider,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

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

    getTvlSuiAmount,
    getHistoricalTvlSuiAmount,
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
        <LstStrategyDialog key={strategyType} strategyType={strategyType} />
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
                  <LstStrategyCard
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
                  <LstStrategyCard
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

        {/* Learn more */}
        <div className="flex w-full flex-col gap-3">
          <TBodySans className="text-lg">Learn more</TBodySans>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>What is SEND Strategies?</TBodySans>
              <TLabelSans>
                <span className="font-medium">SEND Strategies</span> is a new
                Suilend feature that lets you deploy into preset DeFi strategies
                in one click - turning complex, multi-step processes into a
                simple, streamlined flow.
                <br />
                <br />
                Our first strategies available:
                <br />
                <br />
                1. <span className="font-medium">sSUI/SUI</span> looping
                strategy that lets you leverage up to 3x, yielding ~11% APR from
                both SUI staking rewards and additional sSUI rewards.
                <br />
                2. <span className="font-medium">stratSUI/SUI</span> looping
                strategy that lets you leverage up to 3x, yielding both $STRAT
                rewards and SUI staking rewards.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>How do I deposit?</TBodySans>
              <TLabelSans>
                Head to{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://suilend.fi/strategies"
                  noIcon
                >
                  suilend.fi/strategies
                </TextLink>
                .
                <br />
                <br />
                In the deposit modal, enter the amount of SUI you want to
                deposit into the strategy and sign the transaction request in
                your Sui wallet.
                <br />
                <br />
                For example, the sSUI/SUI strategy applies <b>3x leverage</b> -
                for example, depositing 10 SUI gives you 30 SUI of total
                exposure.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>How do I withdraw?</TBodySans>
              <TLabelSans>
                In the withdraw modal, enter the amount of SUI you want to
                withdraw from the strategy, and sign the transaction request in
                your Sui wallet.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>What are the risks?</TBodySans>
              <TLabelSans>
                Standard DeFi risks apply here.
                <br />
                <br />• Liquidation Risk: if borrows exceed borrow power due to
                interest accruing
                <br />• Smart Contract Risk: tied to SpringSui-issued LSTs such
                as sSUI or stratSUI.
                <br />• Oracle Risk: {`doesn't`} apply here (see below).
                <br />
                <br />
                Always size your position based on your risk tolerance.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>How does Suilend mitigate risks?</TBodySans>
              <TLabelSans>TODO</TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>Do I need to manage my position?</TBodySans>
              <TLabelSans>TODO</TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border bg-card p-4">
              <TBodySans>How much leverage should I use?</TBodySans>
              <TLabelSans>
                Higher leverage boosts APR - but also increases risk.
                <br />
                <br />
                For example:
                <br />• 1.5-2x: Lower risk, moderate yield
                <br />• 2.5-3x: Higher yield, higher liquidation risk
                <br />
                <br />
                You can adjust leverage at any time through the UI.
              </TLabelSans>
            </div>
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
