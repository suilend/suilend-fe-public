import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Period } from "@/fetchers/fetchCharts";

import RevenueChart from "./RevenueChart";

const ChartSection = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Period>("30d");
  const [isCumulative, setIsCumulative] = useState(true);

  const [enabledMetrics, setEnabledMetrics] = useState({
    revenue: true,
    buybacks: true,
    price: true,
  });

  const [revenueScope, setRevenueScope] = useState<
    "all" | "suilend" | "steamm"
  >("all");

  const toggleMetric = (key: keyof typeof enabledMetrics) => {
    const numEnabled = Object.values(enabledMetrics).filter(Boolean).length;
    if (numEnabled === 1 && enabledMetrics[key]) return; // keep at least one
    setEnabledMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-start md:justify-between">
          {/* Left cluster: timeframe + cumulative */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm text-muted-foreground">
                Timeframe
              </span>
              <Select
                value={selectedTimeframe}
                onValueChange={(v) => setSelectedTimeframe(v as Period)}
              >
                <SelectTrigger className="h-8 px-3 py-2 text-xs md:text-sm bg-background">
                  {(() => {
                    const labelMap: Record<Period, string> = {
                      "1d": "1D",
                      "7d": "7D",
                      "30d": "30D",
                      "90d": "90D",
                      ytd: "YTD",
                      alltime: "All time",
                    };
                    return labelMap[selectedTimeframe];
                  })()}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">1D</SelectItem>
                  <SelectItem value="7d">7D</SelectItem>
                  <SelectItem value="30d">30D</SelectItem>
                  <SelectItem value="90d">90D</SelectItem>
                  <SelectItem value="ytd">YTD</SelectItem>
                  <SelectItem value="alltime">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cumulative"
                checked={isCumulative}
                onCheckedChange={(v) => setIsCumulative(Boolean(v))}
              />
              <label
                htmlFor="cumulative"
                className="text-sm font-sans text-muted-foreground cursor-pointer"
              >
                Cumulative
              </label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RevenueChart
          timeframe={selectedTimeframe}
          isCumulative={isCumulative}
          enabledMetrics={enabledMetrics}
          revenueScope={revenueScope}
        />

        {/* Horizontal legend below chart */}
        <div className="mt-4 w-full flex flex-wrap items-center gap-6">
          {/* Revenue toggle */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle Revenue"
              onClick={() => toggleMetric("revenue")}
              className="w-4 h-4 rounded-[3px] p-0 flex items-center justify-center"
              style={{ backgroundColor: "transparent" }}
            >
              {/* Diagonally split square: left (Suilend), right (STEAMM) */}
              <svg width="16" height="16" viewBox="0 0 16 16">
                {(() => {
                  const showFill = enabledMetrics.revenue;
                  const scope = revenueScope;
                  const suilendFill =
                    showFill && (scope === "all" || scope === "suilend");
                  const steammFill =
                    showFill && (scope === "all" || scope === "steamm");
                  return (
                    <g>
                      {/* Left triangle (top-left) – Suilend */}
                      <polygon
                        points="0,0 16,0 0,16"
                        fill={suilendFill ? "hsl(var(--primary))" : "none"}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                      {/* Right triangle (bottom-right) – STEAMM */}
                      <polygon
                        points="16,0 16,16 0,16"
                        fill={steammFill ? "hsl(var(--secondary))" : "none"}
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                      />
                    </g>
                  );
                })()}
              </svg>
            </button>
            <span className="text-sm">Revenue</span>
            <Select
              value={revenueScope}
              onValueChange={(v) =>
                setRevenueScope(v as "all" | "suilend" | "steamm")
              }
            >
              <SelectTrigger className="h-7 px-2 py-1 text-xs bg-background ml-2">
                {revenueScope === "all"
                  ? "All"
                  : revenueScope === "suilend"
                    ? "Suilend"
                    : "STEAMM"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="suilend">Suilend</SelectItem>
                <SelectItem value="steamm">STEAMM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buybacks toggle */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle Buybacks"
              onClick={() => toggleMetric("buybacks")}
              className="w-4 h-4 rounded-[3px]"
              style={{
                backgroundColor: enabledMetrics.buybacks
                  ? "#ffffff"
                  : "transparent",
                border: `2px solid #ffffff`,
                opacity: enabledMetrics.buybacks ? 1 : 0.8,
              }}
            />
            <span className="text-sm">Buybacks</span>
          </div>

          {/* Price toggle */}
          <div className="flex items-center gap-2">
            <button
              aria-label="Toggle Price"
              onClick={() => toggleMetric("price")}
              className="w-4 h-4 rounded-[3px]"
              style={{
                backgroundColor: enabledMetrics.price
                  ? "hsl(var(--muted-foreground))"
                  : "transparent",
                border: `2px solid hsl(var(--muted-foreground))`,
              }}
            />
            <span className="text-sm">Price</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartSection;
