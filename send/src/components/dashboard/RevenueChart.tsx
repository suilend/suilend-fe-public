import { useCallback, useMemo, useState } from "react";

import { AlertCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  BuybacksPoint,
  Period,
  PricePoint,
  RevenuePoint,
  getBuybacksChart,
  getPriceChart,
  getRevenueChart,
} from "@/fetchers/fetchCharts";

type Timeframe = "7D" | "1M" | "ALL";

type MetricKey = "revenue" | "buybacks" | "price";

type ProtocolKey = "suilend" | "steamm";

type EnabledMetrics = Record<MetricKey, boolean>;
type RevenueScope = "all" | ProtocolKey;

type ChartProps = {
  timeframe: Timeframe;
  isCumulative: boolean;
  enabledMetrics: EnabledMetrics;
  revenueScope: RevenueScope;
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
const COLOR_PRICE_LINE = "hsl(var(--muted-foreground))";
const COLOR_BUYBACKS = "hsl(var(--primary))"; // will render with lower opacity

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

function mapTimeframeToPeriod(tf: Timeframe): Period {
  if (tf === "7D") return "7d";
  if (tf === "1M") return "30d";
  return "90d"; // ALL -> 90d (closest available)
}

function formatLabel(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function useProcessedData(timeframe: Timeframe, isCumulative: boolean) {
  const period = mapTimeframeToPeriod(timeframe);
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
    const tsSet = new Set<number>();
    (revenueData ?? []).forEach((p) => tsSet.add(p.timestamp));
    (buybacksData ?? []).forEach((p) => tsSet.add(p.timestamp));
    (priceData ?? []).forEach((p) => tsSet.add(p.timestamp));
    const timestamps = Array.from(tsSet).sort((a, b) => a - b);

    const revenueByTs = new Map<number, RevenuePoint>();
    (revenueData ?? []).forEach((p) => revenueByTs.set(p.timestamp, p));
    const buybacksByTs = new Map<number, BuybacksPoint>();
    (buybacksData ?? []).forEach((p) => buybacksByTs.set(p.timestamp, p));
    const priceByTs = new Map<number, PricePoint>();
    (priceData ?? []).forEach((p) => priceByTs.set(p.timestamp, p));

    const points: RawPoint[] = timestamps.map((ts) => {
      const rev = revenueByTs.get(ts);
      const buy = buybacksByTs.get(ts);
      const pr = priceByTs.get(ts);
      const suilendRevenueM = rev ? rev.suilendRevenue / 1_000_000 : 0;
      const steammRevenueM = rev ? rev.steammRevenue / 1_000_000 : 0;
      const buybacksM = buy ? buy.usdValue / 1_000_000 : 0;
      const price = pr ? pr.price : 0;
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

  const processed = useMemo(() => {
    if (raw.length === 0)
      return [] as Array<{
        label: string;
        suilend: { revenue: number; buybacks: number };
        steamm: { revenue: number; buybacks: number };
        price: number;
      }>;

    if (!isCumulative) {
      return raw.map((pt) => ({
        label: pt.label,
        suilend: { revenue: pt.suilendRevenueM, buybacks: pt.buybacksM },
        steamm: { revenue: pt.steammRevenueM, buybacks: 0 },
        price: pt.price,
      }));
    }

    let cumSuilend = 0;
    let cumSteamm = 0;
    let cumBuy = 0;
    return raw.map((pt) => {
      cumSuilend += pt.suilendRevenueM;
      cumSteamm += pt.steammRevenueM;
      cumBuy += pt.buybacksM;
      return {
        label: pt.label,
        suilend: { revenue: cumSuilend, buybacks: cumBuy },
        steamm: { revenue: cumSteamm, buybacks: 0 },
        price: pt.price,
      };
    });
  }, [raw, isCumulative]);

  return { processed, loading, anyError };
}

const RevenueChart = ({
  timeframe,
  isCumulative,
  enabledMetrics,
  revenueScope,
}: ChartProps) => {
  const chartWidth = 860;
  const chartHeight = 300;
  const margin = { top: 16, right: 20, left: 48, bottom: 28 };
  const width = chartWidth - margin.left - margin.right;
  const height = chartHeight - margin.top - margin.bottom;

  const {
    processed: data,
    loading,
    anyError,
  } = useProcessedData(timeframe, isCumulative);

  // Left Y (bars) and Right Y (price)
  const maxYLeft = useMemo(() => {
    const totals = data.map((d) => {
      const revenueVal = enabledMetrics.revenue
        ? revenueScope === "all"
          ? d.suilend.revenue + d.steamm.revenue
          : d[revenueScope].revenue
        : 0;
      const buybacksVal = enabledMetrics.buybacks ? d.suilend.buybacks : 0;
      return Math.max(revenueVal, buybacksVal);
    });
    const m = Math.max(1, ...totals);
    const step = Math.pow(10, Math.floor(Math.log10(m)) - 1);
    return Math.ceil(m / step) * step;
  }, [data, enabledMetrics, revenueScope]);

  const maxYRight = useMemo(() => {
    if (!enabledMetrics.price) return 1;
    const m = Math.max(1, ...data.map((d) => d.price));
    const step = Math.pow(10, Math.floor(Math.log10(m)) - 1);
    return Math.ceil(m / step) * step;
  }, [data, enabledMetrics.price]);

  const getX = useCallback(
    (i: number) => (i / Math.max(1, data.length - 1)) * width,
    [data, width],
  );
  const getYLeft = useCallback(
    (v: number) => height - (v / maxYLeft) * height,
    [height, maxYLeft],
  );
  const getYRight = useCallback(
    (v: number) => height - (v / maxYRight) * height,
    [height, maxYRight],
  );

  const priceLine = useMemo(() => {
    if (!enabledMetrics.price) return [] as { x: number; y: number }[];
    return data.map((d, i) => ({ x: getX(i), y: getYRight(d.price) }));
  }, [data, enabledMetrics.price, getX, getYRight]);

  const gridValuesLeft = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(maxYLeft * t),
  );
  const gridValuesRight = [0, 0.25, 0.5, 0.75, 1].map((t) =>
    Math.round(maxYRight * t),
  );

  // Hover state for tooltips
  const [hover, setHover] = useState<
    | { type: "revenue"; index: number; protocol: ProtocolKey; value: number }
    | { type: "buybacks"; index: number; value: number }
    | { type: "price"; index: number; value: number }
    | null
  >(null);

  return (
    <div className="w-full h-[300px] overflow-hidden">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-full"
      >
        {/* Grid */}
        {gridValuesLeft.map((value, i) => {
          const y = margin.top + getYLeft(value);
          return (
            <g key={i}>
              <line
                x1={margin.left}
                y1={y}
                x2={margin.left + width}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity={0.35}
              />
              <text
                x={margin.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="hsl(var(--muted-foreground))"
                fontSize="12"
              >
                ${value}M
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line
          x1={margin.left}
          y1={margin.top + height}
          x2={margin.left + width}
          y2={margin.top + height}
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Loading / Error overlays */}
        {loading && (
          <foreignObject
            x={margin.left}
            y={margin.top}
            width={width}
            height={height}
          >
            <div className="w-full h-full">
              <Skeleton className="w-full h-full" />
            </div>
          </foreignObject>
        )}
        {anyError && (
          <g>
            <text
              x={margin.left + 8}
              y={margin.top + 16}
              fill="red"
              fontSize="12"
              className="flex items-center"
            ></text>
            <g transform={`translate(${margin.left + 8}, ${margin.top + 8})`}>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </g>
          </g>
        )}

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={margin.left + getX(i)}
            y={margin.top + height + 16}
            textAnchor="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="10"
          >
            {d.label}
          </text>
        ))}

        {/* Side-by-side bars: left = Revenue (stacked by protocol per scope), right = Buybacks (single) */}
        {data.map((d, i) => {
          const centerX = margin.left + getX(i);
          const segmentWidth = width / Math.max(1, data.length);
          const barWidth = Math.min(18, Math.max(6, segmentWidth * 0.35));
          const gap = Math.max(2, segmentWidth * 0.05);
          const revX = centerX - gap / 2 - barWidth;
          const buyX = centerX + gap / 2;

          // Revenue segments depending on scope
          const revenueSegments: Array<{
            value: number;
            color: string;
            protocol: ProtocolKey;
          }> = [];
          if (enabledMetrics.revenue) {
            if (revenueScope === "all") {
              if (d.suilend.revenue > 0)
                revenueSegments.push({
                  value: d.suilend.revenue,
                  color: COLOR_SUILEND,
                  protocol: "suilend",
                });
              if (d.steamm.revenue > 0)
                revenueSegments.push({
                  value: d.steamm.revenue,
                  color: COLOR_STEAMM,
                  protocol: "steamm",
                });
            } else {
              const val = d[revenueScope].revenue;
              if (val > 0)
                revenueSegments.push({
                  value: val,
                  color:
                    revenueScope === "suilend" ? COLOR_SUILEND : COLOR_STEAMM,
                  protocol: revenueScope,
                });
            }
          }

          // Buybacks single bar (sum of protocols), subtle color
          const buybacksValue = enabledMetrics.buybacks
            ? d.suilend.buybacks
            : 0; // stored in suilend.buybacks

          // Draw revenue stacked
          let yCursorRev = margin.top + getYLeft(0);
          const revenueRects = revenueSegments.map((seg, idx) => {
            const h = (seg.value / maxYLeft) * height;
            const y = yCursorRev - h;
            yCursorRev = y;
            return (
              <rect
                key={`r-${idx}`}
                x={revX}
                y={y}
                width={barWidth}
                height={h}
                fill={seg.color}
                opacity={1}
                onMouseEnter={() =>
                  setHover({
                    type: "revenue",
                    index: i,
                    protocol: seg.protocol,
                    value: seg.value,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          });

          // Draw buybacks bar
          const buybacksHeight = (buybacksValue / maxYLeft) * height;
          const buybacksY = margin.top + getYLeft(0) - buybacksHeight;
          const buybackRect = (
            <rect
              key={`b-${i}`}
              x={buyX}
              y={buybacksY}
              width={barWidth}
              height={buybacksHeight}
              fill={COLOR_BUYBACKS}
              opacity={0.45}
              onMouseEnter={() =>
                setHover({ type: "buybacks", index: i, value: buybacksValue })
              }
              onMouseLeave={() => setHover(null)}
            />
          );

          return (
            <g key={i}>
              {revenueRects}
              {buybackRect}
            </g>
          );
        })}

        {/* Price line on right axis */}
        {priceLine.length > 0 && (
          <g>
            <path
              d={buildPath(
                priceLine.map((p) => ({
                  x: margin.left + p.x,
                  y: margin.top + p.y,
                })),
              )}
              fill="none"
              stroke={COLOR_PRICE_LINE}
              strokeWidth={2.5}
            />
            {priceLine.map((p, i) => (
              <g key={i}>
                <circle
                  cx={margin.left + p.x}
                  cy={margin.top + p.y}
                  r={3}
                  fill={COLOR_PRICE_LINE}
                />
                <circle
                  cx={margin.left + p.x}
                  cy={margin.top + p.y}
                  r={10}
                  fill="transparent"
                  onMouseEnter={() =>
                    setHover({ type: "price", index: i, value: data[i].price })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            ))}
          </g>
        )}

        {/* Right axis ticks */}
        {enabledMetrics.price && (
          <g>
            {gridValuesRight.map((value, i) => {
              const y = margin.top + getYRight(value);
              return (
                <text
                  key={i}
                  x={margin.left + width + 6}
                  y={y + 4}
                  textAnchor="start"
                  fill="hsl(var(--muted-foreground))"
                  fontSize="12"
                >
                  ${value}
                </text>
              );
            })}
          </g>
        )}

        {/* Tooltip rendering */}
        {hover && (
          <g>
            {hover.type !== "price" &&
              (() => {
                const i = hover.index;
                const centerX = margin.left + getX(i);
                const segmentWidth = width / Math.max(1, data.length);
                const barWidth = Math.min(18, Math.max(6, segmentWidth * 0.35));
                const gap = Math.max(2, segmentWidth * 0.05);
                const isRevenue = hover.type === "revenue";
                const x = isRevenue
                  ? centerX - gap / 2 - barWidth
                  : centerX + gap / 2;
                const value = hover.value;
                const y = isRevenue
                  ? (() => {
                      // compute top of hovered segment for better tooltip placement
                      const segments: Array<{
                        value: number;
                        protocol: ProtocolKey;
                      }> = [];
                      if (revenueScope === "all") {
                        if (enabledMetrics.revenue) {
                          segments.push({
                            value: data[i].suilend.revenue,
                            protocol: "suilend",
                          });
                          segments.push({
                            value: data[i].steamm.revenue,
                            protocol: "steamm",
                          });
                        }
                      } else if (enabledMetrics.revenue) {
                        segments.push({
                          value: data[i][revenueScope].revenue,
                          protocol: revenueScope,
                        });
                      }
                      let cursor = margin.top + getYLeft(0);
                      for (const seg of segments) {
                        const h = (seg.value / maxYLeft) * height;
                        const top = cursor - h;
                        if (
                          seg.protocol ===
                          (hover as { protocol: ProtocolKey }).protocol
                        )
                          return top;
                        cursor = top;
                      }
                      return cursor;
                    })()
                  : margin.top + getYLeft(value);

                const boxX = x - 6;
                const boxY = y - 28;
                const label =
                  hover.type === "revenue"
                    ? `Revenue – ${(hover as { protocol: ProtocolKey }).protocol === "suilend" ? "Suilend" : "STEAMM"}`
                    : "Buybacks";
                const text = `${label}: $${value.toFixed(2)}M`;
                return (
                  <g>
                    <rect
                      x={boxX}
                      y={boxY}
                      width={150}
                      height={24}
                      rx={4}
                      ry={4}
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--border))"
                    />
                    <text
                      x={boxX + 8}
                      y={boxY + 16}
                      fill="hsl(var(--foreground))"
                      fontSize="12"
                    >
                      {text}
                    </text>
                  </g>
                );
              })()}
            {hover.type === "price" &&
              (() => {
                const i = hover.index;
                const p = priceLine[i];
                if (!p) return null;
                const x = margin.left + p.x + 8;
                const y = margin.top + p.y - 28;
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={100}
                      height={24}
                      rx={4}
                      ry={4}
                      fill="hsl(var(--card))"
                      stroke="hsl(var(--border))"
                    />
                    <text
                      x={x + 8}
                      y={y + 16}
                      fill="hsl(var(--foreground))"
                      fontSize="12"
                    >
                      Price: ${hover.value.toFixed(2)}
                    </text>
                  </g>
                );
              })()}
          </g>
        )}
      </svg>
    </div>
  );
};

export default RevenueChart;
