import { useMemo } from "react";

import BigNumber from "bignumber.js";
import { Wallet } from "lucide-react";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import { NORMALIZED_WAL_COINTYPE, formatUsd, getToken } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function WalletBalancesCard() {
  const { address } = useWalletContext();
  const { allAppData, isLst } = useLoadedAppContext();
  const { appData } = useLendingMarketContext();
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
                  const price = isLst(coinType)
                    ? reserve.price.times(
                        allAppData.lstMap[coinType].lstToSuiExchangeRate, // Take into account the LST to SUI exchange rate
                      )
                    : (reserve?.price ?? appData.rewardPriceMap[coinType]);
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
                let price: BigNumber | undefined = isLst(coinType)
                  ? reserve.price.times(
                      allAppData.lstMap[coinType].lstToSuiExchangeRate, // Take into account the LST to SUI exchange rate
                    )
                  : (reserve?.price ?? appData.rewardPriceMap[coinType]);
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
              const appDataMainMarket =
                allAppData.allLendingMarketData[LENDING_MARKET_ID]; // Override appData from useLendingMarketContext

              const price =
                appDataMainMarket.reserveMap[NORMALIZED_WAL_COINTYPE].price;

              return {
                reserve: undefined,
                token: {
                  ...getToken(
                    NORMALIZED_WAL_COINTYPE,
                    appDataMainMarket.coinMetadataMap[NORMALIZED_WAL_COINTYPE],
                  ),
                  symbol: "Staked WAL".toUpperCase(),
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
