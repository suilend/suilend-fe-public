import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";

import { Token, formatToken, formatUsd } from "@suilend/frontend-sui";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { reserveSort } from "@suilend/sdk/utils";

import styles from "@/components/dashboard/AccountAssetTable.module.scss";
import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import AssetCell from "@/components/dashboard/market-table/AssetCell";
import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

export enum AccountAssetTableType {
  DEPOSITS = "deposits",
  BORROWS = "borrows",
  BALANCES = "balances",
}

interface RowData {
  reserve?: ParsedReserve;
  token: Token;
  price?: BigNumber;
  amount: BigNumber;
  amountUsd?: BigNumber;
}

interface AccountAssetTableProps {
  type: AccountAssetTableType;
  assets: RowData[];
  noAssetsMessage: string;
}

export default function AccountAssetTable({
  type,
  assets,
  noAssetsMessage,
}: AccountAssetTableProps) {
  const { appData } = useLoadedAppContext();

  const { open: openActionsModal } = useActionsModalContext();

  // Columns
  const amountTitleMap: Record<AccountAssetTableType, string> = useMemo(
    () => ({
      [AccountAssetTableType.DEPOSITS]: "Deposits",
      [AccountAssetTableType.BORROWS]: "Borrows",
      [AccountAssetTableType.BALANCES]: "Balance",
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
              <TBody className="text-right">
                {formatToken(amount, { dp: token.decimals })}
              </TBody>
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
            ? () => openActionsModal(row.original.token.symbol)
            : undefined
        }
      />
    </div>
  );
}
