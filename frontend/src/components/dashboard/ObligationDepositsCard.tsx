import { Download } from "lucide-react";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";

export default function ObligationDepositsCard() {
  const { obligation } = useLendingMarketContext();

  if (!obligation) return null;
  return (
    <Card
      id="assets-deposited"
      headerProps={{
        titleIcon: <Download />,
        title: (
          <>
            Deposited assets
            <span className="text-xs text-muted-foreground">
              {obligation.depositPositionCount}
            </span>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="p-0">
        <AccountAssetTable
          type={AccountAssetTableType.DEPOSITS}
          assets={obligation.deposits.map((d) => ({
            reserve: d.reserve,
            token: d.reserve.token,
            price: d.reserve.price,
            amount: d.depositedAmount,
            amountUsd: d.depositedAmountUsd,
          }))}
          noAssetsMessage="No deposits"
        />
      </CardContent>
    </Card>
  );
}
