import { Side } from "@suilend/sdk/types";

import AprWithRewardsBreakdown from "@/components/dashboard/AprWithRewardsBreakdown";
import { ReservesRowData } from "@/components/dashboard/MarketTable";

interface DepositAprCellProps {
  reserve: ReservesRowData["reserve"];
}

export default function DepositAprCell({ reserve }: DepositAprCellProps) {
  return <AprWithRewardsBreakdown side={Side.DEPOSIT} reserve={reserve} />;
}
