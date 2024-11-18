import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";

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
import { formatToken, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RowData {
  isBalance?: boolean;
  coinType: string;
  mintDecimals: number;
  price: BigNumber;
  symbol: string;
  iconUrl?: string | null;
  amount: BigNumber;
  amountUsd: BigNumber;
  reserve: ParsedReserve;
}

interface AccountAssetTableProps {
  amountTitle?: string;
  assets: RowData[];
  noAssetsMessage: string;
}

export default function AccountAssetTable({
  amountTitle = "Amount",
  assets,
  noAssetsMessage,
}: AccountAssetTableProps) {
  const { data } = useLoadedAppContext();
  const { open: openActionsModal } = useActionsModalContext();

  // Columns
  const columns: ColumnDef<RowData>[] = useMemo(
    () => [
      {
        accessorKey: "symbol",
        sortingFn: "text",
        header: ({ column }) => tableHeader(column, "Asset name"),
        cell: ({ row }) => {
          const { isBalance, coinType, price, symbol, iconUrl, reserve } =
            row.original;

          return (
            <AssetCell
              isBalance={isBalance}
              coinType={coinType}
              price={price}
              symbol={symbol}
              iconUrl={iconUrl}
              reserve={reserve}
            />
          );
        },
      },
      {
        accessorKey: "amount",
        sortingFn: decimalSortingFn("amount"),
        header: ({ column }) =>
          tableHeader(column, amountTitle, { isNumerical: true }),
        cell: ({ row }) => {
          const { mintDecimals, amount, amountUsd } = row.original;

          return (
            <div className="flex flex-col items-end gap-1">
              <TBody className="text-right">
                {formatToken(amount, { dp: mintDecimals })}
              </TBody>
              <TLabel className="text-right">{formatUsd(amountUsd)}</TLabel>
            </div>
          );
        },
      },
    ],
    [amountTitle],
  );

  // Sort
  const sortedAssets = assets
    .slice()
    .sort((a, b) =>
      reserveSort(
        data.lendingMarket.reserves,
        a.reserve.coinType,
        b.reserve.coinType,
      ),
    );

  return (
    <div className="w-full">
      <DataTable<RowData>
        columns={columns}
        data={sortedAssets}
        noDataMessage={noAssetsMessage}
        tableRowClassName={() => cn(styles.tableRow)}
        tableCellClassName={(cell) =>
          cn(
            cell && cell.column.getIsFirstColumn() && "pr-0",
            cell && cell.column.getIsLastColumn() && "pl-0",
          )
        }
        onRowClick={(row) => () =>
          openActionsModal(row.original.reserve.symbol)
        }
      />
    </div>
  );
}
