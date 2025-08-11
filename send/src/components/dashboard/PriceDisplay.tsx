"use client";

import { AlertCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMetrics } from "@/fetchers/fetchMetrics";

export default function PriceDisplay() {
  const { data: metrics, isLoading, error } = getMetrics();
  const price = metrics?.currentPrice;
  return (
    <span className="text-xl font--mono text-muted-foreground ml-2 mr-6 flex items-center gap-1">
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : price !== undefined ? (
        `$${price.toFixed(2)}`
      ) : (
        "N/A"
      )}
      {error && (
        <AlertCircle className="w-4 h-4 text-red-500" aria-label="Error" />
      )}
    </span>
  );
}
