import Head from "next/head";
import Link from "next/link";

import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";

import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import StrategyCard from "@/components/strategies/StrategyCard";
import { Button } from "@/components/ui/button";
import VaultCard from "@/components/vaults/VaultCard";
import { VaultContextProvider, useVaultContext } from "@/contexts/VaultContext";

function Page() {
  const { vaults } = useVaultContext();

  return (
    <>
      <Head>
        <title>Suilend | Vaults</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center gap-4">
            <TBody className="uppercase">All vaults</TBody>
            <Link className="uppercase underline" href="/vaults/admin">
              <Button variant="outline">Admin</Button>
            </Link>
          </div>

          {/* Min card width: 400px */}
          <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
            {vaults.map((vault) => (
              <VaultCard key={vault.id} vault={vault as any} />
            ))}
          </div>
        </div>

        {/* Learn more */}
        <div className="flex w-full flex-col gap-4">
          <TBody className="uppercase">Learn more</TBody>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 1 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What is Suilend Vaults?</TBodySans>
              <TLabelSans>
                <span className="font-medium">Suilend Vaults</span> is a new
                Suilend feature that lets you deploy into preset DeFi strategies
                in one click - turning complex, multi-step processes into a
                simple, streamlined flow.
              </TLabelSans>
            </div>

            {/* 2 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
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
              </TLabelSans>
            </div> */}

            {/* 3 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
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
            </div> */}

            {/* 4 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
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
            </div> */}

            {/* 5 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What are the risks?</TBodySans>
              <TLabelSans>
                Standard DeFi risks apply.
                <br />
                <br />• Liquidation Risk: if your borrows exceed your
                liquidation threshold due to interest accruing
                <br />• Smart Contract Risk: tied to SpringSui-issued LSTs such
                as sSUI.
                <br />• Oracle Risk: depending on strategy ({`doesn't`} apply to
                SpringSui LST/SUI Looping strategies)
                <br />
                <br />
                Note: If your health is {"<100%"}, you will need{" "}
                <b>additional capital</b> (returned in the same transaction) to
                decrease your leverage and bring your health back up to 100%.
                You {"won't"} be able to deposit or withdraw while your health
                is {"<100%"}.
              </TLabelSans>
            </div>

            {/* 6 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
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
              </TLabelSans>
            </div> */}

            {/* 7 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>Do I need to manage my position?</TBodySans>
              <TLabelSans>
                Suilend Vaults is designed to be low-maintenance and requires
                minimal management. You can adjust your leverage, deposit, or
                withdraw at any time (provided your health is 100%, see{" "}
                {`"What are the risks?"`} for more details).
                <br />
                <br />
                Rewards that are listed on Suilend will be autoclaimed and
                redeposited roughly every two weeks. Other rewards will need to
                be claimed and redeposited manually.
              </TLabelSans>
            </div>

            {/* 8 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How much leverage should I use?</TBodySans>
              <TLabelSans>
                Higher leverage means higher APR—but also higher risk.
                <br />
                <br />
                For example:
                <br />• 1.5-2x leverage: Lower risk, moderate yield
                <br />• 2.5-3x leverage: Higher liquidation risk, high yield
              </TLabelSans>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Vaults() {
  return (
    <VaultContextProvider>
      <Page />
    </VaultContextProvider>
  );
}
