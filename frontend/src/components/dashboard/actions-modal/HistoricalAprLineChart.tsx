import { useCallback, useEffect, useMemo, useRef } from "react";

import BigNumber from "bignumber.js";
import { format } from "date-fns";
import { capitalize } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import { WAD, getDedupedAprRewards, reserveSort } from "@suilend/sdk";
import { ApiReserveAssetDataEvent, Side } from "@suilend/sdk/lib/types";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import {
  COINTYPE_COLOR_MAP,
  MS_PER_YEAR,
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
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";
import { useReserveAssetDataEventsContext } from "@/contexts/ReserveAssetDataEventsContext";
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

const getCtokenExchangeRate = (event: ApiReserveAssetDataEvent) =>
  new BigNumber(event.ctokenSupply).eq(0)
    ? new BigNumber(1)
    : new BigNumber(event.supplyAmount).div(WAD).div(event.ctokenSupply);

const isBase = (field: string) => field.includes("_base__");
const isStakingYield = (field: string) => field.includes("_staking_yield__");
const isReward = (field: string) => !isBase(field);

const getFieldCoinType = (field: string) => field.split("__")[1];
const getFieldColor = (field: string, showReserveDetails?: boolean) => {
  if (isBase(field))
    return !showReserveDetails
      ? "hsl(var(--success))"
      : (COINTYPE_COLOR_MAP[getFieldCoinType(field)] ?? "hsl(var(--muted))");
  if (isStakingYield(field))
    return COINTYPE_COLOR_MAP[getFieldCoinType(field)] ?? "hsl(var(--muted))";
  if (isReward(field))
    return COINTYPE_COLOR_MAP[getFieldCoinType(field)] ?? "hsl(var(--muted))";
  return "";
};

interface TooltipContentProps {
  side: Side;
  reserves: {
    reserve: ParsedReserve;
    side: Side;
    multiplier: number;
  }[];
  fields: string[];
  d: ChartData;
  viewBox?: ViewBox;
  x?: number;
}

function TooltipContent({
  side,
  reserves,
  fields,
  d,
  viewBox,
  x,
}: TooltipContentProps) {
  const { appData } = useLendingMarketContext();

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

        {definedFields.map((field, index, array) => {
          const coinType = getFieldCoinType(field);
          const color = getFieldColor(field, reserves.length > 1);

          const reserve = reserves.find((r) => r.reserve.coinType === coinType);

          return (
            <AprRewardsBreakdownRow
              key={field}
              isLast={index === array.length - 1}
              value={
                <span style={{ color }}>
                  {formatPercent(new BigNumber(d[field] as number), {
                    useAccountingSign: true,
                  })}
                </span>
              }
            >
              {isBase(field) ? (
                <TLabelSans>
                  {reserves.length > 1
                    ? `${appData.coinMetadataMap[coinType].symbol} ${
                        reserve?.side
                      } interest`
                    : "Interest"}
                </TLabelSans>
              ) : isStakingYield(field) ? (
                <TLabelSans>
                  {reserves.length > 1
                    ? `${appData.coinMetadataMap[coinType].symbol} staking yield*`
                    : "Staking yield*"}
                </TLabelSans>
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
  side: Side;
  reserves: {
    reserve: ParsedReserve;
    side: Side;
    multiplier: number;
  }[];
}

export default function HistoricalAprLineChart({
  side,
  reserves,
}: HistoricalAprLineChartProps) {
  const { isLst } = useLoadedAppContext();
  const { appData, userData } = useLendingMarketContext();

  const {
    reserveAssetDataEventsMap,
    fetchReserveAssetDataEvents,
    lstExchangeRateMap,
    fetchLstExchangeRates,
  } = useReserveAssetDataEventsContext();

  // Events
  const [days, setDays] = useLocalStorage<Days>("historicalLineChart_days", 7);

  const getAprRewardReserves = useCallback(
    (reserve: ParsedReserve, side: Side) => {
      const rewards = userData.rewardMap[reserve.coinType]?.[side] ?? [];
      const aprRewards = getDedupedAprRewards(rewards);

      return Array.from(
        new Set(aprRewards.map((aprReward) => aprReward.stats.rewardCoinType)),
      )
        .map((rewardCoinType) => appData.reserveMap[rewardCoinType])
        .filter(Boolean);
    },
    [userData.rewardMap, appData.reserveMap],
  );

  const didFetchInitialReserveAssetDataEventsRef = useRef<
    Record<string, boolean>
  >({});
  const didFetchInitialLstExchangeRatesRef = useRef<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    reserves.forEach(({ reserve, side, multiplier }) => {
      // Base
      const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
      if (events === undefined) {
        if (!didFetchInitialReserveAssetDataEventsRef.current[reserve.id]) {
          fetchReserveAssetDataEvents(reserve, days);
          didFetchInitialReserveAssetDataEventsRef.current[reserve.id] = true;
        }
      }

      // LST exchange rates
      const lstExchangeRates = lstExchangeRateMap?.[reserve.coinType]?.[days];
      if (
        isLst(reserve.coinType) &&
        side === Side.DEPOSIT &&
        lstExchangeRates === undefined
      ) {
        if (!didFetchInitialLstExchangeRatesRef.current[reserve.coinType]) {
          fetchLstExchangeRates(reserve.coinType, days);
          didFetchInitialLstExchangeRatesRef.current[reserve.coinType] = true;
        }
      }

      // Rewards
      getAprRewardReserves(reserve, side).forEach((rewardReserve) => {
        const rewardEvents =
          reserveAssetDataEventsMap?.[rewardReserve.id]?.[days];
        if (rewardReserve.id !== reserve.id && rewardEvents === undefined) {
          if (
            !didFetchInitialReserveAssetDataEventsRef.current[
              rewardReserve.coinType
            ]
          ) {
            fetchReserveAssetDataEvents(rewardReserve, days);
            didFetchInitialReserveAssetDataEventsRef.current[
              rewardReserve.coinType
            ] = true;
          }
        }
      });
    });
  }, [
    reserves,
    reserveAssetDataEventsMap,
    days,
    fetchReserveAssetDataEvents,
    lstExchangeRateMap,
    isLst,
    fetchLstExchangeRates,
    getAprRewardReserves,
  ]);

  const onDaysClick = (value: Days) => {
    setDays(value);

    reserves.forEach(({ reserve, side, multiplier }) => {
      // Base
      const events = reserveAssetDataEventsMap?.[reserve.id]?.[value];
      if (events === undefined) {
        fetchReserveAssetDataEvents(reserve, value);
      }

      // LST exchange rates
      const lstExchangeRates = lstExchangeRateMap?.[reserve.coinType]?.[value];
      if (
        isLst(reserve.coinType) &&
        side === Side.DEPOSIT &&
        lstExchangeRates === undefined
      ) {
        fetchLstExchangeRates(reserve.coinType, value);
      }

      // Rewards
      getAprRewardReserves(reserve, side).forEach((rewardReserve) => {
        const rewardEvents =
          reserveAssetDataEventsMap?.[rewardReserve.id]?.[value];
        if (rewardReserve.id !== reserve.id && rewardEvents === undefined) {
          fetchReserveAssetDataEvents(rewardReserve, value);
        }
      });
    });
  };

  // Data
  const chartData = useMemo(() => {
    if (
      reserves.some(({ reserve, side, multiplier }) => {
        // Base
        const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
        if (events === undefined) return true;

        // LST exchange rates
        const lstExchangeRates = lstExchangeRateMap?.[reserve.coinType]?.[days];
        if (
          isLst(reserve.coinType) &&
          side === Side.DEPOSIT &&
          lstExchangeRates === undefined
        )
          return true;

        // Rewards
        for (const rewardReserve of getAprRewardReserves(reserve, side)) {
          const rewardEvents =
            reserveAssetDataEventsMap?.[rewardReserve.id]?.[days];
          if (rewardReserve.id !== reserve.id && rewardEvents === undefined)
            return true;
        }
      })
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
      .reverse(); // Oldest to newest

    const result: (Pick<ChartData, "timestampS"> & Partial<ChartData>)[] = [];
    timestampsS.forEach((timestampS) => {
      const d: ChartData = { timestampS };

      // Base
      reserves.forEach(({ reserve, side, multiplier }) => {
        const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
        const event = events!.findLast((e) => e.sampleTimestampS <= timestampS);
        if (!event) return;

        d[`1_interestAprPercent_base__${reserve.coinType}`] = event
          ? side === Side.DEPOSIT
            ? +event.depositAprPercent * multiplier
            : +event.borrowAprPercent *
              multiplier *
              (reserves.some(({ side }) => side === Side.DEPOSIT) &&
              reserves.some(({ side }) => side === Side.BORROW)
                ? -1 // Normalize borrow APRs if there are both deposits and borrows
                : 1)
          : undefined;
      });

      // LST
      reserves.forEach(({ reserve, side, multiplier }) => {
        const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
        const lstExchangeRates = lstExchangeRateMap?.[reserve.coinType]?.[days];
        const event = events!.findLast((e) => e.sampleTimestampS <= timestampS);
        if (!event) return;

        if (isLst(reserve.coinType) && side === Side.DEPOSIT)
          d[`2_interestAprPercent_staking_yield__${reserve.coinType}`] =
            (() => {
              const prevLstExchangeRate = lstExchangeRates!.findLast(
                (e) => e.timestampS < timestampS,
              );
              const lstExchangeRate = lstExchangeRates!.find(
                (e) => e.timestampS >= timestampS,
              );
              // console.log("XXXXXXX", [
              //   prevLstExchangeRate
              //     ? formatDate(
              //         new Date(prevLstExchangeRate?.timestampS * 1000),
              //         "MM/dd HH:mm",
              //       )
              //     : undefined,
              //   formatDate(new Date(timestampS * 1000), "MM/dd HH:mm"),
              //   lstExchangeRate
              //     ? formatDate(
              //         new Date(lstExchangeRate?.timestampS * 1000),
              //         "MM/dd HH:mm",
              //       )
              //     : undefined,
              // ]);

              if (lstExchangeRate === undefined) {
                return result.at(-1)?.[
                  `2_interestAprPercent_staking_yield_${reserve.coinType}`
                ];
              }
              if (
                prevLstExchangeRate === undefined ||
                lstExchangeRate === undefined
              )
                return undefined;

              const proportionOfYear = new BigNumber(
                lstExchangeRate.timestampS - prevLstExchangeRate.timestampS,
              ).div(MS_PER_YEAR / 1000);

              const aprPercent = proportionOfYear.eq(0)
                ? new BigNumber(0)
                : lstExchangeRate.value
                    .div(prevLstExchangeRate.value)
                    .minus(1)
                    .div(proportionOfYear)
                    .times(100);

              return +aprPercent * multiplier;
            })();
      });

      // Rewards
      reserves.forEach(({ reserve, side, multiplier }) => {
        const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
        const event = events!.findLast((e) => e.sampleTimestampS <= timestampS);
        if (!event) return;

        for (const rewardReserve of getAprRewardReserves(reserve, side)) {
          const rewardEvents =
            reserveAssetDataEventsMap?.[rewardReserve.id]?.[days];

          let rewardAprPercent =
            calculateRewardAprPercent(side, event, rewardEvents!, reserve) *
            multiplier;
          if (
            side === Side.BORROW &&
            reserves.some(({ side }) => side === Side.DEPOSIT) &&
            reserves.some(({ side }) => side === Side.BORROW)
          )
            rewardAprPercent = rewardAprPercent * -1; // Normalize borrow APRs if there are both deposits and borrows
          if (rewardAprPercent === 0) continue;

          d[`3_interestAprPercent_reward__${rewardReserve.coinType}`] =
            (d[`3_interestAprPercent_reward__${rewardReserve.coinType}`] ?? 0) +
            rewardAprPercent; // There may be multiple rewards for the same reserve
        }
      });

      result.push(d);
    });

    return result;
  }, [
    reserves,
    reserveAssetDataEventsMap,
    days,
    lstExchangeRateMap,
    isLst,
    getAprRewardReserves,
  ]);
  const isLoading = chartData === undefined;

  // Average APR
  const averageAprPercent = useMemo(() => {
    if (reserves.length > 1) return undefined;
    const reserve = reserves[0].reserve;

    const events = reserveAssetDataEventsMap?.[reserve.id]?.[days];
    if (events === undefined) return undefined;

    const event = events![0];
    if (event === undefined) return undefined;

    // Timestamps
    const timestampS = new Date().getTime() / 1000;
    const prevTimestampS = event.timestampS;

    const proportionOfYear = new BigNumber(timestampS - prevTimestampS).div(
      MS_PER_YEAR / 1000,
    );

    if (side === Side.DEPOSIT) {
      // Ctoken exchange rate
      const ctokenExchangeRate = reserve.cTokenExchangeRate;
      const prevCtokenExchangeRate = getCtokenExchangeRate(event.original);

      const annualizedInterestRate = proportionOfYear.eq(0)
        ? new BigNumber(0)
        : ctokenExchangeRate
            .div(prevCtokenExchangeRate)
            .minus(1)
            .div(proportionOfYear);
      const annualizedInterestRatePercent = annualizedInterestRate.times(100);

      return annualizedInterestRatePercent;
    } else {
      // Cumulative borrow rate
      const cumulativeBorrowRate = reserve.cumulativeBorrowRate;
      const prevCumulativeBorrowRate = event.cumulativeBorrowRate;

      const annualizedInterestRate = proportionOfYear.eq(0)
        ? new BigNumber(0)
        : cumulativeBorrowRate
            .div(prevCumulativeBorrowRate)
            .minus(1)
            .div(proportionOfYear);
      const annualizedInterestRatePercent = annualizedInterestRate.times(100);

      return annualizedInterestRatePercent;
    }
  }, [reserves, reserveAssetDataEventsMap, days, side]);

  // Fields
  const fields = useMemo(() => {
    if ((chartData ?? []).length === 0) return [];

    const result: string[] = [];
    for (const d of chartData ?? []) {
      for (const field of Object.keys(d).filter(
        (key) => key !== "timestampS",
      )) {
        if (!result.includes(field)) result.push(field);
      }
    }

    return result.sort((a, b) => {
      const aIndex = +a[0];
      const aCoinType = getFieldCoinType(a);

      const bIndex = +b[0];
      const bCoinType = getFieldCoinType(b);

      if (aIndex !== bIndex) return aIndex - bIndex; // 1, 2, 3, ...
      return reserveSort(appData.lendingMarket.reserves, aCoinType, bCoinType);
    });
  }, [chartData, appData.lendingMarket.reserves]);
  const fieldStackIdMap = useMemo(
    () => fields.reduce((acc, field) => ({ ...acc, [field]: "1" }), {}),
    [fields],
  );

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
          average={
            averageAprPercent !== undefined ? +averageAprPercent : undefined
          }
          tickFormatterY={(value) =>
            formatPercent(new BigNumber(value), { dp: 1 })
          }
          fields={fields}
          fieldStackIdMap={fieldStackIdMap}
          getFieldColor={(field: string) =>
            getFieldColor(field, reserves.length > 1)
          }
          tooltipContent={({ active, payload, viewBox, coordinate }) => {
            if (!active || !payload?.[0]?.payload) return null;
            return (
              <TooltipContent
                side={side}
                reserves={reserves}
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
