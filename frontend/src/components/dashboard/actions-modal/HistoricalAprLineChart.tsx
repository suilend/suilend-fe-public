import { useEffect, useMemo, useRef } from "react";

import BigNumber from "bignumber.js";
import { format } from "date-fns";
import { capitalize } from "lodash";
import * as Recharts from "recharts";
import { useLocalStorage } from "usehooks-ts";

import { COINTYPE_COLOR_MAP } from "@suilend/frontend-sui";
import { ParsedDownsampledApiReserveAssetDataEvent } from "@suilend/sdk/parsers/apiReserveAssetDataEvent";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Side } from "@suilend/sdk/types";

import AprRewardsBreakdownRow from "@/components/dashboard/AprRewardsBreakdownRow";
import Button from "@/components/shared/Button";
import CartesianGridVerticalLine from "@/components/shared/CartesianGridVerticalLine";
import TokenLogo from "@/components/shared/TokenLogo";
import {
  TBody,
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useReserveAssetDataEventsContext } from "@/contexts/ReserveAssetDataEventsContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import useIsTouchscreen from "@/hooks/useIsTouchscreen";
import { ViewBox, axis, getTooltipStyle, line, tooltip } from "@/lib/chart";
import {
  DAYS,
  DAY_S,
  Days,
  RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP,
  calculateRewardAprPercent,
} from "@/lib/events";
import { formatPercent } from "@/lib/format";
import { getDedupedAprRewards } from "@/lib/liquidityMining";
import { cn } from "@/lib/utils";

const isBase = (field: string) => field.endsWith("__base");
const isReward = (field: string) => !isBase(field);

const getFieldCoinType = (field: string) => field.split("__")[1];
const getFieldColor = (field: string) => {
  if (isBase(field)) return "hsl(var(--success))";
  if (isReward(field)) return COINTYPE_COLOR_MAP[getFieldCoinType(field)];
  return "";
};

type ChartData = {
  timestampS: number;
  [interestAprPercent: string]: number | undefined;
};

