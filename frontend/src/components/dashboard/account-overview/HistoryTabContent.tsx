import { useMemo } from "react";

import { ColumnDef, Row } from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import { cloneDeep } from "lodash";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";

import { useSettingsContext } from "@suilend/frontend-sui-next";
import {
  ApiBorrowEvent,
  ApiClaimRewardEvent,
  ApiDepositEvent,
  ApiLiquidateEvent,
  ApiRepayEvent,
  ApiWithdrawEvent,
} from "@suilend/sdk/types";
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
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  EventType,
  EventTypeNameMap,
  apiEventSortDesc,
  eventSortAsc,
} from "@/lib/events";
import { formatToken } from "@/lib/format";
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
  const { data } = useLoadedAppContext();

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
          const { timestamp } = row.original;

          if (isGroupRow)
            return (
              <TBody className="w-max uppercase text-muted-foreground">
                Multiple
              </TBody>
            );
          return (
            <TBody className="w-max">
              {formatDate(new Date(timestamp * 1000), "yyyy-MM-dd HH:mm:ss")}
            </TBody>
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
            <TBody className="w-max uppercase">
              {EventTypeNameMap[eventType]}
              {isGroupRow && (
                <span className="text-muted-foreground">{` (${row.subRows.length})`}</span>
              )}
            </TBody>
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
            [
              EventType.DEPOSIT,
              EventType.BORROW,
              EventType.WITHDRAW,
              EventType.REPAY,
              EventType.CLAIM_REWARD,
            ].includes(eventType)
          ) {
            return value.includes(
              (
                event as
                  | ApiDepositEvent
                  | ApiBorrowEvent
                  | ApiWithdrawEvent
                  | ApiRepayEvent
                  | ApiClaimRewardEvent
              ).coinType,
            );
          } else if (eventType === EventType.LIQUIDATE) {
            const liquidateEvent = event as ApiLiquidateEvent;

            const repayReserve = data.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.repayReserveId,
            );
            const withdrawReserve = data.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.withdrawReserveId,
            );

            return (
              [repayReserve?.coinType, withdrawReserve?.coinType].filter(
                Boolean,
              ) as string[]
            ).reduce((acc, coinType) => acc || value.includes(coinType), false);
          }

          return false;
        },
        header: ({ column }) =>
          tableHeader(column, "Details", { borderBottom: true }),
        cell: ({ row }) => {
          const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
          const { eventType, event } = row.original;

          if (eventType === EventType.DEPOSIT) {
            const depositEvent = event as ApiDepositEvent;
            const coinMetadata = data.coinMetadataMap[depositEvent.coinType];

            const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
              (e) => e.digest === depositEvent.digest,
            );

            let amount;
            if (reserveAssetDataEvent) {
              amount = new BigNumber(depositEvent.ctokenAmount)
                .times(getCtokenExchangeRate(reserveAssetDataEvent))
                .div(10 ** coinMetadata.decimals);
            }

            return (
              <TokenAmount
                amount={amount}
                token={{
                  coinType: depositEvent.coinType,
                  symbol: coinMetadata.symbol,
                  iconUrl: coinMetadata.iconUrl,
                }}
                decimals={coinMetadata.decimals}
              />
            );
          } else if (eventType === EventType.BORROW) {
            const borrowEvent = event as ApiBorrowEvent;
            const coinMetadata = data.coinMetadataMap[borrowEvent.coinType];

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
            const coinMetadata = data.coinMetadataMap[withdrawEvent.coinType];

            const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
              (e) => e.digest === withdrawEvent.digest,
            );

            let amount;
            if (reserveAssetDataEvent) {
              amount = new BigNumber(withdrawEvent.ctokenAmount)
                .times(getCtokenExchangeRate(reserveAssetDataEvent))
                .div(10 ** coinMetadata.decimals);
            }

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
            const coinMetadata = data.coinMetadataMap[repayEvent.coinType];

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

            const repayReserve = data.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.repayReserveId,
            );
            const withdrawReserve = data.lendingMarket.reserves.find(
              (reserve) => reserve.id === liquidateEvent.withdrawReserveId,
            );
            if (!repayReserve || !withdrawReserve)
              return (
                <TLabelSans className="w-max">
                  {isGroupRow ? "N/A" : "See txn for details"}
                </TLabelSans>
              );

            let withdrawAmount = new BigNumber(0);
            let repayAmount = new BigNumber(0);

            if (isGroupRow) {
              for (const subRow of row.subRows) {
                const subRowLiquidateEvent = subRow.original
                  .event as ApiLiquidateEvent;

                const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
                  (e) => e.digest === subRowLiquidateEvent.digest,
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
              }
            } else {
              const reserveAssetDataEvent = eventsData?.reserveAssetData.find(
                (e) => e.digest === liquidateEvent.digest,
              );
              if (!reserveAssetDataEvent)
                return (
                  <TLabelSans className="w-max">See txn for details</TLabelSans>
                );

              withdrawAmount = withdrawAmount.plus(
                new BigNumber(liquidateEvent.withdrawAmount)
                  .times(getCtokenExchangeRate(reserveAssetDataEvent))
                  .div(10 ** withdrawReserve.mintDecimals),
              );
              repayAmount = repayAmount.plus(
                new BigNumber(liquidateEvent.repayAmount).div(
                  10 ** repayReserve.mintDecimals,
                ),
              );
            }

            return (
              <div className="flex w-max flex-col">
                <div className="flex w-max flex-row items-center gap-2">
                  <TLabelSans>Deposits liquidated</TLabelSans>
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
                  <TLabelSans>Borrows repaid</TLabelSans>
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
              </div>
            );
          } else if (eventType === EventType.CLAIM_REWARD) {
            const claimRewardEvent = event as ApiClaimRewardEvent;
            const coinMetadata =
              data.coinMetadataMap[claimRewardEvent.coinType];

            const claimedAmount = new BigNumber(
              claimRewardEvent.liquidityAmount,
            ).div(10 ** coinMetadata.decimals);

            return (
              <TokenAmount
                amount={claimedAmount}
                token={{
                  coinType: claimRewardEvent.coinType,
                  symbol: coinMetadata.symbol,
                  iconUrl: coinMetadata.iconUrl,
                }}
                decimals={coinMetadata.decimals}
              />
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
          const { event } = row.original;

          if (isGroupRow) {
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
      data.coinMetadataMap,
      eventsData?.reserveAssetData,
      data.lendingMarket.reserves,
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
                  const repayReserve = data.lendingMarket.reserves.find(
                    (reserve) => reserve.id === liquidateEvent.repayReserveId,
                  );
                  const withdrawReserve = data.lendingMarket.reserves.find(
                    (reserve) =>
                      reserve.id === liquidateEvent.withdrawReserveId,
                  );

                  return [
                    repayReserve?.coinType,
                    withdrawReserve?.coinType,
                  ].filter(Boolean) as string[];
                })
                .flat(),
            ]),
          ).sort((a, b) => reserveSort(data.lendingMarket.reserves, a, b)),
    [eventsData, data.lendingMarket.reserves],
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
        // Dedupe CLAIM_REWARD events
        case EventType.CLAIM_REWARD: {
          const claimRewardEvent = row.event as ApiClaimRewardEvent;

          const lastRow = finalRows[finalRows.length - 1];
          if (!lastRow || lastRow.eventType !== EventType.CLAIM_REWARD)
            finalRows.push(cloneDeep(row));
          else {
            const lastClaimRewardEvent = lastRow.event as ApiClaimRewardEvent;

            if (
              lastClaimRewardEvent.coinType === claimRewardEvent.coinType &&
              lastClaimRewardEvent.isDepositReward ===
                claimRewardEvent.isDepositReward &&
              lastClaimRewardEvent.timestamp === claimRewardEvent.timestamp &&
              lastClaimRewardEvent.digest === claimRewardEvent.digest
            ) {
              (
                finalRows[finalRows.length - 1].event as ApiClaimRewardEvent
              ).liquidityAmount = new BigNumber(
                lastClaimRewardEvent.liquidityAmount,
              )
                .plus(claimRewardEvent.liquidityAmount)
                .toString();
            } else finalRows.push(row);
          }

          break;
        }

        // Group LIQUIDATE events
        case EventType.LIQUIDATE: {
          const liquidateEvent = row.event as ApiLiquidateEvent;

          finalRows.push({ ...row, subRows: [row] });
          break;

          // TODO: Group consecutive liquidations for the same asset pair
          const lastRow = finalRows[finalRows.length - 1];
          if (!lastRow || lastRow.eventType !== EventType.LIQUIDATE)
            finalRows.push({ ...row, subRows: [row] });
          else {
            const lastLiquidateEvent = lastRow.event as ApiLiquidateEvent;

            if (
              lastLiquidateEvent.repayReserveId ===
                liquidateEvent.repayReserveId &&
              lastLiquidateEvent.withdrawReserveId ===
                liquidateEvent.withdrawReserveId
            )
              (lastRow.subRows as RowData[]).push(row);
            else finalRows.push({ ...row, subRows: [row] });
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
      {eventTypes.length > 0 || coinTypes.length > 0 ? (
        <div className="flex flex-row gap-4 p-4">
          <TLabelSans className="my-1">Filters</TLabelSans>

          <div className="flex flex-row flex-wrap gap-2">
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
              const coinMetadata = data.coinMetadataMap[coinType];
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
          </div>
        </div>
      ) : (
        <div className="h-4 w-full shrink-0" />
      )}

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
        container={{
          className: cn(rows === undefined && "overflow-y-hidden"),
        }}
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
            isGroupRow && row.getIsExpanded() && "!bg-muted/10",
            isNested && "!bg-card",
          );
        }}
        tableCellClassName={(cell) =>
          cn(
            "relative z-[1]",
            cell &&
              [EventType.BORROW, EventType.LIQUIDATE].includes(
                cell.row.original.eventType,
              )
              ? "py-2 h-auto"
              : "py-0 h-12",
          )
        }
        onRowClick={(row) => {
          const isGroupRow = row.getCanExpand() && row.subRows.length > 1;
          if (isGroupRow) return row.getToggleExpandedHandler();
        }}
      />
    </>
  );
}
