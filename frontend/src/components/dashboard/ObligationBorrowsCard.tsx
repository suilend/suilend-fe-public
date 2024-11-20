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
          amountTitle="Borrows"
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
