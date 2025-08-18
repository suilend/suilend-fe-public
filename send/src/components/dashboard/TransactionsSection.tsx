import Image from "next/image";
import React, { CSSProperties } from "react";

import { AlertCircle, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DCA, getDcas } from "@/fetchers/fetchDcas";
import { getTransactions } from "@/fetchers/fetchTransactions";
import { ASSETS_URL } from "@/lib/constants";
import { cn, toCompactNumber } from "@/lib/utils";

import SuilendLogo from "../layout/SuilendLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const TransactionsSection = () => {
  const PAGE_SIZE = 25;
  const { data: rawDcas } = getDcas();
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = React.useState<string[]>([]);
  const {
    data: pageData,
    isLoading,
    error,
  } = getTransactions(PAGE_SIZE, cursor === "start" ? undefined : cursor);
  // Avoid falling back to the first page while a paged request is loading
  const pageResults = pageData?.results;
  const nextCursor = pageData?.cursor;

  const dcas = rawDcas?.filter(
    (d) => d.status !== "cancelled" || d.outCoinCurrentAmount !== "0",
  );

  // Track page time ranges (min/max swap timestamps) per cursor key
  const [cursorRanges, setCursorRanges] = React.useState<
    Record<string, { min: number; max: number }>
  >({});
  React.useEffect(() => {
    if (!pageResults || pageResults.length === 0) return;
    const min = Math.min(...pageResults.map((tx) => tx.timestamp));
    const max = Math.max(...pageResults.map((tx) => tx.timestamp));
    const key = cursor ?? "start";
    setCursorRanges((prev) => ({ ...prev, [key]: { min, max } }));
  }, [pageResults, cursor]);

  // Build unified rows (swaps + dcas), sorted by created time desc
  const unifiedRows = React.useMemo(() => {
    type Row = {
      kind: "swap" | "dca";
      timestamp: number;
      typeLabel: string;
      priceContent: React.ReactNode;
      usdValue: number;
      outAmount: number;
      inAmount?: React.ReactNode;
      viewHref: string;
      ongoing?: boolean;
      progressPercent?: number;
      id?: string;
      dca?: DCA;
      totalBuys?: number;
    };

    const swapRows: Row[] = (pageResults ?? []).map((tx) => ({
      kind: "swap",
      timestamp: tx.timestamp,
      typeLabel: "SWAP",
      priceContent: `$${tx.price.toFixed(2)}`,
      usdValue: tx.usdValue,
      outAmount: tx.sendAmount,
      inAmount: toCompactNumber(tx.inCoinAmount / 1_000_000),
      viewHref: `https://suiscan.xyz/tx/${tx.digest}`,
    }));

    const parseNum = (v: string | number | null | undefined) =>
      v == null ? undefined : typeof v === "number" ? v : Number(v);

    // Limit DCAs to those within the current page's swap timestamp range
    const currentKey = cursor ?? "start";
    const range = cursorRanges[currentKey];
    const pageScopedDcas = range
      ? (dcas ?? []).filter((d) => {
          const ts =
            d.lastTransactionTimestamp > 1e12
              ? d.lastTransactionTimestamp
              : d.lastTransactionTimestamp * 1000;
          const upper =
            currentKey === "start" ? Number.POSITIVE_INFINITY : range.max;
          return ts >= range.min && ts <= upper;
        })
      : [];

    const dcaRows: Row[] = pageScopedDcas.map((d: DCA): Row => {
      const tsMs =
        d.lastTransactionTimestamp > 1e12
          ? d.lastTransactionTimestamp
          : d.lastTransactionTimestamp * 1000;
      const inStart = parseNum(d.inCoinStartingAmount) ?? 0; // USDC in base units
      const inCur = parseNum(d.inCoinCurrentAmount) ?? 0; // USDC in base units
      const outCur = (parseNum(d.outCoinCurrentAmount) ?? 0) / 1_000_000; // SEND amount (1e6)
      const inPer = parseNum(d.inCoinPerCycle) ?? 0; // USDC in base units per cycle

      // USD value (USDC spent so far)
      const usdValue = (inStart - inCur) / 1_000_000;

      // Progress percent (completed buys / total buys)
      const totalBuys = inPer > 0 ? Math.floor(inStart / inPer) : 0;
      const completedBuys =
        inPer > 0 ? Math.floor((inStart - inCur) / inPer) : 0;
      // Use COMPLETED percent for the visual progress fill (left -> right)
      const progressPercent =
        totalBuys > 0 ? (completedBuys / totalBuys) * 100 : 0;

      const inCoinStarting = parseFloat(d.inCoinStartingAmount);
      const inCoinCurrent = parseFloat(d.inCoinCurrentAmount);
      const spentUsdc = (inCoinStarting - inCoinCurrent) / 1_000_000;
      const totalUsdc = inCoinStarting / 1_000_000;
      const FractionUSDC: React.ReactNode = (
        <span className="inline-flex items-center font-sans">
          <Image
            src={`${ASSETS_URL}/icons/usdc.png`}
            alt="USDC"
            className="rounded-full overflow-hidden mr-1"
            width={16}
            height={16}
          />
          <span>{toCompactNumber(spentUsdc)}</span>
          <span className="opacity-60">/</span>
          <span>{toCompactNumber(totalUsdc)}</span>
        </span>
      );
      // Price content ($ per SEND)
      let priceContent: React.ReactNode;
      if (d.status === "completed" && outCur > 0) {
        const price = inStart / 1_000_000 / outCur;
        priceContent = `$${price.toFixed(2)}`;
      } else if (d.status === "ongoing") {
        priceContent = (
          <span className="px-2 py-1 rounded text-xs font-medium text-white bg-primary font-mono">
            ONGOING
          </span>
        );
      } else if (d.status === "cancelled") {
        priceContent = `$${(spentUsdc / outCur).toFixed(2)}`;
      }

      return {
        kind: "dca",
        timestamp: tsMs,
        typeLabel: "DCA",
        priceContent,
        usdValue,
        outAmount: outCur,
        inAmount: ["ongoing"].includes(d.status) ? (
          <span className="inline-flex items-center gap-1">{FractionUSDC}</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-sans">
            <Image
              src={`${ASSETS_URL}/icons/usdc.png`}
              alt="USDC"
              className="rounded-full overflow-hidden"
              width={16}
              height={16}
            />
            {toCompactNumber(spentUsdc)}
          </span>
        ),
        viewHref: `https://suiscan.xyz/object/${d.objectId}`,
        ongoing: d.status === "ongoing",
        progressPercent,
        id: d.objectId,
        dca: d,
        totalBuys,
      };
    });

    const merged = [...swapRows, ...dcaRows].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    return merged;
  }, [pageResults, dcas, cursor, cursorRanges]);

  return (
    <>
      <Card>
        <CardContent>
          <div className="overflow-x-scroll">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full whitespace-nowrap border-separate border-spacing-0">
                <thead className="sticky top-[-1px] bg-card z-20 shadow-[0_1px_0_0_hsl(var(--border))]">
                  <tr className="border-b border-border">
                    <th className="text-xs text-left pl-4 py-3 font-sans font-normal text-muted-foreground">
                      Time (UTC)
                    </th>
                    <th className="text-xs text-left px-2 py-3 font-sans font-normal text-muted-foreground">
                      Type
                    </th>
                    <th className="text-xs px-2 text-left py-3 font-sans font-normal text-muted-foreground">
                      Price
                    </th>
                    <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground max-lg:text-center">
                      SEND Amount
                    </th>
                    <th className="text-xs text-left max-lg:text-center py-3 font-sans font-normal text-muted-foreground">
                      Value
                    </th>
                    <th className="text-xs text-right pr-2 py-3 font-sans font-normal text-muted-foreground">
                      Explorer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={6} className="py-3 px-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  )}
                  {!isLoading &&
                    unifiedRows.map((row, index) => (
                      <>
                        <tr
                          className={cn(
                            row.kind === "dca" && row.ongoing && "bg-muted/15",
                            "[background-image:linear-gradient(hsl(var(--card)),hsl(var(--card)))]",
                            "[background-repeat:no-repeat]",
                            "[background-position:left_top]",
                            "[background-size:var(--prog)100%]",
                          )}
                          style={{
                            ["--prog" as keyof CSSProperties]: `${row.progressPercent ?? 0}%`,
                          }}
                        >
                          <td className="py-3 pl-4 z-10 relative text-foreground text-xs font-sans">
                            {new Date(row.timestamp)
                              .toLocaleString("en-US", {
                                month: "2-digit",
                                day: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              })
                              .replace(",", "")}
                          </td>
                          <td className="py-3 px-2 text-sm z-10 relative max-lg:text-xs">
                            {row.typeLabel}
                          </td>
                          <td className="py-3 px-2 text-sm z-10 relative max-lg:text-xs font-sans">
                            {row.priceContent}
                          </td>
                          <td className="py-3 z-10 relative">
                            <div className="flex items-center gap-1 max-lg:justify-center">
                              <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                                <SuilendLogo size={12} />
                              </div>
                              {row.kind === "dca" && row.ongoing ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-sm underline decoration-dotted decoration-1 underline-offset-2 max-lg:text-xs font-sans">
                                      {toCompactNumber(row.outAmount)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    className="font-sans text-xs"
                                    side={index === 0 ? "bottom" : "top"}
                                  >
                                    DCA is ongoing and will continue to buy more
                                    SEND.
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-sm max-lg:text-xs font-sans">
                                  {toCompactNumber(row.outAmount)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 z-10 relative">
                            <div className="flex items-center gap-2 text-sm max-lg:justify-center">
                              {row.kind === "dca" ? (
                                <span className="text-sm max-lg:text-xs">
                                  {row.inAmount}
                                </span>
                              ) : (
                                <div className="flex items-center gap-2 text-sm max-lg:justify-center max-lg:text-xs font-sans">
                                  <div className="w-4 h-4 rounded-full flex items-center justify-center">
                                    <Image
                                      src={`${ASSETS_URL}/icons/usdc.png`}
                                      alt="USDC"
                                      className="rounded-full overflow-hidden"
                                      width={16}
                                      height={16}
                                    />
                                  </div>
                                  {row.inAmount}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 z-10 relative text-right pr-2">
                            <a
                              href={row.viewHref}
                              target="_blank"
                              rel="noreferrer"
                              className="flex justify-end"
                            >
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                          </td>
                        </tr>
                      </>
                    ))}
                  {error && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-3 px-4 text-red-500 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>Failed to load transactions</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-4 gap-2">
              <button
                className="px-3 py-1 rounded-md border border-border disabled:opacity-50 text-muted-foreground text-xs font-sans"
                disabled={
                  prevCursors.length === 0 ||
                  !prevCursors[prevCursors.length - 1]
                }
                onClick={() => {
                  setCursor(prevCursors[prevCursors.length - 1] ?? undefined);
                  setPrevCursors(prevCursors.slice(0, -1));
                }}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 rounded-md border border-border disabled:opacity-50 text-muted-foreground text-xs font-sans"
                disabled={!nextCursor}
                onClick={() => {
                  if (!nextCursor) return;
                  if (cursor === nextCursor) return; // already at last page
                  setPrevCursors([...prevCursors, cursor ?? "start"]);
                  setCursor(nextCursor);
                }}
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionsSection;
