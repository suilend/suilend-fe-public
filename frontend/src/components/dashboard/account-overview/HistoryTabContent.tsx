import { useMemo } from "react";

import { ColumnDef, Row } from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import { cloneDeep } from "lodash";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { formatToken } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";
import {
  ApiBorrowEvent,
  ApiClaimRewardEvent,
  ApiDepositEvent,
  ApiLiquidateEvent,
  ApiRepayEvent,
  ApiWithdrawEvent,
} from "@suilend/sdk/lib/types";
import { reserveSort } from "@suilend/sdk/utils";

import {
  EventsData,
  TokenAmount,
  getCtokenExchangeRate,
} from "@/components/dashboard/account-overview/AccountOverviewDialog";
import DataTable, { tableHeader } from "@/components/dashboard/DataTable";
import Button from "@/components/shared/Button";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  EventType,
  EventTypeNameMap,
  apiEventSortDesc,
  eventSortAsc,
} from "@/lib/events";
import { cn } from "@/lib/utils";

interface RowData {
  timestamp: number;
  eventIndex: number;
  eventType: EventType;
  event:
    | ApiDepositEvent
    | ApiBorrowEvent
    | ApiWithdrawEvent
    | ApiRepayEvent
    | ApiLiquidateEvent
    | ApiClaimRewardEvent;
  subRows?: RowData[];
}

enum ColumnId {
  DATE = "date",
  EVENT_TYPE = "eventType",
  DETAILS = "details",
  DIGEST = "digest",
}

interface HistoryTabContentProps {
  eventsData?: EventsData;
}

