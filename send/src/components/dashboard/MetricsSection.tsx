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

  return error ? (
    <Card>
      <CardContent className="p-5">
        <div className="text-red-500 flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span className="font-sans">Failed to load metrics</span>
        </div>
      </CardContent>
    </Card>
  ) : (
    <>
      <Card className="flex lg:hidden">
        <CardContent className="p-3 lg:p-5 flex justify-between w-full">
          <div className="flex flex-col items-center">
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

          <div className="flex flex-col items-center">
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
          {error && (
            <div className="mt-3 text-red-500 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to load metrics</span>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="w-full gap-5 hidden lg:flex">
        <Card className="flex-1">
          <CardContent className="p-5">
            <div className="flex flex-col">
              <div className="text-xs font-sans text-muted-foreground mb-2 text-center">
                <span className="hidden lg:block">Market Cap</span>
                <span className="block lg:hidden">Mcap</span>
              </div>
              <div className="text-[13px] lg:text-[15px] text-center">
                {isLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  toCompactCurrency(marketCap)
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-5">
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
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-5">
            <div className="flex flex-col items-center">
              <div className="text-xs font-sans text-muted-foreground flex items-center gap-1 lg:gap-2 mb-2 text-center">
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
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MetricsSection;
