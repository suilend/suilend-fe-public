import BigNumber from "bignumber.js";
import useSWR, { useSWRConfig } from "swr";

import {
  ParsedReserve,
  Side,
  initializeSuilend,
  initializeSuilendRewards,
} from "@suilend/sdk";
import { LENDING_MARKETS, SuilendClient } from "@suilend/sdk/client";
import { API_URL, issSui } from "@suilend/sui-fe";
import { showErrorToast, useSettingsContext } from "@suilend/sui-fe-next";

import { AllAppData } from "@/contexts/AppContext";

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();

  const { cache } = useSWRConfig();

  // Data
  const dataFetcher = async () => {
    const [
      allLendingMarketData,
      lstAprPercentMap,
      obligationsWithUnclaimedRewards,
    ] = await Promise.all([
      // Lending markets
      (async () => {
        const allLendingMarketData: AllAppData["allLendingMarketData"] =
          Object.fromEntries(
            await Promise.all(
              LENDING_MARKETS.map((LENDING_MARKET) =>
                (async () => {
                  const suilendClient = await SuilendClient.initialize(
                    LENDING_MARKET.id,
                    LENDING_MARKET.type,
                    suiClient,
                    true,
                  );

                  const {
                    lendingMarket,
                    coinMetadataMap,

                    refreshedRawReserves,
                    reserveMap,
                    reserveCoinTypes,
                    reserveCoinMetadataMap,

                    rewardCoinTypes,
                    activeRewardCoinTypes,
                    rewardCoinMetadataMap,
                  } = await initializeSuilend(suiClient, suilendClient);

                  const { rewardPriceMap } = await initializeSuilendRewards(
                    reserveMap,
                    activeRewardCoinTypes,
                  );

                  return [
                    LENDING_MARKET.id,
                    {
                      suilendClient,

                      lendingMarket,
                      coinMetadataMap,

                      refreshedRawReserves,
                      reserveMap,
                      reserveCoinTypes,
                      reserveCoinMetadataMap,

                      rewardPriceMap,
                      rewardCoinTypes,
                      activeRewardCoinTypes,
                      rewardCoinMetadataMap,
                    },
                  ];
                })(),
              ),
            ),
          );

        return allLendingMarketData;
      })(),

      // LSTs (won't throw on error)
      (async () => {
        try {
          const res = await fetch(`${API_URL}/springsui/apy`);
          const json: Record<string, string> = await res.json();
          if ((res as any)?.statusCode === 500)
            throw new Error("Failed to fetch SpringSui LST APRs");

          return Object.fromEntries(
            Object.entries(json).map(([coinType, aprPercent]) => [
              coinType,
              new BigNumber(aprPercent),
            ]),
          );
        } catch (err) {
          console.error(err);
          return {} as AllAppData["lstAprPercentMap"];
        }
      })(),

      // Obligations with unclaimed rewards (won't throw on error)
      (async () => {
        try {
          const res = await fetch(
            `${API_URL}/obligations/unclaimed-rewards?limit=3`,
          );
          const json: {
            obligations: {
              id: string;
              unclaimedRewards: {
                rewardReserveArrayIndex: string;
                rewardIndex: string;
                rewardCoinType: string;
                side: Side;
                depositReserveArrayIndex: string;
              }[];
            }[];
          } = await res.json();

          return json.obligations.map((o) => ({
            ...o,
            unclaimedRewards: o.unclaimedRewards.map((r) => ({
              rewardReserveArrayIndex: BigInt(r.rewardReserveArrayIndex),
              rewardIndex: BigInt(r.rewardIndex),
              rewardCoinType: r.rewardCoinType,
              side: r.side,
              depositReserveArrayIndex: BigInt(r.depositReserveArrayIndex),
            })),
          }));
        } catch (err) {
          console.error(err);
          return {} as AllAppData["obligationsWithUnclaimedRewards"];
        }
      })(),
    ]);

    const isEcosystemLst = (coinType: string) =>
      Object.keys(lstAprPercentMap).includes(coinType) && !issSui(coinType);

    // Sort ecosystem LSTs by TVL (descending)
    for (const lendingMarket of Object.values(allLendingMarketData)) {
      // Sort
      const ecosystemLstReserves = lendingMarket.lendingMarket.reserves.filter(
        (r) => isEcosystemLst(r.coinType),
      );
      const sortedEcosystemLstReserves = ecosystemLstReserves
        .slice()
        .sort((a, b) => +b.depositedAmountUsd - +a.depositedAmountUsd);

      // Update
      const nonEcosystemLstReserves =
        lendingMarket.lendingMarket.reserves.filter(
          (r) => !isEcosystemLst(r.coinType),
        );
      const index = nonEcosystemLstReserves.findIndex((r) =>
        issSui(r.coinType),
      );

      lendingMarket.lendingMarket.reserves = [
        ...nonEcosystemLstReserves.slice(0, index + 1),
        ...sortedEcosystemLstReserves,
        ...nonEcosystemLstReserves.slice(index + 1),
      ];

      lendingMarket.reserveMap = lendingMarket.lendingMarket.reserves.reduce(
        (acc, reserve) => ({ ...acc, [reserve.coinType]: reserve }),
        {},
      ) as Record<string, ParsedReserve>;
    }

    return {
      allLendingMarketData,
      lstAprPercentMap,
      obligationsWithUnclaimedRewards,
    };
  };

  const { data, mutate } = useSWR<AllAppData>("appData", dataFetcher, {
    refreshInterval: 30 * 1000,
    onSuccess: (data) => {
      console.log("Fetched app data", data);
    },
    onError: (err, key) => {
      const isInitialLoad = cache.get(key)?.data === undefined;
      if (isInitialLoad) showErrorToast("Failed to fetch app data", err);

      console.error(err);
    },
  });

  return { data, mutateData: mutate };
}
