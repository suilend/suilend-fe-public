import BigNumber from "bignumber.js";
import useSWR, { useSWRConfig } from "swr";

import {
  LendingMarketMetadata,
  ParsedReserve,
  initializeSuilend,
  initializeSuilendRewards,
} from "@suilend/sdk";
import {
  LENDING_MARKET_ID,
  STEAMM_LM_LENDING_MARKET_ID,
  SuilendClient,
} from "@suilend/sdk/client";
import { API_URL, issSui } from "@suilend/sui-fe";
import { showErrorToast, useSettingsContext } from "@suilend/sui-fe-next";

import { AllAppData } from "@/contexts/AppContext";

const LENDING_MARKET_METADATA_MAP: Record<
  string,
  Pick<LendingMarketMetadata, "name" | "slug" | "isHidden">
> = {
  [LENDING_MARKET_ID]: {
    name: "Main market",
    slug: "main",
    isHidden: false,
  },
  [STEAMM_LM_LENDING_MARKET_ID]: {
    name: "STEAMM LM",
    slug: "steamm-lm",
    isHidden: true,
  },
};

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();

  const { cache } = useSWRConfig();

  // Data
  const dataFetcher = async () => {
    // Get lending markets from registry
    const lendingMarketsTableObj = await suiClient.getDynamicFields({
      parentId:
        "0xdc00dfa5ea142a50f6809751ba8dcf84ae5c60ca5f383e51b3438c9f6d72a86e",
    });

    const lendingMarketMetadataMap: Record<string, LendingMarketMetadata> =
      Object.fromEntries(
        (
          await Promise.all(
            lendingMarketsTableObj.data.map(async ({ objectId }) => {
              const obj = await suiClient.getObject({
                id: objectId,
                options: { showContent: true },
              });

              // Lending market
              const lendingMarketId: string = (obj.data?.content as any).fields
                .value;
              if (
                [
                  "0x6d9478307d1cb8417470bec42e38000422b448e9638d6b43b821301179ac8caf", // STEAMM LM (old)
                  "0x8742d26532a245955630ff230b0d4b14aff575a0f3261efe50f571f84c4e4773", // Test
                ].includes(lendingMarketId)
              )
                return undefined;

              const lendingMarketType: string = `0x${
                ((obj.data?.content as any).fields.name.fields as any).name
              }`;

              // LendingMarketOwnerCap id
              const firstTx = await suiClient.queryTransactionBlocks({
                filter: { ChangedObject: lendingMarketId },
                options: {
                  showObjectChanges: true,
                },
                limit: 1,
                order: "ascending",
              });

              const lendingMarketOwnerCapId: string = (
                firstTx.data[0].objectChanges?.find(
                  (o) =>
                    o.type === "created" &&
                    o.objectType.includes(
                      `::lending_market::LendingMarketOwnerCap<${lendingMarketType}>`,
                    ),
                ) as any
              ).objectId;

              return {
                id: lendingMarketId,
                type: lendingMarketType,
                lendingMarketOwnerCapId,

                name:
                  LENDING_MARKET_METADATA_MAP[lendingMarketId]?.name ??
                  undefined,
                slug:
                  LENDING_MARKET_METADATA_MAP[lendingMarketId]?.slug ??
                  undefined,
                isHidden:
                  LENDING_MARKET_METADATA_MAP[lendingMarketId]?.isHidden ??
                  undefined,
              };
            }),
          )
        )
          .filter((x) => x !== undefined)
          .map((x) => [x.id, x]),
      );
    console.log(
      "[useFetchAppData] lendingMarketMetadataMap:",
      lendingMarketMetadataMap,
    );

    const [allLendingMarketData, lstAprPercentMap] = await Promise.all([
      // Lending markets

      (async () => {
        const allLendingMarketData: AllAppData["allLendingMarketData"] =
          Object.fromEntries(
            await Promise.all(
              Object.entries(lendingMarketMetadataMap).map(
                ([lendingMarketId, lendingMarketMetadata]) =>
                  (async () => {
                    const suilendClient = await SuilendClient.initialize(
                      lendingMarketId,
                      lendingMarketMetadata.type,
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
                    } = await initializeSuilend(
                      suiClient,
                      suilendClient,
                      lendingMarketMetadata,
                    );

                    const { rewardPriceMap } = await initializeSuilendRewards(
                      reserveMap,
                      activeRewardCoinTypes,
                    );

                    return [
                      lendingMarketId,
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
          const url = `${API_URL}/springsui/apy`;
          const res = await fetch(url);
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
