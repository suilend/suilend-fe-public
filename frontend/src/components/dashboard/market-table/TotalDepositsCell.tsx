import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import TotalCell from "@/components/dashboard/market-table/TotalCell";

interface TotalDepositsCellProps {
  token: ReservesRowData["token"];
  depositedAmount: ReservesRowData["depositedAmount"];
  depositedAmountUsd: ReservesRowData["depositedAmountUsd"];
  depositedAmountTooltip: ReservesRowData["depositedAmountTooltip"];
  horizontal?: boolean;
}

export default function TotalDepositsCell({
  token,
  depositedAmount,
  depositedAmountUsd,
  depositedAmountTooltip,
  horizontal,
}: TotalDepositsCellProps) {
  return (
    <TotalCell
      token={token}
      total={depositedAmount}
      totalUsd={depositedAmountUsd}
      tooltip={depositedAmountTooltip}
      horizontal={horizontal}
    />
  );
}
