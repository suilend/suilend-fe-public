import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { VenetianMask } from "lucide-react";

import { useSettingsContext } from "@suilend/frontend-sui-next";

import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import PointsCount from "@/components/points/PointsCount";
import PointsRank from "@/components/points/PointsRank";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import OpenURLButton from "@/components/shared/OpenURLButton";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { LeaderboardRowData, usePointsContext } from "@/contexts/PointsContext";
import { formatAddress } from "@/lib/format";
import { ROOT_URL } from "@/lib/navigation";

interface PointsLeaderboardTableProps {
  season: number;
  data?: LeaderboardRowData[];
  skeletonRows?: number;
  pageSize?: number;
  disableSorting?: boolean;
}

export default function PointsLeaderboardTable({
  season,
  data,
  skeletonRows,
  pageSize,
  disableSorting,
}: PointsLeaderboardTableProps) {
  const { explorer } = useSettingsContext();
  const { season: currentSeason } = usePointsContext();

  // Columns
  const columns = useMemo(() => {
    const result: ColumnDef<LeaderboardRowData>[] = [
      {
        accessorKey: "rank",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Rank"),
        cell: ({ row }) => {
          const { rank } = row.original;
          return <PointsRank season={season} rank={rank} noTooltip />;
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
                <OpenURLButton url={explorer.buildAddressUrl(address)} />
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
    ];
    if (season === currentSeason)
      result.push({
        accessorKey: "pointsPerDay",
        enableSorting: !disableSorting,
        sortingFn: decimalSortingFn("pointsPerDay"),
        header: ({ column }) =>
          tableHeader(column, "Points per day", { isNumerical: true }),
        cell: ({ row }) => {
          const { pointsPerDay } = row.original;

          return (
            <div className="flex flex-row justify-end">
              <PointsCount season={season} amount={pointsPerDay} />
            </div>
          );
        },
      });
    result.push({
      accessorKey: "totalPoints",
      enableSorting: !disableSorting,
      sortingFn: decimalSortingFn("totalPoints"),
      header: ({ column }) =>
        tableHeader(column, "Total Points", { isNumerical: true }),
      cell: ({ row }) => {
        const { totalPoints } = row.original;

        return (
          <div className="flex flex-row justify-end">
            <PointsCount season={season} amount={totalPoints} />
          </div>
        );
      },
    });

    return result;
  }, [season, explorer, currentSeason, disableSorting]);

  return (
    <DataTable<LeaderboardRowData>
      columns={columns}
      data={data}
      noDataMessage="No users"
      skeletonRows={skeletonRows}
      pageSize={pageSize}
    />
  );
}
