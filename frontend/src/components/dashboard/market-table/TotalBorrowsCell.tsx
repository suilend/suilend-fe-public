import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import TotalCell from "@/components/dashboard/market-table/TotalCell";

interface TotalBorrowsCellProps {
  reserve: ReservesRowData["reserve"];
  token: ReservesRowData["token"];
  borrowedAmount: ReservesRowData["borrowedAmount"];
  borrowedAmountUsd: ReservesRowData["borrowedAmountUsd"];
  borrowedAmountTooltip: ReservesRowData["borrowedAmountTooltip"];
  horizontal?: boolean;
}

export default function TotalBorrowsCell({
  reserve,
  token,
  borrowedAmount,
  borrowedAmountUsd,
  borrowedAmountTooltip,
  horizontal,
}: TotalBorrowsCellProps) {
  return (
    <TotalCell
      reserve={reserve}
      token={token}
      total={borrowedAmount}
      totalUsd={borrowedAmountUsd}
      tooltip={borrowedAmountTooltip}
      horizontal={horizontal}
    />
  );
}
