import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  Token,
  getFilteredRewards,
  getStakingYieldAprPercent,
  getTotalAprPercent,
  isDeprecated,
  isEcosystemLst,
  isMemecoin,
  issSui,
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
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TTitle } from "@/components/shared/Typography";
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

export interface HeaderRowData {
  isHeader: boolean;
  isIsolated: boolean;
  count: number;

  subRows: (CollapsibleRowData | ReservesRowData)[];
}

export interface CollapsibleRowData {
  isCollapsibleRow: boolean;
  title: string;

  depositedAmount: BigNumber;
  depositedAmountUsd: BigNumber;
  borrowedAmount: BigNumber;
  borrowedAmountUsd: BigNumber;

  subRows: ReservesRowData[];
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

type RowData = HeaderRowData | CollapsibleRowData | ReservesRowData;

export default function MarketTable() {
  const { data, filteredReserves } = useLoadedAppContext();
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
          if ((row.original as CollapsibleRowData).isCollapsibleRow) {
            const { title, subRows } = row.original as CollapsibleRowData;

            const Icon = row.getIsExpanded() ? ChevronUp : ChevronDown;

            return (
              <div className="flex flex-row items-center gap-3">
                <div className="flex h-7 w-7 flex-row items-center justify-center rounded-md bg-muted/15">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>

                <div className="flex min-w-max flex-col gap-1">
                  <div className="flex flex-row items-center gap-2">
                    <TBody>{title}</TBody>
                    <TLabel>{subRows.length}</TLabel>
                  </div>

                  <TokenLogos
                    className="h-4 w-4"
                    tokens={subRows.map((subRow) => subRow.token)}
                  />
                </div>
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
        cell: ({ row }) => {
          if ((row.original as HeaderRowData).isHeader) return null;
          if ((row.original as CollapsibleRowData).isCollapsibleRow) {
            const { depositedAmountUsd } = row.original as CollapsibleRowData;

            return (
              <div className="flex flex-col items-end gap-1">
                <TBody>--</TBody>
                <Tooltip title={formatUsd(depositedAmountUsd, { exact: true })}>
                  <TLabel className="min-w-max text-right">
                    {formatUsd(depositedAmountUsd)}
                  </TLabel>
                </Tooltip>
              </div>
            );
          }

          return <TotalDepositsCell {...(row.original as ReservesRowData)} />;
        },
      },
      {
        accessorKey: "borrowedAmount",
        sortingFn: decimalSortingFn("borrowedAmountUsd"),
        header: ({ column }) =>
          tableHeader(column, "Borrows", { isNumerical: true }),
        cell: ({ row }) => {
          if ((row.original as HeaderRowData).isHeader) return null;
          if ((row.original as CollapsibleRowData).isCollapsibleRow) {
            const { borrowedAmountUsd } = row.original as CollapsibleRowData;

            if (borrowedAmountUsd.eq(0)) return null;
            return (
              <div className="flex flex-col items-end gap-1">
                <TBody>--</TBody>
                <Tooltip title={formatUsd(borrowedAmountUsd, { exact: true })}>
                  <TLabel className="min-w-max text-right">
                    {formatUsd(borrowedAmountUsd)}
                  </TLabel>
                </Tooltip>
              </div>
            );
          }

          return <TotalBorrowsCell {...(row.original as ReservesRowData)} />;
        },
      },
      {
        accessorKey: "openLtvBw",
        enableSorting: false,
        header: ({ column }) =>
          tableHeader(column, "LTV / BW", {
            isRightAligned: true,
            tooltip: OPEN_LTV_BORROW_WEIGHT_TOOLTIP,
          }),
        cell: ({ row }) => {
          if ((row.original as HeaderRowData).isHeader) return null;
          if ((row.original as CollapsibleRowData).isCollapsibleRow)
            return null;

          return <OpenLtvBwCell {...(row.original as ReservesRowData)} />;
        },
      },
      {
        accessorKey: "depositAprPercent",
        sortingFn: decimalSortingFn("totalDepositAprPercent"),
        header: ({ column }) =>
          tableHeader(column, "Deposit APR", { isNumerical: true }),
        cell: ({ row }) => {
          if ((row.original as HeaderRowData).isHeader) return null;
          if ((row.original as CollapsibleRowData).isCollapsibleRow)
            return null;

          return (
            <div className="flex flex-row justify-end">
              <DepositAprCell {...(row.original as ReservesRowData)} />
            </div>
          );
        },
      },
      {
        accessorKey: "borrowAprPercent",
        sortingFn: decimalSortingFn("totalBorrowAprPercent"),
        header: ({ column }) =>
          tableHeader(column, "Borrow APR", { isNumerical: true }),
        cell: ({ row }) => {
          if ((row.original as HeaderRowData).isHeader) return null;
          if ((row.original as CollapsibleRowData).isCollapsibleRow)
            return null;

          return (
            <div className="flex flex-row justify-end">
              <BorrowAprCell {...(row.original as ReservesRowData)} />
            </div>
          );
        },
      },
    ],
    [],
  );

