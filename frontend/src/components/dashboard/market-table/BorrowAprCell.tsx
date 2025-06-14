import { Side } from "@suilend/sdk/lib/types";

import AprWithRewardsBreakdown from "@/components/dashboard/AprWithRewardsBreakdown";
import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";

interface BorrowAprCellProps {
  reserve: ReservesRowData["reserve"];
}

export default function BorrowAprCell({ reserve }: BorrowAprCellProps) {
  return <AprWithRewardsBreakdown side={Side.BORROW} reserve={reserve} />;
}
