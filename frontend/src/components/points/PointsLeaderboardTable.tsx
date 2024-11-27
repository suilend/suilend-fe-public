import { useMemo } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { VenetianMask } from "lucide-react";

import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

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
import { DASHBOARD_URL } from "@/lib/navigation";

export default function PointsLeaderboardTable() {
  const { explorer } = useSettingsContext();
  const { address } = useWalletContext();
  const { leaderboardRows } = usePointsContext();

  // Columns
  const columns: ColumnDef<LeaderboardRowData>[] = useMemo(
    () => [
      {
        accessorKey: "rank",
        enableSorting: false,
        header: ({ column }) => tableHeader(column, "Rank"),
        cell: ({ row }) => {
          const { rank } = row.original;
          return <PointsRank rank={rank} noTooltip />;
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
                  url={`${DASHBOARD_URL}?wallet=${address}`}
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
        accessorKey: "pointsPerDay",
        sortingFn: decimalSortingFn("pointsPerDay"),
        header: ({ column }) =>
          tableHeader(column, "Points per day", { isNumerical: true }),
        cell: ({ row }) => {
          const { pointsPerDay } = row.original;

          return (
            <div className="flex flex-row justify-end">
              <PointsCount points={pointsPerDay} />
            </div>
          );
        },
      },
      {
        accessorKey: "totalPoints",
        sortingFn: decimalSortingFn("totalPoints"),
        header: ({ column }) =>
          tableHeader(column, "Total Points", { isNumerical: true }),
        cell: ({ row }) => {
          const { totalPoints } = row.original;

          return (
            <div className="flex flex-row justify-end">
              <PointsCount points={totalPoints} />
            </div>
          );
        },
      },
    ],
    [explorer],
  );

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-6">
      <DataTable<LeaderboardRowData>
        columns={columns}
        data={leaderboardRows}
        noDataMessage="No users"
        pageSize={100}
        tableClassName="border-y"
        tableRowClassName={(row) =>
          address &&
          row?.original.address === address &&
          "shadow-[inset_0_0_0_2px_hsl(var(--secondary))] !bg-secondary/5"
        }
      />
    </div>
  );
}
