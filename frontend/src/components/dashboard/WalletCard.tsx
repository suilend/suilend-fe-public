import { useMemo } from "react";

import BigNumber from "bignumber.js";
import { Wallet } from "lucide-react";

import { LENDING_MARKET_ID, ParsedReserve } from "@suilend/sdk";
import { formatUsd, getToken } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import AccountAssetTable, {
  AccountAssetTableType,
} from "@/components/dashboard/AccountAssetTable";
import Card from "@/components/dashboard/Card";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function WalletCard() {
  const { address } = useWalletContext();
  const { allAppData, isLst } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { balancesCoinMetadataMap, getBalance } = useLoadedUserContext();

  const coinTypes = useMemo(
    () =>
      Object.keys(balancesCoinMetadataMap ?? {}).filter(
        (coinType) =>
          getBalance(coinType).gt(0) &&
          (appDataMainMarket.reserveCoinTypes.includes(coinType) ||
            appDataMainMarket.rewardCoinTypes.includes(coinType)),
      ),
    [
      balancesCoinMetadataMap,
      getBalance,
      appDataMainMarket.reserveCoinTypes,
      appDataMainMarket.rewardCoinTypes,
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
            Wallet
            <span className="text-xs text-muted-foreground">
              {formatUsd(
                coinTypes.reduce((acc, coinType) => {
                  const reserve: ParsedReserve | undefined =
                    appDataMainMarket.reserveMap[coinType];
                  let price: BigNumber | undefined = (
                    reserve?.price ??
                    appDataMainMarket.rewardPriceMap[coinType] ??
                    new BigNumber(0)
                  ).times(
                    isLst(coinType)
                      ? allAppData.lstMap[coinType].lstToSuiExchangeRate // Take into account the LST to SUI exchange rate
                      : 1,
                  );
                  if (price !== undefined && price.isNaN()) price = undefined;

                  return acc.plus(
                    price !== undefined ? getBalance(coinType).times(price) : 0,
                  );
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
          id="wallet"
          lendingMarketId={LENDING_MARKET_ID}
          type={AccountAssetTableType.WALLET}
          assets={[
            ...Object.entries(balancesCoinMetadataMap ?? {})
              .filter(([coinType]) => coinTypes.includes(coinType))
              .map(([coinType, coinMetadata]) => {
                const reserve: ParsedReserve | undefined =
                  appDataMainMarket.reserveMap[coinType];
                let price: BigNumber | undefined = (
                  reserve?.price ??
                  appDataMainMarket.rewardPriceMap[coinType] ??
                  new BigNumber(0)
                ).times(
                  isLst(coinType)
                    ? allAppData.lstMap[coinType].lstToSuiExchangeRate // Take into account the LST to SUI exchange rate
                    : 1,
                );
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
          ]}
          noAssetsMessage="No assets"
          noLendingMarketHeader
        />
      </CardContent>
    </Card>
  );
}
