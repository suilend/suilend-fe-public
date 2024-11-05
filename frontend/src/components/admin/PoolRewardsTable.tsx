import { ColumnDef } from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import { Ban, X } from "lucide-react";

import { ParsedPoolReward } from "@suilend/sdk/parsers/reserve";

import DataTable, {
  decimalSortingFn,
  tableHeader,
} from "@/components/dashboard/DataTable";
import Button from "@/components/shared/Button";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RowData {
  startTime: Date;
  endTime: Date;
  totalRewards: BigNumber;
  allocatedRewards: BigNumber;
  cumulativeRewardsPerShare: BigNumber;
  mintDecimals: number;
  symbol: string;
  poolReward: ParsedPoolReward;
}

interface PoolRewardsTableProps {
  poolRewards: RowData[];
  noPoolRewardsMessage: string;
  onCancelReward: (poolReward: ParsedPoolReward) => void;
  onCloseReward: (poolReward: ParsedPoolReward) => void;
}

export default function PoolRewardsTable({
  poolRewards,
  noPoolRewardsMessage,
  onCancelReward,
  onCloseReward,
}: PoolRewardsTableProps) {
  const appContext = useAppContext();
  const data = appContext.data as AppData;

  const isEditable = !!data.lendingMarketOwnerCapId;

  const columns: ColumnDef<RowData>[] = [
    {
      accessorKey: "symbol",
      sortingFn: "text",
      header: ({ column }) => tableHeader(column, "Asset"),
      cell: ({ row }) => {
        const { endTime, symbol } = row.original;

        return (
          <TBody className={cn(endTime.getTime() < Date.now() && "opacity-25")}>
            {symbol}
          </TBody>
        );
      },
    },
    {
      accessorKey: "startTime",
      sortingFn: "datetime",
      header: ({ column }) =>
        tableHeader(column, "Start time", { isDate: true }),
      cell: ({ row }) => {
        const { startTime, endTime } = row.original;

        return (
          <Tooltip title={formatDate(startTime, "yyyy-MM-dd HH:mm:ss")}>
            <TBody
              className={cn(endTime.getTime() < Date.now() && "opacity-25")}
            >
              {startTime.getTime()}
            </TBody>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "endTime",
      sortingFn: "datetime",
      header: ({ column }) => tableHeader(column, "End time", { isDate: true }),
      cell: ({ row }) => {
        const { endTime } = row.original;

        return (
          <Tooltip title={formatDate(endTime, "yyyy-MM-dd HH:mm:ss")}>
            <TBody
              className={cn(endTime.getTime() < Date.now() && "opacity-25")}
            >
              {endTime.getTime()}
            </TBody>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "totalRewards",
      sortingFn: decimalSortingFn("totalRewards"),
      header: ({ column }) =>
        tableHeader(column, "Total rewards", { isNumerical: true }),
      cell: ({ row }) => {
        const { endTime, totalRewards, mintDecimals } = row.original;

        return (
          <TBody
            className={cn(
              "text-right",
              endTime.getTime() < Date.now() && "opacity-25",
            )}
          >
            {formatNumber(totalRewards, { dp: mintDecimals, exact: true })}
          </TBody>
        );
      },
    },
    {
      accessorKey: "allocatedRewards",
      sortingFn: decimalSortingFn("allocatedRewards"),
      header: ({ column }) =>
        tableHeader(column, "Allocated rewards", { isNumerical: true }),
      cell: ({ row }) => {
        const { endTime, allocatedRewards } = row.original;

        return (
          <TBody
            className={cn(
              "text-right",
              endTime.getTime() < Date.now() && "opacity-25",
            )}
          >
            {formatNumber(allocatedRewards, { dp: 20, exact: true })}
          </TBody>
        );
      },
    },
    {
      accessorKey: "cumulativeRewardsPerShare",
      sortingFn: decimalSortingFn("cumulativeRewardsPerShare"),
      header: ({ column }) =>
        tableHeader(column, "Cum. rewards per share", { isNumerical: true }),
      cell: ({ row }) => {
        const { endTime, cumulativeRewardsPerShare } = row.original;

        return (
          <TBody
            className={cn(
              "text-right",
              endTime.getTime() < Date.now() && "opacity-25",
            )}
          >
            {formatNumber(cumulativeRewardsPerShare, { dp: 20, exact: true })}
          </TBody>
        );
      },
    },
    {
      accessorKey: "actions",
      enableSorting: false,
      header: ({ column }) => tableHeader(column, "Actions"),
      cell: ({ row }) => {
        const { endTime, poolReward } = row.original;

        const isCancelable = Date.now() <= endTime.getTime();
        const isClosable = Date.now() > endTime.getTime();

        return (
          <div className="flex flex-row gap-1">
            <Button
              tooltip="Cancel reward"
              icon={<Ban />}
              variant="secondary"
              size="icon"
              onClick={() => onCancelReward(poolReward)}
              disabled={!isCancelable || !isEditable}
            >
              Cancel reward
            </Button>
            <Button
              tooltip="Close reward"
              icon={<X />}
              variant="secondary"
              size="icon"
              onClick={() => onCloseReward(poolReward)}
              disabled={!isClosable || !isEditable}
            >
              Close reward
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      <DataTable<RowData>
        columns={columns}
        data={poolRewards}
        noDataMessage={noPoolRewardsMessage}
      />
    </div>
  );
}
