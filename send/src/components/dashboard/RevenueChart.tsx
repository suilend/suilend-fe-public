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
  suilendRevenue: number; // USD
  steammRevenue: number; // USD
  buybacks: number; // USD
  price?: number; // USD (undefined when no datapoint)
};

// Colors: protocol-distinct hues. Metric is subtle via opacity.
const COLOR_SUILEND = "hsl(var(--primary))";
const COLOR_STEAMM = "hsl(var(--secondary))";
const COLOR_SPRINGSUI = "#6DA8FF";
const COLOR_PRICE_LINE = "hsl(var(--muted-foreground))";
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

function startOf4HourUtc(ts: number): number {
  const date = new Date(ts);
  const floorHour = Math.floor(date.getUTCHours() / 4) * 4;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    floorHour,
    0,
    0,
    0,
  );
}

function format4HourLabel(ts: number): string {
  const start = new Date(ts);
  const end = new Date(ts + 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(start.getUTCHours())}–${pad(end.getUTCHours())}h`;
}

function useProcessedData(
  period: Period,
  isCumulative: boolean,
  isSmall: boolean,
) {
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
    // Build the union of timestamps from all series without any tolerance
    const tsSet = new Set<number>();
    (revenueData ?? []).forEach((p) => tsSet.add(p.timestamp));
    (buybacksData ?? []).forEach((p) => tsSet.add(p.timestamp));
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
        buybacks: buy?.usdValue ?? 0,
        price,
      };
    });
  }, [revenueData, buybacksData, priceData, period]);

  // Bucketing rules vary for mobile vs desktop
  const bucketedRaw: RawPoint[] = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;

    const aggregate = (
      getBucketKey: (ts: number) => number,
      makeLabel: (bucket: number) => string,
      nextTick?: (ts: number) => number | null,
    ) => {
      const map = new Map<
        number,
        {
          ts: number;
          label: string;
          r1: number;
          r2: number;
          b: number;
          pSum: number;
          pCount: number;
        }
      >();
      for (const pt of raw) {
        const bucket = getBucketKey(pt.timestamp);
        const cur = map.get(bucket);
        if (!cur) {
          map.set(bucket, {
            ts: bucket,
            label: makeLabel(bucket),
            r1: pt.suilendRevenue,
            r2: pt.steammRevenue,
            b: pt.buybacks,
            pSum: pt.price ?? 0,
            pCount: pt.price != null ? 1 : 0,
          });
        } else {
          cur.r1 += pt.suilendRevenue;
          cur.r2 += pt.steammRevenue;
          cur.b += pt.buybacks;
          if (pt.price != null) {
            cur.pSum += pt.price;
            cur.pCount += 1;
          }
        }
      }
      const sorted = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
      if (!nextTick) {
        return sorted.map((v) => ({
          timestamp: v.ts,
          label: makeLabel(v.ts),
          suilendRevenue: v.r1,
          steammRevenue: v.r2,
          buybacks: v.b,
          price: v.pCount > 0 ? v.pSum / v.pCount : undefined,
        }));
      }
      if (sorted.length === 0) return [] as RawPoint[];
      const byTs = new Map(sorted.map((v) => [v.ts, v] as const));
      const out: RawPoint[] = [];
      for (
        let t = sorted[0].ts;
        t !== null && t <= sorted[sorted.length - 1].ts;

      ) {
        const v = byTs.get(t);
        if (v) {
          out.push({
            timestamp: v.ts,
            label: makeLabel(v.ts),
            suilendRevenue: v.r1,
            steammRevenue: v.r2,
            buybacks: v.b,
            price: v.pCount > 0 ? v.pSum / v.pCount : undefined,
          });
        } else {
          out.push({
            timestamp: t,
            label: makeLabel(t),
            suilendRevenue: 0,
            steammRevenue: 0,
            buybacks: 0,
            price: undefined,
          });
        }
        const nt = nextTick(t);
        if (nt === null) break;
        t = nt;
      }
      return out;
    };

    if (isSmall) {
      // Mobile bucketing
      if (period === "1d")
        return aggregate(
          startOf4HourUtc,
          format4HourLabel,
          (t) => t + 4 * 60 * 60 * 1000,
        );
      if (period === "7d")
        return aggregate(
          startOfDayUtc,
          (b) => formatWeekLabel(b),
          (t) => t + dayMs,
        );
      if (period === "30d")
        return aggregate(
          startOfWeekUtc,
          (b) => formatWeekLabel(b),
          (t) => t + 7 * dayMs,
        );
      if (period === "90d") {
        const get15Day = (ts: number) => {
          const d0 = startOfDayUtc(ts);
          const idx = Math.floor(d0 / dayMs);
          const base = Math.floor(idx / 15) * 15;
          return base * dayMs;
        };
        return aggregate(
          get15Day,
          (b) => formatWeekLabel(b),
          (t) => t + 15 * dayMs,
        );
      }
      if (period === "1y" || period === "all") {
        const twoMonth = (ts: number) => {
          const d = new Date(ts);
          const mi = d.getUTCFullYear() * 12 + d.getUTCMonth();
          const bucketM = Math.floor(mi / 2) * 2;
          const y = Math.floor(bucketM / 12);
          const m = bucketM % 12;
          return Date.UTC(y, m, 1);
        };
        const next2Months = (t: number) => {
          const d = new Date(t);
          const y = d.getUTCFullYear();
          const m = d.getUTCMonth() + 2;
          return Date.UTC(y + Math.floor(m / 12), m % 12, 1);
        };
        return aggregate(twoMonth, (b) => formatMonthLabel(b), next2Months);
      }
      return raw;
    }

    // Desktop bucketing
    if (period === "1d") {
      const hourMs = 60 * 60 * 1000;
      const startOfHour = (ts: number) => Math.floor(ts / hourMs) * hourMs;
      return aggregate(
        startOfHour,
        (b) => formatHourLabel(b),
        (t) => t + hourMs,
      );
    }
    if (period === "7d") {
      return aggregate(
        startOfDayUtc,
        (b) => formatWeekLabel(b),
        (t) => t + dayMs,
      );
    }
    if (period === "30d" || period === "90d") {
      return aggregate(
        startOfWeekUtc,
        (b) => formatWeekLabel(b),
        (t) => t + 7 * dayMs,
      );
    }
    if (period === "1y" || period === "all") {
      const nextMonth = (t: number) => {
        const d = new Date(t);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        return Date.UTC(y + Math.floor(m / 12), m % 12, 1);
      };
      return aggregate(startOfMonthUtc, (b) => formatMonthLabel(b), nextMonth);
    }
    // 1d and 7d: show raw
    return raw;
  }, [raw, period, isSmall]);

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
        suilend: { revenue: pt.suilendRevenue, buybacks: pt.buybacks },
        steamm: { revenue: pt.steammRevenue, buybacks: 0 },
        price: pt.price,
      }));
    }

    let cumSuilend = 0;
    let cumSteamm = 0;
    let cumBuy = 0;
    return bucketedRaw.map((pt) => {
      cumSuilend += pt.suilendRevenue;
      cumSteamm += pt.steammRevenue;
      cumBuy += pt.buybacks;
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
        ? { top: 4, right: 6, left: 6, bottom: 6 }
        : { top: 10, right: 14, left: 14, bottom: 20 },
    [isSmall],
  );
  const yAxisWidth = isSmall ? 44 : 56; // fixed widths so the plot stays centered

  const { processed: data } = useProcessedData(
    timeframe,
    isCumulative,
    isSmall,
  );

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
        springsuiRevenue: enabledMetrics.springsuiRevenue ? 0 : 0,
        buybacks: enabledMetrics.buybacks ? d.suilend.buybacks : 0,
        price: d.price,
      })),
    [data, enabledMetrics],
  );

  const xTicks = useMemo(() => {
    if (chartData.length === 0) return [] as number[];
    // Prefer cadence-based ticks to avoid adjacent duplicates
    const firstTs = chartData[0].timestamp;
    const lastTs = chartData[chartData.length - 1].timestamp;
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    let cadence = hour; // default hourly
    if (timeframe === "1d")
      cadence = isSmall ? 4 * hour : 2 * hour; // mobile: 4h, desktop: 2h tick cadence
    else if (timeframe === "7d") cadence = day;
    else if (timeframe === "30d") cadence = 7 * day;
    else if (timeframe === "90d") cadence = isSmall ? 15 * day : 7 * day;
    else cadence = isSmall ? 60 * day : 30 * day; // coarse fallback

    const alignToCadence = (ts: number) => Math.floor(ts / cadence) * cadence;
    let cursor = alignToCadence(firstTs);
    if (cursor < firstTs) cursor += cadence;

    const ticksTs: number[] = [];
    while (cursor <= lastTs + 1) {
      // +1ms tolerance
      ticksTs.push(cursor);
      cursor += cadence;
    }

    // Map cadence timestamps to nearest indices in chartData (not just floor)
    const indices: number[] = [];
    let j = 0;
    for (const t of ticksTs) {
      while (
        j + 1 < chartData.length &&
        Math.abs(chartData[j + 1].timestamp - t) <=
          Math.abs(chartData[j].timestamp - t)
      )
        j++;
      indices.push(chartData[j].index);
    }
    // De-duplicate indices
    const uniq: number[] = [];
    for (const idx of indices)
      if (uniq[uniq.length - 1] !== idx) uniq.push(idx);
    // Ensure first/last indices are included so edge labels render
    const lastIdx = chartData[chartData.length - 1].index;
    if (uniq.length === 0 || uniq[0] !== chartData[0].index)
      uniq.unshift(chartData[0].index);
    if (uniq[uniq.length - 1] !== lastIdx) uniq.push(lastIdx);
    return uniq;
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
        label: "SpringSui",
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
  const topRevenueKey = enabledMetrics.springsuiRevenue
    ? "springsuiRevenue"
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
      const w = Math.max(0, Math.floor(width * Math.max(0, Math.min(1, widthFraction))));
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
        return <path d={dPlain} fill={fill} opacity={0.5}/>;
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
        return <path d={d} fill={fill} opacity={0.5}  />;
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
            className="text-xs font-sans text-muted-foreground"
            axisLine={true}
            tickLine={false}
            domain={[
              chartData.length > 0 ? -0.5 : 0,
              chartData.length > 0 ? chartData.length - 0.5 : 1,
            ]}
            tickMargin={isSmall ? 2 : 6}
            interval={"preserveStartEnd"}
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
            domain={[0, Math.max(1, maxYRight)]}
            width={yAxisWidth}
            className="text-xs font-sans text-muted-foreground"
          >
            <Recharts.Label
              value={isSmall ? "" : "Price ($)"}
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
            />
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
            />
          )}
          {enabledMetrics.springsuiRevenue && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="springsuiRevenue"
              stackId="revenue"
              fill={COLOR_SPRINGSUI}
              isAnimationActive={false}
              radius={
                topRevenueKey === "springsuiRevenue"
                  ? [topRadius, topRadius, 0, 0]
                  : 0
              }
              shape={CenteredRoundedTopRectFraction(
                1,
                topRevenueKey === "springsuiRevenue" ? topRadius : 0,
              )}
            />
          )}
          {enabledMetrics.buybacks && (
            <Recharts.Bar
              yAxisId="left"
              dataKey="buybacks"
              fill={COLOR_BUYBACKS}
              isAnimationActive={false}
              radius={[topRadius, topRadius, 0, 0]}
              shape={CenteredRoundedTopRectFraction(1, topRadius)}
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
              {/* Real line draws; do not connect across nulls */}
              <Recharts.Line
                yAxisId="right"
                type="monotone"
                dataKey="price"
                stroke={COLOR_PRICE_LINE}
                strokeWidth={2.5}
                dot={{ r: 3 }}
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
