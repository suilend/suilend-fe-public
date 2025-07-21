import Head from "next/head";

import SsuiStrategyCard from "@/components/strategies/SsuiStrategyCard";
import { StrategiesContextProvider } from "@/contexts/StrategiesContext";

function Page() {
  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <SsuiStrategyCard />
      </div>
    </>
  );
}

export default function Strategies() {
  return (
    <StrategiesContextProvider>
      <Page />
    </StrategiesContextProvider>
  );
}
