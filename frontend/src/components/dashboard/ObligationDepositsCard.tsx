import { useMemo } from "react";

import BigNumber from "bignumber.js";
import { Download } from "lucide-react";

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

export default function ObligationDepositsCard() {
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { obligationMap } = useLoadedUserContext();

  const filteredAppData = useMemo(
    () =>
      Object.values(allAppData.allLendingMarketData).filter((appData) => {
        const obligation = obligationMap[appData.lendingMarket.id];

        if (!obligation || obligation.depositPositionCount === 0) return false;
        if (appData.lendingMarket.isHidden && address !== ADMIN_ADDRESS)
          return false;

        return true;
      }),
    [allAppData.allLendingMarketData, obligationMap, address],
  );

  if (!address || filteredAppData.length === 0) return null;
  return (
    <Card
      id="assets-deposited"
      headerProps={{
        titleIcon: <Download />,
        title: (
          <>
            Deposits
            <span className="text-xs text-muted-foreground">
              {formatUsd(
                filteredAppData.reduce(
                  (acc, appData) =>
                    acc.plus(
                      obligationMap[appData.lendingMarket.id]
                        ?.depositedAmountUsd ?? 0,
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
      <CardContent className="flex flex-col gap-px p-0">
        {filteredAppData.map((appData) => {
          const obligation = obligationMap[appData.lendingMarket.id]!; // Checked above

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
              noLendingMarketHeader={filteredAppData.length === 1}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
