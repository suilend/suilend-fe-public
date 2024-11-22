import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";

import {
  NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES,
  NORMALIZED_fudSUI_COINTYPE,
  Token,
  getFilteredRewards,
  getStakingYieldAprPercent,
  getTotalAprPercent,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Side } from "@suilend/sdk/types";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import AssetCell from "@/components/dashboard/market-table/AssetCell";
import BorrowAprCell from "@/components/dashboard/market-table/BorrowAprCell";
import DepositAprCell from "@/components/dashboard/market-table/DepositAprCell";
import MarketCardList from "@/components/dashboard/market-table/MarketCardList";
import styles from "@/components/dashboard/market-table/MarketTable.module.scss";
import OpenLtvBwCell from "@/components/dashboard/market-table/OpenLtvBwCell";
import TotalBorrowsCell from "@/components/dashboard/market-table/TotalBorrowsCell";
import TotalDepositsCell from "@/components/dashboard/market-table/TotalDepositsCell";
import Tooltip from "@/components/shared/Tooltip";
import { TLabel, TTitle } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatToken, formatUsd } from "@/lib/format";
import {
  ISOLATED_TOOLTIP,
  OPEN_LTV_BORROW_WEIGHT_TOOLTIP,
} from "@/lib/tooltips";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

export enum MarketTableType {
  MARKET = "market",
}

export interface ReservesRowData {
  reserve: ParsedReserve;
  token: Token;
  price: BigNumber;
  isIsolated: boolean;

  openLtvPercent: BigNumber;
  borrowWeight: BigNumber;
  depositedAmount: BigNumber;
  depositedAmountUsd: BigNumber;
  depositedAmountTooltip: string | undefined;
  borrowedAmount: BigNumber;
  borrowedAmountUsd: BigNumber;
  borrowedAmountTooltip: string | undefined;
  depositAprPercent: BigNumber;
  totalDepositAprPercent: BigNumber;
  borrowAprPercent: BigNumber;
  totalBorrowAprPercent: BigNumber;
}

interface HeaderRowData {
  isHeader: boolean;
  isIsolated: boolean;
  count: number;
}

type RowData = ReservesRowData | HeaderRowData;

