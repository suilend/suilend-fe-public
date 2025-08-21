import { Plus, X } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Period } from "@/fetchers/fetchCharts";

import { Checkbox } from "../ui/checkbox";

import RevenueChart from "./RevenueChart";

const ChartSection = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useLocalStorage<Period>(
    "selectedTimeframe",
    "30d",
  );
  const [isCumulative, setIsCumulative] = useLocalStorage(
    "isCumulative",
    false,
  );

  const [enabledMetrics, setEnabledMetrics] = useLocalStorage(
    "enabledMetrics",
    {
      steammRevenue: false,
      suilendRevenue: false,
      springSuiRevenue: false,
      buybacks: true,
      price: false,
    },
  );

  const toggleMetric = (key: keyof typeof enabledMetrics) => {
    setEnabledMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRevenue = () => {
    const allRevenueEnabled =
      enabledMetrics.suilendRevenue &&
      enabledMetrics.steammRevenue &&
      enabledMetrics.springSuiRevenue;

    setEnabledMetrics((prev) => ({
      ...prev,
      suilendRevenue: !allRevenueEnabled,
      steammRevenue: !allRevenueEnabled,
      springSuiRevenue: !allRevenueEnabled,
    }));
  };

  const getActivePills = () => {
    const pills = [];

    // Individual revenue source pills (never a combined "Revenue" pill)
    if (enabledMetrics.suilendRevenue) {
      pills.push({
        key: "suilendRevenue",
        label: "Suilend",
        color: "hsl(var(--primary))",
      });
    }
    if (enabledMetrics.steammRevenue) {
      pills.push({
        key: "steammRevenue",
        label: "STEAMM",
        color: "hsl(var(--secondary))",
      });
    }
    if (enabledMetrics.springSuiRevenue) {
      pills.push({
        key: "springSuiRevenue",
        label: "SpringSui",
        color: "#6DA8FF",
      });
    }

    if (enabledMetrics.buybacks) {
      // Pink to match design
      pills.push({ key: "buybacks", label: "Buybacks", color: "#F08BD9" });
    }
    if (enabledMetrics.price) {
      pills.push({
        key: "price",
        label: "SEND Price",
        color: "hsl(var(--foreground))",
      });
    }
    return pills;
  };

  const removePill = (key: string) => {
    toggleMetric(key as keyof typeof enabledMetrics);
  };

  function Controls({ className }: { className?: string }) {
    return (
      <div className={`items-center gap-2 lg:gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <label
            htmlFor="cumulative"
            className="text-xs font-sans text-muted-foreground"
          >
            Cumulative
          </label>
          <button
            id="cumulative"
            onClick={() => setIsCumulative(!isCumulative)}
            className={`relative inline-flex h-5 w-9 items-center border border-border rounded-full transition-colors ${
              isCumulative ? "bg-primary" : "bg-background"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isCumulative ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <Select
          value={selectedTimeframe}
          onValueChange={(v) => setSelectedTimeframe(v as Period)}
        >
          <SelectTrigger className="h-8 px-3 py-2 text-xs md:text-sm font-sans bg-background w-auto text-muted-foreground">
            {(() => {
              const labelMap: Record<Period, string> = {
                "7d": "7D",
                "30d": "30D",
                "90d": "90D",
                "1y": "1Y",
                all: "ALL",
              };
              return (
                <span className="text-xs font-sans text-muted-foreground">
                  {labelMap[selectedTimeframe]}
                </span>
              );
            })()}
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="7d"
              className="text-xs font-sans text-muted-foreground"
            >
              7D
            </SelectItem>
            <SelectItem
              value="30d"
              className="text-xs font-sans text-muted-foreground"
            >
              30D
            </SelectItem>
            <SelectItem
              value="90d"
              className="text-xs font-sans text-muted-foreground"
            >
              90D
            </SelectItem>
            <SelectItem
              value="1y"
              className="text-xs font-sans text-muted-foreground"
            >
              1Y
            </SelectItem>
            <SelectItem
              value="all"
              className="text-xs font-sans text-muted-foreground"
            >
              ALL
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <>
      <Card className="max-lg:pb-0">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Left side: Metric dropdown + pills */}
            <div className="flex items-center gap-2 justify-between">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 font-sans bg-background border border-border rounded-md transition-colors text-muted-foreground text-xs">
                    Metric
                    <Plus className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-0">
                  <div className="p-1">
                    <div
                      className="flex items-center px-2 py-1.5 font-sans cursor-pointer hover:bg-accent rounded-sm text-muted-foreground text-xs"
                      onClick={() => toggleMetric("buybacks")}
                    >
                      <Checkbox
                        checked={enabledMetrics.buybacks}
                        className="mr-2"
                      />
                      Buybacks
                    </div>

                    <div className="h-px bg-border my-1" />

                    <div
                      className="flex items-center px-2 py-1.5 font-sans cursor-pointer hover:bg-accent rounded-sm text-muted-foreground text-xs"
                      onClick={toggleRevenue}
                    >
                      {(() => {
                        const all =
                          enabledMetrics.suilendRevenue &&
                          enabledMetrics.steammRevenue &&
                          enabledMetrics.springSuiRevenue;
                        const any =
                          enabledMetrics.suilendRevenue ||
                          enabledMetrics.steammRevenue ||
                          enabledMetrics.springSuiRevenue;
                        return (
                          <Checkbox
                            checked={all}
                            indeterminate={!all && any}
                            className="mr-2"
                          />
                        );
                      })()}
                      Revenue
                    </div>

                    <div className="pl-6">
                      <div
                        className="flex items-center px-2 py-1.5 font-sans cursor-pointer hover:bg-accent rounded-sm text-muted-foreground text-xs"
                        onClick={() => toggleMetric("suilendRevenue")}
                      >
                        <Checkbox
                          checked={enabledMetrics.suilendRevenue}
                          className="mr-2"
                        />
                        Suilend
                      </div>
                      <div
                        className="flex items-center px-2 py-1.5 font-sans cursor-pointer hover:bg-accent rounded-sm text-muted-foreground text-xs"
                        onClick={() => toggleMetric("steammRevenue")}
                      >
                        <Checkbox
                          checked={enabledMetrics.steammRevenue}
                          className="mr-2"
                        />
                        STEAMM
                      </div>
                      <div
                        className="flex items-center px-2 py-1.5 font-sans cursor-pointer hover:bg-accent rounded-sm text-muted-foreground text-xs"
                        onClick={() => toggleMetric("springSuiRevenue")}
                      >
                        <Checkbox
                          checked={enabledMetrics.springSuiRevenue}
                          className="mr-2"
                        />
                        SpringSui
                      </div>
                    </div>

                    <div className="h-px bg-border my-1" />

                    <div
                      className="flex items-center px-2 py-1.5 font-sans cursor-pointer hover:bg-accent rounded-xs text-muted-foreground text-xs"
                      onClick={() => toggleMetric("price")}
                    >
                      <Checkbox
                        checked={enabledMetrics.price}
                        className="mr-2"
                      />
                      SEND Price
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="w-px h-[38px] bg-border mx-2 hidden lg:block"></div>

              <Controls className="lg:hidden flex" />
              <div className="hidden lg:flex gap-2 items-center flex-1">
                {/* Active metric pills */}
                {getActivePills().map((pill) => (
                  <div
                    key={pill.key}
                    className="flex items-center gap-2 px-3 py-1 bg-background rounded-full text-sm font-sans"
                    style={{ border: `1px solid ${pill.color}` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: pill.color }}
                    />
                    <span className="text-sm font-sans">{pill.label}</span>
                    <button
                      onClick={() => removePill(pill.key)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Cumulative toggle + timeframe */}
            <Controls className="lg:flex hidden" />

            <div className="flex items-center gap-2 lg:hidden flex-1 flex-wrap">
              {/* Active metric pills */}
              {getActivePills().map((pill) => (
                <div
                  key={pill.key}
                  className="flex items-center gap-2 px-3 py-1 bg-background rounded-full text-sm font-sans"
                  style={{ border: `1px solid ${pill.color}` }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: pill.color }}
                  />
                  <span>{pill.label}</span>
                  <button
                    onClick={() => removePill(pill.key)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 justify-center items-center max-lg:pb-0">
          <RevenueChart
            timeframe={selectedTimeframe}
            isCumulative={isCumulative}
            enabledMetrics={enabledMetrics}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default ChartSection;
