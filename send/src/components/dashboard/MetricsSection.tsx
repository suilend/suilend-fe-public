import { useState } from "react";

import { AlertCircle, ArrowLeftRight, ArrowRightLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMetrics } from "@/fetchers/fetchMetrics";
import { SEND_SUPPLY } from "@/lib/constants";
import { toCompactCurrency, toCompactNumber } from "@/lib/utils";

import SuilendLogo from "../layout/SuilendLogo";

const MetricsSection = () => {
  const [showUsdValue, setShowUsdValue] = useState(false);
  const { data: metrics, isLoading, error } = getMetrics();
  const price = metrics?.currentPrice;
  const marketCap = price ? price * SEND_SUPPLY : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div className="flex flex-col items-start">
            <div className="text-xs font-sans text-muted-foreground mb-2 text-left">
              <span className="hidden lg:block">Market Cap</span>
              <span className="block lg:hidden">Mcap</span>
            </div>
            <div className="text-[13px] lg:text-[15px] text-left">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                toCompactCurrency(marketCap)
              )}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs font-sans text-muted-foreground mb-2 text-center">
              Revenue
            </div>
            <div className="text-[13px] lg:text-[15px]">
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                toCompactCurrency(metrics?.revenue ?? 0)
              )}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs font-sans text-muted-foreground mb-2 text-center">
              Treasury
            </div>
            <div className="text-[13px] lg:text-[15px] text-center">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                toCompactCurrency(metrics?.treasury ?? 0)
              )}
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-xs font-sans text-muted-foreground flex items-center gap-1 lg:gap-2 mb-2 text-right">
              <span className="hidden lg:block">Total Buybacks</span>
              <span className="block lg:hidden">Buybacks</span>
              {showUsdValue ? (
                <ArrowRightLeft
                  className="w-4 cursor-pointer h-4"
                  onClick={() => setShowUsdValue(!showUsdValue)}
                />
              ) : (
                <ArrowLeftRight
                  className="w-4 cursor-pointer h-4"
                  onClick={() => setShowUsdValue(!showUsdValue)}
                />
              )}
            </div>
            <div className="text-[13px] lg:text-[15px] flex items-center gap-1 text-right lg:hidden">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : showUsdValue ? (
                toCompactCurrency(
                  (metrics?.totalBuybacks ?? 0) *
                    (metrics?.currentPrice ?? 0) || 0,
                )
              ) : (
                <>
                  <SuilendLogo size={12} />
                  {toCompactNumber(metrics?.totalBuybacks ?? 0)}
                </>
              )}
            </div>
            <div className="text-[13px] lg:text-[15px] items-center gap-1 text-right hidden lg:flex">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : showUsdValue ? (
                (
                  (metrics?.totalBuybacks ?? 0) *
                    (metrics?.currentPrice ?? 0) || 0
                ).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })
              ) : (
                <>
                  <SuilendLogo size={12} />
                  {(metrics?.totalBuybacks ?? 0).toLocaleString("en-US")}
                </>
              )}
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-3 text-red-500 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load metrics</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsSection;
