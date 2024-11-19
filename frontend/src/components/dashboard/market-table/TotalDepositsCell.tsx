import TotalCell from "@/components/dashboard/market-table/TotalCell";
import { ReservesRowData } from "@/components/dashboard/MarketTable";

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
