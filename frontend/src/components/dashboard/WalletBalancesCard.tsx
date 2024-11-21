import { useMemo } from "react";

import BigNumber from "bignumber.js";

import { getToken, useWalletContext } from "@suilend/frontend-sui";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatUsd } from "@/lib/format";

export default function WalletBalancesCard() {
  const { address } = useWalletContext();
  const { data, balancesCoinMetadataMap, getBalance } = useLoadedAppContext();

  const coinTypes = useMemo(
    () =>
      Object.keys(balancesCoinMetadataMap ?? {}).filter(
        (coinType) =>
          getBalance(coinType).gt(0) &&
          (data.reserveCoinTypes.includes(coinType) ||
            data.rewardCoinTypes.includes(coinType)),
      ),
    [
      balancesCoinMetadataMap,
      getBalance,
      data.reserveCoinTypes,
      data.rewardCoinTypes,
    ],
  );

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
                coinTypes.reduce((acc, coinType) => {
                  const reserve = data.reserveMap[coinType];
                  const price = reserve?.price ?? data.rewardPriceMap[coinType];

                  if (price === undefined) return acc;
                  return acc.plus(getBalance(coinType).times(price));
                }, new BigNumber(0)),
              )}
            </span>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="p-0">
        <AccountAssetTable
          type={AccountAssetTableType.BALANCES}
          assets={Object.entries(balancesCoinMetadataMap ?? {})
            .filter(([coinType]) => coinTypes.includes(coinType))
            .map(([coinType, coinMetadata]) => {
              const reserve = data.reserveMap[coinType];
              const price = reserve?.price ?? data.rewardPriceMap[coinType];

              return {
                reserve,
                token: getToken(coinType, coinMetadata),
                price,
                amount: getBalance(coinType),
                amountUsd:
                  price !== undefined
                    ? getBalance(coinType).times(price)
                    : undefined,
              };
            })}
          noAssetsMessage="No assets"
        />
      </CardContent>
    </Card>
  );
}
