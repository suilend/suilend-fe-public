import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  Token,
  formatToken,
  formatUsd,
  isDeprecated,
  isMemecoin,
  issSui,
} from "@suilend/frontend-sui";
import {
  getFilteredRewards,
  getStakingYieldAprPercent,
  getTotalAprPercent,
} from "@suilend/sdk";
import { Side } from "@suilend/sdk/lib/types";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { isEcosystemLst } from "@suilend/springsui-sdk";

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
import { useLoadedUserContext } from "@/contexts/UserContext";
import {
  DEPRECATED_ASSETS_TOOLTIP,
  ISOLATED_ASSETS_TOOLTIP,
  OPEN_LTV_BORROW_WEIGHT_TOOLTIP,
} from "@/lib/tooltips";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

const getExceedsLimit = (limit: BigNumber, total: BigNumber) =>
  limit.eq(0) || total.gte(limit);
const getExceedsLimitTooltip = (side: Side) => `Asset ${side} limit reached.`;
const getExceedsLimitUsdTooltip = (side: Side) =>
  `Asset USD ${side} limit reached.`;

const getAlmostExceedsLimit = (limit: BigNumber, total: BigNumber) =>
  !limit.eq(0) &&
  total.gte(limit.times(Math.min(0.9999, 1 - 1 / limit.toNumber())));
const getAlmostExceedsLimitTooltip = (
  side: Side,
  remaining: BigNumber,
  symbol: string,
  decimals: number,
) =>
  `Asset ${side} limit almost reached. Capacity remaining: ${formatToken(remaining, { dp: decimals })} ${symbol}`;
const getAlmostExceedsLimitUsdTooltip = (side: Side, remaining: BigNumber) =>
  `Asset USD ${side} limit almost reached. Capacity remaining: ${formatUsd(remaining)}`;

export enum MarketTableType {
  MARKET = "market",
}

export interface HeaderRowData {
  isHeader: boolean;
  isIsolated?: boolean;
  isDeprecated?: boolean;
  title: string;
  tooltip?: string;
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
  isIsolated: boolean;
  isDeprecated: boolean;

  reserve: ParsedReserve;
  token: Token;
  price: BigNumber;

  openLtvPercent: BigNumber;
  borrowWeightBps: BigNumber;
  depositLimit: BigNumber;
  depositedAmount: BigNumber;
  depositedAmountUsd: BigNumber;
  depositedAmountTooltip: string | undefined;
  borrowLimit: BigNumber;
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
  const { lstAprPercentMap } = useLoadedAppContext();
  const { userData, filteredReserves } = useLoadedUserContext();

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
            const { isIsolated, isDeprecated, title, tooltip, count } =
              row.original as HeaderRowData;

            const Icon = row.getIsExpanded() ? ChevronUp : ChevronDown;

