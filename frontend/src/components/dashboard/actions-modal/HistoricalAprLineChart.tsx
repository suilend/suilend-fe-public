import { useEffect, useMemo, useRef } from "react";

import BigNumber from "bignumber.js";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import { getDedupedAprRewards } from "@suilend/sdk";
import { Side } from "@suilend/sdk/lib/types";
import { ParsedDownsampledApiReserveAssetDataEvent } from "@suilend/sdk/parsers/apiReserveAssetDataEvent";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import {
  COINTYPE_COLOR_MAP,
  NORMALIZED_SUI_COINTYPE,
  formatPercent,
  getToken,
} from "@suilend/sui-fe";

import HistoricalLineChart, {
  ChartData,
} from "@/components/dashboard/actions-modal/HistoricalLineChart";
import AprRewardsBreakdownRow from "@/components/dashboard/AprRewardsBreakdownRow";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useReserveAssetDataEventsContext } from "@/contexts/ReserveAssetDataEventsContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ViewBox, getTooltipStyle } from "@/lib/chart";
import {
  DAYS,
  DAYS_MAP,
  DAY_S,
  Days,
  RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP,
  calculateRewardAprPercent,
} from "@/lib/events";
import { cn } from "@/lib/utils";

const isBase = (field: string) => field.endsWith("__base");
const isStakingYield = (field: string) => field.endsWith("__staking_yield");
const isReward = (field: string) => !isBase(field);

const getFieldCoinType = (field: string) => field.split("__")[1];
const getFieldColor = (field: string) => {
  if (isBase(field)) return "hsl(var(--success))";
  if (isStakingYield(field)) return COINTYPE_COLOR_MAP[NORMALIZED_SUI_COINTYPE]; // SUI color
  if (isReward(field))
    return COINTYPE_COLOR_MAP[getFieldCoinType(field)] ?? "hsl(var(--muted))";
  return "";
};

interface TooltipContentProps {
  side: Side;
  fields: string[];
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContent({ side, fields, d, viewBox, x }: TooltipContentProps) {
  const { appData } = useLoadedAppContext();

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
              ) : isStakingYield(field) ? (
                <TLabelSans>Staking yield*</TLabelSans>
              ) : (
                <>
                  <TLabelSans>Rewards in</TLabelSans>
                  <TokenLogo
                    token={getToken(
                      coinType,
                      appData.coinMetadataMap[coinType],
                    )}
                    size={16}
                  />
                  <TLabelSans>
                    {appData.coinMetadataMap[coinType].symbol}
                  </TLabelSans>
                </>
              )}
            </AprRewardsBreakdownRow>
          );
        })}
      </div>
    </div>
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
  const { allAppData, appData, isLst } = useLoadedAppContext();
  const { userData } = useLoadedUserContext();

  const { reserveAssetDataEventsMap, fetchReserveAssetDataEvents } =
    useReserveAssetDataEventsContext();

  // Events
  const [days, setDays] = useLocalStorage<Days>("historicalLineChart_days", 7);

  const aprRewardReserves = useMemo(() => {
    const rewards = userData.rewardMap[reserve.coinType]?.[side] ?? [];
    const aprRewards = getDedupedAprRewards(rewards);

    return aprRewards
      .map((aprReward) => appData.reserveMap[aprReward.stats.rewardCoinType])
      .filter(Boolean);
  }, [userData.rewardMap, reserve.coinType, side, appData.reserveMap]);

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
          [`${side}InterestAprPercent__staking_yield`]:
            event && side === Side.DEPOSIT && isLst(event.coinType)
              ? +allAppData.lstAprPercentMap[event.coinType]
              : undefined,
        },
      );
      result.push(d);
    });

    return result as ChartData[];
  }, [
    reserveAssetDataEventsMap,
    reserve,
    days,
    aprRewardReserves,
    side,
    isLst,
    allAppData.lstAprPercentMap,
  ]);
  const isLoading = chartData === undefined;

  // Fields
  const fields =
    (chartData ?? []).length > 0
      ? Array.from(
          new Set(
            (chartData ?? [])
              .map((d) => Object.keys(d).filter((key) => key !== "timestampS"))
              .flat(),
          ),
        )
      : [];

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
            formatPercent(new BigNumber(value), { dp: 1 })
          }
          fields={fields}
          getFieldColor={getFieldColor}
          tooltipContent={({ active, payload, viewBox, coordinate }) => {
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
      </div>
    </div>
  );
}
