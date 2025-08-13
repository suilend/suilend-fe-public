import { useEffect, useMemo, useState } from "react";

import * as Recharts from "recharts";

import {
  BuybacksPoint,
  Period,
  PricePoint,
  RevenuePoint,
  getBuybacksChart,
  getPriceChart,
  getRevenueChart,
} from "@/fetchers/fetchCharts";

type EnabledMetrics = {
  suilendRevenue: boolean;
  steammRevenue: boolean;
  springsuiRevenue: boolean;
  buybacks: boolean;
  price: boolean;
};

type ChartProps = {
  timeframe: Period;
  isCumulative: boolean;
  enabledMetrics: EnabledMetrics;
};

type RawPoint = {
  timestamp: number; // ms
  label: string;
  suilendRevenueM: number; // in millions USD
  steammRevenueM: number; // in millions USD
  buybacksM: number; // in millions USD
  price: number; // USD
};

// Colors: protocol-distinct hues. Metric is subtle via opacity.
const COLOR_SUILEND = "hsl(var(--primary))";
const COLOR_STEAMM = "hsl(var(--secondary))";
const COLOR_SPRINGSUI = "#6DA8FF";
const COLOR_PRICE_LINE = "hsl(var(--muted-foreground))";
const COLOR_BUYBACKS = "#ffffff"; // white for better distinction

//

function formatLabel(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTooltipDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function startOfWeekUtc(ts: number): number {
  const d = new Date(ts);
  const day = d.getUTCDay(); // 0=Sun ... 6=Sat
  const diffToMonday = (day + 6) % 7; // Monday=0
  const monday = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - diffToMonday);
  return monday.getTime();
}

function startOfMonthUtc(ts: number): number {
  const d = new Date(ts);
  const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return monthStart.getTime();
}

function formatMonthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short" });
}

function formatWeekLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function useProcessedData(period: Period, isCumulative: boolean) {
  const {
    data: revenueData,
    isLoading: loadingRev,
    error: errorRev,
  } = getRevenueChart(period);
  const {
    data: buybacksData,
    isLoading: loadingBuy,
    error: errorBuy,
  } = getBuybacksChart(period);
  const {
    data: priceData,
    isLoading: loadingPrice,
    error: errorPrice,
  } = getPriceChart(period);

  const loading = loadingRev || loadingBuy || loadingPrice;
  const anyError = errorRev || errorBuy || errorPrice;

  const raw: RawPoint[] = useMemo(() => {
    // Choose a canonical x-axis timeline to avoid blank regions.
    // Prefer price (densest/most regular), otherwise revenue, then buybacks.
    let timestamps: number[] = [];
    if (priceData && priceData.length > 0) {
      timestamps = Array.from(new Set(priceData.map((p) => p.timestamp))).sort(
        (a, b) => a - b,
      );
    } else if (revenueData && revenueData.length > 0) {
      timestamps = Array.from(
        new Set(revenueData.map((p) => p.timestamp)),
      ).sort((a, b) => a - b);
    } else if (buybacksData && buybacksData.length > 0) {
      timestamps = Array.from(
        new Set(buybacksData.map((p) => p.timestamp)),
      ).sort((a, b) => a - b);
    }

    const revenueByTs = new Map<number, RevenuePoint>();
    (revenueData ?? []).forEach((p) => revenueByTs.set(p.timestamp, p));
    const buybacksByTs = new Map<number, BuybacksPoint>();
    (buybacksData ?? []).forEach((p) => buybacksByTs.set(p.timestamp, p));
    const priceByTs = new Map<number, PricePoint>();
    (priceData ?? []).forEach((p) => priceByTs.set(p.timestamp, p));

    const revKeys = Array.from(revenueByTs.keys()).sort((a, b) => a - b);
    const buyKeys = Array.from(buybacksByTs.keys()).sort((a, b) => a - b);

    // Estimate step from canonical timestamps to set a matching tolerance
    const diffs: number[] = [];
    for (let i = 1; i < timestamps.length; i++)
      diffs.push(timestamps[i] - timestamps[i - 1]);
    const stepMs =
      diffs.length > 0
        ? diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)]
        : 24 * 60 * 60 * 1000;
    const tolerance = Math.max(stepMs / 2, 6 * 60 * 60 * 1000); // at least 6h

    let revIdx = 0;
    let buyIdx = 0;

    function nearestValue<T extends { timestamp: number }>(
      keys: number[],
      map: Map<number, T>,
      idxRef: { i: number },
      ts: number,
    ): T | undefined {
      if (keys.length === 0) return undefined;
      // advance pointer while next key is <= ts
      while (idxRef.i + 1 < keys.length && keys[idxRef.i + 1] <= ts) idxRef.i++;
      const prevKey = keys[idxRef.i];
      const nextKey =
        idxRef.i + 1 < keys.length ? keys[idxRef.i + 1] : undefined;
      let bestKey = prevKey;
      if (
        nextKey !== undefined &&
        Math.abs(nextKey - ts) < Math.abs(prevKey - ts)
      )
        bestKey = nextKey;
      if (Math.abs(bestKey - ts) <= tolerance) return map.get(bestKey);
      return undefined;
    }

    // Build price array aligned to the canonical timeline with forward-fill/backfill
    const prices: Array<number | undefined> = timestamps.map(
      (ts) => priceByTs.get(ts)?.price,
    );
    // forward-fill
    let last: number | undefined = undefined;
    for (let i = 0; i < prices.length; i++) {
      if (prices[i] === undefined) {
        prices[i] = last;
      } else {
        last = prices[i];
      }
    }
    // backfill for leading undefineds
    let firstDefined: number | undefined = undefined;
    for (let i = 0; i < prices.length; i++) {
      if (prices[i] !== undefined) {
        firstDefined = prices[i];
        break;
      }
    }
    if (firstDefined !== undefined) {
      for (let i = 0; i < prices.length; i++) {
        if (prices[i] === undefined) prices[i] = firstDefined;
        else break;
      }
    }

    const points: RawPoint[] = timestamps.map((ts, idx) => {
      const rev = nearestValue(revKeys, revenueByTs, { i: revIdx }, ts);
      revIdx = Math.min(revKeys.length - 1, revIdx);
      const buy = nearestValue(buyKeys, buybacksByTs, { i: buyIdx }, ts);
      buyIdx = Math.min(buyKeys.length - 1, buyIdx);
      const suilendRevenueM = rev ? rev.suilendRevenue / 1_000_000 : 0;
      const steammRevenueM = rev ? rev.steammRevenue / 1_000_000 : 0;
      const buybacksM = buy ? buy.usdValue / 1_000_000 : 0;
      const price = prices[idx] ?? 0;
      return {
        timestamp: ts,
        label: formatLabel(ts),
        suilendRevenueM,
        steammRevenueM,
        buybacksM,
        price,
      };
    });
    return points;
  }, [revenueData, buybacksData, priceData]);

  // Optionally bucket raw points by week/month depending on period
  const bucketedRaw: RawPoint[] = useMemo(() => {
    if (period === "90d") {
      const byBucket = new Map<number, RawPoint>();
      for (const pt of raw) {
        const bucket = startOfWeekUtc(pt.timestamp);
        const existing = byBucket.get(bucket);
        if (!existing) {
          byBucket.set(bucket, {
            timestamp: bucket,
            label: formatWeekLabel(bucket),
            suilendRevenueM: pt.suilendRevenueM,
            steammRevenueM: pt.steammRevenueM,
            buybacksM: pt.buybacksM,
            price: pt.price,
          });
        } else {
          existing.suilendRevenueM += pt.suilendRevenueM;
          existing.steammRevenueM += pt.steammRevenueM;
          existing.buybacksM += pt.buybacksM;
          // average price within bucket
          existing.price = (existing.price + pt.price) / 2;
        }
      }
      return Array.from(byBucket.values()).sort(
        (a, b) => a.timestamp - b.timestamp,
      );
    }
    if (period === "ytd" || period === "alltime") {
      const byBucket = new Map<number, { sum: RawPoint; count: number }>();
      for (const pt of raw) {
        const bucket = startOfMonthUtc(pt.timestamp);
        const existing = byBucket.get(bucket);
        if (!existing) {
          byBucket.set(bucket, {
            sum: {
              timestamp: bucket,
              label: formatMonthLabel(bucket),
              suilendRevenueM: pt.suilendRevenueM,
              steammRevenueM: pt.steammRevenueM,
              buybacksM: pt.buybacksM,
              price: pt.price,
            },
            count: 1,
          });
        } else {
          existing.sum.suilendRevenueM += pt.suilendRevenueM;
          existing.sum.steammRevenueM += pt.steammRevenueM;
          existing.sum.buybacksM += pt.buybacksM;
          existing.sum.price += pt.price;
          existing.count += 1;
        }
      }
      const arr = Array.from(byBucket.values())
        .map(({ sum, count }) => ({ ...sum, price: sum.price / count }))
        .sort((a, b) => a.timestamp - b.timestamp);
      return arr;
    }
    return raw;
  }, [raw, period]);

  const processed = useMemo(() => {
    if (raw.length === 0)
      return [] as Array<{
        timestamp: number;
        label: string;
        suilend: { revenue: number; buybacks: number };
        steamm: { revenue: number; buybacks: number };
        price: number;
      }>;

    if (!isCumulative) {
      return bucketedRaw.map((pt) => ({
        timestamp: pt.timestamp,
        label: pt.label,
        suilend: { revenue: pt.suilendRevenueM, buybacks: pt.buybacksM },
        steamm: { revenue: pt.steammRevenueM, buybacks: 0 },
        price: pt.price,
      }));
    }

    let cumSuilend = 0;
    let cumSteamm = 0;
    let cumBuy = 0;
    return bucketedRaw.map((pt) => {
      cumSuilend += pt.suilendRevenueM;
      cumSteamm += pt.steammRevenueM;
      cumBuy += pt.buybacksM;
      return {
        timestamp: pt.timestamp,
        label: pt.label,
        suilend: { revenue: cumSuilend, buybacks: cumBuy },
        steamm: { revenue: cumSteamm, buybacks: 0 },
        price: pt.price,
      };
    });
  }, [bucketedRaw, isCumulative, raw.length]);

  return { processed, loading, anyError };
}

