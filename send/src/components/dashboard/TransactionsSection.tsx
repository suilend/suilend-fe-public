import Image from "next/image";
import React, { CSSProperties } from "react";

import { AlertCircle, ChevronDown, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DCA, getDcas } from "@/fetchers/fetchDcas";
import { getTransactions } from "@/fetchers/fetchTransactions";
import { ASSETS_URL } from "@/lib/constants";
import { toCompactCurrency, toCompactNumber } from "@/lib/utils";

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
      priceContent: `$${tx.price.toFixed(4)}`,
      usdValue: tx.usdValue,
      outAmount: tx.sendAmount,
      inAmount: toCompactNumber(tx.inCoinAmount / 1_000_000),
      viewHref: `https://suiscan.xyz/tx/${tx.digest}`,
    }));

    const parseNum = (v: string | number | null | undefined) =>
      v == null ? undefined : typeof v === "number" ? v : Number(v);

    const dcaRows: Row[] = (dcas ?? []).map((d: DCA): Row => {
      const createdMs = d.createdAt > 1e12 ? d.createdAt : d.createdAt * 1000;
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
        <span className="inline-flex items-center gap-1">
          <Image
            src={`${ASSETS_URL}/icons/usdc.png`}
            alt="USDC"
            className="rounded-full overflow-hidden"
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
        priceContent = toCompactCurrency(price);
      } else if (d.status === "ongoing") {
        priceContent = (
          <span className="px-2 py-1 rounded text-xs font-medium text-white bg-primary">
            ONGOING
          </span>
        );
      } else if (d.status === "cancelled") {
        priceContent = (
          <span className="px-2 py-1 rounded text-xs font-medium text-white bg-muted">
            CANCELLED
          </span>
        );
      }

      return {
        kind: "dca",
        timestamp: createdMs,
        typeLabel: "DCA",
        priceContent,
        usdValue,
        outAmount: outCur,
        inAmount: ["cancelled", "ongoing"].includes(d.status) ? (
          <span className="inline-flex items-center gap-1">{FractionUSDC}</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Image
              src={`${ASSETS_URL}/icons/usdc.png`}
              alt="USDC"
              className="rounded-full overflow-hidden"
              width={16}
              height={16}
            />
            {toCompactCurrency(inStart / 1_000_000)}
          </span>
        ),
        viewHref: `https://suiscan.xyz/object/${d.objectId}`,
        ongoing: d.status === "ongoing" || d.status === "cancelled",
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
  }, [pageResults, dcas]);

  // Expanded DCA rows by id
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const formatSchedule = (seconds: number) => {
    if (!seconds || Number.isNaN(seconds)) return "—";
    if (seconds < 60) return `Every ${seconds}s`;
    const units: Array<[number, string]> = [
      [60 * 60 * 24 * 7, "week"],
      [60 * 60 * 24, "day"],
      [60 * 60, "hour"],
      [60, "minute"],
    ];
    for (const [sec, name] of units) {
      if (seconds % sec === 0) {
        const v = Math.floor(seconds / sec);
        return `Every ${v} ${name}${v === 1 ? "" : "s"}`;
      }
    }
    return `Every ${seconds}s`;
  };

  const formatPriceRange = (
    inPer: number,
    minOut: number | null,
    maxOut: number | null,
  ) => {
    const toUsdPerSend = (inBase: number, outBase: number) =>
      inBase / 1_000_000 / (outBase / 1_000_000);
    const parts: string[] = [];
    if (maxOut) {
      const minPrice = toUsdPerSend(inPer, maxOut);
      parts.push(minPrice.toFixed(4));
    }
    if (minOut) {
      const maxPrice = toUsdPerSend(inPer, minOut);
      parts.push(maxPrice.toFixed(4));
    }
    if (parts.length === 2) return `${parts[0]} – ${parts[1]}`;
    if (parts.length === 1 && minOut) return `≥ ${parts[0]}`;
    if (parts.length === 1 && maxOut) return `≤ ${parts[0]}`;
    return "—";
  };

  return (
    <>
      <span className="text-lg">SWAPS</span>
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Time
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Type
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground hidden lg:table-cell">
                    Price
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground max-lg:text-center">
                    Current Output
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground max-lg:text-right">
                    Input
                  </th>
                  <th className="text-xs text-center py-3 font-sans font-normal text-muted-foreground hidden lg:table-cell">
                    View
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
                  unifiedRows.map((row) => (
                    <>
                      <tr
                        className={`border-b border-border/50 relative overflow-hidden ${row.kind === "dca" && row.ongoing ? "bg-muted/15 after:content-[''] after:absolute after:inset-y-0 after:left-0 after:h-[49px] after:bg-card after:rounded-r-md after:z-0 after:w-[var(--prog)] after:border-r-primary/50 after:border-r-2" : ""}`}
                        style={
                          row.kind === "dca" && row.ongoing
                            ? {
                                ["--prog" as keyof CSSProperties]: `${row.progressPercent ?? 0}%`,
                              }
                            : undefined
                        }
                      >
                        <td className="py-3 text-sm hidden lg:table-cell z-10 relative">
                          {new Date(row.timestamp)
                            .toLocaleString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              year: "2-digit",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: false,
                            })
                            .replace(",", "")}
                        </td>
                        <td className="py-3 text-sm lg:hidden z-10 relative">
                          {new Date(row.timestamp)
                            .toLocaleString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              year: "2-digit",
                            })
                            .replace(",", "")}
                        </td>
                        <td className="py-3 text-sm z-10 relative">
                          {row.typeLabel}
                        </td>
                        <td className="py-3 text-sm hidden lg:table-cell z-10 relative">
                          {row.priceContent}
                        </td>
                        <td className="py-3 z-10 relative">
                          <div className="flex items-center gap-2">
                            {row.kind === "dca" ? (
                              <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                                <SuilendLogo size={12} />
                              </div>
                            ) : (
                              <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                                <SuilendLogo size={12} />
                              </div>
                            )}
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-sm">
                                  {toCompactNumber(row.outAmount)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {row.outAmount.toLocaleString()}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                        <td className="py-3 z-10 relative">
                          <div className="flex items-center gap-2">
                            {row.kind === "dca" ? (
                              <span className="text-sm">{row.inAmount}</span>
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 items-center justify-center z-10 relative text-center hidden lg:table-cell">
                          {row.kind === "dca" && row.id ? (
                            <button
                              className={`transition-transform ${expanded[row.id] ? "rotate-180" : ""}`}
                              onClick={() => toggleExpanded(row.id!)}
                              aria-label="Toggle DCA details"
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </button>
                          ) : (
                            <a
                              href={row.viewHref}
                              target="_blank"
                              rel="noreferrer"
                              className="flex justify-center"
                            >
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}
                        </td>
                      </tr>
                      {row.kind === "dca" &&
                        row.id &&
                        expanded[row.id] &&
                        row.dca && (
                          <tr>
                            <td colSpan={6} className="py-3">
                              {/* Summary card */}
                              <div className="border border-border rounded-md p-3 mb-3">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:flex lg:justify-between">
                                  <div>
                                    <div className="text-xs text-muted-foreground font-sans text-center">
                                      Status
                                    </div>
                                    <div className="text-center">
                                      <span
                                        className={`px-2 py-1 rounded text-xs font-medium text-white ${row.dca.status === "ongoing" ? "bg-primary" : row.dca.status === "cancelled" ? "bg-muted" : "bg-secondary"}`}
                                      >
                                        {row.dca.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <div className="text-xs text-muted-foreground font-sans text-center">
                                      Order size
                                    </div>
                                    <div className="inline-flex items-center gap-1 text-sm text-center justify-center">
                                      <Image
                                        src={`${ASSETS_URL}/icons/usdc.png`}
                                        alt="USDC"
                                        width={14}
                                        height={14}
                                        className="rounded-full"
                                      />
                                      {toCompactCurrency(
                                        (parseFloat(row.dca.inCoinPerCycle) ||
                                          0) / 1_000_000,
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground font-sans text-center">
                                      Schedule
                                    </div>
                                    <div className="text-sm text-center">
                                      {formatSchedule(
                                        Number(row.dca.frequency),
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground font-sans text-center">
                                      Price Range
                                    </div>
                                    <div className="text-sm text-center">
                                      {formatPriceRange(
                                        Number(row.dca.inCoinPerCycle),
                                        row.dca.minOutCoinPerCycle
                                          ? Number(row.dca.minOutCoinPerCycle)
                                          : null,
                                        row.dca.maxOutCoinPerCycle
                                          ? Number(row.dca.maxOutCoinPerCycle)
                                          : null,
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-4">
                                      <div className="text-xs text-muted-foreground font-sans text-center">
                                        Txns
                                      </div>
                                      <div className="text-sm text-center">
                                        {(() => {
                                          const inStart =
                                            Number(
                                              row.dca!.inCoinStartingAmount,
                                            ) || 0;
                                          const inCur =
                                            Number(
                                              row.dca!.inCoinCurrentAmount,
                                            ) || 0;
                                          const inPer =
                                            Number(row.dca!.inCoinPerCycle) ||
                                            0;
                                          const x =
                                            inPer > 0
                                              ? Math.floor(
                                                  (inStart - inCur) / inPer,
                                                )
                                              : 0;
                                          const y =
                                            inPer > 0
                                              ? Math.floor(inStart / inPer)
                                              : 0;
                                          return `${x}/${y}`;
                                        })()}
                                      </div>
                                    </div>
                                    <a
                                      href={row.viewHref}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              </div>

                              {/* Transactions list */}
                              <div className="border border-border rounded-md p-3">
                                <table className="w-full">
                                  <thead>
                                    <tr className="text-xs text-muted-foreground">
                                      <th className="text-left font-normal font-sans py-2 whitespace-nowrap text-muted-foreground text-xs">
                                        Date
                                      </th>
                                      <th className="text-left font-normal font-sans py-2 whitespace-nowrap hidden lg:table-cell text-muted-foreground text-xs">
                                        Price
                                      </th>
                                      <th className="text-left font-normal font-sans py-2 whitespace-nowrap text-muted-foreground text-xs">
                                        Output
                                      </th>
                                      <th className="text-left font-normal font-sans py-2 whitespace-nowrap text-muted-foreground text-xs">
                                        Input
                                      </th>
                                      <th className="text-right font-normal font-sans py-2 whitespace-nowrap text-muted-foreground text-xs">
                                        Txn
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[...row.dca.transactions]
                                      .sort((a, b) => b.timestamp - a.timestamp)
                                      .map((t) => {
                                        const inAmt =
                                          parseFloat(t.inCoinAmount) /
                                          1_000_000;
                                        const outAmt =
                                          parseFloat(t.outCoinAmount) /
                                          1_000_000;
                                        const price =
                                          outAmt > 0 ? inAmt / outAmt : 0;
                                        const txsAsc = [
                                          ...row.dca!.transactions,
                                        ].sort(
                                          (a, b) => a.timestamp - b.timestamp,
                                        );
                                        const ascIndex = txsAsc.findIndex(
                                          (x) =>
                                            x.timestamp === t.timestamp &&
                                            x.digest === t.digest,
                                        );
                                        const txNum =
                                          ascIndex >= 0 ? ascIndex + 1 : 0;
                                        return (
                                          <tr
                                            key={t.digest}
                                            className="border-t border-border/50"
                                          >
                                            <td className="py-2 text-sm whitespace-nowrap hidden lg:table-cell">
                                              {new Date(
                                                t.timestamp > 1e12
                                                  ? t.timestamp
                                                  : t.timestamp * 1000,
                                              )
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
                                            <td className="py-2 text-sm whitespace-nowrap lg:hidden">
                                              {new Date(
                                                t.timestamp > 1e12
                                                  ? t.timestamp
                                                  : t.timestamp * 1000,
                                              )
                                                .toLocaleString("en-US", {
                                                  month: "2-digit",
                                                  day: "2-digit",
                                                  year: "2-digit",
                                                })
                                                .replace(",", "")}
                                            </td>
                                            <td className="py-2 text-sm whitespace-nowrap hidden lg:table-cell">
                                              {toCompactCurrency(price)}
                                            </td>
                                            <td className="py-2 text-sm whitespace-nowrap  items-center gap-1">
                                              <div className="flex items-center gap-1">
                                                <SuilendLogo size={12} />{" "}
                                                {toCompactNumber(outAmt)}
                                              </div>
                                            </td>
                                            <td className="py-2 text-sm whitespace-nowrap  items-center gap-1">
                                              <div className="flex items-center gap-1">
                                                <Image
                                                  src={`${ASSETS_URL}/icons/usdc.png`}
                                                  alt="USDC"
                                                  width={14}
                                                  height={14}
                                                  className="rounded-full"
                                                />
                                                {toCompactNumber(inAmt)}
                                              </div>
                                            </td>
                                            <td className="py-2 text-center text-sm whitespace-nowrap">
                                              <a
                                                href={`https://suiscan.xyz/tx/${t.digest}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground justify-end"
                                              >
                                                <span>
                                                  {txNum}/{row.totalBuys ?? 0}
                                                </span>
                                                <ExternalLink className="w-4 h-4 hidden lg:block" />
                                              </a>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                    </>
                  ))}
                {error && (
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-red-500 text-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        <span>Failed to load transactions</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between pt-4 gap-2">
              <button
                className="px-3 py-1 rounded-md border border-border text-sm disabled:opacity-50"
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
                className="px-3 py-1 rounded-md border border-border text-sm disabled:opacity-50"
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
