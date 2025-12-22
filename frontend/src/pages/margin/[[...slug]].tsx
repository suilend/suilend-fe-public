import Head from "next/head";
import { useState } from "react";

import BigNumber from "bignumber.js";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import { formatPercent, formatPrice, formatToken } from "@suilend/sui-fe";

import PythRatioChart from "@/components/margin/PythRatioChart";
import TokenLogos from "@/components/shared/TokenLogos";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import {
  MarginContextProvider,
  useMarginContext,
} from "@/contexts/MarginContext";
import { cn } from "@/lib/utils";

function Page() {
  const { reserves, tokens, currentPrice, price24hAgo } = useMarginContext();

  // State
  const [isLong, setIsLong] = useState<boolean>(true);

  return (
    <>
      <Head>
        <title>Suilend | Margin</title>
      </Head>

      <div className="flex w-full flex-col gap-8">
        {/* Header */}
        <div className="flex w-full flex-row flex-wrap items-center gap-x-10 gap-y-6">
          {/* Logos */}
          <div className="flex h-8 flex-row items-center justify-center gap-3">
            <TokenLogos tokens={tokens} size={32} />

            <TBody className="text-2xl">
              {tokens[0].symbol}/{tokens[1].symbol}
            </TBody>
          </div>

          {/* Price */}
          <div className="flex h-8 flex-col justify-center gap-0.5">
            {currentPrice !== null ? (
              <>
                <TBody>
                  {formatToken(new BigNumber(currentPrice), { dp: 4 })}
                </TBody>
                <TLabel>
                  {formatPrice(
                    new BigNumber(currentPrice).times(reserves[1].price),
                  )}
                </TLabel>
              </>
            ) : (
              <>
                <Skeleton className="h-5 w-16 shrink-0" />
                <Skeleton className="h-4 w-12 shrink-0" />
              </>
            )}
          </div>

          {/* Change */}
          <div className="flex h-8 flex-col justify-center gap-1">
            <TLabelSans>24h change</TLabelSans>
            {currentPrice !== null && price24hAgo !== null ? (
              <TLabel
                className={cn(
                  currentPrice - price24hAgo > 0
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {currentPrice - price24hAgo > 0 ? "+" : "-"}
                {formatToken(
                  new BigNumber(Math.abs(currentPrice - price24hAgo)),
                  { dp: 4 },
                )}{" "}
                {currentPrice - price24hAgo > 0 ? "+" : "-"}
                {formatPercent(
                  new BigNumber(
                    (Math.abs(currentPrice - price24hAgo) / price24hAgo) * 100,
                  ),
                )}
              </TLabel>
            ) : (
              <Skeleton className="h-4 w-16 shrink-0" />
            )}
          </div>

          {/* Volume */}
          <div className="flex h-8 flex-col justify-center gap-1">
            <TLabelSans>24h volume</TLabelSans>
            <TLabel>--</TLabel>
          </div>

          {/* Trades */}
          <div className="flex h-8 flex-col justify-center gap-1">
            <TLabelSans>24h trades</TLabelSans>
            <TLabel>--</TLabel>
          </div>

          {/* Liquidity */}
          <div className="flex h-8 flex-col justify-center gap-1">
            <TLabelSans>Liquidity</TLabelSans>
            <TLabel>--</TLabel>
          </div>
        </div>

        {/* Columns */}
        <div className="flex w-full flex-row gap-5">
          {/* Left */}
          <div className="flex flex-1 flex-col gap-5">
            {/* Chart */}
            <div className="h-[420px] w-full">
              <PythRatioChart />
            </div>

            {/* Positions and History */}
            <div className="h-[120px] w-full rounded-sm border" />
          </div>

          {/* Right */}
          <div className="flex h-[420px] max-w-[440px] flex-1 flex-col gap-4">
            {/* Long/short */}
            <div className="flex h-9 w-full flex-row items-center gap-2">
              {/* Long */}
              <button
                className={cn(
                  "group flex h-full flex-1 flex-row items-center justify-center rounded-md border transition-colors",
                  isLong
                    ? "border-long/25 bg-long/10"
                    : "hover:border-long/25 hover:bg-long/10 focus-visible:border-long/25 focus-visible:bg-long/10",
                )}
                onClick={() => setIsLong(true)}
              >
                <TBody
                  className={cn(
                    "w-max uppercase text-muted-foreground transition-colors",
                    isLong
                      ? "text-long"
                      : "group-hover:text-long group-focus-visible:text-long",
                  )}
                >
                  Long
                </TBody>
              </button>

              {/* Short */}
              <button
                className={cn(
                  "group flex h-full flex-1 flex-row items-center justify-center rounded-md border transition-colors",
                  !isLong
                    ? "border-short/25 bg-short/10"
                    : "hover:border-short/25 hover:bg-short/10 focus-visible:border-short/25 focus-visible:bg-short/10",
                )}
                onClick={() => setIsLong(false)}
              >
                <TBody
                  className={cn(
                    "w-max uppercase text-muted-foreground transition-colors",
                    !isLong
                      ? "text-short"
                      : "group-hover:text-short group-focus-visible:text-short",
                  )}
                >
                  Short
                </TBody>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Margin() {
  return (
    <MarginContextProvider>
      <LendingMarketContextProvider lendingMarketId={LENDING_MARKET_ID}>
        <Page />
      </LendingMarketContextProvider>
    </MarginContextProvider>
  );
}