export default function HistoryTabContent({
  eventsData,
}: HistoryTabContentProps) {
  const { explorer } = useSettingsContext();
  const { appData } = useLoadedAppContext();

  // Columns
  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        id: ColumnId.DATE,
        accessorKey: "date",
        sortingFn: (rowA: Row<RowData>, rowB: Row<RowData>) =>
          eventSortAsc(rowA.original, rowB.original),
        header: ({ column }) =>
          tableHeader(column, "Date", { isDate: true, borderBottom: true }),
        cell: ({ row }) => {
          const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
          const { timestamp, eventType } = row.original;

          if (isGroupRow && eventType === EventType.LIQUIDATE)
            return (
              <TBodySans className="w-max text-muted-foreground">
                Multiple
              </TBodySans>
            );
          return (
            <TBodySans className="w-max">
              {formatDate(new Date(timestamp * 1000), "yyyy-MM-dd HH:mm:ss")}
            </TBodySans>
          );
        },
      },
      {
        id: ColumnId.EVENT_TYPE,
        accessorKey: "eventType",
        enableSorting: false,
        filterFn: (row, key, value: EventType[]) =>
          value.includes(row.original.eventType),
        header: ({ column }) =>
          tableHeader(column, "Action", { borderBottom: true }),
        cell: ({ row }) => {
          const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
          const { eventType } = row.original;

          return (
            <TBodySans className="w-max">
              {EventTypeNameMap[eventType]}
              {isGroupRow && eventType === EventType.LIQUIDATE && (
                <span className="ml-1.5 text-muted-foreground">
                  ({row.subRows.length})
                </span>
              )}
            </TBodySans>
          );
        },
      },
      {
        id: ColumnId.DETAILS,
        accessorKey: "details",
        enableSorting: false,
        filterFn: (row, key, value: string[]) => {
          const { eventType, event } = row.original;

          if (
            [EventType.BORROW, EventType.WITHDRAW, EventType.REPAY].includes(
              eventType,
            )
          ) {
            return value.includes(
              (event as ApiBorrowEvent | ApiWithdrawEvent | ApiRepayEvent)
                .coinType,
            );
          } else if (eventType === EventType.DEPOSIT) {
            if (row.subRows.length > 0) {
              const coinTypes = row.subRows.reduce(
                (acc, subRow) => [
                  ...acc,
                  (subRow.original.event as ApiDepositEvent).coinType,
                ],
                [] as string[],
              );

              return coinTypes.some((coinType) => value.includes(coinType));
            } else return true;
          } else if (eventType === EventType.LIQUIDATE) {
            const liquidateEvent = event as ApiLiquidateEvent;

            const withdrawReserve = appData.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.withdrawReserveId,
            );
            const repayReserve = appData.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.repayReserveId,
            );

            return (
              [withdrawReserve?.coinType, repayReserve?.coinType].filter(
                Boolean,
              ) as string[]
            ).some((coinType) => value.includes(coinType));
          } else if (eventType === EventType.CLAIM_REWARD) {
            if (row.subRows.length > 0) {
              const coinTypes = row.subRows.reduce(
                (acc, subRow) => [
                  ...acc,
                  (subRow.original.event as ApiClaimRewardEvent).coinType,
                ],
                [] as string[],
              );

              return coinTypes.some((coinType) => value.includes(coinType));
            } else return true;
          }

          return false;
        },
        header: ({ column }) =>
          tableHeader(column, "Details", { borderBottom: true }),
        cell: ({ row }) => {
          const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
          const { eventType, event } = row.original;

          if (eventType === EventType.DEPOSIT) {
            const depositedAmountMap: Record<string, BigNumber> = {};

            for (const subRow of row.subRows) {
              const subRowDepositEvent = subRow.original
                .event as ApiDepositEvent;
              const coinMetadata =
                appData.coinMetadataMap[subRowDepositEvent.coinType];

              const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
                (e) =>
                  e.digest === subRowDepositEvent.digest &&
                  e.coinType === subRowDepositEvent.coinType,
              );
              if (!reserveAssetDataEvent)
                return <TLabelSans className="w-max">N/A</TLabelSans>;

              depositedAmountMap[subRowDepositEvent.coinType] = (
                depositedAmountMap[subRowDepositEvent.coinType] ??
                new BigNumber(0)
              ).plus(
                new BigNumber(subRowDepositEvent.ctokenAmount)
                  .times(getCtokenExchangeRate(reserveAssetDataEvent))
                  .div(10 ** coinMetadata.decimals),
              );
            }

            return (
              <div className="flex w-max flex-col gap-1">
                {Object.entries(depositedAmountMap).map(([coinType, value]) => {
                  const coinMetadata = appData.coinMetadataMap[coinType];

                  return (
                    <TokenAmount
                      key={coinType}
                      amount={value}
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
          } else if (eventType === EventType.BORROW) {
            const borrowEvent = event as ApiBorrowEvent;
            const coinMetadata = appData.coinMetadataMap[borrowEvent.coinType];

            const incFeesAmount = new BigNumber(
              borrowEvent.liquidityAmount,
            ).div(10 ** coinMetadata.decimals);
            const feesAmount = new BigNumber(
              borrowEvent.originationFeeAmount,
            ).div(10 ** coinMetadata.decimals);
            const amount = incFeesAmount.minus(feesAmount);

            return (
              <div className="flex w-max flex-col gap-1">
                <TokenAmount
                  amount={amount}
                  token={{
                    coinType: borrowEvent.coinType,
                    symbol: coinMetadata.symbol,
                    iconUrl: coinMetadata.iconUrl,
                  }}
                  decimals={coinMetadata.decimals}
                />

                <TLabelSans className="w-max">
                  +{formatToken(feesAmount, { dp: coinMetadata.decimals })}{" "}
                  {coinMetadata.symbol} in fees
                </TLabelSans>
              </div>
            );
          } else if (eventType === EventType.WITHDRAW) {
            const withdrawEvent = event as ApiWithdrawEvent;
            const coinMetadata =
              appData.coinMetadataMap[withdrawEvent.coinType];

            const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
              (e) =>
                e.digest === withdrawEvent.digest &&
                e.coinType === withdrawEvent.coinType,
            );
            if (!reserveAssetDataEvent)
              return <TLabelSans className="w-max">N/A</TLabelSans>;

            const amount = new BigNumber(withdrawEvent.ctokenAmount)
              .times(getCtokenExchangeRate(reserveAssetDataEvent))
              .div(10 ** coinMetadata.decimals);

            return (
              <TokenAmount
                amount={amount}
                token={{
                  coinType: withdrawEvent.coinType,
                  symbol: coinMetadata.symbol,
                  iconUrl: coinMetadata.iconUrl,
                }}
                decimals={coinMetadata.decimals}
              />
            );
          } else if (eventType === EventType.REPAY) {
            const repayEvent = event as ApiRepayEvent;
            const coinMetadata = appData.coinMetadataMap[repayEvent.coinType];

            const amount = new BigNumber(repayEvent.liquidityAmount).div(
              10 ** coinMetadata.decimals,
            );

            return (
              <TokenAmount
                amount={amount}
                token={{
                  coinType: repayEvent.coinType,
                  symbol: coinMetadata.symbol,
                  iconUrl: coinMetadata.iconUrl,
                }}
                decimals={coinMetadata.decimals}
              />
            );
          } else if (eventType === EventType.LIQUIDATE) {
            const liquidateEvent = event as ApiLiquidateEvent;

            const withdrawReserve = appData.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.withdrawReserveId,
            );
            const repayReserve = appData.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.repayReserveId,
            );
            if (!withdrawReserve || !repayReserve)
              return (
                <TLabelSans className="w-max">
                  {isGroupRow ? "N/A" : "See transaction for details"}
                </TLabelSans>
              );

            let withdrawAmount = new BigNumber(0);
            let repayAmount = new BigNumber(0);

            let liquidatorBonusAmount = new BigNumber(0);
            let protocolFeeAmount = new BigNumber(0);

            const subRows = isGroupRow ? row.subRows : [row];
            for (const subRow of subRows) {
              const subRowLiquidateEvent = subRow.original
                .event as ApiLiquidateEvent;

              const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
                (e) =>
                  e.digest === subRowLiquidateEvent.digest &&
                  e.coinType === withdrawReserve.coinType,
              );
              if (!reserveAssetDataEvent)
                return <TLabelSans className="w-max">N/A</TLabelSans>;

              withdrawAmount = withdrawAmount.plus(
                new BigNumber(subRowLiquidateEvent.withdrawAmount)
                  .times(getCtokenExchangeRate(reserveAssetDataEvent))
                  .div(10 ** withdrawReserve.mintDecimals),
              );
              repayAmount = repayAmount.plus(
                new BigNumber(subRowLiquidateEvent.repayAmount).div(
                  10 ** repayReserve.mintDecimals,
                ),
              );

              liquidatorBonusAmount = liquidatorBonusAmount.plus(
                new BigNumber(subRowLiquidateEvent.liquidatorBonusAmount)
                  .times(getCtokenExchangeRate(reserveAssetDataEvent))
                  .div(10 ** withdrawReserve.mintDecimals),
              );
              protocolFeeAmount = protocolFeeAmount.plus(
                new BigNumber(subRowLiquidateEvent.protocolFeeAmount)
                  .times(getCtokenExchangeRate(reserveAssetDataEvent))
                  .div(10 ** withdrawReserve.mintDecimals),
              );
            }

            return (
              <div className="flex w-max flex-col gap-1">
                <div className="flex w-max flex-row items-center gap-2">
                  <TLabelSans>
                    {isGroupRow
                      ? "Total deposits liquidated"
                      : "Deposits liquidated"}
                  </TLabelSans>
                  <TokenAmount
                    amount={withdrawAmount}
                    token={{
                      coinType: withdrawReserve.coinType,
                      symbol: withdrawReserve.symbol,
                      iconUrl: withdrawReserve.iconUrl,
                    }}
                    decimals={withdrawReserve.mintDecimals}
                  />
                </div>

                <div className="flex w-max flex-row items-center gap-2">
                  <TLabelSans>
                    {isGroupRow ? "Total borrows repaid" : "Borrows repaid"}
                  </TLabelSans>
                  <TokenAmount
                    amount={repayAmount}
                    token={{
                      coinType: repayReserve.coinType,
                      symbol: repayReserve.symbol,
                      iconUrl: repayReserve.iconUrl,
                    }}
                    decimals={repayReserve.mintDecimals}
                  />
                </div>

                <TLabelSans className="w-max">
                  Liquidation penalty:{" "}
                  {formatToken(liquidatorBonusAmount, {
                    dp: withdrawReserve.mintDecimals,
                  })}{" "}
                  {withdrawReserve.token.symbol}
                </TLabelSans>
                <TLabelSans className="w-max">
                  Protocol liquidation fee:{" "}
                  {formatToken(protocolFeeAmount, {
                    dp: withdrawReserve.mintDecimals,
                  })}{" "}
                  {withdrawReserve.token.symbol}
                </TLabelSans>
              </div>
            );
          } else if (eventType === EventType.CLAIM_REWARD) {
            const claimedAmountMap: Record<string, BigNumber> = {};

            for (const subRow of row.subRows) {
              const subRowClaimRewardEvent = subRow.original
                .event as ApiClaimRewardEvent;
              const coinMetadata =
                appData.coinMetadataMap[subRowClaimRewardEvent.coinType];

              claimedAmountMap[subRowClaimRewardEvent.coinType] = (
                claimedAmountMap[subRowClaimRewardEvent.coinType] ??
                new BigNumber(0)
              ).plus(
                new BigNumber(subRowClaimRewardEvent.liquidityAmount).div(
                  10 ** coinMetadata.decimals,
                ),
              );
            }

            return (
              <div className="flex w-max flex-col gap-1">
                {Object.entries(claimedAmountMap).map(([coinType, value]) => {
                  const coinMetadata = appData.coinMetadataMap[coinType];

                  return (
                    <TokenAmount
                      key={coinType}
                      amount={value}
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
          }

          return null;
        },
      },
      {
        id: ColumnId.DIGEST,
        accessorKey: "digest",
        enableSorting: false,
        header: ({ column }) =>
          tableHeader(column, "Txn", { borderBottom: true }),
        cell: ({ row }) => {
          const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
          const { eventType, event } = row.original;

          if (isGroupRow && eventType === EventType.LIQUIDATE) {
            const isExpanded = row.getIsExpanded();
            const Icon = isExpanded ? ChevronUp : ChevronDown;

            return (
              <div className="flex h-8 w-8 flex-row items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          } else {
            return (
              <OpenOnExplorerButton url={explorer.buildTxUrl(event.digest)} />
            );
          }
        },
      },
    ],
    [
      appData.coinMetadataMap,
      eventsData?.reserveAssetData,
      appData.lendingMarket.reserves,
      explorer,
    ],
  );

  // Filters
  const [filteredOutEventTypes, setFilteredOutEventTypes] = useLocalStorage<
    EventType[]
  >("accountDetailsHistoryFilteredOutEventTypes", []);
  const toggleEventTypeFilter = (eventType: EventType) => {
    setFilteredOutEventTypes((arr) =>
      arr.includes(eventType)
        ? arr.filter((f) => f !== eventType)
        : [...arr, eventType],
    );
  };

  const [filteredOutCoinTypes, setFilteredOutCoinTypes] = useLocalStorage<
    string[]
  >("accountDetailsHistoryFilteredOutCoinTypes", []);
  const toggleCoinTypeFilter = (coinType: string) => {
    setFilteredOutCoinTypes((arr) =>
      arr.includes(coinType)
        ? arr.filter((f) => f !== coinType)
        : [...arr, coinType],
    );
  };

  const eventTypes = useMemo(() => {
    if (eventsData === undefined) return [];

    const result: EventType[] = [];
    if (eventsData.deposit.length > 0) result.push(EventType.DEPOSIT);
    if (eventsData.borrow.length > 0) result.push(EventType.BORROW);
    if (eventsData.withdraw.length > 0) result.push(EventType.WITHDRAW);
    if (eventsData.repay.length > 0) result.push(EventType.REPAY);
    if (eventsData.liquidate.length > 0) result.push(EventType.LIQUIDATE);
    if (eventsData.claimReward.length > 0) result.push(EventType.CLAIM_REWARD);

    return result;
  }, [eventsData]);
  const isNotFilteredOutEventType = (eventType: EventType) =>
    !filteredOutEventTypes.includes(eventType);

  const coinTypes = useMemo(
    () =>
      eventsData === undefined
        ? []
        : Array.from(
            new Set([
              ...[
                ...eventsData.deposit,
                ...eventsData.borrow,
                ...eventsData.withdraw,
                ...eventsData.repay,
                ...eventsData.claimReward,
              ].map((event) => event.coinType),
              ...eventsData.liquidate
                .map((liquidateEvent) => {
                  const withdrawReserve = appData.lendingMarket.reserves.find(
                    (reserve) =>
                      reserve.id === liquidateEvent.withdrawReserveId,
                  );
                  const repayReserve = appData.lendingMarket.reserves.find(
                    (reserve) => reserve.id === liquidateEvent.repayReserveId,
                  );

                  return [
                    withdrawReserve?.coinType,
                    repayReserve?.coinType,
                  ].filter(Boolean) as string[];
                })
                .flat(),
            ]),
          ).sort((a, b) => reserveSort(appData.lendingMarket.reserves, a, b)),
    [eventsData, appData.lendingMarket.reserves],
  );
  const isNotFilteredOutCoinType = (coinType: string) =>
    !filteredOutCoinTypes.includes(coinType);

  // Rows
  const rows = useMemo(() => {
    if (eventsData === undefined) return undefined;

    const sortedRows = Object.entries(eventsData)
      .reduce((acc: RowData[], [key, value]) => {
        if (
          [EventType.RESERVE_ASSET_DATA, EventType.OBLIGATION_DATA].includes(
            key as EventType,
          )
        )
          return acc;

        return [
          ...acc,
          ...value.map(
            (event) =>
              ({
                timestamp: event.timestamp,
                eventIndex: event.eventIndex,
                eventType: key as EventType,
                event: cloneDeep(event),
              }) as RowData,
          ),
        ];
      }, [])
      .sort(apiEventSortDesc);

    const finalRows: RowData[] = [];
    for (let i = 0; i < sortedRows.length; i++) {
      const row = sortedRows[i];

      switch (row.eventType) {
        // Group DEPOSIT events by digest
        case EventType.DEPOSIT: {
          const depositEvent = row.event as ApiDepositEvent;

          const lastRow = finalRows[finalRows.length - 1];
          if (!lastRow || lastRow.eventType !== EventType.DEPOSIT)
            finalRows.push({ ...row, subRows: [row] });
          else {
            const lastDepositEvent = lastRow.event as ApiDepositEvent;

            if (lastDepositEvent.digest !== depositEvent.digest) {
              finalRows.push({ ...row, subRows: [row] });
            } else {
              (lastRow.subRows as RowData[]).push(row);
            }
          }

          break;
        }

        // Group LIQUIDATE events by repayReserveId and withdrawReserveId
        case EventType.LIQUIDATE: {
          const liquidateEvent = row.event as ApiLiquidateEvent;

          const lastRow = finalRows[finalRows.length - 1];
          if (!lastRow || lastRow.eventType !== EventType.LIQUIDATE)
            finalRows.push({ ...row, subRows: [row] });
          else {
            const lastLiquidateEvent = lastRow.event as ApiLiquidateEvent;

            if (
              lastLiquidateEvent.repayReserveId !==
                liquidateEvent.repayReserveId ||
              lastLiquidateEvent.withdrawReserveId !==
                liquidateEvent.withdrawReserveId
            )
              finalRows.push({ ...row, subRows: [row] });
            else (lastRow.subRows as RowData[]).push(row);
          }

          break;
        }

        // Group CLAIM_REWARD events by digest
        case EventType.CLAIM_REWARD: {
          const claimRewardEvent = row.event as ApiClaimRewardEvent;

          const lastRow = finalRows[finalRows.length - 1];
          if (!lastRow || lastRow.eventType !== EventType.CLAIM_REWARD)
            finalRows.push({ ...row, subRows: [row] });
          else {
            const lastClaimRewardEvent = lastRow.event as ApiClaimRewardEvent;

            if (lastClaimRewardEvent.digest !== claimRewardEvent.digest) {
              finalRows.push({ ...row, subRows: [row] });
            } else {
              (lastRow.subRows as RowData[]).push(row);
            }
          }

          break;
        }
        default:
          finalRows.push(row);
      }
    }

    return finalRows;
  }, [eventsData]);

  return (
    <>
      <div className="flex w-full flex-row gap-4">
        <TLabelSans className="my-1">Filters</TLabelSans>

        <div className="flex flex-row flex-wrap gap-2">
          {eventTypes.length > 0 || coinTypes.length > 0 ? (
            <>
              {eventTypes.map((eventType) => {
                const isSelected = isNotFilteredOutEventType(eventType);

                return (
                  <Button
                    key={eventType}
                    className={cn(
                      "rounded-full border hover:border-transparent",
                      isSelected && "border-transparent !bg-muted/20",
                    )}
                    labelClassName="text-xs font-sans"
                    startIcon={isSelected ? <Check /> : undefined}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEventTypeFilter(eventType)}
                  >
                    {EventTypeNameMap[eventType]}
                  </Button>
                );
              })}
              {coinTypes.map((coinType) => {
                const coinMetadata = appData.coinMetadataMap[coinType];
                const isSelected = isNotFilteredOutCoinType(coinType);

                return (
                  <Button
                    key={coinType}
                    className={cn(
                      "h-6 rounded-full border px-2 hover:border-transparent",
                      isSelected && "border-transparent !bg-muted/20",
                    )}
                    startIcon={isSelected ? <Check /> : undefined}
                    icon={
                      <TokenLogo
                        token={{
                          coinType,
                          symbol: coinMetadata.symbol,
                          iconUrl: coinMetadata.iconUrl,
                        }}
                      />
                    }
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCoinTypeFilter(coinType)}
                  >
                    {coinMetadata.symbol}
                  </Button>
                );
              })}
            </>
          ) : (
            <>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-20 rounded-[12px]" />
              ))}
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-12 rounded-[12px]" />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="-mx-4 -mb-4 overflow-y-auto">
        <div className="w-full">
          <DataTable<RowData>
            columns={columns}
            data={rows}
            noDataMessage={
              eventTypes.length + coinTypes.length === 0
                ? "No history"
                : "No history for the active filters"
            }
            columnFilters={[
              {
                id: ColumnId.EVENT_TYPE,
                value: eventTypes.filter(isNotFilteredOutEventType),
              },
              {
                id: ColumnId.DETAILS,
                value: coinTypes.filter(isNotFilteredOutCoinType),
              },
            ]}
            skeletonRows={20}
            tableClassName="relative"
            tableHeaderRowClassName="border-none"
            tableHeadClassName={(header) =>
              cn(
                "sticky bg-popover top-0 z-[2]",
                header.id === ColumnId.DIGEST ? "w-16" : "w-auto",
              )
            }
            tableRowClassName={(row) => {
              if (!row) return;
              const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
              const isNested = !!row.getParentRow();

              return cn(
                isGroupRow &&
                  row.original.eventType === EventType.LIQUIDATE &&
                  row.getIsExpanded() &&
                  "!bg-muted/15",
                isNested && "!bg-muted/10",
              );
            }}
            tableCellClassName={(cell) =>
              cn(
                "relative z-[1]",
                cell &&
                  [
                    EventType.DEPOSIT,
                    EventType.BORROW,
                    EventType.LIQUIDATE,
                    EventType.CLAIM_REWARD,
                  ].includes(cell.row.original.eventType)
                  ? "py-2 h-auto"
                  : "py-0 h-12",
              )
            }
            onRowClick={(row) => {
              const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
              if (isGroupRow && row.original.eventType === EventType.LIQUIDATE)
                return row.getToggleExpandedHandler();
            }}
          />
        </div>
      </div>
    </>
  );
}
