import { useCallback, useMemo } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";

import { WAD } from "@suilend/sdk/constants";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import {
  ApiBorrowEvent,
  ApiDepositEvent,
  ApiLiquidateEvent,
  ApiRepayEvent,
  ApiWithdrawEvent,
  Side,
} from "@suilend/sdk/types";
import { linearlyInterpolate, reserveSort } from "@suilend/sdk/utils";

import {
  EventsData,
  TokenAmount,
  getCtokenExchangeRate,
} from "@/components/dashboard/account-overview/AccountOverviewDialog";
import EarningsChart, {
  ChartData,
} from "@/components/dashboard/account-overview/EarningsChart";
import DataTable, { tableHeader } from "@/components/dashboard/DataTable";
import TitleWithIcon from "@/components/shared/TitleWithIcon";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useReserveAssetDataEventsContext } from "@/contexts/ReserveAssetDataEventsContext";
import { msPerYear } from "@/lib/constants";
import { DAY_S, EventType, eventSortAsc } from "@/lib/events";
import { formatToken, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RowData {
  coinType: string;
  interest: BigNumber;
  rewards: {
    [rewardCoinType: string]: {
      [timestampS: number]: BigNumber;
    };
  };
}

interface EarningsTabContentProps {
  eventsData?: EventsData;
  nowS: number;
}

export default function EarningsTabContent({
  eventsData,
  nowS,
}: EarningsTabContentProps) {
  const appContext = useAppContext();
  const data = appContext.data as AppData;
  const obligation = appContext.obligation as ParsedObligation;
  const { reserveAssetDataEventsMap } = useReserveAssetDataEventsContext();

  type CumInterestMap = {
    [coinType: string]: {
      timestampS: number;
      cumInterest: number;
    }[];
  };

  // Interest earned
  const getInterestEarned = useCallback(
    (
      timestampS: number,
      ctokenExchangeRate: BigNumber,
      prevTimestampS: number,
      prevCtokenExchangeRate: BigNumber,
      prevDepositedCtokenAmount: BigNumber,
    ) => {
      const proportionOfYear = new BigNumber(timestampS - prevTimestampS).div(
        msPerYear / 1000,
      );
      const annualizedInterestRate = new BigNumber(ctokenExchangeRate)
        .div(prevCtokenExchangeRate)
        .minus(1)
        .div(proportionOfYear);

      const prevDepositedAmount = new BigNumber(
        prevDepositedCtokenAmount,
      ).times(prevCtokenExchangeRate);

      const interestEarned = prevDepositedAmount
        .times(annualizedInterestRate)
        .times(proportionOfYear);

      return interestEarned;
    },
    [],
  );

  const cumInterestEarnedMap = useMemo(() => {
    if (eventsData === undefined) return undefined;

    type CumInterestEarnedMap = {
      [coinType: string]: {
        timestampS: number;
        ctokenExchangeRate: BigNumber;
        depositedCtokenAmount: BigNumber;
        cumInterest: number;
      }[];
    };
    const resultMap: CumInterestEarnedMap = {};

    const events = [
      ...eventsData.deposit.map((event) => ({
        ...event,
        eventType: EventType.DEPOSIT,
      })),
      ...eventsData.withdraw.map((event) => ({
        ...event,
        eventType: EventType.WITHDRAW,
      })),
      ...eventsData.liquidate.map((event) => ({
        ...event,
        eventType: EventType.LIQUIDATE,
      })),
    ].sort(eventSortAsc);

    events.forEach((event) => {
      const obligationDataEvent = eventsData.obligationData.find(
        (e) => e.digest === event.digest,
      );
      if (!obligationDataEvent) return;

      let coinType;
      if (event.eventType === EventType.DEPOSIT) {
        coinType = (event as ApiDepositEvent).coinType;
      } else if (event.eventType === EventType.WITHDRAW) {
        coinType = (event as ApiWithdrawEvent).coinType;
      } else if (event.eventType === EventType.LIQUIDATE) {
        const withdrawReserve = data.lendingMarket.reserves.find(
          (reserve) =>
            reserve.id === (event as ApiLiquidateEvent).withdrawReserveId,
        );
        if (!withdrawReserve) return;

        coinType = withdrawReserve.coinType;
      }
      if (!coinType) return;
      const coinMetadata = data.coinMetadataMap[coinType];

      const reserveAssetDataEvent = eventsData.reserveAssetData.find(
        (e) => e.digest === event.digest && e.coinType === coinType,
      );
      if (!reserveAssetDataEvent) return;

      const timestampS = reserveAssetDataEvent.timestamp;
      const ctokenExchangeRate = getCtokenExchangeRate(reserveAssetDataEvent);

      const position = JSON.parse(obligationDataEvent.depositsJson).find(
        (p: any) => normalizeStructTag(p.coin_type.name) === coinType,
      );
      const depositedCtokenAmount = new BigNumber(
        position?.deposited_ctoken_amount ?? 0,
      ).div(10 ** coinMetadata.decimals);

      const prev =
        resultMap[coinType] && resultMap[coinType].length > 0
          ? resultMap[coinType][resultMap[coinType].length - 1]
          : undefined;

      resultMap[coinType] = resultMap[coinType] ?? [];
      resultMap[coinType].push({
        timestampS,
        ctokenExchangeRate,
        depositedCtokenAmount,
        cumInterest: prev
          ? +new BigNumber(prev.cumInterest).plus(
              getInterestEarned(
                timestampS,
                ctokenExchangeRate,
                prev.timestampS,
                prev.ctokenExchangeRate,
                prev.depositedCtokenAmount,
              ),
            )
          : 0,
      });
    });

    for (const coinType of Object.keys(resultMap)) {
      // Add current timestamp
      const reserve = data.reserveMap[coinType];
      if (!reserve) continue;

      const timestampS = nowS;
      const ctokenExchangeRate = reserve.cTokenExchangeRate;

      const prev = resultMap[coinType][resultMap[coinType].length - 1];

      resultMap[coinType].push({
        timestampS,
        ctokenExchangeRate,
        depositedCtokenAmount: new BigNumber(-1),
        cumInterest: +new BigNumber(prev.cumInterest).plus(
          getInterestEarned(
            timestampS,
            ctokenExchangeRate,
            prev.timestampS,
            prev.ctokenExchangeRate,
            prev.depositedCtokenAmount,
          ),
        ),
      });

      // Increase resolution
      const reserveAssetDataEvents =
        reserveAssetDataEventsMap?.[reserve.id]?.[30]; // The last 30 days will be higher resolution
      if (reserveAssetDataEvents === undefined) return undefined;

      for (let i = 0; i < reserveAssetDataEvents.length; i++) {
        const r = reserveAssetDataEvents[i];
        const timestampS = r.timestampS;
        const ctokenExchangeRate = new BigNumber(r.ctokenSupply).eq(0)
          ? new BigNumber(1)
          : new BigNumber(r.depositedAmount).div(r.ctokenSupply);
        if (
          timestampS <= resultMap[coinType][0].timestampS ||
          timestampS >=
            resultMap[coinType][resultMap[coinType].length - 1].timestampS
        )
          continue;
        const prev = resultMap[coinType].findLast(
          (d) => d.timestampS < timestampS,
        );
        if (!prev) continue;
        const interestEarned = getInterestEarned(
          timestampS,
          ctokenExchangeRate,
          prev.timestampS,
          prev.ctokenExchangeRate,
          prev.depositedCtokenAmount,
        );
        resultMap[coinType].push({
          timestampS,
          ctokenExchangeRate,
          depositedCtokenAmount: prev.depositedCtokenAmount.plus(
            interestEarned.div(prev.ctokenExchangeRate),
          ),
          cumInterest: +new BigNumber(prev.cumInterest).plus(interestEarned),
        });
        resultMap[coinType].sort((a, b) => a.timestampS - b.timestampS);
      }
    }

    return resultMap;
  }, [
    eventsData,
    data.lendingMarket.reserves,
    data.coinMetadataMap,
    getInterestEarned,
    data.reserveMap,
    nowS,
    reserveAssetDataEventsMap,
  ]);

  // Interest paid
  const getInterestPaid = useCallback(
    (
      timestampS: number,
      cumulativeBorrowRate: BigNumber,
      prevTimestampS: number,
      prevCumulativeBorrowRate: BigNumber,
      prevBorrowedAmount: BigNumber,
    ) => {
      const proportionOfYear = new BigNumber(timestampS - prevTimestampS).div(
        msPerYear / 1000,
      );
      const annualizedInterestRate = proportionOfYear.gt(0)
        ? new BigNumber(cumulativeBorrowRate)
            .div(prevCumulativeBorrowRate)
            .minus(1)
            .div(proportionOfYear)
        : new BigNumber(0);

      const interestPaid = prevBorrowedAmount
        .times(annualizedInterestRate)
        .times(proportionOfYear);

      return interestPaid;
    },
    [],
  );

  const cumInterestPaidMap = useMemo(() => {
    if (eventsData === undefined) return undefined;

    type CumInterestPaidMap = {
      [coinType: string]: {
        timestampS: number;
        cumulativeBorrowRate: BigNumber;
        borrowedAmount: BigNumber;
        cumInterest: number;
      }[];
    };
    const resultMap: CumInterestPaidMap = {};

    const events = [
      ...eventsData.borrow.map((event) => ({
        ...event,
        eventType: EventType.BORROW,
      })),
      ...eventsData.repay.map((event) => ({
        ...event,
        eventType: EventType.REPAY,
      })),
      ...eventsData.liquidate.map((event) => ({
        ...event,
        eventType: EventType.LIQUIDATE,
      })),
    ].sort(eventSortAsc);

    events.forEach((event) => {
      const obligationDataEvent = eventsData.obligationData.find(
        (e) => e.digest === event.digest,
      );
      if (!obligationDataEvent) return;

      let coinType;
      if (event.eventType === EventType.BORROW) {
        coinType = (event as unknown as ApiBorrowEvent).coinType;
      } else if (event.eventType === EventType.REPAY) {
        coinType = (event as ApiRepayEvent).coinType;
      } else if (event.eventType === EventType.LIQUIDATE) {
        const repayReserve = data.lendingMarket.reserves.find(
          (reserve) =>
            reserve.id === (event as ApiLiquidateEvent).repayReserveId,
        );
        if (!repayReserve) return;

        coinType = repayReserve.coinType;
      }
      if (!coinType) return;
      const coinMetadata = data.coinMetadataMap[coinType];

      const reserveAssetDataEvent = eventsData.reserveAssetData.find(
        (e) => e.digest === event.digest && e.coinType === coinType,
      );
      if (!reserveAssetDataEvent) return;

      const timestampS = reserveAssetDataEvent.timestamp;
      const cumulativeBorrowRate = new BigNumber(
        reserveAssetDataEvent.cumulativeBorrowRate,
      ).div(WAD);

      const position = JSON.parse(obligationDataEvent.borrowsJson).find(
        (p: any) => normalizeStructTag(p.coin_type.name) === coinType,
      );
      const borrowedAmount = new BigNumber(position?.borrowed_amount.value ?? 0)
        .div(WAD)
        .div(10 ** coinMetadata.decimals);

      const prev =
        resultMap[coinType] && resultMap[coinType].length > 0
          ? resultMap[coinType][resultMap[coinType].length - 1]
          : undefined;

      resultMap[coinType] = resultMap[coinType] ?? [];
      resultMap[coinType].push({
        timestampS,
        cumulativeBorrowRate,
        borrowedAmount,
        cumInterest: prev
          ? +new BigNumber(prev.cumInterest).plus(
              getInterestPaid(
                timestampS,
                cumulativeBorrowRate,
                prev.timestampS,
                prev.cumulativeBorrowRate,
                prev.borrowedAmount,
              ),
            )
          : 0,
      });
    });

    for (const coinType of Object.keys(resultMap)) {
      // Add current timestamp
      const reserve = data.reserveMap[coinType];
      if (!reserve) continue;

      const timestampS = nowS;
      const cumulativeBorrowRate = reserve.cumulativeBorrowRate;

      const prev = resultMap[coinType][resultMap[coinType].length - 1];

      resultMap[coinType].push({
        timestampS,
        cumulativeBorrowRate,
        borrowedAmount: new BigNumber(-1),
        cumInterest: +new BigNumber(prev.cumInterest).plus(
          getInterestPaid(
            timestampS,
            cumulativeBorrowRate,
            prev.timestampS,
            prev.cumulativeBorrowRate,
            prev.borrowedAmount,
          ),
        ),
      });

      // Increase resolution
      const reserveAssetDataEvents =
        reserveAssetDataEventsMap?.[reserve.id]?.[30]; // The last 30 days will be higher resolution
      if (reserveAssetDataEvents === undefined) return undefined;

      for (let i = 0; i < reserveAssetDataEvents.length; i++) {
        const r = reserveAssetDataEvents[i];
        const timestampS = r.timestampS;
        const cumulativeBorrowRate = r.cumulativeBorrowRate;
        if (
          timestampS <= resultMap[coinType][0].timestampS ||
          timestampS >=
            resultMap[coinType][resultMap[coinType].length - 1].timestampS
        )
          continue;
        const prev = resultMap[coinType].findLast(
          (d) => d.timestampS < timestampS,
        );
        if (!prev) continue;
        const interestPaid = getInterestPaid(
          timestampS,
          cumulativeBorrowRate,
          prev.timestampS,
          prev.cumulativeBorrowRate,
          prev.borrowedAmount,
        );
        resultMap[coinType].push({
          timestampS,
          cumulativeBorrowRate,
          borrowedAmount: prev.borrowedAmount.plus(interestPaid),
          cumInterest: +new BigNumber(prev.cumInterest).plus(interestPaid),
        });
        resultMap[coinType].sort((a, b) => a.timestampS - b.timestampS);
      }
    }

    return resultMap;
  }, [
    eventsData,
    data.lendingMarket.reserves,
    data.coinMetadataMap,
    getInterestPaid,
    data.reserveMap,
    nowS,
    reserveAssetDataEventsMap,
  ]);

  // Rewards
  const rewardsMap = useMemo(() => {
    if (eventsData === undefined) return undefined;

    const resultMap: {
      [side: string]: {
        [coinType: string]: {
          [rewardCoinType: string]: {
            [timestampS: number]: BigNumber;
          };
        };
      };
    } = {};

    eventsData.claimReward.forEach((claimRewardEvent) => {
      const reserve = data.lendingMarket.reserves.find(
        (reserve) => reserve.id === claimRewardEvent.reserveId,
      );
      if (!reserve) return;

      const coinMetadata = data.coinMetadataMap[claimRewardEvent.coinType];
      const claimedAmount = new BigNumber(claimRewardEvent.liquidityAmount).div(
        10 ** coinMetadata.decimals,
      );
      if (claimedAmount.eq(0)) return;

      const side = claimRewardEvent.isDepositReward
        ? Side.DEPOSIT
        : Side.BORROW;

      resultMap[side] = resultMap[side] ?? {};
      resultMap[side][reserve.coinType] =
        resultMap[side][reserve.coinType] ?? {};
      resultMap[side][reserve.coinType][claimRewardEvent.coinType] =
        resultMap[side][reserve.coinType][claimRewardEvent.coinType] ?? {};
      resultMap[side][reserve.coinType][claimRewardEvent.coinType][nowS] =
        resultMap[side][reserve.coinType][claimRewardEvent.coinType][nowS] ??
        new BigNumber(0);

      resultMap[side][reserve.coinType][claimRewardEvent.coinType][nowS] =
        resultMap[side][reserve.coinType][claimRewardEvent.coinType][nowS].plus(
          claimedAmount,
        );
      resultMap[side][reserve.coinType][claimRewardEvent.coinType][
        claimRewardEvent.timestamp
      ] = resultMap[side][reserve.coinType][claimRewardEvent.coinType][nowS];
    });

    Object.entries(data.rewardMap).forEach(([coinType, rewards]) => {
      [...rewards.deposit, ...rewards.borrow].forEach((reward) => {
        const claimableAmount =
          reward.obligationClaims[obligation.id]?.claimableAmount ??
          new BigNumber(0);
        if (claimableAmount.eq(0)) return;

        const side = reward.stats.side;

        resultMap[side] = resultMap[side] ?? {};
        resultMap[side][coinType] = resultMap[side][coinType] ?? {};
        resultMap[side][coinType][reward.stats.rewardCoinType] =
          resultMap[side][coinType][reward.stats.rewardCoinType] ?? {};
        resultMap[side][coinType][reward.stats.rewardCoinType][nowS] =
          resultMap[side][coinType][reward.stats.rewardCoinType][nowS] ??
          new BigNumber(0);

        resultMap[side][coinType][reward.stats.rewardCoinType][nowS] =
          resultMap[side][coinType][reward.stats.rewardCoinType][nowS].plus(
            claimableAmount,
          );
      });
    });

    return resultMap;
  }, [
    eventsData,
    data.lendingMarket.reserves,
    data.coinMetadataMap,
    nowS,
    data.rewardMap,
    obligation.id,
  ]);

  // Chart
  const getInterpolatedCumInterestData = useCallback(
    (cumInterestMap?: CumInterestMap) => {
      if (cumInterestMap === undefined) return undefined;
      const sortedCoinTypes = Object.keys(cumInterestMap).sort((a, b) =>
        reserveSort(data.lendingMarket.reserves, a, b),
      );
      const sortedTimestampsS = Array.from(
        new Set(
          Object.values(cumInterestMap)
            .map((chartData) => chartData.map((d) => d.timestampS).flat())
            .flat(),
        ),
      ).sort((a, b) => a - b);
      const minTimestampS = Math.min(...sortedTimestampsS);
      const maxTimestampS = Math.max(...sortedTimestampsS);
      const diffS = maxTimestampS - minTimestampS;
      let sampledTimestampsS: number[] = [];
      const minSampleIntervalS = 1 * 60;
      if (diffS < minSampleIntervalS) sampledTimestampsS = sortedTimestampsS;
      else {
        const days = diffS / DAY_S;
        let sampleIntervalS;
        if (days <= 1 / 4)
          sampleIntervalS = minSampleIntervalS; // 360
        else if (days <= 1 / 2)
          sampleIntervalS = 2 * 60; // 360
        else if (days <= 1)
          sampleIntervalS = 5 * 60; // 288
        else if (days <= 2)
          sampleIntervalS = 10 * 60; // 288
        else if (days <= 3)
          sampleIntervalS = 15 * 60; // 288
        else if (days <= 7)
          sampleIntervalS = 30 * 60; // 336
        else if (days <= 14)
          sampleIntervalS = 60 * 60; // 336
        else if (days <= 30)
          sampleIntervalS = 2 * 60 * 60; // 360
        else if (days <= 60)
          sampleIntervalS = 4 * 60 * 60; // 360
        else if (days <= 90)
          sampleIntervalS = 6 * 60 * 60; // 360
        else if (days <= 180)
          sampleIntervalS = 12 * 60 * 60; // 360
        else if (days <= 360)
          sampleIntervalS = DAY_S; // 360
        else sampleIntervalS = DAY_S;
        const startTimestampS =
          minTimestampS - (minTimestampS % sampleIntervalS);
        const endTimestampS = maxTimestampS;
        const n =
          Math.floor((endTimestampS - startTimestampS) / sampleIntervalS) + 1;
        for (let i = 0; i < n; i++) {
          const tS = startTimestampS + sampleIntervalS * i;
          if (tS >= maxTimestampS) break;
          sampledTimestampsS.push(tS);
        }
        sampledTimestampsS.push(maxTimestampS);
      }
      const result: ChartData[] = [];
      for (const timestampS of sampledTimestampsS) {
        const d: ChartData = sortedCoinTypes.reduce(
          (acc, coinType) => {
            return {
              ...acc,
              [coinType]: +linearlyInterpolate(
                cumInterestMap[coinType],
                "timestampS",
                "cumInterest",
                timestampS,
              ),
            };
          },
          { timestampS },
        );
        result.push(d);
      }
      return result;
    },
    [data.lendingMarket.reserves],
  );
  const interpolatedCumInterestEarnedData = useMemo(
    () => getInterpolatedCumInterestData(cumInterestEarnedMap),
    [getInterpolatedCumInterestData, cumInterestEarnedMap],
  );
  const interpolatedCumInterestPaidData = useMemo(
    () => getInterpolatedCumInterestData(cumInterestPaidMap),
    [getInterpolatedCumInterestData, cumInterestPaidMap],
  );

  // Usd
  const getCumInterestUsd = useCallback(
    (cumInterestMap?: CumInterestMap) => {
      if (cumInterestMap === undefined) return undefined;

      return Object.keys(cumInterestMap).reduce((acc, coinType) => {
        const reserve = data.reserveMap[coinType];
        if (!reserve) return acc;

        const d = cumInterestMap[coinType].find((d) => d.timestampS === nowS);
        if (!d) return acc;

        const cumInterestUsd = new BigNumber(d.cumInterest).times(
          reserve.price,
        );
        return acc.plus(cumInterestUsd);
      }, new BigNumber(0));
    },
    [data.reserveMap, nowS],
  );

  const cumInterestEarnedUsd = useMemo(
    () => getCumInterestUsd(cumInterestEarnedMap),
    [getCumInterestUsd, cumInterestEarnedMap],
  );

  const cumInterestPaidUsd = useMemo(
    () => getCumInterestUsd(cumInterestPaidMap),
    [getCumInterestUsd, cumInterestPaidMap],
  );

  const totalRewardsEarnedUsd = useMemo(() => {
    if (rewardsMap === undefined) return undefined;

    let result = new BigNumber(0);
    Object.values(rewardsMap).forEach((sideRewards) => {
      Object.values(sideRewards).forEach((reserveRewards) => {
        Object.keys(reserveRewards).forEach((rewardCoinType) => {
          const reserve = data.reserveMap[rewardCoinType];
          if (!reserve) return;

          result = result.plus(
            reserveRewards[rewardCoinType][nowS].times(reserve.price),
          );
        });
      });
    });

    return result;
  }, [rewardsMap, data.reserveMap, nowS]);

  const totalEarningsUsd = useMemo(() => {
    if (
      cumInterestEarnedUsd === undefined ||
      cumInterestPaidUsd === undefined ||
      totalRewardsEarnedUsd === undefined
    )
      return undefined;

    return cumInterestEarnedUsd
      .minus(cumInterestPaidUsd)
      .plus(totalRewardsEarnedUsd);
  }, [cumInterestEarnedUsd, cumInterestPaidUsd, totalRewardsEarnedUsd]);

  // Columns
  const getColumns = useCallback(
    (interestTitle: string): ColumnDef<RowData>[] => [
      {
        accessorKey: "coinType",
        sortingFn: "text",
        header: ({ column }) => tableHeader(column, "Asset name"),
        cell: ({ row }) => {
          const { coinType } = row.original;

          const coinMetadata = data.coinMetadataMap[coinType];

          return (
            <div className="flex w-max flex-row items-center gap-2">
              <TokenLogo
                className="h-4 w-4"
                token={{
                  coinType,
                  symbol: coinMetadata.symbol,
                  iconUrl: coinMetadata.iconUrl,
                }}
              />

              <TBody className="w-max">{coinMetadata.symbol}</TBody>
            </div>
          );
        },
      },
      {
        accessorKey: "interest",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, interestTitle),
        cell: ({ row }) => {
          const { coinType, interest } = row.original;

          const coinMetadata = data.coinMetadataMap[coinType];

          return (
            <TBody className="w-max">
              {formatToken(interest, { dp: coinMetadata.decimals })}{" "}
              {coinMetadata.symbol}
            </TBody>
          );
        },
      },
      {
        accessorKey: "rewards",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Rewards earned"),
        cell: ({ row }) => {
          const { rewards } = row.original;

          if (Object.entries(rewards).length === 0)
            return <TLabelSans className="w-max">N/A</TLabelSans>;
          return (
            <div className="flex w-max flex-col gap-1">
              {Object.keys(rewards).map((coinType) => {
                const coinMetadata = data.coinMetadataMap[coinType];

                return (
                  <TokenAmount
                    key={coinType}
                    amount={rewards[coinType][nowS]}
                    token={{
                      coinType,
                      symbol: coinMetadata.symbol,
                      iconUrl: coinMetadata.iconUrl,
                    }}
                    decimals={coinMetadata.decimals}
                  />
                );
              })}
            </div>
          );
        },
      },
    ],
    [data.coinMetadataMap, nowS],
  );

  const depositColumns = getColumns("Interest earned");
  const borrowColumns = getColumns("Interest paid");

  // Rows
  const rows = useMemo(() => {
    if (
      cumInterestEarnedMap === undefined ||
      cumInterestPaidMap === undefined ||
      rewardsMap === undefined
    )
      return undefined;

    const depositKeys = Array.from(
      new Set([
        ...Object.keys(cumInterestEarnedMap),
        ...Object.keys(rewardsMap?.deposit ?? {}),
      ]),
    );
    const borrowKeys = Array.from(
      new Set([
        ...Object.keys(cumInterestPaidMap),
        ...Object.keys(rewardsMap?.borrow ?? {}),
      ]),
    );

    const depositRows = depositKeys
      .reduce(
        (acc: RowData[], coinType) => [
          ...acc,
          {
            coinType,
            interest: new BigNumber(
              cumInterestEarnedMap[coinType]?.find((d) => d.timestampS === nowS)
                ?.cumInterest ?? 0,
            ),
            rewards: rewardsMap?.deposit?.[coinType] ?? {},
          } as RowData,
        ],
        [],
      )
      .sort((a, b) =>
        reserveSort(data.lendingMarket.reserves, a.coinType, b.coinType),
      );

    const borrowRows = borrowKeys
      .reduce(
        (acc: RowData[], coinType) => [
          ...acc,
          {
            coinType,
            interest: new BigNumber(
              cumInterestPaidMap[coinType]?.find((d) => d.timestampS === nowS)
                ?.cumInterest ?? 0,
            ),
            rewards: rewardsMap?.borrow?.[coinType] ?? {},
          } as RowData,
        ],
        [],
      )
      .sort((a, b) =>
        reserveSort(data.lendingMarket.reserves, a.coinType, b.coinType),
      );

    return { deposit: depositRows, borrow: borrowRows };
  }, [
    cumInterestEarnedMap,
    cumInterestPaidMap,
    rewardsMap,
    nowS,
    data.lendingMarket.reserves,
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pt-4">
      <div className="flex flex-col gap-2 px-4">
        <div className="relative w-full">
          <div className="absolute bottom-0 left-0 right-3/4 top-0 z-[1] rounded-l-sm bg-gradient-to-r from-primary/20 to-transparent" />

          <div className="relative z-[2] flex flex-row items-center justify-around rounded-sm border border-primary/5 px-2 py-3 md:px-4">
            <div className="flex flex-col items-center gap-1">
              <TLabelSans className="text-center">Net earnings</TLabelSans>
              {totalEarningsUsd !== undefined ? (
                <Tooltip title={formatUsd(totalEarningsUsd, { exact: true })}>
                  <TBody
                    className={cn(
                      "text-center",
                      totalEarningsUsd.gt(0) && "text-success",
                      totalEarningsUsd.lt(0) && "text-destructive",
                    )}
                  >
                    {totalEarningsUsd.lt(0) && "-"}
                    {formatUsd(totalEarningsUsd.abs())}
                  </TBody>
                </Tooltip>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
            </div>

            <TLabelSans>=</TLabelSans>

            <div className="flex flex-col items-center gap-1">
              <TLabelSans className="text-center">Rewards earned</TLabelSans>
              {totalRewardsEarnedUsd !== undefined ? (
                <Tooltip
                  title={formatUsd(totalRewardsEarnedUsd, { exact: true })}
                >
                  <TBody className="text-center">
                    {formatUsd(totalRewardsEarnedUsd)}
                  </TBody>
                </Tooltip>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
            </div>

            <TLabelSans>+</TLabelSans>

            <div className="flex flex-col items-center gap-1">
              <TLabelSans className="text-center">Interest earned</TLabelSans>
              {cumInterestEarnedUsd !== undefined ? (
                <Tooltip
                  title={formatUsd(cumInterestEarnedUsd, { exact: true })}
                >
                  <TBody className="text-center">
                    {formatUsd(cumInterestEarnedUsd)}
                  </TBody>
                </Tooltip>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
            </div>

            <TLabelSans>-</TLabelSans>

            <div className="flex flex-col items-center gap-1">
              <TLabelSans className="text-center">Interest paid</TLabelSans>
              {cumInterestPaidUsd ? (
                <Tooltip title={formatUsd(cumInterestPaidUsd, { exact: true })}>
                  <TBody className="text-center">
                    {formatUsd(cumInterestPaidUsd)}
                  </TBody>
                </Tooltip>
              ) : (
                <Skeleton className="h-5 w-10" />
              )}
            </div>
          </div>
        </div>

        <TLabelSans>
          Note: The above are estimates calculated using current prices.
        </TLabelSans>
      </div>

      {[
        {
          side: Side.DEPOSIT,
          title: "Deposits",
          columns: depositColumns,
          data: rows?.deposit,
          noDataMessage: "No deposits",
        },
        {
          side: Side.BORROW,
          title: "Borrows",
          columns: borrowColumns,
          data: rows?.borrow,
          noDataMessage: "No borrows",
        },
      ].map((table, index, array) => {
        const chartData =
          table.side === Side.DEPOSIT
            ? interpolatedCumInterestEarnedData
            : interpolatedCumInterestPaidData;

        return (
          <div key={table.title} className="flex flex-col gap-4">
            <TitleWithIcon className="px-4">{table.title}</TitleWithIcon>

            <div key={table.title} className="flex flex-col gap-4">
              <div className="w-full">
                <DataTable<RowData>
                  columns={table.columns}
                  data={table.data}
                  noDataMessage={table.noDataMessage}
                  skeletonRows={data.lendingMarket.reserves.length}
                  container={{
                    className: "overflow-y-visible overflow-x-auto",
                  }}
                  tableCellClassName={(cell) =>
                    cn(
                      cell &&
                        Object.entries(cell.row.original.rewards).length > 1
                        ? "py-2 h-auto"
                        : "py-0 h-12",
                    )
                  }
                />
              </div>

              {(chartData === undefined || chartData.length > 0) && (
                <div
                  className={cn("w-full", index === array.length - 1 && "pb-4")}
                >
                  <EarningsChart
                    side={table.side}
                    isLoading={chartData === undefined}
                    data={chartData ?? []}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