const RevenueChart = ({
  timeframe,
  isCumulative,
  enabledMetrics,
}: ChartProps) => {
  const [isSmall, setIsSmall] = useState(false);
  useEffect(() => {
    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(max-width: 640px)")
        : undefined;
    const onChange = () => setIsSmall(Boolean(mq?.matches));
    onChange();
    mq?.addEventListener("change", onChange);
    return () => mq?.removeEventListener("change", onChange);
  }, []);
  const margin = useMemo(
    () =>
      isSmall
        ? { top: 6, right: 8, left: 12, bottom: 16 }
        : { top: 10, right: 12, left: 14, bottom: 20 },
    [isSmall],
  );

  const { processed: data } = useProcessedData(timeframe, isCumulative);

  const maxYRight = useMemo(() => {
    if (!enabledMetrics.price) return 1;
    const m = Math.max(1, ...data.map((d) => d.price));
    const step = Math.pow(10, Math.floor(Math.log10(m)) - 1);
    return Math.ceil(m / step) * step;
  }, [data, enabledMetrics.price]);

  // Recharts data mapping and ticks
  const chartData = useMemo(
    () =>
      data.map((d, index) => ({
        index,
        timestamp: d.timestamp,
        label: d.label,
        suilendRevenue: enabledMetrics.suilendRevenue ? d.suilend.revenue : 0,
        steammRevenue: enabledMetrics.steammRevenue ? d.steamm.revenue : 0,
        springsuiRevenue: enabledMetrics.springsuiRevenue ? 0 : 0,
        buybacks: enabledMetrics.buybacks ? d.suilend.buybacks : 0,
        price: d.price,
      })),
    [data, enabledMetrics],
  );

  const xTicks = useMemo(() => {
    const maxLabels =
      timeframe === "30d"
        ? isSmall
          ? 6
          : 10
        : timeframe === "7d"
          ? isSmall
            ? 5
            : 7
          : 12;
    const step = Math.max(1, Math.floor(chartData.length / maxLabels));
    return chartData
      .filter((_, i) => i % step === 0 || i === chartData.length - 1)
      .map((d) => d.index);
  }, [chartData, timeframe, isSmall]);

  // Left Y domain derived strictly from visible series
  const yMaxLeftVisible = useMemo(() => {
    if (chartData.length === 0) return 1;
    let max = 0;
    for (const d of chartData) {
      const revenueSum =
        (enabledMetrics.suilendRevenue ? d.suilendRevenue : 0) +
        (enabledMetrics.steammRevenue ? d.steammRevenue : 0) +
        (enabledMetrics.springsuiRevenue ? d.springsuiRevenue : 0);
      const buy = enabledMetrics.buybacks ? d.buybacks : 0;
      const m = Math.max(revenueSum, buy);
      if (m > max) max = m;
    }
    // If values are below 1M, round up to nearest 0.05M for better readability
    if (max < 1) return Math.max(0.05, Math.ceil(max * 20) / 20);
    // Otherwise, use 1-2-5 progression
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const leading = max / magnitude;
    let niceLeading = 1;
    if (leading <= 1) niceLeading = 1;
    else if (leading <= 2) niceLeading = 2;
    else if (leading <= 5) niceLeading = 5;
    else niceLeading = 10;
    return niceLeading * magnitude;
  }, [chartData, enabledMetrics]);

  // console.log(yMaxLeftVisible);

  // Tooltip content styled like site cards
  const TooltipCard = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: {
      payload: {
        suilendRevenue: number;
        steammRevenue: number;
        springsuiRevenue: number;
        buybacks: number;
        price: number;
        timestamp: number;
      };
    }[];
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    const rows: Array<{ label: string; value: number; color?: string }> = [];
    if (enabledMetrics.suilendRevenue && d.suilendRevenue > 0)
      rows.push({
        label: "Suilend",
        value: d.suilendRevenue,
        color: COLOR_SUILEND,
      });
    if (enabledMetrics.steammRevenue && d.steammRevenue > 0)
      rows.push({
        label: "STEAMM",
        value: d.steammRevenue,
        color: COLOR_STEAMM,
      });
    if (enabledMetrics.springsuiRevenue && d.springsuiRevenue > 0)
      rows.push({
        label: "SpringSUI",
        value: d.springsuiRevenue,
        color: COLOR_SPRINGSUI,
      });
    if (enabledMetrics.buybacks && d.buybacks > 0)
      rows.push({
        label: "Buybacks",
        value: d.buybacks,
        color: COLOR_BUYBACKS,
      });
    const dateStr = formatTooltipDate(d.timestamp);
    return (
      <div className="rounded-md border bg-[#081126] text-foreground px-3 py-2 shadow-md">
        <div className="text-xs text-muted-foreground mb-2">{dateStr}</div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 text-sm mb-1"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: r.color }}
              />
              <span>{r.label}</span>
            </div>
            <span>{`$${r.value.toFixed(r.value < 1 ? 2 : 0)}M`}</span>
          </div>
        ))}
        {enabledMetrics.price && (
          <div className="flex items-center justify-between gap-4 text-sm mt-1">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: COLOR_PRICE_LINE }}
              />
              <span>Price</span>
            </div>
            <span>{`$${Number(d.price).toFixed(2)}`}</span>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="w-full h-[260px] md:h-[300px]">
      <Recharts.ResponsiveContainer width="100%" height="100%">
        <Recharts.ComposedChart
          data={chartData}
          margin={margin}
          barCategoryGap="0%"
          barGap={0}
        >
          <Recharts.CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <Recharts.XAxis
            dataKey="index"
            type="number"
            ticks={xTicks}
            tickFormatter={(value: number) => chartData[value]?.label ?? ""}
            tick={{
              fontSize: isSmall ? 10 : 12,
              fill: "hsl(var(--muted-foreground))",
            }}
            domain={[
              chartData.length > 0 ? -0.5 : 0,
              chartData.length > 0 ? chartData.length - 0.5 : 1,
            ]}
            tickMargin={isSmall ? 4 : 6}
          />
          <Recharts.YAxis
            yAxisId="left"
            orientation="left"
            tick={{
              fontSize: isSmall ? 10 : 12,
              fill: "hsl(var(--muted-foreground))",
            }}
            tickFormatter={(v: number) =>
              v < 1 ? `$${v.toFixed(2)}M` : `$${v}M`
            }
            domain={[0, yMaxLeftVisible]}
            allowDecimals
          >
            <Recharts.Label
              value="USD (M)"
              angle={-90}
              position="insideLeft"
              offset={isSmall ? 0 : -5}
              style={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: isSmall ? 10 : 12,
              }}
            />
          </Recharts.YAxis>
          <Recharts.YAxis
            yAxisId="right"
            orientation="right"
            tick={{
              fontSize: isSmall ? 10 : 12,
              fill: "hsl(var(--muted-foreground))",
            }}
            domain={[0, Math.max(1, maxYRight)]}
          >
            <Recharts.Label
              value="Price ($)"
              angle={90}
              position="insideRight"
              offset={10}
              style={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: isSmall ? 10 : 12,
              }}
            />
          </Recharts.YAxis>

          {enabledMetrics.suilendRevenue && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="suilendRevenue"
              stackId="revenue"
              fill={COLOR_SUILEND}
            />
          )}
          {enabledMetrics.steammRevenue && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="steammRevenue"
              stackId="revenue"
              fill={COLOR_STEAMM}
            />
          )}
          {enabledMetrics.springsuiRevenue && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="springsuiRevenue"
              stackId="revenue"
              fill={COLOR_SPRINGSUI}
            />
          )}
          {enabledMetrics.buybacks && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="buybacks"
              fill={COLOR_BUYBACKS}
              opacity={0.45}
            />
          )}
          {enabledMetrics.price && (
            <>
              {/* Invisible reference line segments to extend to axes */}
              <Recharts.Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                stroke="transparent"
                dot={false}
                isAnimationActive={false}
                points={undefined}
              />
              {/* Real line draws over full domain by padding domain with -0.5..N-0.5 */}
              <Recharts.Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                stroke={COLOR_PRICE_LINE}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                isAnimationActive={false}
                connectNulls
              />
            </>
          )}
          <Recharts.Tooltip content={<TooltipCard />} />
        </Recharts.ComposedChart>
      </Recharts.ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
