import { useCallback, useMemo } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";

import {
  MS_PER_YEAR,
  formatToken,
  formatUsd,
  isSendPoints,
} from "@suilend/frontend-sui";
import { WAD } from "@suilend/sdk/lib/constants";
import {
  ApiBorrowEvent,
  ApiDepositEvent,
  ApiLiquidateEvent,
  ApiRepayEvent,
  ApiWithdrawEvent,
  Side,
} from "@suilend/sdk/lib/types";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
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
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { DAY_S, EventType, eventSortAsc } from "@/lib/events";
import { cn } from "@/lib/utils";

interface RowData {
  coinType: string;
  interestEarned: BigNumber;
  rewardsEarned: {
    [rewardCoinType: string]: {
      [timestampS: number]: BigNumber;
    };
  };
  borrowFees: BigNumber;
  interestPaid: BigNumber;
  liquidations: BigNumber;
}

interface EarningsTabContentProps {
  eventsData?: EventsData;
  nowS: number;
}

export default function EarningsTabContent({
  eventsData,
  nowS,
}: EarningsTabContentProps) {
  const { data, ...restAppContext } = useLoadedAppContext();
  const obligation = restAppContext.obligation as ParsedObligation;

  type CumInterestEarnedMap = {
    [coinType: string]: {
      timestampS: number;
      ctokenExchangeRate: BigNumber;
      depositedCtokenAmount: BigNumber;
      cumInterest: BigNumber;
    }[];
  };

  type CumInterestPaidMap = {
    [coinType: string]: {
      timestampS: number;
      cumulativeBorrowRate: BigNumber;
      borrowedAmount: BigNumber;
      cumInterest: BigNumber;
    }[];
  };

  type CumBorrowFeesMap = {
    [coinType: string]: BigNumber;
  };

  type CumRewardsEarnedMap = Record<
    Side,
    {
      [coinType: string]: {
        [rewardCoinType: string]: {
          [timestampS: number]: BigNumber;
        };
      };
    }
  >;

  type CumLiquidationsMap = {
    [coinType: string]: BigNumber;
  };

  // Plus - Interest earned
  const getInterestEarned = useCallback(
    (
      timestampS: number,
      ctokenExchangeRate: BigNumber,
      prevTimestampS: number,
      prevCtokenExchangeRate: BigNumber,
      prevDepositedCtokenAmount: BigNumber,
    ) => {
      const proportionOfYear = new BigNumber(timestampS - prevTimestampS).div(
        MS_PER_YEAR / 1000,
      );
      const annualizedInterestRate = proportionOfYear.eq(0)
        ? new BigNumber(0)
        : new BigNumber(ctokenExchangeRate)
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
      if (!coinMetadata) return;

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
          ? prev.cumInterest.plus(
              getInterestEarned(
                timestampS,
                ctokenExchangeRate,
                prev.timestampS,
                prev.ctokenExchangeRate,
                prev.depositedCtokenAmount,
              ),
            )
          : new BigNumber(0),
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
        cumInterest: prev.cumInterest.plus(
          getInterestEarned(
            timestampS,
            ctokenExchangeRate,
            prev.timestampS,
            prev.ctokenExchangeRate,
            prev.depositedCtokenAmount,
          ),
        ),
      });
    }

    return resultMap;
  }, [
    eventsData,
    data.lendingMarket.reserves,
    data.coinMetadataMap,
    getInterestEarned,
    data.reserveMap,
    nowS,
  ]);

  // Plus - Rewards earned
  const rewardsEarnedMap = useMemo(() => {
    if (eventsData === undefined) return undefined;

    const resultMap: CumRewardsEarnedMap = {
      [Side.DEPOSIT]: {},
      [Side.BORROW]: {},
    };

    eventsData.claimReward.forEach((claimRewardEvent) => {
      const reserve = data.lendingMarket.reserves.find(
        (reserve) => reserve.id === claimRewardEvent.reserveId,
      );
      if (!reserve) return;

      const coinMetadata = data.coinMetadataMap[claimRewardEvent.coinType];
      if (!coinMetadata) return;

      const claimedAmount = new BigNumber(claimRewardEvent.liquidityAmount).div(
        10 ** coinMetadata.decimals,
      );
      if (claimedAmount.eq(0)) return;

      const side = claimRewardEvent.isDepositReward
        ? Side.DEPOSIT
        : Side.BORROW;

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

  // Minus - Borrow fees
  const cumBorrowFeesMap = useMemo(() => {
    if (eventsData === undefined) return undefined;

    const resultMap: CumBorrowFeesMap = {};

    const events = [
      ...eventsData.borrow.map((event) => ({
        ...event,
        eventType: EventType.BORROW,
      })),
    ].sort(eventSortAsc);

    events.forEach((event) => {
      const coinType = (event as ApiBorrowEvent).coinType;
      if (!coinType) return;

      const coinMetadata = data.coinMetadataMap[coinType];
      if (!coinMetadata) return;

      const feesAmount = new BigNumber(event.originationFeeAmount).div(
        10 ** coinMetadata.decimals,
      );

      resultMap[coinType] = (resultMap[coinType] ?? new BigNumber(0)).plus(
        feesAmount,
      );
    });

    return resultMap;
  }, [eventsData, data.coinMetadataMap]);

  // Minus - Interest paid
  const getInterestPaid = useCallback(
    (
      timestampS: number,
      cumulativeBorrowRate: BigNumber,
      prevTimestampS: number,
      prevCumulativeBorrowRate: BigNumber,
      prevBorrowedAmount: BigNumber,
    ) => {
      const proportionOfYear = new BigNumber(timestampS - prevTimestampS).div(
        MS_PER_YEAR / 1000,
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
      if (!coinMetadata) return;

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
          ? prev.cumInterest.plus(
              getInterestPaid(
                timestampS,
                cumulativeBorrowRate,
                prev.timestampS,
                prev.cumulativeBorrowRate,
                prev.borrowedAmount,
              ),
            )
          : new BigNumber(0),
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
        cumInterest: prev.cumInterest.plus(
          getInterestPaid(
            timestampS,
            cumulativeBorrowRate,
            prev.timestampS,
            prev.cumulativeBorrowRate,
            prev.borrowedAmount,
          ),
        ),
      });
    }

    return resultMap;
  }, [
    eventsData,
    data.lendingMarket.reserves,
    data.coinMetadataMap,
    getInterestPaid,
    data.reserveMap,
    nowS,
  ]);

  // Minus - Liquidations
  const cumLiquidationsMap = useMemo(() => {
    if (eventsData === undefined) return undefined;

    const resultMap: CumLiquidationsMap = {};

    const events = [
      ...eventsData.liquidate.map((event) => ({
        ...event,
        eventType: EventType.LIQUIDATE,
      })),
    ].sort(eventSortAsc);

    events.forEach((event) => {
      const withdrawReserve = data.lendingMarket.reserves.find(
        (reserve) => reserve.id === event.withdrawReserveId,
      );
      if (!withdrawReserve) return;

      const withdrawCoinMetadata =
        data.coinMetadataMap[withdrawReserve.coinType];
      if (!withdrawCoinMetadata) return;

      const reserveAssetDataEvent = eventsData.reserveAssetData.find(
        (e) => e.digest === event.digest,
      );
      if (!reserveAssetDataEvent) return;

      const liquidatorBonusAmount = new BigNumber(event.liquidatorBonusAmount)
        .times(getCtokenExchangeRate(reserveAssetDataEvent))
        .div(10 ** withdrawReserve.mintDecimals);
      const protocolFeeAmount = new BigNumber(event.protocolFeeAmount)
        .times(getCtokenExchangeRate(reserveAssetDataEvent))
        .div(10 ** withdrawReserve.mintDecimals);

      resultMap[withdrawReserve.coinType] = (
        resultMap[withdrawReserve.coinType] ?? new BigNumber(0)
      ).plus(liquidatorBonusAmount.plus(protocolFeeAmount));
    });

    return resultMap;
  }, [eventsData, data.lendingMarket.reserves, data.coinMetadataMap]);

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
  type CumInterestMap = {
    [coinType: string]: {
      timestampS: number;
      cumInterest: BigNumber;
    }[];
  };

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

  const cumRewardsEarnedUsd = useMemo(() => {
    if (rewardsEarnedMap === undefined) return undefined;

    let result = new BigNumber(0);
    Object.entries(rewardsEarnedMap).forEach(([side, sideRewards]) => {
      Object.entries(sideRewards).forEach(
        ([reserveCoinType, reserveRewards]) => {
          Object.keys(reserveRewards).forEach((rewardCoinType) => {
            if (isSendPoints(rewardCoinType)) return;

            const rewardAmount = reserveRewards[rewardCoinType][nowS];
            const rewardPrice = data.rewardPriceMap[rewardCoinType];
            if (!rewardPrice) return;

            result = result.plus(rewardAmount.times(rewardPrice));
          });
        },
      );
    });

    return result;
  }, [rewardsEarnedMap, nowS, data.rewardPriceMap]);

  const cumBorrowFeesUsd = useMemo(() => {
    if (cumBorrowFeesMap === undefined) return undefined;

    return Object.keys(cumBorrowFeesMap).reduce((acc, coinType) => {
      const reserve = data.reserveMap[coinType];
      if (!reserve) return acc;

      return acc.plus(cumBorrowFeesMap[coinType].times(reserve.price));
    }, new BigNumber(0));
  }, [cumBorrowFeesMap, data.reserveMap]);

  const cumInterestPaidUsd = useMemo(
    () => getCumInterestUsd(cumInterestPaidMap),
    [getCumInterestUsd, cumInterestPaidMap],
  );

  const cumLiquidationsUsd = useMemo(() => {
    if (cumLiquidationsMap === undefined) return undefined;

    return Object.keys(cumLiquidationsMap).reduce((acc, coinType) => {
      const reserve = data.reserveMap[coinType];
      if (!reserve) return acc;

      return acc.plus(cumLiquidationsMap[coinType].times(reserve.price));
    }, new BigNumber(0));
  }, [cumLiquidationsMap, data.reserveMap]);

  const totalEarningsUsd = useMemo(() => {
    if (
      cumInterestEarnedUsd === undefined ||
      cumRewardsEarnedUsd === undefined ||
      cumBorrowFeesUsd === undefined ||
      cumInterestPaidUsd === undefined ||
      cumLiquidationsUsd === undefined
    )
      return undefined;

    return new BigNumber(cumInterestEarnedUsd.plus(cumRewardsEarnedUsd)).minus(
      cumBorrowFeesUsd.plus(cumInterestPaidUsd).plus(cumLiquidationsUsd),
    );
  }, [
    cumInterestEarnedUsd,
    cumRewardsEarnedUsd,
    cumBorrowFeesUsd,
    cumInterestPaidUsd,
    cumLiquidationsUsd,
  ]);

  // Columns
  const columns = useMemo(() => {
    const result: ColumnDef<RowData>[] = [];

    result.push(
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
        accessorKey: "interestEarned",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Interest earned"),
        cell: ({ row }) => {
          const { coinType, interestEarned } = row.original;

          const coinMetadata = data.coinMetadataMap[coinType];

          if (interestEarned.eq(0))
            return <TLabelSans className="w-max">--</TLabelSans>;
          return (
            <TBody className="w-max">
              {formatToken(interestEarned, { dp: coinMetadata.decimals })}{" "}
              {coinMetadata.symbol}
            </TBody>
          );
        },
      },
      {
        accessorKey: "rewardsEarned",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Rewards earned"),
        cell: ({ row }) => {
          const { rewardsEarned } = row.original;

          if (Object.entries(rewardsEarned).length === 0)
            return <TLabelSans className="w-max">--</TLabelSans>;
          return (
            <div className="flex w-max flex-col gap-1">
              {Object.keys(rewardsEarned)
                .sort((a, b) => reserveSort(data.lendingMarket.reserves, a, b))
                .map((coinType) => {
                  const coinMetadata = data.coinMetadataMap[coinType];

                  return (
                    <TokenAmount
                      key={coinType}
                      amount={rewardsEarned[coinType][nowS]}
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
      {
        accessorKey: "borrowFees",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Borrow fees"),
        cell: ({ row }) => {
          const { coinType, borrowFees } = row.original;

          const coinMetadata = data.coinMetadataMap[coinType];

          if (borrowFees.eq(0))
            return <TLabelSans className="w-max">--</TLabelSans>;
          return (
            <TBody className="w-max">
              {formatToken(borrowFees, { dp: coinMetadata.decimals })}{" "}
              {coinMetadata.symbol}
            </TBody>
          );
        },
      },
      {
        accessorKey: "interestPaid",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Interest paid"),
        cell: ({ row }) => {
          const { coinType, interestPaid } = row.original;

          const coinMetadata = data.coinMetadataMap[coinType];

          if (interestPaid.eq(0))
            return <TLabelSans className="w-max">--</TLabelSans>;
          return (
            <TBody className="w-max">
              {formatToken(interestPaid, { dp: coinMetadata.decimals })}{" "}
              {coinMetadata.symbol}
            </TBody>
          );
        },
      },
      {
        accessorKey: "liquidations",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Liquidations"),
        cell: ({ row }) => {
          const { coinType, liquidations } = row.original;

          const coinMetadata = data.coinMetadataMap[coinType];

          if (liquidations.eq(0))
            return <TLabelSans className="w-max">--</TLabelSans>;
          return (
            <TBody className="w-max">
              {formatToken(liquidations, { dp: coinMetadata.decimals })}{" "}
              {coinMetadata.symbol}
            </TBody>
          );
        },
      },
    );

    return result;
  }, [data.coinMetadataMap, data.lendingMarket.reserves, nowS]);

  // Rows
  const rows = useMemo(() => {
    if (
      cumInterestEarnedMap === undefined ||
      rewardsEarnedMap === undefined ||
      cumBorrowFeesMap === undefined ||
      cumInterestPaidMap === undefined ||
      cumLiquidationsMap === undefined
    )
      return undefined;

    const coinTypes = Array.from(
      new Set([
        ...Object.keys(cumInterestEarnedMap),
        ...Object.keys({
          ...(rewardsEarnedMap?.[Side.DEPOSIT] ?? {}),
          ...(rewardsEarnedMap?.[Side.BORROW] ?? {}),
        }),
        ...Object.keys(cumBorrowFeesMap),
        ...Object.keys(cumInterestPaidMap),
        ...Object.keys(cumLiquidationsMap),
      ]),
    );

    return coinTypes
      .reduce(
        (acc: RowData[], coinType) => [
          ...acc,
          {
            coinType,
            interestEarned: new BigNumber(
              cumInterestEarnedMap[coinType]?.find((d) => d.timestampS === nowS)
                ?.cumInterest ?? 0,
            ),
            rewardsEarned: {
              ...(rewardsEarnedMap?.[Side.DEPOSIT]?.[coinType] ?? {}),
              ...(rewardsEarnedMap?.[Side.BORROW]?.[coinType] ?? {}),
            },
            borrowFees: cumBorrowFeesMap[coinType] ?? new BigNumber(0),
            interestPaid: new BigNumber(
              cumInterestPaidMap[coinType]?.find((d) => d.timestampS === nowS)
                ?.cumInterest ?? 0,
            ),
            liquidations: cumLiquidationsMap[coinType] ?? new BigNumber(0),
          } as RowData,
        ],
        [],
      )
      .sort((a, b) =>
        reserveSort(data.lendingMarket.reserves, a.coinType, b.coinType),
      );
  }, [
    cumInterestEarnedMap,
    rewardsEarnedMap,
    cumBorrowFeesMap,
    cumInterestPaidMap,
    cumLiquidationsMap,
    nowS,
    data.lendingMarket.reserves,
  ]);

  return (
    <>
      <div className="-mx-4 -mb-4 flex flex-col gap-4 overflow-y-auto">
        {/* Summary */}
        <div className="flex flex-col gap-3 px-4">
          <div className="flex w-full flex-col items-center gap-0.5 md:flex-row">
            {/* Total */}
            <div
              className={cn(
                "flex flex-col items-center gap-1 rounded-sm bg-muted/15 py-3 transition-colors max-md:w-full md:flex-1",
                totalEarningsUsd !== undefined &&
                  cn(
                    totalEarningsUsd.gt(0) && "bg-success/15",
                    totalEarningsUsd.lt(0) && "bg-destructive/15",
                  ),
              )}
            >
              <TLabelSans className="text-center">Net earnings</TLabelSans>
              {totalEarningsUsd !== undefined ? (
                <Tooltip title={formatUsd(totalEarningsUsd, { exact: true })}>
                  <TBody className="text-center">
                    {totalEarningsUsd.lt(0) && "-"}
                    {formatUsd(totalEarningsUsd.abs())}
                  </TBody>
                </Tooltip>
              ) : (
                <Skeleton className="h-5 w-16" />
              )}
            </div>

            {/* Plus */}
            <div className="flex flex-row items-center justify-around rounded-sm bg-success/5 py-3 max-md:w-full md:flex-[2] md:gap-4">
              {/* Interest earned */}
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
                  <Skeleton className="h-5 w-16" />
                )}
              </div>

              {/* Rewards earned */}
              <div className="flex flex-col items-center gap-1">
                <TLabelSans className="text-center">Rewards earned</TLabelSans>
                {cumRewardsEarnedUsd !== undefined ? (
                  <Tooltip
                    title={formatUsd(cumRewardsEarnedUsd, { exact: true })}
                  >
                    <TBody className="text-center">
                      {formatUsd(cumRewardsEarnedUsd)}
                    </TBody>
                  </Tooltip>
                ) : (
                  <Skeleton className="h-5 w-16" />
                )}
              </div>
            </div>

            {/* Minus */}
            <div className="flex flex-row items-center justify-around rounded-sm bg-destructive/5 py-3 max-md:w-full md:flex-[3] md:gap-4">
              {/* Borrow fees */}
              <div className="flex flex-col items-center gap-1">
                <TLabelSans className="text-center">Borrow fees</TLabelSans>
                {cumBorrowFeesUsd ? (
                  <Tooltip title={formatUsd(cumBorrowFeesUsd, { exact: true })}>
                    <TBody className="text-center">
                      {formatUsd(cumBorrowFeesUsd)}
                    </TBody>
                  </Tooltip>
                ) : (
                  <Skeleton className="h-5 w-16" />
                )}
              </div>

              {/* Interest paid */}
              <div className="flex flex-col items-center gap-1">
                <TLabelSans className="text-center">Interest paid</TLabelSans>
                {cumInterestPaidUsd ? (
                  <Tooltip
                    title={formatUsd(cumInterestPaidUsd, { exact: true })}
                  >
                    <TBody className="text-center">
                      {formatUsd(cumInterestPaidUsd)}
                    </TBody>
                  </Tooltip>
                ) : (
                  <Skeleton className="h-5 w-16" />
                )}
              </div>

              {/* Liquidations */}
              <div className="flex flex-col items-center gap-1">
                <TLabelSans className="text-center">Liquidations</TLabelSans>
                {cumLiquidationsUsd ? (
                  <Tooltip
                    title={formatUsd(cumLiquidationsUsd, { exact: true })}
                  >
                    <TBody className="text-center">
                      {formatUsd(cumLiquidationsUsd)}
                    </TBody>
                  </Tooltip>
                ) : (
                  <Skeleton className="h-5 w-16" />
                )}
              </div>
            </div>
          </div>

          <TLabelSans>
            Note: The above are estimates calculated using current prices.
            Interest earned does not include LST (e.g. sSUI) staking yield.
          </TLabelSans>
        </div>

        <div className="flex flex-col gap-6 pb-4">
          {/* Table */}
          <div className="w-full">
            <DataTable<RowData>
              columns={columns}
              data={rows}
              tableCellClassName={(cell) =>
                cn(
                  cell &&
                    Object.entries(cell.row.original.rewardsEarned).length > 1
                    ? "py-2 h-auto"
                    : "py-0 h-12",
                )
              }
            />
          </div>

          {/* Charts */}
          <div className="relative flex w-full flex-col max-md:gap-6 md:flex-row">
            {interpolatedCumInterestEarnedData === undefined ||
            interpolatedCumInterestPaidData === undefined ? (
              <div className="w-full px-4">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : (
              <>
                {interpolatedCumInterestEarnedData.length > 0 && (
                  <div className="relative z-[2] max-md:w-full md:flex-1">
                    <EarningsChart
                      side={Side.DEPOSIT}
                      data={interpolatedCumInterestEarnedData}
                    />
                  </div>
                )}
                {interpolatedCumInterestPaidData.length > 0 && (
                  <div className="relative z-[1] max-md:w-full md:flex-1">
                    <EarningsChart
                      side={Side.BORROW}
                      data={interpolatedCumInterestPaidData}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
