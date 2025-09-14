import { useEffect, useMemo, useRef } from "react";

import BigNumber from "bignumber.js";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import { Side } from "@suilend/sdk/lib/types";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import {
  COINTYPE_COLOR_MAP,
  Token,
  formatToken,
  formatUsd,
} from "@suilend/sui-fe";

import HistoricalLineChart, {
  ChartData,
} from "@/components/dashboard/actions-modal/HistoricalLineChart";
import Button from "@/components/shared/Button";
import {
  TBody,
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import { useReserveAssetDataEventsContext } from "@/contexts/ReserveAssetDataEventsContext";
import { ViewBox, getTooltipStyle } from "@/lib/chart";
import {
  DAYS,
  DAYS_MAP,
  DAY_S,
  Days,
  RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP,
} from "@/lib/events";
import { cn } from "@/lib/utils";

const getFieldColor = (field: string, token: Token) => {
  if (field === "availableAmount") return "hsl(var(--foreground))";
  return COINTYPE_COLOR_MAP[token.coinType] ?? "hsl(var(--muted))";
};

interface TooltipContentProps {
  side: Side;
  token: Token;
  fields: string[];
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContent({
  side,
  token,
  fields,
  d,
  viewBox,
  x,
}: TooltipContentProps) {
  if (fields.every((field) => d[field] === undefined)) return null;
  if (viewBox === undefined || x === undefined) return null;

  return (
    // Subset of TooltipContent className
    <div
      className="absolute rounded-md border bg-popover px-3 py-1.5 shadow-md"
      style={getTooltipStyle(260, viewBox, x)}
    >
      <div className="flex w-full flex-col gap-2">
        <TLabelSans>
          {format(new Date(d.timestampS * 1000), "MM/dd HH:mm")}
        </TLabelSans>

        {/* Deposits/Borrows */}
        <div className="flex w-full flex-row justify-between gap-4">
          <TBodySans>{capitalize(side)}s</TBodySans>

          <div className="flex flex-col items-end gap-1">
            <TBody
              style={{
                color: getFieldColor(
                  side === Side.DEPOSIT ? "depositedAmount" : "borrowedAmount",
                  token,
                ),
              }}
            >
              {formatToken(
                new BigNumber(
                  d[
                    side === Side.DEPOSIT ? "depositedAmount" : "borrowedAmount"
                  ] ?? 0,
                ),
                { exact: false },
              )}{" "}
              {token.symbol}
            </TBody>
            <TLabel>
              {formatUsd(
                new BigNumber(
                  d[
                    side === Side.DEPOSIT
                      ? "depositedAmountUsd"
                      : "borrowedAmountUsd"
                  ] ?? 0,
                ),
                { exact: false },
              )}
            </TLabel>
          </div>
        </div>

        {/* Available amount */}
        <div className="flex w-full flex-row justify-between gap-4">
          <TBodySans>Available amount</TBodySans>

          <div className="flex flex-col items-end gap-1">
            <TBody
              style={{
                color: getFieldColor("availableAmount", token),
              }}
            >
              {formatToken(new BigNumber(d.availableAmount ?? 0), {
                exact: false,
              })}{" "}
              {token.symbol}
            </TBody>
            <TLabel>
              {formatUsd(new BigNumber(d.availableAmountUsd ?? 0), {
                exact: false,
              })}
            </TLabel>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HistoricalDepositBorrowLineChartProps {
  reserve: ParsedReserve;
  side: Side;
  noInitialFetch?: boolean;
}

export default function HistoricalDepositBorrowLineChart({
  reserve,
  side,
  noInitialFetch,
}: HistoricalDepositBorrowLineChartProps) {
  const { reserveAssetDataEventsMap, fetchReserveAssetDataEvents } =
    useReserveAssetDataEventsContext();

  // Events
  const [days, setDays] = useLocalStorage<Days>("historicalLineChart_days", 7);

  const didFetchInitialReserveAssetDataEventsRef = useRef<boolean>(false);
  useEffect(() => {
    const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
    if (events === undefined) {
      if (noInitialFetch || didFetchInitialReserveAssetDataEventsRef.current)
        return;

      fetchReserveAssetDataEvents(reserve, days);
      didFetchInitialReserveAssetDataEventsRef.current = true;
    }
  }, [
    reserveAssetDataEventsMap,
    reserve,
    days,
    noInitialFetch,
    fetchReserveAssetDataEvents,
  ]);

  const onDaysClick = (value: Days) => {
    setDays(value);

    const events = reserveAssetDataEventsMap?.[reserve.id]?.[value];
    if (events === undefined) fetchReserveAssetDataEvents(reserve, value);
  };

  // Data
  const chartData = useMemo(() => {
    const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
    if (events === undefined) return;
    if (events.length === 0) return [];

    // Data
    const sampleIntervalS = RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP[days];

    const daysS = days * DAY_S;
    const n = daysS / sampleIntervalS;

    const lastTimestampS =
      Date.now() / 1000 - ((Date.now() / 1000) % sampleIntervalS);
    const timestampsS = Array.from({ length: n })
      .map((_, index) => lastTimestampS - index * sampleIntervalS)
      .reverse();

    const result: (Pick<ChartData, "timestampS"> & Partial<ChartData>)[] = [];
    timestampsS.forEach((timestampS) => {
      const event = events.findLast((e) => e.sampleTimestampS <= timestampS);

      const d = {
        timestampS,
        [side === Side.DEPOSIT ? "depositedAmount" : "borrowedAmount"]: event
          ? side === Side.DEPOSIT
            ? +event.depositedAmount
            : +event.borrowedAmount
          : undefined,
        [side === Side.DEPOSIT ? "depositedAmountUsd" : "borrowedAmountUsd"]:
          event
            ? side === Side.DEPOSIT
              ? +event.depositedAmountUsd
              : +event.borrowedAmountUsd
            : undefined,
        availableAmount: event ? +event.availableAmount : undefined,
        availableAmountUsd: event ? +event.availableAmountUsd : undefined,
      };
      result.push(d);
    });

    return result as ChartData[];
  }, [reserveAssetDataEventsMap, reserve, days, side]);
  const isLoading = chartData === undefined;

  // Fields
  const fields = useMemo(
    () =>
      (chartData ?? []).length > 0
        ? Array.from(
            new Set(
              (chartData ?? [])
                .map((d) =>
                  Object.keys(d).filter((key) => key !== "timestampS"),
                )
                .flat(),
            ),
          )
        : [],
    [chartData],
  );
  const fieldStackIdMap = useMemo(
    () => ({
      [side === Side.DEPOSIT ? "depositedAmount" : "borrowedAmount"]: "1",
      [side === Side.DEPOSIT ? "depositedAmountUsd" : "borrowedAmountUsd"]: "0", // Not shown in chart
      availableAmount: "2",
      availableAmountUsd: "0", // Not shown in chart
    }),
    [side],
  );

  return (
    <div className="-mx-4 flex flex-col">
      <div className="flex w-full flex-row items-center justify-between px-4">
        <TLabelSans style={{ paddingLeft: 40 }}>{capitalize(side)}s</TLabelSans>

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
              onClick={() => onDaysClick(_days)}
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
          tickFormatterY={(value) =>
            formatToken(new BigNumber(value), { exact: false })
          }
          fields={fields}
          fieldStackIdMap={fieldStackIdMap}
          getFieldColor={(field: string) => getFieldColor(field, reserve.token)}
          tooltipContent={({ active, payload, viewBox, coordinate }) => {
            if (!active || !payload?.[0]?.payload) return null;
            return (
              <TooltipContent
                side={side}
                token={reserve.token}
                fields={fields}
                d={payload[0].payload as ChartData}
                viewBox={viewBox as any}
                x={coordinate?.x}
              />
            );
          }}
        />
      </div>
    </div>
  );
}
