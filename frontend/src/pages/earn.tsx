import Head from "next/head";

import { LENDING_MARKET_ID } from "@suilend/sdk";

import StrategyPanel from "@/components/strategies/StrategyPanel";
import VaultPanel from "@/components/strategies/VaultPanel";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import { LstStrategyContextProvider } from "@/contexts/LstStrategyContext";
import { VaultContextProvider } from "@/contexts/VaultContext";

function Page() {
  return (
    <>
      <Head>
        <title>Suilend | Earn</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <VaultPanel />
        <StrategyPanel />
      </div>
    </>
  );
}

export default function Strategies() {
  return (
    <VaultContextProvider>
      <LstStrategyContextProvider>
        <LendingMarketContextProvider lendingMarketId={LENDING_MARKET_ID}>
          <Page />
        </LendingMarketContextProvider>
      </LstStrategyContextProvider>
    </VaultContextProvider>
  );
}
