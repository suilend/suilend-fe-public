import Image from "next/image";

import { AlertCircle, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactions } from "@/fetchers/fetchTransactions";
import { ASSETS_URL } from "@/lib/constants";
import { toCompactNumber } from "@/lib/utils";

import SuilendLogo from "../layout/SuilendLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const TransactionsSection = () => {
  const { data, isLoading, error } = getTransactions(50);
  const transactions = data?.results ?? [];

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
                    Date
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Type
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Price
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Swapped from
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
                  transactions.map((tx, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-3 text-sm">
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
                      </td>
                      <td className="py-3 text-sm">SWAP</td>
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
                      <td className="py-3 text-sm">${tx.price.toFixed(4)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
                            <Image
                              src={`${ASSETS_URL}/icons/sui.png`}
                              alt="Suilend"
                              width={16}
                              height={16}
                            />
                          </div>
                          <span className="text-sm">{tx.price.toFixed(4)}</span>
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
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default TransactionsSection;
