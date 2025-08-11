import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import RevenueChart from "./RevenueChart";

type Timeframe = "7D" | "1M" | "ALL";

const ChartSection = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1M");
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
            <div className="flex items-center gap-2 border border-border rounded-md overflow-hidden bg-tabBg">
              {(["7D", "1M", "ALL"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium transition-colors ${
                    selectedTimeframe === tf
                      ? "text-white bg-card-foreground"
                      : "bg-transparent text-card-foreground"
                  }`}
                >
                  {tf}
                </button>
              ))}
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

          {/* Right cluster: Boxed legend with checkboxes */}
          <div className="border border-border rounded-lg p-3 md:p-4 bg-tabBg w-full md:w-auto">
            {/* Metrics */}
            <div>
              <p className="text-xs md:text-sm text-muted-foreground mb-2">
                Metrics
              </p>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={enabledMetrics.revenue}
                    onChange={() => toggleMetric("revenue")}
                  />
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: "hsl(var(--primary))" }}
                  />
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
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={enabledMetrics.buybacks}
                    onChange={() => toggleMetric("buybacks")}
                  />
                  <span
                    className="w-3 h-3 rounded-sm opacity-60"
                    style={{ backgroundColor: "hsl(var(--primary))" }}
                  />
                  <span className="text-sm">Buybacks</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-current"
                    checked={enabledMetrics.price}
                    onChange={() => toggleMetric("price")}
                  />
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: "hsl(var(--muted-foreground))" }}
                  />
                  <span className="text-sm">Price</span>
                </label>
              </div>
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
      </CardContent>
    </Card>
  );
};

export default ChartSection;
