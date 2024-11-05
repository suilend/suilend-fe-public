import { Side } from "@suilend/sdk/types";

import AprWithRewardsBreakdown from "@/components/dashboard/AprWithRewardsBreakdown";
import { ReservesRowData } from "@/components/dashboard/MarketTable";

type BorrowAprCellProps = Pick<ReservesRowData, "reserve">;

export default function BorrowAprCell({ reserve }: BorrowAprCellProps) {
  return <AprWithRewardsBreakdown side={Side.BORROW} reserve={reserve} />;
}
