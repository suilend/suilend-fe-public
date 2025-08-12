import Head from "next/head";

import { ParsedObligation, StrategyOwnerCap } from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";
import { formatPercent } from "@suilend/sui-fe";

import TextLink from "@/components/shared/TextLink";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import LstStrategyCard from "@/components/strategies/LstStrategyCard";
import LstStrategyDialog from "@/components/strategies/LstStrategyDialog";
import {
  LstStrategyContextProvider,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

function ComingSoonStrategyCard() {
  return (
    <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm border bg-card">
      <TLabelSans>Coming soon</TLabelSans>
    </div>
  );
}

function Page() {
  const { userData } = useLoadedUserContext();

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What is SEND Strategies?</TBodySans>
              <TLabelSans>
                <span className="font-medium">SEND Strategies</span> is a new
                Suilend feature that lets you deploy into preset DeFi strategies
                in one click - turning complex, multi-step processes into a
                simple, streamlined flow.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What strategies are available?</TBodySans>
              <TLabelSans>
                1. <span className="font-medium">sSUI/SUI</span> Looping
                strategy that lets you leverage up to 3x, yielding{" "}
                {formatPercent(
                  getAprPercent(
                    StrategyType.sSUI_SUI_LOOPING,
                    undefined,
                    exposureMap[StrategyType.sSUI_SUI_LOOPING].default,
                  ),
                )}{" "}
                APR from sSUI rewards and sSUI staking yield.
                <br />
                <br />
                2. <span className="font-medium">stratSUI/SUI</span> Looping
                strategy that lets you leverage up to 3x, yielding{" "}
                {formatPercent(
                  getAprPercent(
                    StrategyType.stratSUI_SUI_LOOPING,
                    undefined,
                    exposureMap[StrategyType.stratSUI_SUI_LOOPING].default,
                  ),
                )}{" "}
                APR from STRAT and sSUI rewards, and stratSUI staking yield.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How do I deposit?</TBodySans>
              <TLabelSans>
                In the deposit modal, enter the amount of SUI you want to
                deposit into the strategy and sign the transaction request in
                your Sui wallet.
                <br />
                <br />
                After opening a position, {`you'll`} be able to deposit more
                into the strategy at any time.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How do I withdraw?</TBodySans>
              <TLabelSans>
                In the withdraw modal, enter the amount of SUI you want to
                withdraw from the strategy, and sign the transaction request in
                your Sui wallet.
                <br />
                <br />
                You can either withdraw all of your position at once by pressing
                the MAX button, or withdraw a portion of it.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What are the risks?</TBodySans>
              <TLabelSans>
                Standard DeFi risks apply.
                <br />
                <br />• Liquidation Risk: if borrows exceed your borrow power
                due to interest accruing
                <br />• Smart Contract Risk: tied to SpringSui-issued LSTs such
                as sSUI or stratSUI.
                <br />• Oracle Risk: depending on strategy ({`doesn't`} apply to
                SpringSui LST/SUI Looping strategies)
                <br />
                <br />
                Always size your position based on your risk tolerance.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How does Suilend mitigate risks?</TBodySans>
              <TLabelSans>
                All DeFi protocols, including Suilend, come with risks, which
                are important to understand before depositing significant
                amounts of capital. The main risks involved in using Suilend are
                outlined{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://docs.suilend.fi/security/risks"
                  noIcon
                >
                  here
                </TextLink>
                .
                <br />
                <br />
                To mitigate this, Suilend has undergone multiple rigorous
                audits, available{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://docs.suilend.fi/security/suilend-audit"
                  noIcon
                >
                  here
                </TextLink>{" "}
                and has an active bug bounty program covering smart contract
                bugs. Suilend is one of the few Sui DeFi protocols to fully
                open-source its smart contracts:{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://docs.suilend.fi/ecosystem/suilend-integration-links"
                  noIcon
                >
                  Suilend Integration Links
                </TextLink>
                .
                {/* <br />
                <br />
                For the sSUI/SUI and stratSUI/SUI strategies:
                <br />• No oracle risk: The SUI Pyth price feed is used for both
                assets, as individual feeds for SUI derivative assets are less
                reliable. Using a unified SUI price feed avoids oracle issues
                that have occurred in the past (eg. mSOL on Solana).
                <br />• If either asset depegs, the Suilend team will intervene
                manually, adjusting LTVs or handling liquidations depending on
                the nature of the depeg. */}
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>Do I need to manage my position?</TBodySans>
              <TLabelSans>
                Suilend Strategies is designed to be low-maintenance and
                requires minimal management, but you can adjust your leverage,
                deposit, or withdraw at any time.
                <br />
                <br />
                Rewards that are listed on Suilend will be autocompounded
                roughly every two weeks. Other rewards will need to be
                compounded manually.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How much leverage should I use?</TBodySans>
              <TLabelSans>
                Higher leverage means higher APR—but also higher risk.
                <br />
                <br />
                For example:
                <br />• 1.5-2x leverage: Lower risk, moderate yield
                <br />• 2.5-3x leverage: Higher liquidation risk, high yield
                <br />
                <br />
                You can adjust your leverage for each strategy at any time
                through the UI.
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
