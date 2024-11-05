import BigNumber from "bignumber.js";

import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import AccountAssetTable from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { formatUsd } from "@/lib/format";

export default function WalletBalancesCard() {
  const { address } = useWalletContext();
  const appContext = useAppContext();
  const data = appContext.data as AppData;

  if (!address) return null;
  return (
    <Card
      id="wallet-balances"
      headerProps={{
        title: (
          <>
            Wallet balances
            <span className="text-xs text-muted-foreground">
              {formatUsd(
                Object.values(data.coinBalancesMap).reduce(
                  (acc, cb) =>
                    acc.plus(cb.balance.times(cb.price as BigNumber)),
                  new BigNumber(0),
                ),
              )}
            </span>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="p-0">
        <AccountAssetTable
          amountTitle="Balance"
          assets={Object.values(data.coinBalancesMap)
            .filter((cb) => !cb.balance.eq(0))
            .map((cb) => ({
              isBalance: true,
              coinType: cb.coinType,
              mintDecimals: cb.mintDecimals,
              price: cb.price as BigNumber,
              symbol: cb.symbol,
              iconUrl: cb.iconUrl,
              amount: cb.balance,
              amountUsd: cb.balance.times(cb.price as BigNumber),
              reserve: data.lendingMarket.reserves.find(
                (r) => r.coinType === cb.coinType,
              ) as ParsedReserve,
            }))}
          noAssetsMessage="No assets"
        />
      </CardContent>
    </Card>
  );
}
