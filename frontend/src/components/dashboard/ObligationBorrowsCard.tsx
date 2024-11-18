import AccountAssetTable from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function ObligationBorrowsCard() {
  const { obligation } = useLoadedAppContext();

  if (!obligation) return null;
  return (
    <Card
      id="assets-borrowed"
      headerProps={{
        title: "Borrowed assets",
        noSeparator: true,
      }}
    >
      <CardContent className="p-0">
        <AccountAssetTable
          assets={obligation.borrows.map((b) => ({
            coinType: b.coinType,
            mintDecimals: b.reserve.mintDecimals,
            price: b.reserve.price,
            symbol: b.reserve.symbol,
            iconUrl: b.reserve.iconUrl,
            amount: b.borrowedAmount,
            amountUsd: b.borrowedAmountUsd,
            reserve: b.reserve,
          }))}
          noAssetsMessage="No borrows"
        />
      </CardContent>
    </Card>
  );
}
