import { useState } from "react";

import { AlertCircle, ArrowLeftRight, ArrowRightLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMetrics } from "@/fetchers/fetchMetrics";
import { SEND_SUPPLY } from "@/lib/constants";

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
          <div>
            <div className="text-xs font-sans text-muted-foreground mb-2">
              Market Cap
            </div>
            <div className="text-[15px]">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                new Intl.NumberFormat("en-US", {
                  notation: "compact",
                  maximumFractionDigits: 2,
                  style: "currency",
                  currency: "USD",
                }).format(marketCap)
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-sans text-muted-foreground mb-2">
              Revenue
            </div>
            <div className="text-[15px]">
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                `$${(metrics?.revenue ?? 0).toLocaleString()}`
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-sans text-muted-foreground mb-2">
              Treasury
            </div>
            <div className="text-[15px]">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `$${(metrics?.treasury ?? 0).toLocaleString()}`
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-sans text-muted-foreground flex items-center gap-2 mb-2">
              Total buybacks
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
            <div className="text-[15px] flex items-center gap-1">
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : showUsdValue ? (
                `$${((metrics?.totalBuybacks ?? 0) * (metrics?.currentPrice ?? 0) || 0).toLocaleString()}`
              ) : (
                <>
                  <SuilendLogo size={12} />
                  {(metrics?.totalBuybacks ?? 0).toLocaleString()}
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
