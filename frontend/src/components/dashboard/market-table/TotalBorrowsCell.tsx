import TotalCell from "@/components/dashboard/market-table/TotalCell";
import { ReservesRowData } from "@/components/dashboard/MarketTable";

interface TotalBorrowsCellProps {
  token: ReservesRowData["token"];
  borrowedAmount: ReservesRowData["borrowedAmount"];
  borrowedAmountUsd: ReservesRowData["borrowedAmountUsd"];
  borrowedAmountTooltip: ReservesRowData["borrowedAmountTooltip"];
  horizontal?: boolean;
}

export default function TotalBorrowsCell({
  token,
  borrowedAmount,
  borrowedAmountUsd,
  borrowedAmountTooltip,
  horizontal,
}: TotalBorrowsCellProps) {
  return (
    <TotalCell
      token={token}
      total={borrowedAmount}
      totalUsd={borrowedAmountUsd}
      tooltip={borrowedAmountTooltip}
      horizontal={horizontal}
    />
  );
}
