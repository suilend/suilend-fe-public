import { useMemo, useState } from "react";

import BigNumber from "bignumber.js";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { formatPercent, formatUsd } from "@suilend/sui-fe";

import HistoricalLineChart, {
  ChartData,
} from "@/components/dashboard/actions-modal/HistoricalLineChart";
import AprRewardsBreakdownRow from "@/components/dashboard/AprRewardsBreakdownRow";
import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import useFetchVaultStats from "@/fetchers/useFetchVaultStats";
import { ViewBox, getTooltipStyle } from "@/lib/chart";
import { DAYS, DAYS_MAP, Days } from "@/lib/events";
import { cn } from "@/lib/utils";

const ALLOCATION_SEGMENT_COLORS = ["#457AE4", "#60A5FA", "#93C5FD", "#1D4ED8"];

interface TooltipContentPropsBase {
  fields: string[];
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContentAprTvl({
  fields,
  d,
  viewBox,
  x,
  metricType,
}: TooltipContentPropsBase & { metricType: "APR" | "TVL" }) {
  if (fields.every((field) => d[field] === undefined)) return null;
  if (viewBox === undefined || x === undefined) return null;

  const field = fields[0];
  const value = d[field];

  return (
    <div
      className="absolute rounded-md border bg-popover px-3 py-1.5 shadow-md"
      style={getTooltipStyle(200, viewBox, x)}
    >
      <div className="flex w-full flex-col gap-2">
        <TLabelSans>
          {format(new Date(d.timestampS * 1000), "MM/dd HH:mm")}
        </TLabelSans>
        <div className="flex w-full flex-row items-center justify-between gap-4">
          <TBodySans>{metricType}</TBodySans>
          <TBody>
            {metricType === "APR"
              ? formatPercent(new BigNumber(value ?? 0))
              : formatUsd(new BigNumber(value ?? 0))}
          </TBody>
        </div>
      </div>
    </div>
  );
}

function TooltipContentAllocations({
  fields,
  d,
  viewBox,
  x,
}: TooltipContentPropsBase) {
  const { LENDING_MARKET_METADATA_MAP } = useLoadedAppContext();

  if (fields.every((field) => d[field] === undefined)) return null;
  if (viewBox === undefined || x === undefined) return null;

  const definedFields = fields.filter((field) => d[field] !== undefined);
  const total = definedFields.reduce(
    (acc, field) => acc.plus(new BigNumber(d[field] as number)),
    new BigNumber(0),
  );

  return (
    <div
      className="absolute rounded-md border bg-popover px-3 py-1.5 shadow-md"
      style={getTooltipStyle(260, viewBox, x)}
    >
      <div className="flex w-full flex-col gap-2">
        <TLabelSans>
          {format(new Date(d.timestampS * 1000), "MM/dd HH:mm")}
        </TLabelSans>

        <div className="flex w-full flex-row items-center justify-between gap-4">
          <TBodySans>Total</TBodySans>
          <TBody>{formatUsd(total)}</TBody>
        </div>

        {definedFields.map((field, index, array) => {
          const name = LENDING_MARKET_METADATA_MAP[field]?.name ?? field;
          const color =
            ALLOCATION_SEGMENT_COLORS[index % ALLOCATION_SEGMENT_COLORS.length];

          return (
            <AprRewardsBreakdownRow
              key={field}
              isLast={index === array.length - 1}
              value={
                <span style={{ color }}>
                  {formatUsd(new BigNumber(d[field] as number))}
                </span>
              }
            >
              <TLabelSans>{name}</TLabelSans>
            </AprRewardsBreakdownRow>
          );
        })}
      </div>
    </div>
  );
}

interface VaultChartProps {
  vaultId: string;
}

type MetricType = "TVL" | "APR" | "Allocations";

export default function VaultChart({ vaultId }: VaultChartProps) {
  const { LENDING_MARKET_METADATA_MAP } = useLoadedAppContext();

  const [days, setDays] = useLocalStorage<Days>("vaultChart_days", 7);
  const { data: chartData, isLoading } = useFetchVaultStats(vaultId, days);
  const [metricType, setMetricType] = useState<MetricType>("TVL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const allocationFields = useMemo(() => {
    if (!chartData) return [] as string[];
    const keys = new Set<string>();
    chartData.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (k !== "timestampS" && k !== "tvl" && k !== "apr") keys.add(k);
      });
    });
    return Array.from(keys).sort((a, b) => {
      const na = LENDING_MARKET_METADATA_MAP[a]?.name ?? a;
      const nb = LENDING_MARKET_METADATA_MAP[b]?.name ?? b;
      return na.localeCompare(nb);
    });
  }, [chartData, LENDING_MARKET_METADATA_MAP]);

  const fields = useMemo(() => {
    if (metricType === "APR") return ["apr"];
    if (metricType === "TVL") return ["tvl"];
    return allocationFields;
  }, [metricType, allocationFields]);

  const fieldStackIdMap = useMemo(
    () =>
      fields.reduce(
        (acc, f) => ({ ...acc, [f]: "1" }),
        {} as Record<string, string>,
      ),
    [fields],
  );

  const average = useMemo(() => {
    if (!chartData || metricType === "Allocations") return undefined;
    const key = metricType === "APR" ? "apr" : "tvl";
    const sum = chartData.reduce(
      (acc, curr) => acc.plus(new BigNumber((curr as any)[key] ?? 0)),
      new BigNumber(0),
    );
    const count = chartData.length || 1;
    return sum.div(count).toNumber();
  }, [chartData, metricType]);

  const getFieldColor = (field: string) => {
    if (metricType === "APR") return "hsl(var(--success))";
    if (metricType === "TVL") return "hsl(var(--primary))";
    const idx = allocationFields.indexOf(field);
    return ALLOCATION_SEGMENT_COLORS[
      (idx >= 0 ? idx : 0) % ALLOCATION_SEGMENT_COLORS.length
    ];
  };

  return (
    <div className="-mx-4 flex flex-col">
      <div className="flex w-full flex-row items-center justify-between px-4">
        <div className="flex flex-row items-center gap-2">
          <TBodySans>
            Historical{" "}
            <DropdownMenu
              rootProps={{
                open: isDropdownOpen,
                onOpenChange: setIsDropdownOpen,
              }}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-inherit hover:opacity-80"
                >
                  {metricType}
                  <ChevronDown className="h-3 w-3" />
                </button>
              }
              contentProps={{
                style: {
                  minWidth: "120px",
                  maxWidth: "120px",
                  padding: "8px",
                },
              }}
              items={
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setMetricType("TVL");
                      setIsDropdownOpen(false);
                    }}
                    isSelected={metricType === "TVL"}
                  >
                    TVL
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setMetricType("APR");
                      setIsDropdownOpen(false);
                    }}
                    isSelected={metricType === "APR"}
                  >
                    APR
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setMetricType("Allocations");
                      setIsDropdownOpen(false);
                    }}
                    isSelected={metricType === "Allocations"}
                  >
                    Allocations
                  </DropdownMenuItem>
                </>
              }
            />
          </TBodySans>
        </div>

        <div className="flex h-4 flex-row items-center">
          {DAYS.map((_days) => (
            <Button
              key={_days}
              className="px-2"
              labelClassName={cn(
                "text-muted-foreground text-xs",
                days === _days && "text-primary-foreground",
              )}
              variant="ghost"
              size="sm"
              onClick={() => setDays(_days)}
            >
              {DAYS_MAP[_days]}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="historical-apr-line-chart h-[140px] w-full shrink-0 transform-gpu md:h-[160px]"
        is-loading={isLoading ? "true" : "false"}
      >
        <HistoricalLineChart
          data={chartData ?? []}
          average={average}
          tickFormatterY={(value) =>
            metricType === "APR"
              ? formatPercent(new BigNumber(value), { dp: 1 })
              : formatUsd(new BigNumber(value))
          }
          fields={fields}
          fieldStackIdMap={fieldStackIdMap}
          getFieldColor={getFieldColor}
          tooltipContent={({ active, payload, viewBox, coordinate }) => {
            if (!active || !payload?.[0]?.payload) return null;
            const d = payload[0].payload as ChartData;
            return metricType === "Allocations" ? (
              <TooltipContentAllocations
                fields={fields}
                d={d}
                viewBox={viewBox as any}
                x={coordinate?.x}
              />
            ) : (
              <TooltipContentAprTvl
                fields={fields}
                d={d}
                viewBox={viewBox as any}
                x={coordinate?.x}
                metricType={metricType as "APR" | "TVL"}
              />
            );
          }}
        />
      </div>
    </div>
  );
}
