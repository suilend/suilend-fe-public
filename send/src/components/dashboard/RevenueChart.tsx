import { useEffect, useMemo, useState } from "react";

import * as Recharts from "recharts";

import {
  BuybacksPoint,
  Period,
  RevenuePoint,
  getBuybacksChart,
  getPriceChart,
  getRevenueChart,
} from "@/fetchers/fetchCharts";
import { toCompactCurrency } from "@/lib/utils";

type EnabledMetrics = {
  suilendRevenue: boolean;
  steammRevenue: boolean;
  springSuiRevenue: boolean;
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
  suilendRevenue: number; // USD
  steammRevenue: number; // USD
  springSuiRevenue: number; // USD
  buybacks: number; // USD
  price?: number; // USD (undefined when no datapoint)
};

// Colors: protocol-distinct hues. Metric is subtle via opacity.
const COLOR_SUILEND = "hsl(var(--primary))";
const COLOR_STEAMM = "hsl(var(--secondary))";
const COLOR_SPRINGSUI = "#6DA8FF";
const COLOR_PRICE_LINE = "hsl(var(--foreground))";
const COLOR_BUYBACKS = "#F08BD9"; // pink shade to match design

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

function formatHourLabel(ts: number): string {
  const d = new Date(ts);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  // No leading zero for hours; always 2-digit minutes
  return `${hours}:${pad2(minutes)}`;
}