            if (!isIsolated && !isDeprecated) return null;
            return (
              <div className="group flex flex-row items-center gap-2">
                {isDeprecated && (
                  <Icon className="-mr-1 h-4 w-4 text-primary" />
                )}

                <Tooltip title={tooltip}>
                  <TTitle
                    className={cn(
                      "w-max uppercase",
                      !!tooltip &&
                        cn("decoration-primary/50", hoverUnderlineClassName),
                    )}
                  >
                    {title}
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

            if (depositedAmountUsd.eq(0)) return null;
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
      const totalDepositAprPercent = getTotalAprPercent(
        Side.DEPOSIT,
        reserve.depositAprPercent,
        getFilteredRewards(userData.rewardMap[reserve.coinType].deposit),
        getStakingYieldAprPercent(Side.DEPOSIT, reserve, lstAprPercentMap),
      );
      const totalBorrowAprPercent = getTotalAprPercent(
        Side.BORROW,
        reserve.borrowAprPercent,
        getFilteredRewards(userData.rewardMap[reserve.coinType].borrow),
      );

      const almostExceedsDepositLimit = getAlmostExceedsLimit(
        reserve.config.depositLimit,
        reserve.depositedAmount,
      );
      const almostExceedsDepositLimitUsd = getAlmostExceedsLimit(
        reserve.config.depositLimitUsd,
        reserve.depositedAmountUsd,
      );

      const exceedsDepositLimit = getExceedsLimit(
        reserve.config.depositLimit,
        reserve.depositedAmount,
      );
      const exceedsDepositLimitUsd = getExceedsLimit(
        reserve.config.depositLimitUsd,
        reserve.depositedAmountUsd,
      );

      const almostExceedsBorrowLimit = getAlmostExceedsLimit(
        reserve.config.borrowLimit,
        reserve.borrowedAmount,
      );
      const almostExceedsBorrowLimitUsd = getAlmostExceedsLimit(
        reserve.config.borrowLimitUsd,
        reserve.borrowedAmountUsd,
      );

      const exceedsBorrowLimit = getExceedsLimit(
        reserve.config.borrowLimit,
        reserve.borrowedAmount,
      );
      const exceedsBorrowLimitUsd = getExceedsLimit(
        reserve.config.borrowLimitUsd,
        reserve.borrowedAmountUsd,
      );

      const depositedAmountTooltip = exceedsDepositLimit
        ? getExceedsLimitTooltip(Side.DEPOSIT)
        : exceedsDepositLimitUsd
          ? getExceedsLimitUsdTooltip(Side.DEPOSIT)
          : almostExceedsDepositLimit
            ? getAlmostExceedsLimitTooltip(
                Side.DEPOSIT,
                reserve.config.depositLimit.minus(reserve.depositedAmount),
                reserve.token.symbol,
                reserve.token.decimals,
              )
            : almostExceedsDepositLimitUsd
              ? getAlmostExceedsLimitUsdTooltip(
                  Side.DEPOSIT,
                  reserve.config.depositLimitUsd.minus(
                    reserve.depositedAmountUsd,
                  ),
                )
              : undefined;

      const borrowedAmountTooltip = exceedsBorrowLimit
        ? getExceedsLimitTooltip(Side.BORROW)
        : exceedsBorrowLimitUsd
          ? getExceedsLimitUsdTooltip(Side.BORROW)
          : almostExceedsBorrowLimit
            ? getAlmostExceedsLimitTooltip(
                Side.BORROW,
                reserve.config.borrowLimit.minus(reserve.borrowedAmount),
                reserve.token.symbol,
                reserve.token.decimals,
              )
            : almostExceedsBorrowLimitUsd
              ? getAlmostExceedsLimitUsdTooltip(
                  Side.BORROW,
                  reserve.config.borrowLimitUsd.minus(
                    reserve.borrowedAmountUsd,
                  ),
                )
              : undefined;

      return {
        isIsolated: reserve.config.isolated,
        isDeprecated: isDeprecated(reserve.token.coinType),

        reserve,
        token: reserve.token,
        price: reserve.price,

        openLtvPercent: new BigNumber(reserve.config.openLtvPct),
        borrowWeightBps: reserve.config.borrowWeightBps,
        depositLimit: reserve.config.depositLimit,
        depositedAmount: reserve.depositedAmount,
        depositedAmountUsd: reserve.depositedAmountUsd,
        depositedAmountTooltip,
        borrowLimit: reserve.config.borrowLimit,
        borrowedAmount: reserve.borrowedAmount,
        borrowedAmountUsd: reserve.borrowedAmountUsd,
        borrowedAmountTooltip,
        depositAprPercent: reserve.depositAprPercent,
        totalDepositAprPercent,
        borrowAprPercent: reserve.borrowAprPercent,
        totalBorrowAprPercent,
      };
    });

    const mainReserveRows = reserveRows.filter(
      (reserveRow) => !reserveRow.isIsolated && !reserveRow.isDeprecated,
    );
    const isolatedReserveRows = reserveRows.filter(
      (reserveRow) => reserveRow.isIsolated && !reserveRow.isDeprecated,
    );
    const deprecatedReserveRows = reserveRows.filter(
      (reserveRow) => reserveRow.isDeprecated,
    );

    const result: HeaderRowData[] = [];

    // Main assets
    if (mainReserveRows.length > 0) {
      const mainAssetsRow: HeaderRowData = {
        isHeader: true,
        title: "Main assets",
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

      mainAssetsRow.count = mainReserveRows.length;
      result.push(mainAssetsRow);
    }

    // Isolated assets
    if (isolatedReserveRows.length > 0) {
      const isolatedAssetsRow: HeaderRowData = {
        isHeader: true,
        isIsolated: true,
        title: "Isolated assets",
        tooltip: ISOLATED_ASSETS_TOOLTIP,
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

    // Deprecated assets
    if (deprecatedReserveRows.length > 0) {
      const deprecatedAssetsRow: HeaderRowData = {
        isHeader: true,
        isDeprecated: true,
        title: "Deprecated assets",
        tooltip: DEPRECATED_ASSETS_TOOLTIP,
        count: 0,

        subRows: [],
      };

      for (const reserveRow of deprecatedReserveRows) {
        deprecatedAssetsRow.subRows.push(reserveRow);
      }

      deprecatedAssetsRow.count = deprecatedReserveRows.length;
      result.push(deprecatedAssetsRow);
    }

    return result;
  }, [filteredReserves, userData.rewardMap, lstAprPercentMap]);

  return (
    <div className="w-full">
      <div className="w-full max-md:hidden">
        <DataTable<RowData>
          columns={columns}
          data={rows}
          initialExpandedState={{ "0": true, "1": true, "2": false }} // Expand main and isolated assets rows, do not expand deprecated assets row
          tableRowClassName={(row) => {
            if (!row) return cn(styles.tableRow);

            if ((row.original as HeaderRowData).isHeader) {
              const { isIsolated, isDeprecated } =
                row.original as HeaderRowData;

              return cn(
                styles.tableRow,
                !isIsolated && !isDeprecated && "border-b-0",
              );
            }
            if ((row.original as CollapsibleRowData).isCollapsibleRow)
              return cn(styles.tableRow, row.getIsExpanded() && "bg-muted/5");

            if (row.getParentRows().length === 2)
              return cn(styles.tableRow, "bg-muted/5");

            return cn(styles.tableRow);
          }}
          tableCellClassName={(cell) => {
            if (!cell) return undefined;

            if ((cell.row.original as HeaderRowData).isHeader) {
              const { isIsolated, isDeprecated } = cell.row
                .original as HeaderRowData;

              if (!isIsolated && !isDeprecated) return cn("p-0 h-0");
              return cn(
                cell.column.getIsFirstColumn() ? "h-auto py-2" : "p-0 h-0",
              );
            }
            if ((cell.row.original as CollapsibleRowData).isCollapsibleRow)
              return cell.column.getIsFirstColumn() && cell.row.getIsExpanded()
                ? cn("shadow-[inset_2px_0_0_0px_hsl(var(--primary))]")
                : undefined;

            return cell.row.getParentRows().length === 2 &&
              cell.column.getIsFirstColumn()
              ? cn("shadow-[inset_2px_0_0_0px_hsl(var(--primary))]")
              : undefined;
          }}
          tableCellColSpan={(cell) => {
            if ((cell.row.original as HeaderRowData).isHeader)
              return cell.column.getIsFirstColumn()
                ? columns.length
                : undefined;

            return undefined;
          }}
          onRowClick={(row) => {
            if ((row.original as HeaderRowData).isHeader)
              return (row.original as HeaderRowData).isDeprecated
                ? row.getToggleExpandedHandler()
                : undefined;
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
