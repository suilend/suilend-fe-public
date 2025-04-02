import { useMemo } from "react";

import BigNumber from "bignumber.js";
import { Wallet } from "lucide-react";

import {
  NORMALIZED_WAL_COINTYPE,
  formatUsd,
  getToken,
} from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function WalletBalancesCard() {
  const { address } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { balancesCoinMetadataMap, getBalance, ownedStakedWalObjects } =
    useLoadedUserContext();

  const coinTypes = useMemo(
    () =>
      Object.keys(balancesCoinMetadataMap ?? {}).filter(
        (coinType) =>
          getBalance(coinType).gt(0) &&
          (appData.reserveCoinTypes.includes(coinType) ||
            appData.rewardCoinTypes.includes(coinType)),
      ),
    [
      balancesCoinMetadataMap,
      getBalance,
      appData.reserveCoinTypes,
      appData.rewardCoinTypes,
    ],
  );

  if (!address) return null;
  return (
    <Card
      id="wallet-balances"
      headerProps={{
        titleIcon: <Wallet />,
        title: (
          <>
            Wallet balances
            <span className="text-xs text-muted-foreground">
              {formatUsd(
                coinTypes.reduce((acc, coinType) => {
                  const reserve = appData.reserveMap[coinType];
                  const price =
                    reserve?.price ?? appData.rewardPriceMap[coinType];

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
          assets={[
            ...Object.entries(balancesCoinMetadataMap ?? {})
              .filter(([coinType]) => coinTypes.includes(coinType))
              .map(([coinType, coinMetadata]) => {
                const reserve = appData.reserveMap[coinType];

                let price: BigNumber | undefined =
                  reserve?.price ?? appData.rewardPriceMap[coinType];
                if (price !== undefined && price.isNaN()) price = undefined;

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
              }),
            ...(ownedStakedWalObjects ?? []).map((obj) => {
              const price = appData.reserveMap[NORMALIZED_WAL_COINTYPE].price;

              return {
                reserve: undefined,
                token: {
                  ...getToken(
                    NORMALIZED_WAL_COINTYPE,
                    appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE],
                  ),
                  symbol: "Staked WAL",
                },
                price,
                amount: obj.amount,
                amountUsd: obj.amount.times(price),
                extra: { obj },
              };
            }),
          ]}
          noAssetsMessage="No assets"
        />
      </CardContent>
    </Card>
  );
}
