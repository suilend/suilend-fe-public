import { useMemo } from "react";

import { Download } from "lucide-react";

import { useWalletContext } from "@suilend/sui-fe-next";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function ObligationDepositsCard() {
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { obligationMap } = useLoadedUserContext();

  const obligationCount = useMemo(
    () =>
      Object.values(obligationMap).filter(
        (obligation) => obligation !== undefined,
      ).length,
    [obligationMap],
  );

  if (!address || obligationCount === 0) return null;
  return (
    <Card
      id="assets-deposited"
      headerProps={{
        titleIcon: <Download />,
        title: (
          <>
            Deposited assets
            <span className="text-xs text-muted-foreground">
              {Object.values(allAppData.allLendingMarketData).reduce(
                (acc, appData) =>
                  acc +
                  (obligationMap[appData.lendingMarket.id]
                    ?.depositPositionCount ?? 0),
                0,
              )}
            </span>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-col gap-px p-0">
        {Object.values(allAppData.allLendingMarketData).map((appData) => {
          const obligation = obligationMap[appData.lendingMarket.id];

          if (!obligation || obligation.depositPositionCount === 0) return null;
          return (
            <AccountAssetTable
              key={appData.lendingMarket.id}
              id={`deposits-${appData.lendingMarket.id}`}
              lendingMarketId={appData.lendingMarket.id}
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
          );
        })}
      </CardContent>
    </Card>
  );
}
