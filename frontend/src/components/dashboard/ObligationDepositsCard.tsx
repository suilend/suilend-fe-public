import AccountAssetTable from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function ObligationDepositsCard() {
  const { obligation } = useLoadedAppContext();

  if (!obligation) return null;
  return (
    <Card
      id="assets-deposited"
      headerProps={{
        title: "Deposited assets",
        noSeparator: true,
      }}
    >
      <CardContent className="p-0">
        <AccountAssetTable
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
