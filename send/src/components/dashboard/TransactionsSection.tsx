import React from "react";
import Image from "next/image";

import { AlertCircle, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactions } from "@/fetchers/fetchTransactions";
import { ASSETS_URL } from "@/lib/constants";
import { toCompactCurrency, toCompactNumber } from "@/lib/utils";

import SuilendLogo from "../layout/SuilendLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const TransactionsSection = () => {
  const PAGE_SIZE = 25;
  const { data, isLoading, error } = getTransactions(PAGE_SIZE);
  const transactions = data?.results ?? [];
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [prevCursors, setPrevCursors] = React.useState<string[]>([]);
  const { data: pageData } = getTransactions(PAGE_SIZE, cursor === "start" ? undefined : cursor);
  const pageResults = pageData?.results ?? transactions;
  const nextCursor = pageData?.cursor;

  return (
    <>
      <span className="text-lg">TRANSACTIONS</span>
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
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    USD value
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Out Amount
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground hidden lg:table-cell">
                    In Amount
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Txn
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
                  pageResults.map((tx, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-3 text-sm hidden lg:table-cell">
                        {new Date(tx.timestamp)
                          .toLocaleString("en-US", {
                            month: "numeric",
                            day: "numeric",
                            year: "2-digit",
                            hour: "numeric",
                            minute: "numeric",
                            hour12: false,
                          })
                          .replace(",", "")}
                      </td><td className="py-3 text-sm lg:hidden">
                        {new Date(tx.timestamp)
                          .toLocaleString("en-US", {
                            month: "numeric",
                            day: "numeric",
                            year: "2-digit",
                          })
                          .replace(",", "")}
                      </td>
                      <td className="py-3 text-sm">SWAP</td>
                      <td className="py-3 text-sm hidden lg:table-cell">${tx.price.toFixed(4)}</td>
                      <td className="py-3 text-sm text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-sm">
                            {toCompactCurrency(tx.usdValue)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          ${tx.usdValue.toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center">
                            <SuilendLogo size={12} />
                          </div>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-sm">
                                {toCompactNumber(tx.sendAmount)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {tx.sendAmount.toLocaleString()}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
                            <Image
                              src={`${ASSETS_URL}/icons/sui.png`}
                              alt="Suilend"
                              width={16}
                              height={16}
                            />
                          </div>
                          -
                        </div>
                      </td>
                      <td className="py-3 flex items-center justify-end">
                        <a
                          href={`https://suiscan.xyz/tx/${tx.digest}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      </td>
                    </tr>
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
            <div className="flex items-center justify-between py-3 gap-2">
              <button
                className="px-3 py-1 rounded-md border border-border text-sm disabled:opacity-50"
                disabled={prevCursors.length === 0 || !prevCursors[prevCursors.length - 1]}
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
                  if (nextCursor) {
                    setPrevCursors([...prevCursors, cursor ?? "start"]);
                    setCursor(nextCursor);
                  }
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