export default function MarketTable() {
  const { data, obligation } = useLoadedAppContext();
  const { open: openActionsModal } = useActionsModalContext();

  // Columns
  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        accessorKey: "symbol",
        sortingFn: "text",
        header: ({ column }) => tableHeader(column, "Asset name"),
        cell: ({ row }) => {
          if ((row.original as HeaderRowData).isHeader) {
            const { isIsolated, count } = row.original as HeaderRowData;

            return (
              <div className="flex flex-row items-center gap-2">
                <Tooltip title={isIsolated ? ISOLATED_TOOLTIP : undefined}>
                  <TTitle
                    className={cn(
                      "w-max uppercase",
                      isIsolated &&
                        cn("decoration-primary/50", hoverUnderlineClassName),
                    )}
                  >
                    {isIsolated ? "Isolated" : "Main"} assets
                  </TTitle>
                </Tooltip>
                <TLabel>{count}</TLabel>
              </div>
            );
          }
          return (
            <AssetCell
              tableType={MarketTableType.MARKET}
              {...(row.original as ReservesRowData)}
            />
          );
        },
      },
      {
        accessorKey: "depositedAmount",
        sortingFn: decimalSortingFn("depositedAmountUsd"),
        header: ({ column }) =>
          tableHeader(column, "Deposits", { isNumerical: true }),
        cell: ({ row }) =>
          (row.original as HeaderRowData).isHeader ? null : (
            <TotalDepositsCell {...(row.original as ReservesRowData)} />
          ),
      },
      {
        accessorKey: "borrowedAmount",
        sortingFn: decimalSortingFn("borrowedAmountUsd"),
        header: ({ column }) =>
          tableHeader(column, "Borrows", { isNumerical: true }),
        cell: ({ row }) =>
          (row.original as HeaderRowData).isHeader ? null : (
            <TotalBorrowsCell {...(row.original as ReservesRowData)} />
          ),
      },
      {
        accessorKey: "openLtvBw",
        enableSorting: false,
        header: ({ column }) =>
          tableHeader(column, "LTV / BW", {
            isRightAligned: true,
            tooltip: OPEN_LTV_BORROW_WEIGHT_TOOLTIP,
          }),
        cell: ({ row }) =>
          (row.original as HeaderRowData).isHeader ? null : (
            <OpenLtvBwCell {...(row.original as ReservesRowData)} />
          ),
      },
      {
        accessorKey: "depositAprPercent",
        sortingFn: decimalSortingFn("totalDepositAprPercent"),
        header: ({ column }) =>
          tableHeader(column, "Deposit APR", { isNumerical: true }),
        cell: ({ row }) =>
          (row.original as HeaderRowData).isHeader ? null : (
            <div className="flex flex-row justify-end">
              <DepositAprCell {...(row.original as ReservesRowData)} />
            </div>
          ),
      },
      {
        accessorKey: "borrowAprPercent",
        sortingFn: decimalSortingFn("totalBorrowAprPercent"),
        header: ({ column }) =>
          tableHeader(column, "Borrow APR", { isNumerical: true }),
        cell: ({ row }) =>
          (row.original as HeaderRowData).isHeader ? null : (
            <div className="flex flex-row justify-end">
              <BorrowAprCell {...(row.original as ReservesRowData)} />
            </div>
          ),
      },
    ],
    [],
  );

  // Rows
  const rows: ReservesRowData[] = useMemo(
    () =>
      data.lendingMarket.reserves
        .filter((reserve) =>
          !isInMsafeApp()
            ? true
            : !NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES.includes(
                reserve.coinType,
              ),
        )
        .filter((reserve) => {
          const depositPosition = obligation?.deposits?.find(
            (d) => d.coinType === reserve.coinType,
          );
          const borrowPosition = obligation?.borrows?.find(
            (b) => b.coinType === reserve.coinType,
          );

          const depositedAmount =
            depositPosition?.depositedAmount ?? new BigNumber(0);
          const borrowedAmount =
            borrowPosition?.borrowedAmount ?? new BigNumber(0);

          return (
            (reserve.coinType === NORMALIZED_fudSUI_COINTYPE
              ? Date.now() >= 1732269600000 // 2024-11-22 19:00:00 JST
              : reserve.config.depositLimit.gt(0)) ||
            depositedAmount.gt(0) ||
            borrowedAmount.gt(0)
          );
        })
        .map((reserve) => {
          const token = reserve.token;
          const price = reserve.price;
          const isIsolated = reserve.config.isolated;

          const openLtvPercent = new BigNumber(reserve.config.openLtvPct);
          const borrowWeight = new BigNumber(
            reserve.config.borrowWeightBps,
          ).div(10000);
          const depositedAmount = reserve.depositedAmount;
          const depositedAmountUsd = reserve.depositedAmountUsd;
          const borrowedAmount = reserve.borrowedAmount;
          const borrowedAmountUsd = reserve.borrowedAmountUsd;
          const depositAprPercent = reserve.depositAprPercent;
          const totalDepositAprPercent = getTotalAprPercent(
            Side.DEPOSIT,
            reserve.depositAprPercent,
            getFilteredRewards(data.rewardMap[token.coinType].deposit),
            getStakingYieldAprPercent(
              Side.DEPOSIT,
              reserve,
              data.lstAprPercentMap,
            ),
          );
          const borrowAprPercent = reserve.borrowAprPercent;
          const totalBorrowAprPercent = getTotalAprPercent(
            Side.BORROW,
            reserve.borrowAprPercent,
            getFilteredRewards(data.rewardMap[token.coinType].borrow),
          );

          const getAlmostExceedsLimit = (limit: BigNumber, total: BigNumber) =>
            !limit.eq(0) &&
            total.gte(limit.times(Math.min(0.9999, 1 - 1 / limit.toNumber())));
          const getExceedsLimit = (limit: BigNumber, total: BigNumber) =>
            limit.eq(0) || total.gte(limit);

          const almostExceedsDepositLimit = getAlmostExceedsLimit(
            reserve.config.depositLimit,
            depositedAmount,
          );
          const almostExceedsDepositLimitUsd = getAlmostExceedsLimit(
            reserve.config.depositLimitUsd,
            depositedAmountUsd,
          );

          const exceedsDepositLimit = getExceedsLimit(
            reserve.config.depositLimit,
            depositedAmount,
          );
          const exceedsDepositLimitUsd = getExceedsLimit(
            reserve.config.depositLimitUsd,
            depositedAmountUsd,
          );

          const almostExceedsBorrowLimit = getAlmostExceedsLimit(
            reserve.config.borrowLimit,
            borrowedAmount,
          );
          const almostExceedsBorrowLimitUsd = getAlmostExceedsLimit(
            reserve.config.borrowLimitUsd,
            borrowedAmountUsd,
          );

          const exceedsBorrowLimit = getExceedsLimit(
            reserve.config.borrowLimit,
            borrowedAmount,
          );
          const exceedsBorrowLimitUsd = getExceedsLimit(
            reserve.config.borrowLimitUsd,
            borrowedAmountUsd,
          );

          const getAlmostExceedsLimitTooltip = (
            side: Side,
            remaining: BigNumber,
            symbol: string,
          ) =>
            `Asset ${side} limit almost reached. Capacity remaining: ${formatToken(remaining, { dp: reserve.mintDecimals })} ${symbol}`;
          const getAlmostExceedsLimitUsd = (side: Side, remaining: BigNumber) =>
            `Asset USD ${side} limit almost reached. Capacity remaining: ${formatUsd(remaining)}`;

          const getExceedsLimitTooltip = (side: Side) =>
            `Asset ${side} limit reached.`;
          const getExceedsLimitUsdTooltip = (side: Side) =>
            `Asset USD ${side} limit reached.`;

          const depositedAmountTooltip = exceedsDepositLimit
            ? getExceedsLimitTooltip(Side.DEPOSIT)
            : exceedsDepositLimitUsd
              ? getExceedsLimitUsdTooltip(Side.DEPOSIT)
              : almostExceedsDepositLimit
                ? getAlmostExceedsLimitTooltip(
                    Side.DEPOSIT,
                    reserve.config.depositLimit.minus(depositedAmount),
                    token.symbol,
                  )
                : almostExceedsDepositLimitUsd
                  ? getAlmostExceedsLimitUsd(
                      Side.DEPOSIT,
                      reserve.config.depositLimitUsd.minus(depositedAmountUsd),
                    )
                  : undefined;

          const borrowedAmountTooltip = exceedsBorrowLimit
            ? getExceedsLimitTooltip(Side.BORROW)
            : exceedsBorrowLimitUsd
              ? getExceedsLimitUsdTooltip(Side.BORROW)
              : almostExceedsBorrowLimit
                ? getAlmostExceedsLimitTooltip(
                    Side.BORROW,
                    reserve.config.borrowLimit.minus(borrowedAmount),
                    token.symbol,
                  )
                : almostExceedsBorrowLimitUsd
                  ? getAlmostExceedsLimitUsd(
                      Side.BORROW,
                      reserve.config.borrowLimitUsd.minus(borrowedAmountUsd),
                    )
                  : undefined;

          return {
            reserve,
            token,
            price,
            isIsolated,

            openLtvPercent,
            borrowWeight,
            depositedAmount,
            depositedAmountUsd,
            depositedAmountTooltip,
            borrowedAmount,
            borrowedAmountUsd,
            borrowedAmountTooltip,
            depositAprPercent,
            totalDepositAprPercent,
            borrowAprPercent,
            totalBorrowAprPercent,
          };
        }),
    [
      data.lendingMarket.reserves,
      obligation?.deposits,
      obligation?.borrows,
      data.rewardMap,
      data.lstAprPercentMap,
    ],
  );
  const mainRows = useMemo(() => rows.filter((row) => !row.isIsolated), [rows]);
  const isolatedRows = useMemo(
    () => rows.filter((row) => row.isIsolated),
    [rows],
  );

  const finalRows = useMemo(() => {
    const result = [];

    if (mainRows.length > 0)
      result.push(
        { isHeader: true, isIsolated: false, count: mainRows.length },
        ...mainRows,
      );
    if (isolatedRows.length > 0)
      result.push(
        { isHeader: true, isIsolated: true, count: isolatedRows.length },
        ...isolatedRows,
      );

    return result;
  }, [mainRows, isolatedRows]);

  return (
    <div className="w-full">
      <div className="hidden w-full md:block">
        <DataTable<RowData>
          columns={columns}
          data={finalRows}
          container={{ className: "border rounded-sm" }}
          tableRowClassName={(row, isSorting) =>
            cn(
              styles.tableRow,
              row &&
                (row.original as HeaderRowData).isHeader &&
                isSorting &&
                "hidden", // Hide header rows when sorting
            )
          }
          tableCellClassName={(cell) =>
            cell &&
            (cell.row.original as HeaderRowData).isHeader &&
            cn(
              cell.column.getIsFirstColumn()
                ? "bg-card h-auto py-2"
                : "p-0 h-0",
            )
          }
          tableCellColSpan={(cell) =>
            (cell.row.original as HeaderRowData).isHeader &&
            cell.column.getIsFirstColumn()
              ? columns.length
              : undefined
          }
          onRowClick={(row) =>
            (row.original as HeaderRowData).isHeader
              ? undefined
              : () =>
                  openActionsModal(
                    (row.original as ReservesRowData).token.symbol,
                  )
          }
        />
      </div>
      <div className="w-full md:hidden">
        <MarketCardList rows={rows} />
      </div>
    </div>
  );
}
