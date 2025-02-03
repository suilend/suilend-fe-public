import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import TotalCell from "@/components/dashboard/market-table/TotalCell";

interface TotalBorrowsCellProps {
  reserve: ReservesRowData["reserve"];
  token: ReservesRowData["token"];
  borrowLimit: ReservesRowData["borrowLimit"];
  borrowedAmount: ReservesRowData["borrowedAmount"];
  borrowedAmountUsd: ReservesRowData["borrowedAmountUsd"];
  borrowedAmountTooltip: ReservesRowData["borrowedAmountTooltip"];
  horizontal?: boolean;
}

export default function TotalBorrowsCell({
  reserve,
  token,
  borrowLimit,
  borrowedAmount,
  borrowedAmountUsd,
  borrowedAmountTooltip,
  horizontal,
}: TotalBorrowsCellProps) {
  return (
    <TotalCell
      reserve={reserve}
      token={token}
      limit={borrowLimit}
      total={borrowedAmount}
      totalUsd={borrowedAmountUsd}
      tooltip={borrowedAmountTooltip}
      horizontal={horizontal}
    />
  );
}
