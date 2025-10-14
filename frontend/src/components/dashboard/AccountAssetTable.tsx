import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { reserveSort } from "@suilend/sdk/utils";
import { Token, formatToken, formatUsd } from "@suilend/sui-fe";

import styles from "@/components/dashboard/AccountAssetTable.module.scss";
import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import AssetCell from "@/components/dashboard/market-table/AssetCell";
import ParentLendingMarket from "@/components/shared/ParentLendingMarket";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

export enum AccountAssetTableType {
  DEPOSITS = "deposits",
  BORROWS = "borrows",
}

interface RowData {
  reserve?: ParsedReserve;
  token: Token;
  price?: BigNumber;
  amount: BigNumber;
  amountUsd?: BigNumber;
}

interface AccountAssetTableProps {
  id: string;
  lendingMarketId: string;
  type: AccountAssetTableType;
  assets: RowData[];
  noAssetsMessage: string;
  noLendingMarketHeader?: boolean;
}

export default function AccountAssetTable({
  id,
  lendingMarketId,
  type,
  assets,
  noAssetsMessage,
  noLendingMarketHeader,
}: AccountAssetTableProps) {
  const { allAppData } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[lendingMarketId];
  const { obligationMap } = useLoadedUserContext();
  const obligation = obligationMap[lendingMarketId];

  const { open: openActionsModal } = useActionsModalContext();

  // Count
  const totalUsd = new BigNumber(
    type === AccountAssetTableType.DEPOSITS
      ? (obligation?.depositedAmountUsd ?? 0)
      : (obligation?.borrowedAmountUsd ?? 0),
  );

  // Columns
  const amountTitleMap: Record<AccountAssetTableType, string> = useMemo(
    () => ({
      [AccountAssetTableType.DEPOSITS]: "Deposits",
      [AccountAssetTableType.BORROWS]: "Borrows",
    }),
    [],
  );

  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        accessorKey: "symbol",
        sortingFn: "text",
        header: ({ column }) => tableHeader(column, "Asset name"),
        cell: ({ row }) => <AssetCell tableType={type} {...row.original} />,
      },
      {
        accessorKey: "amount",
        sortingFn: decimalSortingFn("amountUsd"),
        header: ({ column }) =>
          tableHeader(column, amountTitleMap[type], { isNumerical: true }),
        cell: ({ row }) => {
          const { token, amount, amountUsd } = row.original;

          return (
            <div className="flex flex-col items-end gap-1">
              <Tooltip title={`${formatToken(amount, { dp: token.decimals })}`}>
                <TBody className="text-right">
                  {formatToken(amount, { exact: false })}
                </TBody>
              </Tooltip>
              <TLabel className="text-right">
                {amountUsd !== undefined ? formatUsd(amountUsd) : "--"}
              </TLabel>
            </div>
          );
        },
      },
    ],
    [amountTitleMap, type],
  );

  // Sort
  const sortedAssets = useMemo(
    () =>
      assets
        .slice()
        .sort((a, b) =>
          reserveSort(
            appData.lendingMarket.reserves,
            a.token.coinType,
            b.token.coinType,
          ),
        ),
    [assets, appData.lendingMarket.reserves],
  );

  return (
    <div className="w-full">
      <ParentLendingMarket
        id={id}
        lendingMarketId={lendingMarketId}
        count={formatUsd(totalUsd)}
        noHeader={noLendingMarketHeader}
      >
        <DataTable<RowData>
          columns={columns}
          data={sortedAssets}
          noDataMessage={noAssetsMessage}
          tableRowClassName={(row) =>
            cn(styles.tableRow, !row?.original.reserve && "cursor-default")
          }
          tableCellClassName={(cell) =>
            cn(
              cell && cell.column.getIsFirstColumn() && "pr-0",
              cell && cell.column.getIsLastColumn() && "pl-0",
            )
          }
          onRowClick={(row) =>
            row.original.reserve
              ? () =>
                  openActionsModal(
                    lendingMarketId === LENDING_MARKET_ID
                      ? undefined
                      : lendingMarketId,
                    row.original.token.symbol,
                  )
              : undefined
          }
        />
      </ParentLendingMarket>
    </div>
  );
}
