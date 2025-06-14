import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { VenetianMask } from "lucide-react";

import { formatAddress } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import TvlAmount from "@/components/leaderboard/TvlAmount";
import TvlLeaderboardRank from "@/components/leaderboard/TvlLeaderboardRank";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import OpenURLButton from "@/components/shared/OpenURLButton";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { TvlLeaderboardRowData } from "@/contexts/LeaderboardContext";
import { ROOT_URL } from "@/lib/navigation";

interface TvlLeaderboardTableProps {
  data?: TvlLeaderboardRowData[];
  skeletonRows?: number;
  pageSize?: number;
  disableSorting?: boolean;
}

export default function TvlLeaderboardTable({
  data,
  skeletonRows,
  pageSize,
  disableSorting,
}: TvlLeaderboardTableProps) {
  const { explorer } = useSettingsContext();

  // Columns
  const columns = useMemo(() => {
    const result: ColumnDef<TvlLeaderboardRowData>[] = [
      {
        accessorKey: "rank",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Rank"),
        cell: ({ row }) => {
          const { rank } = row.original;
          return <TvlLeaderboardRank rank={rank} noTooltip />;
        },
      },
      {
        accessorKey: "address",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Address"),
        cell: ({ row }) => {
          const { address } = row.original;

          return (
            <div className="flex flex-row items-center gap-2">
              <Tooltip title={address}>
                <TBody className="w-max uppercase">
                  {formatAddress(address, 12)}
                </TBody>
              </Tooltip>

              <div className="flex h-5 flex-row items-center">
                <CopyToClipboardButton value={address} />
                <OpenOnExplorerButton url={explorer.buildAddressUrl(address)} />
                <OpenURLButton
                  url={`${ROOT_URL}?wallet=${address}`}
                  icon={<VenetianMask />}
                >
                  View Dashboard as this user
                </OpenURLButton>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "tvlUsd",
        enableSorting: !disableSorting,
        sortingFn: decimalSortingFn("tvlUsd"),
        header: ({ column }) =>
          tableHeader(column, "TVL", { isNumerical: true }),
        cell: ({ row }) => {
          const { tvlUsd } = row.original;

          return (
            <div className="flex flex-row justify-end">
              <TvlAmount amount={tvlUsd} />
            </div>
          );
        },
      },
    ];

    return result;
  }, [explorer, disableSorting]);

  return (
    <DataTable<TvlLeaderboardRowData>
      columns={columns}
      data={data}
      noDataMessage="No users"
      skeletonRows={skeletonRows}
      pageSize={pageSize}
    />
  );
}
