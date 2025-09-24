import { Upload } from "lucide-react";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";

export default function ObligationBorrowsCard() {
  const { obligation } = useLendingMarketContext();

  if (!obligation) return null;
  return (
    <Card
      id="assets-borrowed"
      headerProps={{
        titleIcon: <Upload />,
        title: (
          <>
            Borrowed assets
            <span className="text-xs text-muted-foreground">
              {obligation.borrowPositionCount}
            </span>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="p-0">
        <AccountAssetTable
          type={AccountAssetTableType.BORROWS}
          assets={obligation.borrows.map((b) => ({
            reserve: b.reserve,
            token: b.reserve.token,
            price: b.reserve.price,
            amount: b.borrowedAmount,
            amountUsd: b.borrowedAmountUsd,
          }))}
          noAssetsMessage="No borrows"
        />
      </CardContent>
    </Card>
  );
}
