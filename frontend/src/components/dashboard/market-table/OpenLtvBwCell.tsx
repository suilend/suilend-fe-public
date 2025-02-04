import BigNumber from "bignumber.js";

import { formatBorrowWeight, formatLtvPercent } from "@suilend/frontend-sui";

import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import { TBody, TLabel } from "@/components/shared/Typography";

interface OpenLtvBwCellProps {
  openLtvPercent: ReservesRowData["openLtvPercent"];
  borrowWeightBps: ReservesRowData["borrowWeightBps"];
}

export default function OpenLtvBwCell({
  openLtvPercent,
  borrowWeightBps,
}: OpenLtvBwCellProps) {
  return (
    <div className="flex flex-row items-center justify-end gap-2">
      <TBody>{formatLtvPercent(new BigNumber(openLtvPercent))}</TBody>
      <TLabel>/</TLabel>
      <TBody>{formatBorrowWeight(borrowWeightBps)}</TBody>
    </div>
  );
}
