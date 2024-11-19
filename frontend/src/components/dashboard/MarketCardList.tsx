import { useMemo } from "react";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import Card from "@/components/dashboard/Card";
import AssetCell from "@/components/dashboard/market-table/AssetCell";
import BorrowAprCell from "@/components/dashboard/market-table/BorrowAprCell";
import DepositAprCell from "@/components/dashboard/market-table/DepositAprCell";
import OpenLtvBwCell from "@/components/dashboard/market-table/OpenLtvBwCell";
import TotalBorrowsCell from "@/components/dashboard/market-table/TotalBorrowsCell";
import TotalDepositsCell from "@/components/dashboard/market-table/TotalDepositsCell";
import styles from "@/components/dashboard/MarketCardList.module.scss";
import { ReservesRowData } from "@/components/dashboard/MarketTable";
import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import Tooltip from "@/components/shared/Tooltip";
import { TLabelSans, TTitle } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import {
  ISOLATED_TOOLTIP,
  OPEN_LTV_BORROW_WEIGHT_TOOLTIP,
} from "@/lib/tooltips";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

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
          <AssetCell {...rowData} />

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
  rows: ReservesRowData[];
}
export default function MarketCardList({ rows }: MarketCardListProps) {
  const { open: openActionsModal } = useActionsModalContext();

  const mainRows = useMemo(() => rows.filter((row) => !row.isIsolated), [rows]);
  const isolatedRows = useMemo(
    () => rows.filter((row) => row.isIsolated),
    [rows],
  );

  return (
    <div className="flex flex-col gap-6">
      {mainRows.length > 0 && (
        <div className="flex flex-col gap-4">
          <TTitle className="uppercase">Main assets</TTitle>
          <div className="flex w-full flex-col gap-2">
            {mainRows.map((rowData) => (
              <MarketCard
                key={rowData.token.coinType}
                rowData={rowData}
                onClick={() => openActionsModal(rowData.token.symbol)}
              />
            ))}
          </div>
        </div>
      )}

      {isolatedRows.length > 0 && (
        <div className="flex flex-col gap-4">
          <Tooltip title={ISOLATED_TOOLTIP}>
            <TTitle
              className={cn(
                "w-max uppercase decoration-primary/50",
                hoverUnderlineClassName,
              )}
            >
              Isolated assets
            </TTitle>
          </Tooltip>
          <div className="flex w-full flex-col gap-2">
            {isolatedRows.map((rowData) => (
              <MarketCard
                key={rowData.token.coinType}
                rowData={rowData}
                onClick={() => openActionsModal(rowData.token.symbol)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
