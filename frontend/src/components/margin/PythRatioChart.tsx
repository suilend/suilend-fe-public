import { useCallback, useEffect, useRef } from "react";

import {
  ColorType,
  CrosshairMode,
  IChartApi,
  IRange,
  ISeriesApi,
  LineSeries,
  LineStyle,
  Time,
  createChart,
} from "lightweight-charts";
import { DebouncedFunc, debounce } from "lodash";

import Spinner from "@/components/shared/Spinner";
import { TLabel } from "@/components/shared/Typography";
import {
  RatioDataPoint,
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
    ratioData,
    fetchData,
  } = useMarginContext();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Refs to track current values for the handler
  const ratioDataRef = useRef<RatioDataPoint[]>(ratioData);
  const timeRangeRef = useRef<TimeRange>(timeRange);

  // Keep refs in sync
  useEffect(() => {
    ratioDataRef.current = ratioData;
  }, [ratioData]);
  useEffect(() => {
    timeRangeRef.current = timeRange;
  }, [timeRange]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    seriesRef.current = chartRef.current.addSeries(LineSeries, {
      color: "#ffffff", // foreground
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      priceFormat: {
        type: "price",
        precision: 4,
        minMove: 10 ** -4,
      },
    });

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
      window.removeEventListener("resize", handleResize);
      chartRef.current?.remove();
    };
  }, []);

  // Update series data when ratioData changes
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    if (ratioData.length === 0) return;

    seriesRef.current.setData(ratioData);
  }, [ratioData]);

  // Subscribe to visible range changes - fetch more data if needed
  const handleVisibleRangeChange = useCallback(
    (newTimeRange: IRange<Time> | null) => {
      console.log("xxx handleVisibleRangeChange", newTimeRange);
      if (!newTimeRange) return;

      const visibleFrom = newTimeRange.from as number;
      const visibleTo = newTimeRange.to as number;

      if (ratioDataRef.current.length === 0) return;
      const dataFrom = ratioDataRef.current[0].time;
      const dataTo = ratioDataRef.current[ratioDataRef.current.length - 1].time;

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
    },
    [setTimeRange],
  );
  const debouncedHandleVisibleRangeChangeRef = useRef<
    DebouncedFunc<typeof handleVisibleRangeChange>
  >(debounce(handleVisibleRangeChange, 1000));

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;

    const debouncedHandleVisibleRangeChange =
      debouncedHandleVisibleRangeChangeRef.current;
    chart
      .timeScale()
      .subscribeVisibleTimeRangeChange(debouncedHandleVisibleRangeChange);

    return () => {
      chart
        .timeScale()
        .unsubscribeVisibleTimeRangeChange(debouncedHandleVisibleRangeChange);
      debouncedHandleVisibleRangeChange.cancel();
    };
  }, []);

  const hasData = ratioData.length > 0;

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

      <div
        ref={chartContainerRef}
        className={cn("relative z-[1] h-full w-full", !hasData && "opacity-0")}
      />
    </div>
  );
}
