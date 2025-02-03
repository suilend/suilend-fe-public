import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import TotalCell from "@/components/dashboard/market-table/TotalCell";

interface TotalDepositsCellProps {
  reserve: ReservesRowData["reserve"];
  token: ReservesRowData["token"];
  depositLimit: ReservesRowData["depositLimit"];
  depositedAmount: ReservesRowData["depositedAmount"];
  depositedAmountUsd: ReservesRowData["depositedAmountUsd"];
  depositedAmountTooltip: ReservesRowData["depositedAmountTooltip"];
  horizontal?: boolean;
}

export default function TotalDepositsCell({
  reserve,
  token,
  depositLimit,
  depositedAmount,
  depositedAmountUsd,
  depositedAmountTooltip,
  horizontal,
}: TotalDepositsCellProps) {
  return (
    <TotalCell
      reserve={reserve}
      token={token}
      limit={depositLimit}
      total={depositedAmount}
      totalUsd={depositedAmountUsd}
      tooltip={depositedAmountTooltip}
      horizontal={horizontal}
    />
  );
}
