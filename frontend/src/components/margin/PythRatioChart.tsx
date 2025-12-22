import { useEffect, useRef, useState } from "react";

import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import {
  CandlestickData,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  IRange,
  ISeriesApi,
  LineStyle,
  MouseEventParams,
  Time,
  UTCTimestamp,
  createChart,
} from "lightweight-charts";
import { debounce } from "lodash";

import { formatPercent, formatToken } from "@suilend/sui-fe";

import Spinner from "@/components/shared/Spinner";
import { TLabel } from "@/components/shared/Typography";
import {
  CandlestickDataPoint,
  TimeRange,
  useMarginContext,
} from "@/contexts/MarginContext";
import { cn } from "@/lib/utils";

export default function PythRatioChart() {
  const {
    resolution,
    setResolution,
    timeRange,
    setTimeRange,
    isLoading,
    error,
    candlestickData,
    fetchData,
  } = useMarginContext();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Refs to track current values for the handler
  const candlestickDataRef = useRef<CandlestickDataPoint[]>(candlestickData);
  const timeRangeRef = useRef<TimeRange>(timeRange);

  // State for hovered candle OHLC display
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(
    null,
  );

  // Keep refs in sync
  useEffect(() => {
    candlestickDataRef.current = candlestickData;
  }, [candlestickData]);
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const timeFormatter = (time: number) =>
      formatDate(new Date(time * 1000), "yyyy/MM/dd HH:mm");

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#879bc4C0", // muted / 75%
        fontFamily: "var(--font-geist-sans)",
        fontSize: 11,
      },
      grid: {
        vertLines: {
          color: "#879bc41A", // muted / 10%
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: "#879bc41A", // muted / 10%
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#879bc4", // muted
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#020918", // background
        },
        horzLine: {
          color: "#879bc4", // muted
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#020918", // background
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) =>
          formatDate(new Date(time * 1000), "HH:mm"),
      },
      localization: {
        timeFormatter,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
      upColor: "#36BF8D", // green for bullish candles
      downColor: "#CA5149", // red for bearish candles
      borderUpColor: "#36BF8D",
      borderDownColor: "#CA5149",
      wickUpColor: "#36BF8D",
      wickDownColor: "#CA5149",
      priceFormat: {
        type: "price",
        precision: 4,
        minMove: 10 ** -4,
      },
    });

    // Handle crosshair move to show OHLC
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time || !seriesRef.current) {
        setHoveredCandle(null);
        return;
      }

      const data = param.seriesData.get(seriesRef.current) as
        | CandlestickData
        | undefined;
      if (!!data) setHoveredCandle(data);
      else setHoveredCandle(null);
    };
    chartRef.current.subscribeCrosshairMove(handleCrosshairMove);

    // Subscribe to visible range changes - fetch more data if needed
    const handleVisibleRangeChange = (newTimeRange: IRange<Time> | null) => {
      console.log("xxx handleVisibleRangeChange", newTimeRange);
      if (!newTimeRange) return;

      const visibleFrom = newTimeRange.from as number;
      const visibleTo = newTimeRange.to as number;

      if (candlestickDataRef.current.length === 0) return;
      const dataFrom = candlestickDataRef.current[0].time;
      const dataTo =
        candlestickDataRef.current[candlestickDataRef.current.length - 1].time;

      const needsEarlierData = visibleFrom < dataFrom;
      const needsLaterData = visibleTo > dataTo;

      if (needsEarlierData || needsLaterData) {
        // Expand the time range to cover visible area + padding
        const visibleDuration = visibleTo - visibleFrom;
        const padding = visibleDuration * 0.5;

        const newFromS = Math.min(
          timeRangeRef.current.fromS,
          Math.floor(visibleFrom - padding),
        );
        const newToS = Math.max(
          timeRangeRef.current.toS,
          Math.ceil(visibleTo + padding),
        );

        setTimeRange({ fromS: newFromS, toS: newToS });
      }
    };
    const debouncedHandleVisibleRangeChange = debounce(
      handleVisibleRangeChange,
      1000,
    );
    chartRef.current
      .timeScale()
      .subscribeVisibleTimeRangeChange(debouncedHandleVisibleRangeChange);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      chartRef.current?.unsubscribeCrosshairMove(handleCrosshairMove);

      chartRef.current
        ?.timeScale()
        .unsubscribeVisibleTimeRangeChange(debouncedHandleVisibleRangeChange);
      debouncedHandleVisibleRangeChange.cancel();

      window.removeEventListener("resize", handleResize);

      chartRef.current?.remove();
    };
  }, [setTimeRange]);

  // Update series data when candlestickData changes
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    if (candlestickData.length === 0) return;

    seriesRef.current.setData(candlestickData);
  }, [candlestickData]);

  const hasData = candlestickData.length > 0;

  // Use hovered candle or latest candle for display
  const displayCandlestickDataPoint: CandlestickDataPoint | null =
    hoveredCandle !== null
      ? {
          time: hoveredCandle.time as UTCTimestamp,
          open: hoveredCandle.open,
          high: hoveredCandle.high,
          low: hoveredCandle.low,
          close: hoveredCandle.close,
        }
      : (candlestickData[candlestickData.length - 1] ?? null);

  const isBullish =
    displayCandlestickDataPoint !== null
      ? displayCandlestickDataPoint.close >= displayCandlestickDataPoint.open
      : false; // No data to display

  return (
    <div className="relative h-full w-full overflow-hidden rounded-sm border">
      {isLoading &&
        (!hasData ? (
          // Spinner in center of the chart
          <div className="absolute inset-0 z-[3] flex items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          // Spinner in top right corner
          <div className="absolute right-2 top-2 z-[3]">
            <Spinner size="sm" />
          </div>
        ))}

      {/* Error in center of the chart */}
      {!!error && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center">
          <TLabel className="text-destructive">{error}</TLabel>
        </div>
      )}

      {/* OHLC Display */}
      {hasData && displayCandlestickDataPoint !== null && (
        <div className="absolute inset-x-0 top-0 z-[2] flex flex-row flex-wrap items-center gap-x-3 gap-y-1 bg-background/50 px-3 py-2">
          {/* Timestamp */}
          <TLabel className="uppercase">
            {formatDate(
              new Date(displayCandlestickDataPoint.time * 1000),
              "yyyy/MM/dd HH:mm",
            )}
          </TLabel>

          {/* Open */}
          <TLabel className="uppercase">
            Open{" "}
            <span className={isBullish ? "text-long" : "text-short"}>
              {formatToken(new BigNumber(displayCandlestickDataPoint.open), {
                dp: 4,
              })}
            </span>
          </TLabel>

          {/* High */}
          <TLabel className="uppercase">
            High{" "}
            <span className={isBullish ? "text-long" : "text-short"}>
              {formatToken(new BigNumber(displayCandlestickDataPoint.high), {
                dp: 4,
              })}
            </span>
          </TLabel>

          {/* Low */}
          <TLabel className="uppercase">
            Low{" "}
            <span className={isBullish ? "text-long" : "text-short"}>
              {formatToken(new BigNumber(displayCandlestickDataPoint.low), {
                dp: 4,
              })}
            </span>
          </TLabel>

          {/* Close */}
          <TLabel className="uppercase">
            Close{" "}
            <span className={isBullish ? "text-long" : "text-short"}>
              {formatToken(new BigNumber(displayCandlestickDataPoint.close), {
                dp: 4,
              })}
            </span>
          </TLabel>

          {/* Range */}
          <TLabel className="uppercase">
            Range{" "}
            <span className={isBullish ? "text-long" : "text-short"}>
              {formatPercent(
                new BigNumber(
                  (displayCandlestickDataPoint.high -
                    displayCandlestickDataPoint.low) /
                    displayCandlestickDataPoint.open,
                ),
              )}
            </span>
          </TLabel>
        </div>
      )}

      <div
        ref={chartContainerRef}
        className={cn("relative z-[1] h-full w-full", !hasData && "opacity-0")}
      />
    </div>
  );
}
