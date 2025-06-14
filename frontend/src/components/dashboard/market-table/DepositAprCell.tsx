import { Side } from "@suilend/sdk/lib/types";

import AprWithRewardsBreakdown from "@/components/dashboard/AprWithRewardsBreakdown";
import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";

interface DepositAprCellProps {
  reserve: ReservesRowData["reserve"];
}

export default function DepositAprCell({ reserve }: DepositAprCellProps) {
  return <AprWithRewardsBreakdown side={Side.DEPOSIT} reserve={reserve} />;
}
