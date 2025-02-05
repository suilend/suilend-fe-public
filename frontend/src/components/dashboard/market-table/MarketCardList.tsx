import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import Card from "@/components/dashboard/Card";
import AssetCell from "@/components/dashboard/market-table/AssetCell";
import BorrowAprCell from "@/components/dashboard/market-table/BorrowAprCell";
import DepositAprCell from "@/components/dashboard/market-table/DepositAprCell";
import styles from "@/components/dashboard/market-table/MarketCardList.module.scss";
import {
  CollapsibleRowData,
  HeaderRowData,
  ReservesRowData,
} from "@/components/dashboard/market-table/MarketTable";
import OpenLtvBwCell from "@/components/dashboard/market-table/OpenLtvBwCell";
import TotalBorrowsCell from "@/components/dashboard/market-table/TotalBorrowsCell";
import TotalDepositsCell from "@/components/dashboard/market-table/TotalDepositsCell";
import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import {
  TBody,
  TLabel,
  TLabelSans,
  TTitle,
} from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { OPEN_LTV_BORROW_WEIGHT_TOOLTIP } from "@/lib/tooltips";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

export enum MarketCardListType {
  MARKET_CARD_LIST = "marketCardList",
}

interface MarketCardProps {
  rowData: ReservesRowData;
  onClick: () => void;
}

function MarketCard({ rowData, onClick }: MarketCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/10",
        styles.card,
      )}
      onClick={onClick}
    >
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="flex w-full flex-row justify-between">
          <AssetCell
            tableType={MarketCardListType.MARKET_CARD_LIST}
            {...rowData}
          />

          <div className="flex flex-row justify-end gap-6">
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>Deposit APR</TLabelSans>
              <DepositAprCell {...rowData} />
            </div>
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>Borrow APR</TLabelSans>
              <BorrowAprCell {...rowData} />
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-row items-center justify-between">
            <LabelWithTooltip tooltip={OPEN_LTV_BORROW_WEIGHT_TOOLTIP}>
              LTV / BW
            </LabelWithTooltip>
            <OpenLtvBwCell {...rowData} />
          </div>
          <div className="flex w-full flex-row items-center justify-between">
            <TLabelSans>Deposits</TLabelSans>
            <TotalDepositsCell {...rowData} horizontal />
          </div>
          <div className="flex w-full flex-row items-center justify-between">
            <TLabelSans>Borrows</TLabelSans>
            <TotalBorrowsCell {...rowData} horizontal />
          </div>
        </div>
      </div>
    </Card>
  );
}

interface MarketCardListProps {
  rows: HeaderRowData[];
}

export default function MarketCardList({ rows }: MarketCardListProps) {
  const { open: openActionsModal } = useActionsModalContext();

  const [headerRowIsExpandedMap, setHeaderRowIsExpandedMap] = useState<
    Record<string, boolean>
  >({});
  const [collapsibleRowIsExpandedMap, setCollapsibleRowIsExpandedMap] =
    useState<Record<string, boolean>>({});

  return (
    <div className="flex w-full flex-col gap-6">
      {rows.map((row, index) => {
        const { isIsolated, isDeprecated, title, tooltip, count } = row;

        const isHeaderRowExpanded =
          !isDeprecated || headerRowIsExpandedMap[title];
        const HeaderRowIcon = isHeaderRowExpanded ? ChevronUp : ChevronDown;

        return (
          <div key={index} className="flex w-full flex-col gap-4">
            {/* Title */}
            {!(!isIsolated && !isDeprecated) && (
              <button
                className="group flex flex-row items-center gap-2"
                onClick={
                  !isDeprecated
                    ? undefined
                    : () =>
                        setHeaderRowIsExpandedMap((prev) => ({
                          ...prev,
                          [title]: !prev[title],
                        }))
                }
              >
                {isDeprecated && (
                  <HeaderRowIcon className="-mr-1 h-4 w-4 text-primary" />
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
              </button>
            )}

            {/* Cards */}
            {isHeaderRowExpanded && (
              <div className="flex w-full flex-col gap-2">
                {row.subRows.map((subRow, index2) => {
                  if ((subRow as CollapsibleRowData).isCollapsibleRow) {
                    const { title, subRows } = subRow as CollapsibleRowData;

                    const isCollapsibleRowExpanded =
                      collapsibleRowIsExpandedMap[title];
                    const CollapsibleRowIcon = isCollapsibleRowExpanded
                      ? ChevronUp
                      : ChevronDown;

                    return (
                      <div
                        key={title}
                        className={cn(
                          "-mx-4 flex flex-col gap-2 px-4",
                          (index2 !== 0 || isCollapsibleRowExpanded) && "pt-0",
                          (index2 !== row.subRows.length - 1 ||
                            isCollapsibleRowExpanded) &&
                            "pb-0",
                          isCollapsibleRowExpanded &&
                            "shadow-[inset_2px_0_0_0px_hsl(var(--primary))]",
                        )}
                      >
                        {/* Title */}
                        <button
                          className="flex flex-row items-center gap-3"
                          onClick={() =>
                            setCollapsibleRowIsExpandedMap((prev) => ({
                              ...prev,
                              [title]: !prev[title],
                            }))
                          }
                        >
                          <div className="flex h-7 w-7 flex-row items-center justify-center rounded-md bg-muted/15">
                            <CollapsibleRowIcon className="h-5 w-5 text-foreground" />
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
                        </button>

                        {/* Cards */}
                        {isCollapsibleRowExpanded && (
                          <div className="flex w-full flex-col gap-2">
                            {subRows.map((subSubRow) => (
                              <MarketCard
                                key={subSubRow.token.coinType}
                                rowData={subSubRow}
                                onClick={() =>
                                  openActionsModal(subSubRow.token.symbol)
                                }
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Card
                  return (
                    <MarketCard
                      key={(subRow as ReservesRowData).token.coinType}
                      rowData={subRow as ReservesRowData}
                      onClick={() =>
                        openActionsModal(
                          (subRow as ReservesRowData).token.symbol,
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