function startOfDayUtc(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
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
    // Build timeline from revenue + buybacks ONLY to keep consistent bar spacing.
    // Do NOT include price timestamps here, or x-axis spacing becomes uneven.
    const tsSet = new Set<number>();
    (revenueData ?? []).forEach((p) => tsSet.add(p.timestamp));
    (buybacksData ?? []).forEach((p) => tsSet.add(p.timestamp));
    // Fallback: if both series are empty, use price to at least render the line
    if (tsSet.size === 0)
      (priceData ?? []).forEach((p) => tsSet.add(p.timestamp));
    const timestamps = Array.from(tsSet).sort((a, b) => a - b);

    const revenueByTs = new Map<number, RevenuePoint>(
      (revenueData ?? []).map((p) => [p.timestamp, p]),
    );
    const buybacksByTs = new Map<number, BuybacksPoint>(
      (buybacksData ?? []).map((p) => [p.timestamp, p]),
    );
    // For 1d we have intraday points; otherwise price is daily
    const isIntraday = period === "1d";
    const priceByTs = isIntraday
      ? new Map<number, number>(
          (priceData ?? []).map((p) => [p.timestamp, p.price]),
        )
      : undefined;
    const priceByDay = !isIntraday
      ? new Map<number, number>(
          (priceData ?? []).map((p) => [startOfDayUtc(p.timestamp), p.price]),
        )
      : undefined;
    const dayKeys = priceByDay
      ? Array.from(priceByDay.keys()).sort((a, b) => a - b)
      : [];
    let priceIdx = 0;

    return timestamps.map((ts) => {
      const rev = revenueByTs.get(ts);
      const buy = buybacksByTs.get(ts);
      // Resolve price: use intraday exact match for 1d; else carry-forward daily
      let price: number | undefined = undefined;
      if (isIntraday) {
        price = priceByTs?.get(ts);
      } else if (dayKeys.length > 0) {
        const dayTs = startOfDayUtc(ts);
        while (
          priceIdx + 1 < dayKeys.length &&
          dayKeys[priceIdx + 1] <= dayTs
        ) {
          priceIdx += 1;
        }
        const key = dayKeys[priceIdx] <= dayTs ? dayKeys[priceIdx] : undefined;
        price = key !== undefined ? priceByDay?.get(key) : undefined;
      }
      return {
        timestamp: ts,
        label: period === "1d" ? formatHourLabel(ts) : formatLabel(ts),
        suilendRevenue: rev?.suilendRevenue ?? 0,
        steammRevenue: rev?.steammRevenue ?? 0,
        springSuiRevenue: rev?.springSuiRevenue ?? 0,
        buybacks: buy?.usdValue ?? 0,
        price,
      };
    });
  }, [revenueData, buybacksData, priceData, period]);

  // For 1y and all, bucket weekly; otherwise serve as-is
  const effectiveRaw: RawPoint[] = useMemo(() => {
    if (period !== "1y" && period !== "all") return raw;
    const map = new Map<
      number,
      {
        ts: number;
        label: string;
        r1: number;
        r2: number;
        r3: number;
        b: number;
        pSum: number;
        pCount: number;
      }
    >();
    for (const pt of raw) {
      const bucket = startOfWeekUtc(pt.timestamp);
      const cur = map.get(bucket);
      if (!cur) {
        map.set(bucket, {
          ts: bucket,
          label: formatLabel(bucket),
          r1: pt.suilendRevenue,
          r2: pt.steammRevenue,
          r3: pt.springSuiRevenue,
          b: pt.buybacks,
          pSum: pt.price ?? 0,
          pCount: pt.price != null ? 1 : 0,
        });
      } else {
        cur.r1 += pt.suilendRevenue;
        cur.r2 += pt.steammRevenue;
        cur.r3 += pt.springSuiRevenue;
        cur.b += pt.buybacks;
        if (pt.price != null) {
          cur.pSum += pt.price;
          cur.pCount += 1;
        }
      }
    }
    const sorted = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
    return sorted.map((v) => ({
      timestamp: v.ts,
      label: formatLabel(v.ts),
      suilendRevenue: v.r1,
      steammRevenue: v.r2,
      springSuiRevenue: v.r3,
      buybacks: v.b,
      price: v.pCount > 0 ? v.pSum / v.pCount : undefined,
    }));
  }, [raw, period]);

  const processed = useMemo(() => {
    if (raw.length === 0)
      return [] as Array<{
        timestamp: number;
        label: string;
        suilend: { revenue: number; buybacks: number };
        steamm: { revenue: number; buybacks: number };
        springSuiRevenue: number;
        price: number;
      }>;

    if (!isCumulative) {
      return effectiveRaw.map((pt) => ({
        timestamp: pt.timestamp,
        label: pt.label,
        suilend: { revenue: pt.suilendRevenue, buybacks: pt.buybacks },
        steamm: { revenue: pt.steammRevenue, buybacks: 0 },
        springSuiRevenue: pt.springSuiRevenue,
        price: pt.price,
      }));
    }

    let cumSuilend = 0;
    let cumSteamm = 0;
    let cumBuy = 0;
    let cumSpring = 0;
    return effectiveRaw.map((pt) => {
      cumSuilend += pt.suilendRevenue;
      cumSteamm += pt.steammRevenue;
      cumBuy += pt.buybacks;
      cumSpring += pt.springSuiRevenue;
      return {
        timestamp: pt.timestamp,
        label: pt.label,
        suilend: { revenue: cumSuilend, buybacks: cumBuy },
        steamm: { revenue: cumSteamm, buybacks: 0 },
        springSuiRevenue: cumSpring,
        price: pt.price,
      };
    });
  }, [effectiveRaw, isCumulative, raw.length]);

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
        ? { top: 4, right: 6, left: 6, bottom: 6 }
        : { top: 10, right: 14, left: 14, bottom: 20 },
    [isSmall],
  );
  const yAxisWidth = isSmall ? 44 : 56; // fixed widths so the plot stays centered

  const { processed: data } = useProcessedData(timeframe, isCumulative);

  const maxYRight = useMemo(() => {
    if (!enabledMetrics.price) return 1;
    const m = Math.max(0, ...data.map((d) => d.price ?? 0));
    if (!Number.isFinite(m) || m <= 0) return 1;
    const exp = Math.floor(Math.log10(m));
    const step = Math.pow(10, Math.max(exp - 1, 0));
    if (!Number.isFinite(step) || step <= 0) return Math.ceil(m) || 1;
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
        springSuiRevenue: enabledMetrics.springSuiRevenue
          ? d.springSuiRevenue
          : 0,
        buybacks: enabledMetrics.buybacks ? d.suilend.buybacks : 0,
        price: d.price,
      })),
    [data, enabledMetrics],
  );

  const lastIndex = chartData.length > 0 ? chartData.length - 1 : -1;

  const xTicks = useMemo(() => {
    const n = chartData.length;
    if (n === 0) return [] as number[];
    // Aim for ~5 labels on small screens, ~10 on desktop, regardless of n
    const maxLabels = isSmall ? 5 : 10;
    const step = Math.max(1, Math.ceil(n / maxLabels));
    const ticks: number[] = [];
    for (let i = 0; i < n; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1);
    return ticks;
  }, [chartData, isSmall]);

  // Left Y domain derived strictly from visible series
  const yMaxLeftVisible = useMemo(() => {
    if (chartData.length === 0) return 1;
    let max = 0;
    for (const d of chartData) {
      const revenueSum =
        (enabledMetrics.suilendRevenue ? d.suilendRevenue : 0) +
        (enabledMetrics.steammRevenue ? d.steammRevenue : 0) +
        (enabledMetrics.springSuiRevenue ? d.springSuiRevenue : 0);
      const buy = enabledMetrics.buybacks ? d.buybacks : 0;
      const m = Math.max(revenueSum, buy);
      if (m > max) max = m;
    }
    if (max <= 0) return 1;
    // For sub-1 ranges, round up to nearest 0.05 for readability
    if (max < 1) return Math.max(0.05, Math.ceil(max / 0.05) * 0.05);
    // Aggressive scaling: use 0.5 progression (…, 0.5, 1.0, 1.5, 2.0, …) × 10^k
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const leading = max / magnitude;
    const niceLeading = Math.ceil(leading / 0.5) * 0.5;
    return niceLeading * magnitude;
  }, [chartData, enabledMetrics]);

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
        springSuiRevenue: number;
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
    if (enabledMetrics.springSuiRevenue && d.springSuiRevenue > 0)
      rows.push({
        label: "SpringSui",
        value: d.springSuiRevenue,
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
        <div className="text-xs text-muted-foreground font-sans mb-2">
          {dateStr}
        </div>
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
              <span className="font-sans text-muted-foreground">{r.label}</span>
            </div>
            <span>{toCompactCurrency(r.value)}</span>
          </div>
        ))}
        {enabledMetrics.price && d.price > 0 && (
          <div className="flex items-center justify-between gap-4 text-sm mt-1">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: COLOR_PRICE_LINE }}
              />
              <span className="font-sans text-muted-foreground">Price</span>
            </div>
            <span>{`$${Number(d.price).toFixed(2)}`}</span>
          </div>
        )}
      </div>
    );
  };

  // Bars fill x-axis: use barCategoryGap="0%" and barGap="-100%" to overlay series.

  // Rounded corners: only the top-most revenue segment should have rounded top edges
  const topRadius = isSmall ? 2 : 3;
  const topRevenueKey = enabledMetrics.springSuiRevenue
    ? "springSuiRevenue"
    : enabledMetrics.steammRevenue
      ? "steammRevenue"
      : enabledMetrics.suilendRevenue
        ? "suilendRevenue"
        : undefined;
  const CenteredRoundedTopRectFraction =
    (widthFraction: number, radius: number = 6) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
    ({ x, y, width, height, fill }: any) => {
      // Recharts gives the category slot (x,width); we recenter our own width
      const cx = x + width / 2;
      const w = Math.max(
        0,
        Math.floor(width * Math.max(0, Math.min(1, widthFraction))),
      );
      const h = height; // can be negative for negative values
      const left = cx - w / 2;
      const right = cx + w / 2;

      // For vertical bars, "top" depends on sign of height
      const isNegative = h < 0;
      const topY = isNegative ? y + h : y;
      const bottomY = isNegative ? y : y + h;

      // Clamp radius to fit
      const r = Math.max(0, Math.min(Math.abs(radius), w / 2, Math.abs(h) / 2));

      // If no rounding needed or height ~0, fall back to a plain rect path
      if (r === 0 || h === 0) {
        const dPlain = `M${left},${bottomY}V${topY}H${right}V${bottomY}Z`;
        return <path d={dPlain} fill={fill} opacity={0.5} />;
      }

      // Build a path that rounds ONLY the top-left and top-right corners.
      // Positive bar: round y=topY; Negative bar: "top" is bottomY visually, so swap.
      if (!isNegative) {
        // Positive bar (extends downward)
        const d = [
          `M${left},${bottomY}`, // start bottom-left
          `V${topY + r}`, // up left edge to start curve
          `Q${left},${topY} ${left + r},${topY}`, // top-left corner
          `H${right - r}`, // top edge
          `Q${right},${topY} ${right},${topY + r}`, // top-right corner
          `V${bottomY}`, // down right edge
          `Z`,
        ].join("");
        return <path d={d} fill={fill} opacity={0.5} />;
      } else {
        // Negative bar (extends upward) — "top" visually is bottomY
        const d = [
          `M${left},${topY}`, // start at real top-left (visually bottom)
          `V${bottomY - r}`, // down to start of "top" (visual) rounding
          `Q${left},${bottomY} ${left + r},${bottomY}`, // visual top-left
          `H${right - r}`,
          `Q${right},${bottomY} ${right},${bottomY - r}`, // visual top-right
          `V${topY}`,
          `Z`,
        ].join("");
        return <path d={d} fill={fill} opacity={0.5} />;
      }
    };

  return (
    <div className="w-full h-[240px] md:h-[300px]">
      <Recharts.ResponsiveContainer width="100%" height="100%">
        <Recharts.ComposedChart
          data={chartData}
          margin={margin}
          barCategoryGap="0%"
          barGap="-100%"
        >
          <defs>
            <pattern
              id="stripe-suilend"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={COLOR_SUILEND} opacity="0.4" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke={COLOR_SUILEND}
                strokeWidth="2"
              />
            </pattern>
            <pattern
              id="stripe-steamm"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={COLOR_STEAMM} opacity="0.4" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke={COLOR_STEAMM}
                strokeWidth="2"
              />
            </pattern>
            <pattern
              id="stripe-springsui"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={COLOR_SPRINGSUI} opacity="0.4" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke={COLOR_SPRINGSUI}
                strokeWidth="2"
              />
            </pattern>
            <pattern
              id="stripe-buybacks"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={COLOR_BUYBACKS} opacity="0.4" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke={COLOR_BUYBACKS}
                strokeWidth="2"
              />
            </pattern>
          </defs>
          <Recharts.CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <Recharts.XAxis
            dataKey="index"
            type="number"
            // Downsampled ticks for readability across long ranges
            ticks={xTicks}
            tickFormatter={(value: number) => chartData[value]?.label ?? ""}
            tick={{
              fontSize: isSmall ? 10 : 12,
              fill: "hsl(var(--muted-foreground))",
            }}
            className="text-xs font-sans text-muted-foreground"
            axisLine={true}
            tickLine={false}
            domain={[
              chartData.length > 0 ? -0.5 : 0,
              chartData.length > 0 ? chartData.length - 0.5 : 1,
            ]}
            tickMargin={isSmall ? 2 : 6}
            interval={0}
          />
          <Recharts.YAxis
            yAxisId="left"
            orientation="left"
            tick={{
              fontSize: isSmall ? 10 : 12,
              fill: "hsl(var(--muted-foreground))",
            }}
            className="text-xs font-sans text-muted-foreground"
            tickFormatter={(v: number) => toCompactCurrency(v)}
            domain={[0, yMaxLeftVisible]}
            allowDecimals
            width={yAxisWidth}
          >
            <Recharts.Label
              value={isSmall ? "" : "USD"}
              angle={-90}
              position="insideLeft"
              offset={isSmall ? 0 : -5}
              className="text-xs font-sans text-muted-foreground"
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
            tickFormatter={(v: number) => `$${v}`}
            domain={[0, Math.max(1, maxYRight)]}
            width={yAxisWidth}
            className="text-xs font-sans text-muted-foreground"
          >
            <Recharts.Label
              value={isSmall ? "" : "Price"}
              angle={90}
              position="insideRight"
              offset={10}
              className="text-xs font-sans text-muted-foreground"
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
              isAnimationActive={false}
              radius={
                topRevenueKey === "suilendRevenue"
                  ? [topRadius, topRadius, 0, 0]
                  : 0
              }
              shape={CenteredRoundedTopRectFraction(
                1,
                topRevenueKey === "suilendRevenue" ? topRadius : 0,
              )}
            >
              {chartData.map((_, i) => (
                <Recharts.Cell
                  key={`suil-${i}`}
                  fill={
                    i === lastIndex ? "url(#stripe-suilend)" : COLOR_SUILEND
                  }
                />
              ))}
            </Recharts.Bar>
          )}
          {enabledMetrics.steammRevenue && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="steammRevenue"
              stackId="revenue"
              fill={COLOR_STEAMM}
              isAnimationActive={false}
              radius={
                topRevenueKey === "steammRevenue"
                  ? [topRadius, topRadius, 0, 0]
                  : 0
              }
              shape={CenteredRoundedTopRectFraction(
                1,
                topRevenueKey === "steammRevenue" ? topRadius : 0,
              )}
            >
              {chartData.map((_, i) => (
                <Recharts.Cell
                  key={`stm-${i}`}
                  fill={i === lastIndex ? "url(#stripe-steamm)" : COLOR_STEAMM}
                />
              ))}
            </Recharts.Bar>
          )}
          {enabledMetrics.springSuiRevenue && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="springSuiRevenue"
              stackId="revenue"
              fill={COLOR_SPRINGSUI}
              isAnimationActive={false}
              radius={
                topRevenueKey === "springSuiRevenue"
                  ? [topRadius, topRadius, 0, 0]
                  : 0
              }
              shape={CenteredRoundedTopRectFraction(
                1,
                topRevenueKey === "springSuiRevenue" ? topRadius : 0,
              )}
            >
              {chartData.map((_, i) => (
                <Recharts.Cell
                  key={`spr-${i}`}
                  fill={
                    i === lastIndex ? "url(#stripe-springsui)" : COLOR_SPRINGSUI
                  }
                />
              ))}
            </Recharts.Bar>
          )}
          {enabledMetrics.buybacks && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="buybacks"
              fill={COLOR_BUYBACKS}
              isAnimationActive={false}
              radius={[topRadius, topRadius, 0, 0]}
              shape={CenteredRoundedTopRectFraction(1, topRadius)}
            >
              {chartData.map((_, i) => (
                <Recharts.Cell
                  key={`buy-${i}`}
                  fill={
                    i === lastIndex ? "url(#stripe-buybacks)" : COLOR_BUYBACKS
                  }
                />
              ))}
            </Recharts.Bar>
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
              {/* Real line draws; do not connect across nulls */}
              <Recharts.Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                stroke={COLOR_PRICE_LINE}
                strokeWidth={isSmall ? 1.5 : 2.5}
                dot={chartData.length <= 100 ? { r: 1 } : undefined}
                isAnimationActive={false}
                connectNulls={false}
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
