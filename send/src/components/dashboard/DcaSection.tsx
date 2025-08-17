import React, { useMemo, useState } from "react";

import { ChevronDown, ExternalLink } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type DCA, getDcas } from "@/fetchers/fetchDcas";
import { getPrices } from "@/fetchers/fetchPrice";
import { toCompactCurrency, toCompactNumber } from "@/lib/utils";

const DcaSection = () => {
  const { data: dcas, isLoading, error } = getDcas();
  const [showCompleted, setShowCompleted] = useState(false);
  const { data: prices } = getPrices(dcas.map((dca) => dca.inCoinType));

  // Filter and sort DCAs
  const filteredDcas = useMemo(() => {
    let filtered = dcas;

    if (!showCompleted) {
      filtered = dcas.filter(
        (dca) => dca.status === "ongoing" || dca.status === "unknown",
      );
    }

    // Sort by createdAt descending (newest first)
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [dcas, showCompleted]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return (
      date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  };

  const getStatusInfo = (dca: DCA) => {
    const inCoinStarting = parseFloat(dca.inCoinStartingAmount);
    const inCoinCurrent = parseFloat(dca.inCoinCurrentAmount);
    const inCoinPerCycle = parseFloat(dca.inCoinPerCycle);

    const totalBuys = Math.floor(inCoinStarting / inCoinPerCycle);
    const completedBuys = Math.floor(
      (inCoinStarting - inCoinCurrent) / inCoinPerCycle,
    );

    let status = dca.status.toUpperCase();
    let statusColor = "bg-gray-600";

    if (dca.status === "ongoing") {
      if (inCoinStarting === inCoinCurrent) {
        status = "INACTIVE";
        statusColor = "bg-gray-600";
      } else {
        status = "ONGOING";
        statusColor = "bg-blue-600";
      }
    } else if (dca.status === "completed") {
      statusColor = "bg-green-600";
    } else if (dca.status === "cancelled") {
      statusColor = "bg-red-600";
    }

    return {
      completedBuys,
      totalBuys,
      status,
      statusColor,
      progressPercent: totalBuys > 0 ? (completedBuys / totalBuys) * 100 : 0,
    };
  };

  const formatAmount = (amount: string, decimals: number = 6) => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return toCompactNumber(num);
  };

  const formatCurrency = (
    amount: string,
    price: number | undefined,
    decimals: number = 6,
  ) => {
    if (!price) return "$0.00";
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return toCompactCurrency(num * price);
  };

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading DCAs: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-lg">DCAS</span>
        {dcas.filter(
          (dca) => dca.status === "cancelled" || dca.status === "completed",
        ).length > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Show completed
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showCompleted ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

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
                    Status
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Total Value
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Remaining Inputs
                  </th>
                  <th className="text-xs text-left py-3 font-sans font-normal text-muted-foreground">
                    Bought so far
                  </th>
                  <th className="text-xs text-center py-3 font-sans font-normal text-muted-foreground">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="py-3 text-center">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredDcas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No DCAs found
                    </td>
                  </tr>
                ) : (
                  filteredDcas.map((dca) => {
                    const statusInfo = getStatusInfo(dca);
                    if (!prices)
                      return (
                        <Skeleton className="h-4 w-24" key={dca.objectId} />
                      );
                    const inCoinPrice = prices[dca.inCoinType];

                    return (
                      <tr
                        key={dca.objectId}
                        className="border-b border-border relative overflow-hidden"
                      >
                        {/* Progress background */}
                        <td
                          className="absolute inset-0 bg-muted/20 transition-all duration-300 ease-out"
                          style={{
                            width: `${statusInfo.progressPercent}%`,
                            zIndex: 0,
                          }}
                        />

                        <td className="py-3 relative z-10">
                          <div className="text-sm">
                            {formatDate(dca.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {statusInfo.completedBuys}/{statusInfo.totalBuys}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium text-white ${statusInfo.statusColor}`}
                            >
                              {statusInfo.status}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 relative z-10">
                          <div className="text-sm">
                            {formatCurrency(
                              dca.inCoinStartingAmount,
                              inCoinPrice,
                            )}
                          </div>
                        </td>

                        <td className="py-3 relative z-10">
                          <div className="text-sm">
                            {formatCurrency(
                              dca.inCoinCurrentAmount,
                              inCoinPrice,
                            )}
                          </div>
                        </td>

                        <td className="py-3 relative z-10">
                          <div className="text-sm">
                            {formatAmount(dca.outCoinCurrentAmount, 9)} SEND
                          </div>
                        </td>

                        <td className="py-3 text-center relative z-10">
                          <a
                            href={`https://suiscan.xyz/object/${dca.objectId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default DcaSection;
