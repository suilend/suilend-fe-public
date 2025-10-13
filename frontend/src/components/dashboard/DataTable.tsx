import { Fragment, FunctionComponent, ReactNode, useState } from "react";

import {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  Header,
  PaginationState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import {
  ArrowDown01,
  ArrowDown10,
  ArrowDownAz,
  ArrowDownZa,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";

import Button from "@/components/shared/Button";
import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import { TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableContainerProps,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function decimalSortingFn<T>(key: string) {
  return (rowA: Row<T>, rowB: Row<T>) => {
    const a = rowA.original as { [key: string]: BigNumber | undefined };
    const b = rowB.original as { [key: string]: BigNumber | undefined };

    if (a[key] === undefined) return 0;
    return new BigNumber(a[key] ?? 0).lt(b[key] ?? 0) ? -1 : 1;
  };
}

enum SortState {
  NOT_SORTED = "not_sorted",
  ASC = "asc",
  DESC = "desc",
}

function getSortState<T>(
  column: Column<T>,
  { isNumerical, isDate }: { isNumerical?: boolean; isDate?: boolean } = {},
) {
  let state: SortState;
  let action;
  if (!column.getIsSorted()) {
    state = SortState.NOT_SORTED;
    action = () => column.toggleSorting(false);
  } else if (column.getIsSorted() === "asc") {
    state = SortState.ASC;
    action = () => column.toggleSorting(true);
  } else {
    state = SortState.DESC;
    action = () => column.clearSorting();
  }

  let icon, tooltip;
  if (state === SortState.NOT_SORTED) {
    if (isNumerical) {
      icon = <ChevronsUpDown />;
      tooltip = "Click to sort smallest to biggest";
    } else if (isDate) {
      icon = <ChevronsUpDown />;
      tooltip = "Click to sort oldest to newest";
    } else {
      icon = <ChevronsUpDown />;
      tooltip = "Click to sort A-Z";
    }
  } else if (state === SortState.ASC) {
    if (isNumerical) {
      icon = <ArrowDown01 />;
      tooltip = "Click to sort biggest to smallest";
    } else if (isDate) {
      icon = <ChevronDown />;
      tooltip = "Click to sort newest to oldest";
    } else {
      icon = <ArrowDownAz />;
      tooltip = "Click to sort Z-A";
    }
  } else {
    if (isNumerical) {
      icon = <ArrowDown10 />;
      tooltip = "Click to cancel sorting";
    } else if (isDate) {
      icon = <ChevronUp />;
      tooltip = "Click to cancel sorting";
    } else {
      icon = <ArrowDownZa />;
      tooltip = "Click to cancel sorting";
    }
  }

  return { action, icon, tooltip };
}

export function tableHeader<T>(
  column: Column<T>,
  title: string,
  {
    isNumerical,
    isRightAligned,
    isDate,
    tooltip,
    borderBottom,
  }: {
    isNumerical?: boolean;
    isRightAligned?: boolean;
    isDate?: boolean;
    tooltip?: string | ReactNode;
    borderBottom?: boolean;
  } = {},
) {
  const sortState = column.getCanSort()
    ? getSortState(column, { isNumerical, isDate })
    : undefined;

  if (!sortState)
    return (
      <LabelWithTooltip
        className={cn(
          "flex h-full w-full min-w-max flex-col justify-center px-4",
          isNumerical || isRightAligned ? "items-end" : "items-start",
          borderBottom && "border-b",
        )}
        tooltip={tooltip}
      >
        {title}
      </LabelWithTooltip>
    );
  return (
    <Button
      className={cn(
        "h-full w-full rounded-none px-4 py-0 text-muted-foreground hover:bg-transparent",
        isNumerical || isRightAligned ? "justify-end" : "justify-start",
        borderBottom && "border-b",
        column.getIsSorted() && "!text-primary-foreground",
      )}
      labelClassName="font-sans text-xs min-w-max"
      tooltip={sortState.tooltip}
      tooltipAlign={isNumerical || isRightAligned ? "end" : "start"}
      endIcon={sortState.icon}
      variant="ghost"
      onClick={sortState.action}
    >
      {title}
    </Button>
  );
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data?: T[];
  noDataMessage?: string;
  columnFilters?: ColumnFiltersState;
  skeletonRows?: number;
  maxRows?: number;
  initialExpandedState?: ExpandedState;
  pageSize?: number;
  container?: TableContainerProps;
  tableClassName?: ClassValue;
  tableHeaderRowClassName?: ClassValue;
  tableHeadClassName?: (header: Header<T, unknown>) => ClassValue;
  tableRowClassName?: (row?: Row<T>) => ClassValue;
  tableCellClassName?: (cell?: Cell<T, unknown>) => ClassValue;
  tableCellColSpan?: (cell: Cell<T, unknown>) => number | undefined;
  RowModal?: FunctionComponent<{
    row: T;
    children: ReactNode;
  }>;
  onRowClick?: (row: Row<T>, index: number) => (() => void) | undefined;
}

export default function DataTable<T>({
  columns,
  data,
  noDataMessage,
  columnFilters,
  skeletonRows,
  maxRows,
  initialExpandedState,
  pageSize,
  container,
  tableClassName,
  tableHeaderRowClassName,
  tableHeadClassName,
  tableRowClassName,
  tableCellClassName,
  tableCellColSpan,
  RowModal,
  onRowClick,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(
    initialExpandedState ?? {},
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize ?? 0,
  });

  type TWithSubRows = T & { subRows?: T[] };

  const isPaginated = pageSize !== undefined;
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onExpandedChange: setExpanded,
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: (row: T) =>
      "subRows" in (row as TWithSubRows)
        ? (row as TWithSubRows).subRows
        : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: isPaginated ? getPaginationRowModel() : undefined,
    onPaginationChange: isPaginated ? setPagination : undefined,
    paginateExpandedRows: false,
    state: {
      columnFilters,
      sorting,
      expanded,
      pagination: isPaginated ? pagination : undefined,
    },
  });

  const pageIndexes: number[] | undefined = (() => {
    if (!isPaginated) return undefined;

    const pageCount = table.getPageCount();
    const lastPageIndex = pageCount - 1;

    if (pageCount < 7)
      return Array.from({ length: pageCount }).map((_, index) => index);

    // First three pages
    if (pagination.pageIndex <= 2) return [0, 1, 2, 3, 4, 5, lastPageIndex];

    // Last three pages
    if (pagination.pageIndex >= lastPageIndex - 2)
      return [
        0,
        lastPageIndex - 5,
        lastPageIndex - 4,
        lastPageIndex - 3,
        lastPageIndex - 2,
        lastPageIndex - 1,
        lastPageIndex,
      ];

    return [
      0,
      pagination.pageIndex - 2,
      pagination.pageIndex - 1,
      pagination.pageIndex,
      pagination.pageIndex + 1,
      pagination.pageIndex + 2,
      lastPageIndex,
    ];
  })();

  return (
    <>
      <Table container={container} className={cn(tableClassName)}>
        <TableHeader className="relative z-[2]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className={cn("hover:bg-transparent", tableHeaderRowClassName)}
            >
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-8 px-0 py-0",
                      tableHeadClassName && tableHeadClassName(header),
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="relative z-[1]">
          {data === undefined ? (
            <>
              {Array.from({ length: skeletonRows ?? 5 }).map((_, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    "hover:bg-transparent",
                    tableRowClassName && tableRowClassName(undefined),
                  )}
                >
                  <TableCell
                    colSpan={columns.length}
                    className={cn(
                      "h-16 px-0 py-0",
                      tableCellClassName && tableCellClassName(),
                    )}
                  >
                    <Skeleton className="h-full w-full bg-muted/10" />
                  </TableCell>
                </TableRow>
              ))}
            </>
          ) : (
            <>
              {table.getRowModel().rows.length ? (
                table
                  .getRowModel()
                  .rows.slice(0, maxRows)
                  .map((row) => {
                    const result: Row<T>[] = [row];
                    for (const subRow of row.subRows) {
                      result.push(subRow);

                      for (const subSubRow of subRow.subRows)
                        result.push(subSubRow);
                    }

                    return result;
                  })
                  .flat()
                  .map((row, index) => {
                    if (!row.getIsAllParentsExpanded()) return null;

                    const children = (
                      <TableRow
                        className={cn(
                          "hover:bg-transparent",
                          (RowModal ||
                            (onRowClick &&
                              onRowClick(row, index) !== undefined)) &&
                            "cursor-pointer hover:bg-muted/10",
                          tableRowClassName && tableRowClassName(row),
                        )}
                        style={{ appearance: "inherit" }}
                        onClick={
                          !RowModal && onRowClick
                            ? onRowClick(row, index)
                            : undefined
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "h-16",
                              tableCellClassName && tableCellClassName(cell),
                            )}
                            colSpan={tableCellColSpan && tableCellColSpan(cell)}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );

                    return (
                      <Fragment key={row.id}>
                        {RowModal ? (
                          <RowModal row={row.original}>{children}</RowModal>
                        ) : (
                          children
                        )}
                      </Fragment>
                    );
                  })
              ) : (
                <TableRow
                  className={cn(
                    "hover:bg-transparent",
                    tableRowClassName && tableRowClassName(undefined),
                  )}
                >
                  <TableCell
                    colSpan={columns.length}
                    className={cn(
                      "h-16 py-0 text-center",
                      tableCellClassName && tableCellClassName(),
                    )}
                  >
                    <TLabelSans>{noDataMessage}</TLabelSans>
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>

      {pageIndexes && pageIndexes.length > 0 && (
        <div className="flex w-full flex-row items-center justify-center gap-2">
          {pageIndexes.map((pageIndex) => (
            <Button
              key={pageIndex}
              className="min-w-9 border bg-card transition-none hover:bg-border disabled:border-secondary disabled:bg-secondary disabled:text-secondary-foreground disabled:opacity-100"
              variant="ghost"
              onClick={() => table.setPageIndex(pageIndex)}
              disabled={pageIndex === pagination.pageIndex}
            >
              {pageIndex + 1}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