interface TooltipContentProps {
  side: Side;
  fields: string[];
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContent({ side, fields, d, viewBox, x }: TooltipContentProps) {
  const appContext = useAppContext();
  const data = appContext.data as AppData;

  if (fields.every((field) => d[field] === undefined)) return null;
  if (viewBox === undefined || x === undefined) return null;

  const definedFields = fields.filter((field) => d[field] !== undefined);
  const totalAprPercent = definedFields.reduce(
    (acc, field) => acc.plus(new BigNumber(d[field] as number)),
    new BigNumber(0),
  );

  return (
    // Subset of TooltipContent className
    <div
      className="absolute rounded-md border bg-popover px-3 py-1.5 shadow-md"
      style={getTooltipStyle(fields.length > 1 ? 260 : 200, viewBox, x)}
    >
      <div className="flex w-full flex-col gap-2">
        <TLabelSans>
          {format(new Date(d.timestampS * 1000), "MM/dd HH:mm")}
        </TLabelSans>

        <div className="flex w-full flex-row items-center justify-between gap-4">
          <TBodySans>{capitalize(side)} APR</TBodySans>
          <TBody>
            {formatPercent(totalAprPercent, { useAccountingSign: true })}
          </TBody>
        </div>

        {definedFields.map((field, index) => {
          const coinType = getFieldCoinType(field);
          const color = getFieldColor(field);

          return (
            <AprRewardsBreakdownRow
              key={field}
              isLast={index === definedFields.length - 1}
              value={
                <span style={{ color }}>
                  {formatPercent(new BigNumber(d[field] as number), {
                    useAccountingSign: true,
                  })}
                </span>
              }
            >
              {isBase(field) ? (
                <TLabelSans>Interest</TLabelSans>
              ) : (
                <>
                  <TLabelSans>Rewards in</TLabelSans>
                  <TokenLogo
                    className="h-4 w-4"
                    token={{
                      coinType,
                      symbol: data.coinMetadataMap[coinType].symbol,
                      iconUrl: data.coinMetadataMap[coinType].iconUrl,
                    }}
                  />
                  <TLabel>{data.coinMetadataMap[coinType].symbol}</TLabel>
                </>
              )}
            </AprRewardsBreakdownRow>
          );
        })}
      </div>
    </div>
  );
}

interface ChartProps {
  side: Side;
  data: ChartData[];
}

function Chart({ side, data }: ChartProps) {
  const { sm } = useBreakpoint();
  const isTouchscreen = useIsTouchscreen();

  const sampleIntervalS =
    data.length > 1 ? data[1].timestampS - data[0].timestampS : 1;
  const samplesPerDay = DAY_S / sampleIntervalS;
  const days = data.length / samplesPerDay;

  // Data
  const allFields =
    data.length > 0
      ? Array.from(
          new Set(
            data
              .map((d) => Object.keys(d).filter((key) => key !== "timestampS"))
              .flat(),
          ),
        )
      : [];

  const fieldsMap = {
    [Side.DEPOSIT]: allFields.filter((field) =>
      field.startsWith("depositInterestAprPercent"),
    ),
    [Side.BORROW]: allFields.filter((field) =>
      field.startsWith("borrowInterestAprPercent"),
    ),
  };
  const fields = fieldsMap[side];

  // Min/max
  const minX = data.length > 0 ? Math.min(...data.map((d) => d.timestampS)) : 0;
  const maxX = data.length > 0 ? Math.max(...data.map((d) => d.timestampS)) : 0;

  let minY = Math.min(
    0,
    ...data.map(
      (d) =>
        d[
          side === Side.DEPOSIT
            ? "depositInterestAprPercent__base"
            : "borrowInterestAprPercent__base"
        ] ?? 0,
    ),
    ...data.map((d) =>
      fields.reduce((acc: number, field) => acc + (d[field] ?? 0), 0),
    ),
  );
  if (minY < 0) minY -= 1;

  let maxY = Math.max(
    0,
    ...data.map(
      (d) =>
        d[
          side === Side.DEPOSIT
            ? "depositInterestAprPercent__base"
            : "borrowInterestAprPercent__base"
        ] ?? 0,
    ),
    ...data.map((d) =>
      fields.reduce((acc: number, field) => acc + (d[field] ?? 0), 0),
    ),
  );
  if (maxY > 0) maxY += 1;

  // Ticks
  const ticksX =
    data.length > 0
      ? data
          .filter((d) => {
            if (days === 1)
              return d.timestampS % ((sm ? 4 : 8) * 60 * 60) === 0;
            if (days === 7) return d.timestampS % ((sm ? 1 : 2) * DAY_S) === 0;
            if (days === 30)
              return d.timestampS % ((sm ? 5 : 10) * DAY_S) === 0;
            return false;
          })
          .map((d) => {
            if (days === 1) return d.timestampS;
            return d.timestampS + new Date().getTimezoneOffset() * 60;
          })
      : [];
  const ticksY =
    data.length > 0
      ? Array.from({ length: 4 }).map(
          (_, index, array) =>
            minY + ((maxY - minY) / (array.length - 1)) * index,
        )
      : [];

  const tickFormatterX = (timestampS: number) => {
    if (days === 1) return format(new Date(timestampS * 1000), "HH:mm");
    return format(new Date(timestampS * 1000), "MM/dd");
  };
  const tickFormatterY = (value: number) =>
    formatPercent(new BigNumber(value), { dp: 1 });

  // Domain
  const domainX = data.length > 0 ? [minX, maxX] : undefined;
  const domainY = data.length > 0 ? [minY, maxY] : undefined;

  return (
    <Recharts.ResponsiveContainer width="100%" height="100%">
      <Recharts.AreaChart
        data={data}
        margin={{
          top: 8,
          right: 16 + 8,
          bottom: -30 + 2 + 16,
          left: -60 + (16 + 40),
        }}
      >
        <Recharts.CartesianGrid
          strokeDasharray="1 4"
          stroke="hsla(var(--secondary) / 20%)"
          fill="transparent"
          horizontal={false}
          vertical={(props) => <CartesianGridVerticalLine {...props} />}
        />
        <Recharts.XAxis
          type="number"
          dataKey="timestampS"
          ticks={ticksX}
          tickMargin={axis.tickMargin}
          tick={axis.tick}
          axisLine={axis.axisLine}
          tickLine={axis.tickLine}
          tickFormatter={tickFormatterX}
          domain={domainX}
        />
        <Recharts.YAxis
          type="number"
          ticks={ticksY}
          tickMargin={axis.tickMargin}
          tick={axis.tick}
          axisLine={axis.axisLine}
          tickLine={axis.tickLine}
          tickFormatter={tickFormatterY}
          domain={domainY}
        />
        {fields.map((field) => {
          const color = getFieldColor(field);

          return (
            <Recharts.Area
              key={field}
              type="monotone"
              stackId="1"
              dataKey={field}
              isAnimationActive={false}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              dot={line.dot}
              strokeWidth={line.strokeWidth}
            />
          );
        })}
        {data.length > 0 && (
          <Recharts.Tooltip
            isAnimationActive={false}
            filterNull={false}
            cursor={tooltip.cursor}
            trigger={isTouchscreen ? "hover" : "hover"}
            wrapperStyle={tooltip.wrapperStyle}
            content={({ active, payload, viewBox, coordinate }) => {
              if (!active || !payload?.[0]?.payload) return null;
              return (
                <TooltipContent
                  side={side}
                  fields={fields}
                  d={payload[0].payload as ChartData}
                  viewBox={viewBox as any}
                  x={coordinate?.x}
                />
              );
            }}
          />
        )}
      </Recharts.AreaChart>
    </Recharts.ResponsiveContainer>
  );
}

interface HistoricalAprLineChartProps {
  reserve: ParsedReserve;
  side: Side;
}

export default function HistoricalAprLineChart({
  reserve,
  side,
}: HistoricalAprLineChartProps) {
  const appContext = useAppContext();
  const data = appContext.data as AppData;
  const { reserveAssetDataEventsMap, fetchReserveAssetDataEvents } =
    useReserveAssetDataEventsContext();

  // Events
  const [days, setDays] = useLocalStorage<Days>(
    "historicalAprLineChartDays",
    7,
  );

  const aprRewardReserves = useMemo(() => {
    const rewards = data.rewardMap[reserve.coinType]?.[side] ?? [];
    const aprRewards = getDedupedAprRewards(rewards);

    return aprRewards
      .map((aprReward) => data.reserveMap[aprReward.stats.rewardCoinType])
      .filter(Boolean);
  }, [data.rewardMap, reserve.coinType, side, data.reserveMap]);

  const didFetchInitialReserveAssetDataEventsRef = useRef<boolean>(false);
  const didFetchInitialRewardReservesAssetDataEventsRef = useRef<
    Record<string, boolean>
  >({});
  useEffect(() => {
    const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
    if (events === undefined) {
      if (didFetchInitialReserveAssetDataEventsRef.current) return;

      fetchReserveAssetDataEvents(reserve, days);
      didFetchInitialReserveAssetDataEventsRef.current = true;
    }

    // Rewards
    aprRewardReserves.forEach((rewardReserve) => {
      if (reserve.id === rewardReserve.id) return;
      if (reserveAssetDataEventsMap?.[rewardReserve.id]?.[days] === undefined) {
        if (
          didFetchInitialRewardReservesAssetDataEventsRef.current[
            rewardReserve.coinType
          ]
        )
          return;

        fetchReserveAssetDataEvents(rewardReserve, days);
        didFetchInitialRewardReservesAssetDataEventsRef.current[
          rewardReserve.coinType
        ] = true;
      }
    });
  }, [
    reserveAssetDataEventsMap,
    reserve,
    days,
    fetchReserveAssetDataEvents,
    aprRewardReserves,
  ]);

  const onDaysClick = (value: Days) => {
    setDays(value);

    const events = reserveAssetDataEventsMap?.[reserve.id]?.[value];
    if (events === undefined) fetchReserveAssetDataEvents(reserve, value);

    // Rewards
    aprRewardReserves.forEach((rewardReserve) => {
      if (reserve.id === rewardReserve.id) return;
      if (reserveAssetDataEventsMap?.[rewardReserve.id]?.[value] === undefined)
        fetchReserveAssetDataEvents(rewardReserve, value);
    });
  };

  // Data
  const chartData = useMemo(() => {
    const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
    if (events === undefined) return;
    if (events.length === 0) return [];
    if (
      aprRewardReserves.some(
        (rewardReserve) =>
          reserveAssetDataEventsMap?.[rewardReserve.id]?.[days] === undefined,
      )
    )
      return;

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

      const d = aprRewardReserves.reduce(
        (acc, rewardReserve) => {
          if (!event) return acc;

          const rewardAprPercent = calculateRewardAprPercent(
            side,
            event,
            reserveAssetDataEventsMap?.[rewardReserve.id]?.[
              days
            ] as ParsedDownsampledApiReserveAssetDataEvent[],
            reserve,
          );
          if (rewardAprPercent === 0) return acc;

          return {
            ...acc,
            [`${side}InterestAprPercent__${rewardReserve.coinType}`]:
              rewardAprPercent,
          };
        },
        {
          timestampS,
          [`${side}InterestAprPercent__base`]: event
            ? side === Side.DEPOSIT
              ? +event.depositAprPercent
              : +event.borrowAprPercent
            : undefined,
        },
      );
      result.push(d);
    });

    return result as ChartData[];
  }, [reserveAssetDataEventsMap, reserve, days, aprRewardReserves, side]);
  const isLoading = chartData === undefined;

  return (
    <div className="-mx-4 flex flex-col">
      <div className="flex w-full flex-row items-center justify-between px-4">
        <TLabelSans style={{ paddingLeft: 40 }}>
          {capitalize(side)} APR
        </TLabelSans>

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
              {_days === 1 && "1D"}
              {_days === 7 && "1W"}
              {_days === 30 && "1M"}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="historical-apr-line-chart h-[140px] w-full shrink-0 transform-gpu md:h-[160px]"
        is-loading={isLoading ? "true" : "false"}
      >
        <Chart side={side} data={chartData ?? []} />
      </div>
    </div>
  );
}
