import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { toTitleCase } from "@/lib/utils";

import RevenueChart from "./RevenueChart";

const ChartSection = () => {
  const [selectedMetric, setSelectedMetric] = useState("REVENUE");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  const [isCumulative, setIsCumulative] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState("all");

  return (
    <>
      <div className="flex border border-border rounded-md overflow-hidden bg-tabBg">
        <button
          onClick={() => setSelectedMetric("REVENUE")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
            selectedMetric === "REVENUE"
              ? "text-white bg-card-foreground"
              : "bg-transparent text-card-foreground"
          }`}
        >
          REVENUE
        </button>
        <button
          onClick={() => setSelectedMetric("BUYBACKS")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
            selectedMetric === "BUYBACKS"
              ? "text-white bg-card-foreground"
              : "bg-transparent text-card-foreground"
          }`}
        >
          BUYBACKS
        </button>
        <button
          onClick={() => setSelectedMetric("PRICE")}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
            selectedMetric === "PRICE"
              ? "text-white bg-card-foreground"
              : "bg-transparent text-card-foreground"
          }`}
        >
          PRICE
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            {/* Left side - Time interval buttons */}
            <div className="flex border border-border rounded-md overflow-hidden bg-tabBg">
              <button
                onClick={() => setSelectedTimeframe("7D")}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  selectedTimeframe === "7D"
                    ? "text-white bg-card-foreground"
                    : "bg-transparent text-card-foreground"
                }`}
              >
                7D
              </button>
              <button
                onClick={() => setSelectedTimeframe("1M")}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  selectedTimeframe === "1M"
                    ? "text-white bg-card-foreground"
                    : "bg-transparent text-card-foreground"
                }`}
              >
                1M
              </button>
              <button
                onClick={() => setSelectedTimeframe("ALL")}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  selectedTimeframe === "ALL"
                    ? "text-white bg-card-foreground"
                    : "bg-transparent text-card-foreground"
                }`}
              >
                ALL
              </button>
            </div>

            {/* Right side - Cumulative checkbox and Protocol select */}
            <div className="flex items-center gap-5">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cumulative"
                  checked={isCumulative}
                  onCheckedChange={setIsCumulative}
                />
                <label
                  htmlFor="cumulative"
                  className="text-sm font-sans text-muted-foreground cursor-pointer"
                >
                  Cumulative
                </label>
              </div>

              <Select
                value={selectedProtocol}
                onValueChange={setSelectedProtocol}
              >
                <SelectTrigger className="bg-tabBg flex gap-2">
                  <span className="text-muted-foreground font-sans">
                    Protocol:
                  </span>
                  <span className="font-sans">
                    {toTitleCase(selectedProtocol)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="font-sans">All</span>
                  </SelectItem>
                  <SelectItem value="suilend">
                    <span className="font-sans">Suilend</span>
                  </SelectItem>
                  <SelectItem value="steamm">
                    <span className="font-sans">STEAMM</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueChart />
        </CardContent>
      </Card>
    </>
  );
};

export default ChartSection;
