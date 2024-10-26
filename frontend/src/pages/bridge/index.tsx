import Head from "next/head";

import { Info } from "lucide-react";

import TextLink from "@/components/shared/TextLink";
import { bodySansClassNames } from "@/components/shared/Typography";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { isEthNativeOnly, isSolNativeOnly } from "@/lib/coinType";
import { formatList } from "@/lib/format";
import { DOCS_BRIDGE_LEARN_MORE_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function Bridge() {
  const appContext = useAppContext();
  const data = appContext.data as AppData;

  const ethNativeReserves = data.lendingMarket.reserves.filter((reserve) =>
    isEthNativeOnly(reserve.coinType),
  );
  const solNativeReserves = data.lendingMarket.reserves.filter((reserve) =>
    isSolNativeOnly(reserve.coinType),
  );

  return (
    <>
      <Head>
        <title>Suilend | Bridge</title>
      </Head>

      <div className="flex w-full flex-col items-center">
        <Alert className="mb-8 max-w-[650px] rounded-sm">
          <Info className="my-0.5 h-4 w-4 !text-muted-foreground" />
          <AlertTitle
            className={cn(bodySansClassNames, "mb-0 tracking-normal")}
          >
            {"Note: Only Wormhole Wrapped Ethereum-native "}
            {formatList(ethNativeReserves.map((reserve) => reserve.symbol))}
            {solNativeReserves.length > 0 &&
              ` and Wormhole Wrapped Solana-native ${formatList(solNativeReserves.map((reserve) => reserve.symbol))}`}
            {" are supported on Suilend. "}
            <TextLink href={DOCS_BRIDGE_LEARN_MORE_URL}>Learn more</TextLink>
          </AlertTitle>
        </Alert>
      </div>
    </>
  );
}
