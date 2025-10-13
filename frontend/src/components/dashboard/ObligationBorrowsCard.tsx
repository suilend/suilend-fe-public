import { useMemo } from "react";

import { Upload } from "lucide-react";

import { useWalletContext } from "@suilend/sui-fe-next";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function ObligationBorrowsCard() {
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
      id="assets-borrowed"
      headerProps={{
        titleIcon: <Upload />,
        title: (
          <>
            Borrowed assets
            <span className="text-xs text-muted-foreground">
              {Object.values(allAppData.allLendingMarketData).reduce(
                (acc, appData) =>
                  acc +
                  (obligationMap[appData.lendingMarket.id]
                    ?.borrowPositionCount ?? 0),
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

          if (!obligation || obligation.borrowPositionCount === 0) return null;
          return (
            <AccountAssetTable
              key={appData.lendingMarket.id}
              id={`borrows-${appData.lendingMarket.id}`}
              lendingMarketId={appData.lendingMarket.id}
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
          );
        })}
      </CardContent>
    </Card>
  );
}
