import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { LENDING_MARKET_ID, Side } from "@suilend/sdk";
import {
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_xBTC_COINTYPE,
} from "@suilend/sui-fe";

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
import OkxAprBadge from "@/components/dashboard/market-table/OkxAprBadge";
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
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";
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
  const { allAppData } = useLoadedAppContext();

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/10",
        rowData.section === "featured" &&
          "border-0 shadow-[inset_0px_0_8px_0px_hsl(var(--secondary))]",
        styles.card,
      )}
      onClick={onClick}
    >
      <div className="flex w-full flex-col gap-4 p-4">
        <div className="flex w-full flex-row items-start justify-between">
          <AssetCell
            tableType={MarketCardListType.MARKET_CARD_LIST}
            {...rowData}
          />

          <div className="flex flex-row justify-end gap-6">
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>Deposit APR</TLabelSans>

              <div className="flex flex-col items-end gap-2">
                <DepositAprCell {...rowData} />

                {rowData.token.coinType === NORMALIZED_xBTC_COINTYPE && (
                  <OkxAprBadge
                    side={Side.DEPOSIT}
                    aprPercent={
                      allAppData.okxAprPercentMap.xBtcDepositAprPercent
                    }
                    href="https://web3.okx.com/earn/product/suilend-sui-xbtc-33353"
                  />
                )}
              </div>
            </div>
            <div className="flex w-fit flex-col items-end gap-1">
              <TLabelSans>Borrow APR</TLabelSans>

              <div className="flex flex-col items-end gap-2">
                <BorrowAprCell {...rowData} />

                {rowData.token.coinType === NORMALIZED_USDC_COINTYPE && (
                  <OkxAprBadge
                    side={Side.BORROW}
                    aprPercent={
                      allAppData.okxAprPercentMap.usdcBorrowAprPercent
                    }
                    href="https://web3.okx.com/earn/product/suilend-sui-usdc-41100"
                  />
                )}
              </div>
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
  const { featuredReserveIds } = useLoadedAppContext();
  const { appData } = useLendingMarketContext();
  const { open: openActionsModal } = useActionsModalContext();

  const [headerRowIsExpandedMap, setHeaderRowIsExpandedMap] = useState<
    Record<string, boolean>
  >({});
  const [collapsibleRowIsExpandedMap, setCollapsibleRowIsExpandedMap] =
    useState<Record<string, boolean>>({});

  return (
    <div className="flex w-full flex-col gap-4">
      {rows.map((row, index) => {
        const { section, title, tooltip, count } = row;

        const isHeaderRowExpanded =
          section !== "deprecated" || headerRowIsExpandedMap[title];
        const HeaderRowIcon = isHeaderRowExpanded ? ChevronUp : ChevronDown;

        return (
          <div key={index} className="flex w-full flex-col gap-4">
            {/* Title */}
            {!(
              (featuredReserveIds ?? []).length === 0 && section === "main"
            ) && (
              <button
                className="group flex flex-row items-center gap-2"
                onClick={
                  section !== "deprecated"
                    ? undefined
                    : () =>
                        setHeaderRowIsExpandedMap((prev) => ({
                          ...prev,
                          [title]: !prev[title],
                        }))
                }
              >
                {section === "deprecated" && (
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
                {section !== "featured" && <TLabel>{count}</TLabel>}
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
                          <div className="flex h-6 w-6 flex-row items-center justify-center rounded-md bg-muted/15">
                            <CollapsibleRowIcon className="h-5 w-5 text-foreground" />
                          </div>

                          <div className="flex min-w-max flex-col gap-1">
                            <div className="flex flex-row items-center gap-2">
                              <TBody>{title}</TBody>
                              <TLabel>{subRows.length}</TLabel>
                            </div>

                            <TokenLogos
                              tokens={subRows.map((subRow) => subRow.token)}
                              size={16}
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
                                  openActionsModal(
                                    appData.lendingMarket.id ===
                                      LENDING_MARKET_ID
                                      ? undefined
                                      : appData.lendingMarket.id,
                                    subSubRow.token.symbol,
                                  )
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
                          appData.lendingMarket.id === LENDING_MARKET_ID
                            ? undefined
                            : appData.lendingMarket.id,
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
