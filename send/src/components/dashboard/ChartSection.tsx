import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Period } from "@/fetchers/fetchCharts";
import { cn } from "@/lib/utils";

import { Button } from "../ui/button";

import RevenueChart from "./RevenueChart";

const ChartSection = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Period>("30d");
  const [isCumulative, setIsCumulative] = useState(true);

  const [enabledMetrics, setEnabledMetrics] = useState({
    steammRevenue: true,
    suilendRevenue: true,
    springsuiRevenue: true,
    buybacks: false,
    price: true,
  });

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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
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
                      ytd: "1Y",
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
                  <SelectItem value="ytd">1Y</SelectItem>
                  <SelectItem value="alltime">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                className={cn(
                  "h-8 text-sm font-sans text-muted-foreground cursor-pointer border-border hover:bg-primary/50 hover:text-primary-foreground",
                  isCumulative && "bg-primary text-primary-foreground",
                )}
                onClick={() => setIsCumulative(!isCumulative)}
              >
                Cumulative
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 justify-center items-center">
        <RevenueChart
          timeframe={selectedTimeframe}
          isCumulative={isCumulative}
          enabledMetrics={enabledMetrics}
        />

        {/* Horizontal legend below chart */}
        <div className="mt-4 w-full flex flex-wrap items-center border border-border p-4 rounded-md gap-4 bg-[#081126]">
          {/* Revenue group */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  aria-label="Toggle Suilend Revenue"
                  onClick={() => toggleMetric("suilendRevenue")}
                  className="w-3.5 h-3.5 rounded-[3px]"
                  style={{
                    backgroundColor: enabledMetrics.suilendRevenue
                      ? "hsl(var(--primary))"
                      : "transparent",
                    border: `2px solid hsl(var(--primary))`,
                  }}
                />
                <span className="text-sm">Suilend</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  aria-label="Toggle STEAMM Revenue"
                  onClick={() => toggleMetric("steammRevenue")}
                  className="w-3.5 h-3.5 rounded-[3px]"
                  style={{
                    backgroundColor: enabledMetrics.steammRevenue
                      ? "hsl(var(--secondary))"
                      : "transparent",
                    border: `2px solid hsl(var(--secondary))`,
                  }}
                />
                <span className="text-sm">STEAMM</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  aria-label="Toggle SpringSUI Revenue"
                  onClick={() => toggleMetric("springsuiRevenue")}
                  className="w-3.5 h-3.5 rounded-[3px]"
                  style={{
                    backgroundColor: enabledMetrics.springsuiRevenue
                      ? "#6DA8FF"
                      : "transparent",
                    border: `2px solid #6DA8FF`,
                  }}
                />
                <span className="text-sm">SpringSUI</span>
              </label>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-border" />

          {/* Buybacks */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Metrics</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  aria-label="Toggle Buybacks"
                  onClick={() => toggleMetric("buybacks")}
                  className="w-3.5 h-3.5 rounded-[3px]"
                  style={{
                    backgroundColor: enabledMetrics.buybacks
                      ? "#ffffff"
                      : "transparent",
                    border: `2px solid #ffffff`,
                    opacity: enabledMetrics.buybacks ? 1 : 0.8,
                  }}
                />
                <span className="text-sm">Buybacks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <button
                  aria-label="Toggle Price"
                  onClick={() => toggleMetric("price")}
                  className="w-3.5 h-3.5 rounded-[3px]"
                  style={{
                    backgroundColor: enabledMetrics.price
                      ? "hsl(var(--muted-foreground))"
                      : "transparent",
                    border: `2px solid hsl(var(--muted-foreground))`,
                  }}
                />
                <span className="text-sm">Price</span>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartSection;
