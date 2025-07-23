import Head from "next/head";

import { TBodySans } from "@/components/shared/Typography";
import SsuiStrategyCard from "@/components/strategies/SsuiStrategyCard";
import { StrategiesContextProvider } from "@/contexts/StrategiesContext";

function Page() {
  return (
    <>
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex w-full flex-col gap-6">
          <TBodySans className="text-xl">Strategies</TBodySans>
          <SsuiStrategyCard />
        </div>
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
