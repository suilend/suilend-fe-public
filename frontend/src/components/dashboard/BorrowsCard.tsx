import { useMemo } from "react";

import BigNumber from "bignumber.js";
import { Upload } from "lucide-react";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { formatUsd } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function BorrowsCard() {
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { obligationMap } = useLoadedUserContext();

  const filteredAppData = useMemo(
    () =>
      Object.values(allAppData.allLendingMarketData).filter((appData) => {
        const obligation = obligationMap[appData.lendingMarket.id];

        if (!obligation || obligation.borrowPositionCount === 0) return false;
        if (appData.lendingMarket.isHidden && address !== ADMIN_ADDRESS)
          return false;

        return true;
      }),
    [allAppData.allLendingMarketData, obligationMap, address],
  );

  if (!address || filteredAppData.length === 0) return null;
  return (
    <Card
      id="borrows"
      headerProps={{
        titleIcon: <Upload />,
        title: (
          <>
            Borrows
            <span className="text-xs text-muted-foreground">
              {formatUsd(
                filteredAppData.reduce(
                  (acc, appData) =>
                    acc.plus(
                      obligationMap[appData.lendingMarket.id]
                        ?.borrowedAmountUsd ?? 0,
                    ),
                  new BigNumber(0),
                ),
              )}
            </span>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-col gap-0.5 p-0">
        {filteredAppData.map((appData) => {
          const obligation = obligationMap[appData.lendingMarket.id]!; // Checked above

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
              noLendingMarketHeader={filteredAppData.length === 1}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