  // Rows
  const rows: HeaderRowData[] = useMemo(() => {
    const reserveRows: ReservesRowData[] = filteredReserves.map((reserve) => {
      const token = reserve.token;
      const price = reserve.price;
      const isIsolated = reserve.config.isolated;

      const openLtvPercent = new BigNumber(reserve.config.openLtvPct);
      const borrowWeight = new BigNumber(reserve.config.borrowWeightBps).div(
        10000,
      );
      const depositedAmount = reserve.depositedAmount;
      const depositedAmountUsd = reserve.depositedAmountUsd;
      const borrowedAmount = reserve.borrowedAmount;
      const borrowedAmountUsd = reserve.borrowedAmountUsd;
      const depositAprPercent = reserve.depositAprPercent;
      const totalDepositAprPercent = getTotalAprPercent(
        Side.DEPOSIT,
        reserve.depositAprPercent,
        getFilteredRewards(data.rewardMap[reserve.coinType].deposit),
        getStakingYieldAprPercent(Side.DEPOSIT, reserve, data.lstAprPercentMap),
      );
      const borrowAprPercent = reserve.borrowAprPercent;
      const totalBorrowAprPercent = getTotalAprPercent(
        Side.BORROW,
        reserve.borrowAprPercent,
        getFilteredRewards(data.rewardMap[reserve.coinType].borrow),
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
    });

    const mainReserveRows = reserveRows.filter(
      (reserveRow) => !reserveRow.isIsolated,
    );
    const isolatedReserveRows = reserveRows.filter(
      (reserveRow) => reserveRow.isIsolated,
    );

    const result: HeaderRowData[] = [];
    if (mainReserveRows.length > 0) {
      const mainAssetsRow: HeaderRowData = {
        isHeader: true,
        isIsolated: false,
        count: 0,

        subRows: [],
      };

      const ecosystemLstsRow: CollapsibleRowData = {
        isCollapsibleRow: true,
        title: "ECOSYSTEM LSTs",

        depositedAmount: new BigNumber(0),
        depositedAmountUsd: new BigNumber(0),
        borrowedAmount: new BigNumber(0),
        borrowedAmountUsd: new BigNumber(0),

        subRows: [],
      };

      const deprecatedRow: CollapsibleRowData = {
        isCollapsibleRow: true,
        title: "DEPRECATED",

        depositedAmount: new BigNumber(0),
        depositedAmountUsd: new BigNumber(0),
        borrowedAmount: new BigNumber(0),
        borrowedAmountUsd: new BigNumber(0),

        subRows: [],
      };

      for (const reserveRow of mainReserveRows) {
        if (isEcosystemLst(reserveRow.token.coinType)) {
          ecosystemLstsRow.depositedAmount =
            ecosystemLstsRow.depositedAmount.plus(reserveRow.depositedAmount);
          ecosystemLstsRow.depositedAmountUsd =
            ecosystemLstsRow.depositedAmountUsd.plus(
              reserveRow.depositedAmountUsd,
            );
          ecosystemLstsRow.borrowedAmount =
            ecosystemLstsRow.borrowedAmount.plus(reserveRow.borrowedAmount);
          ecosystemLstsRow.borrowedAmountUsd =
            ecosystemLstsRow.borrowedAmountUsd.plus(
              reserveRow.borrowedAmountUsd,
            );

          ecosystemLstsRow.subRows.push(reserveRow);
        } else if (isDeprecated(reserveRow.token.coinType)) {
          deprecatedRow.depositedAmount = deprecatedRow.depositedAmount.plus(
            reserveRow.depositedAmount,
          );
          deprecatedRow.depositedAmountUsd =
            deprecatedRow.depositedAmountUsd.plus(
              reserveRow.depositedAmountUsd,
            );
          deprecatedRow.borrowedAmount = deprecatedRow.borrowedAmount.plus(
            reserveRow.borrowedAmount,
          );
          deprecatedRow.borrowedAmountUsd =
            deprecatedRow.borrowedAmountUsd.plus(reserveRow.borrowedAmountUsd);

          deprecatedRow.subRows.push(reserveRow);
        } else mainAssetsRow.subRows.push(reserveRow);
      }

      if (ecosystemLstsRow.subRows.length > 0) {
        const index = mainAssetsRow.subRows.findIndex((x) =>
          issSui((x as ReservesRowData).token.coinType),
        );
        mainAssetsRow.subRows = [
          ...mainAssetsRow.subRows.slice(0, index + 1),
          ecosystemLstsRow,
          ...mainAssetsRow.subRows.slice(index + 1),
        ];
      }

      if (deprecatedRow.subRows.length > 0)
        mainAssetsRow.subRows = [...mainAssetsRow.subRows, deprecatedRow];

      mainAssetsRow.count = mainReserveRows.length;
      result.push(mainAssetsRow);
    }

    if (isolatedReserveRows.length > 0) {
      const isolatedAssetsRow: HeaderRowData = {
        isHeader: true,
        isIsolated: true,
        count: 0,

        subRows: [],
      };

      const memecoinsRow: CollapsibleRowData = {
        isCollapsibleRow: true,
        title: "MEMECOINS",

        depositedAmount: new BigNumber(0),
        depositedAmountUsd: new BigNumber(0),
        borrowedAmount: new BigNumber(0),
        borrowedAmountUsd: new BigNumber(0),

        subRows: [],
      };

      for (const reserveRow of isolatedReserveRows) {
        if (isMemecoin(reserveRow.token.coinType)) {
          memecoinsRow.depositedAmount = memecoinsRow.depositedAmount.plus(
            reserveRow.depositedAmount,
          );
          memecoinsRow.depositedAmountUsd =
            memecoinsRow.depositedAmountUsd.plus(reserveRow.depositedAmountUsd);
          memecoinsRow.borrowedAmount = memecoinsRow.borrowedAmount.plus(
            reserveRow.borrowedAmount,
          );
          memecoinsRow.borrowedAmountUsd = memecoinsRow.borrowedAmountUsd.plus(
            reserveRow.borrowedAmountUsd,
          );

          memecoinsRow.subRows.push(reserveRow);
        } else isolatedAssetsRow.subRows.push(reserveRow);
      }

      if (memecoinsRow.subRows.length > 0)
        isolatedAssetsRow.subRows = [
          ...isolatedAssetsRow.subRows,
          memecoinsRow,
        ];

      isolatedAssetsRow.count = isolatedReserveRows.length;
      result.push(isolatedAssetsRow);
    }

    return result;
  }, [filteredReserves, data.rewardMap, data.lstAprPercentMap]);

  return (
    <div className="w-full">
      <div className="hidden w-full md:block">
        <DataTable<RowData>
          columns={columns}
          data={rows}
          container={{ className: "border rounded-sm" }}
          initialExpandedState={{ "0": true, "1": true }} // Expand main and isolated assets rows
          tableRowClassName={(row) => {
            if (!row) return cn(styles.tableRow);

            if ((row.original as HeaderRowData).isHeader)
              return cn(styles.tableRow);
            if ((row.original as CollapsibleRowData).isCollapsibleRow)
              return cn(styles.tableRow, row.getIsExpanded() && "bg-muted/5");

            if (row.getParentRows().length === 2)
              return cn(styles.tableRow, "bg-muted/5");

            return cn(styles.tableRow);
          }}
          tableCellClassName={(cell) => {
            if (!cell) return undefined;

            if ((cell.row.original as HeaderRowData).isHeader)
              return cn(
                cell.column.getIsFirstColumn()
                  ? "bg-card h-auto py-2"
                  : "p-0 h-0",
              );
            if ((cell.row.original as CollapsibleRowData).isCollapsibleRow)
              return cn(
                cell.row.getIsExpanded() &&
                  cell.column.getIsFirstColumn() &&
                  "shadow-[inset_2px_0_0_0px_hsl(var(--primary))]",
              );

            if (cell.row.getParentRows().length === 2)
              return cn(
                cell.column.getIsFirstColumn() &&
                  "shadow-[inset_2px_0_0_0px_hsl(var(--primary))]",
              );

            return undefined;
          }}
          tableCellColSpan={(cell) => {
            if (
              (cell.row.original as HeaderRowData).isHeader &&
              cell.column.getIsFirstColumn()
            )
              return columns.length;

            return undefined;
          }}
          onRowClick={(row) => {
            if ((row.original as HeaderRowData).isHeader) return undefined;
            if ((row.original as CollapsibleRowData).isCollapsibleRow)
              return row.getToggleExpandedHandler();

            return () =>
              openActionsModal((row.original as ReservesRowData).token.symbol);
          }}
        />
      </div>
      <div className="w-full md:hidden">
        <MarketCardList rows={rows} />
      </div>
    </div>
  );
}
