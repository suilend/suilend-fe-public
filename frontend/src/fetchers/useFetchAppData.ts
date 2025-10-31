import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import useSWR, { useSWRConfig } from "swr";

import {
  LST_DECIMALS,
  LendingMarketMetadata,
  ParsedReserve,
  initializeSuilend,
  initializeSuilendRewards,
} from "@suilend/sdk";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  STEAMM_LM_LENDING_MARKET_ID,
  STEAMM_LM_LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import { LiquidStakingObjectInfo } from "@suilend/springsui-sdk";
import { LiquidStakingInfo } from "@suilend/springsui-sdk/_generated/liquid_staking/liquid-staking/structs";
import { WeightHook } from "@suilend/springsui-sdk/_generated/liquid_staking/weight/structs";
import { API_URL, issSui } from "@suilend/sui-fe";
import { showErrorToast, useSettingsContext } from "@suilend/sui-fe-next";

import { AllAppData } from "@/contexts/AppContext";

export const LENDING_MARKET_METADATA_MAP: Record<
  string,
  LendingMarketMetadata
> = {
  [LENDING_MARKET_ID]: {
    id: LENDING_MARKET_ID,
    type: LENDING_MARKET_TYPE,
    lendingMarketOwnerCapId:
      "0xf7a4defe0b6566b6a2674a02a0c61c9f99bd012eed21bc741a069eaa82d35927",

    name: "Main Market",
    isHidden: false,
  },
  [STEAMM_LM_LENDING_MARKET_ID]: {
    id: STEAMM_LM_LENDING_MARKET_ID,
    type: STEAMM_LM_LENDING_MARKET_TYPE,
    lendingMarketOwnerCapId:
      "0x55a0f33b24e091830302726c8cfbff8cf8abd2ec1f83a4e6f4bf51c7ba3ad5ab",

    name: "STEAMM LM",
    isHidden: true,
  },
  "0x0d3a7f758d19d11e8526f66cca43403a99da16862c570c43efe0f8c4a500f7f2": {
    id: "0x0d3a7f758d19d11e8526f66cca43403a99da16862c570c43efe0f8c4a500f7f2",
    type: "0x3628b6ea618a6cca71793bab63e88ea69e10d3a99b5c7b3df88ba01f165015d4::elixir::ELIXIR",
    lendingMarketOwnerCapId:
      "0xf93304ac799c327471237353d120411c5f55f1d8245db44a6b5f5fabf8f35a42",

    name: "Elixir Market",
    isHidden: false,
  },
  "0x8a8d8e138a28de1c637d0b0955e621b017da7010de388db5a18493eca99c5e82": {
    id: "0x8a8d8e138a28de1c637d0b0955e621b017da7010de388db5a18493eca99c5e82",
    type: "0xd382f7d6e7596585b3063d5f4607de30a7a81adeb521d6b862b4c57defca746e::Matrixdock_gold::MATRIXDOCK_GOLD",
    lendingMarketOwnerCapId:
      "0xb4940c255a6498eb3db91db94881397004d30659b836568356f279a69f2eca3c",

    name: "Matrixdock Gold Market",
    isHidden: true, // TODO
  },
};

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();

  const { cache } = useSWRConfig();

  // Data
  const dataFetcher = async () => {
    // Get lending markets from registry
    // let lendingMarketMetadataMap: Record<string, LendingMarketMetadata> = {};
    // try {
    //   const lendingMarketsTableObj = await suiClient.getDynamicFields({
    //     parentId:
    //       "0xdc00dfa5ea142a50f6809751ba8dcf84ae5c60ca5f383e51b3438c9f6d72a86e",
    //   });

    //   lendingMarketMetadataMap = Object.fromEntries(
    //     (
    //       await Promise.all(
    //         lendingMarketsTableObj.data.map(async ({ objectId }) => {
    //           const obj = await suiClient.getObject({
    //             id: objectId,
    //             options: { showContent: true },
    //           });

    //           // Lending market
    //           const lendingMarketId: string = (obj.data?.content as any).fields
    //             .value;
    //           if (
    //             [
    //               "0x6d9478307d1cb8417470bec42e38000422b448e9638d6b43b821301179ac8caf", // STEAMM LM (old)
    //               "0x8742d26532a245955630ff230b0d4b14aff575a0f3261efe50f571f84c4e4773", // Test 1
    //               "0x8843ed2e29bd36683c7c99bf7e529fcee124a175388ad4b9886b48f1009e6285", // Test 2
    //               "0x02b4b27b3aa136405c2aaa8e2e08191670f3971d495bfcd2dda17184895c20ad", // Test 3
    //             ].includes(lendingMarketId)
    //           )
    //             return undefined;

    //           const lendingMarketType: string = `0x${
    //             ((obj.data?.content as any).fields.name.fields as any).name
    //           }`;

    //           // LendingMarketOwnerCap id
    //           const firstTx = await suiClient.queryTransactionBlocks({
    //             filter: { ChangedObject: lendingMarketId },
    //             options: {
    //               showObjectChanges: true,
    //             },
    //             limit: 1,
    //             order: "ascending",
    //           });

    //           const lendingMarketOwnerCapId: string = (
    //             firstTx.data[0].objectChanges?.find(
    //               (o) =>
    //                 o.type === "created" &&
    //                 o.objectType.includes(
    //                   `::lending_market::LendingMarketOwnerCap<${lendingMarketType}>`,
    //                 ),
    //             ) as any
    //           ).objectId;

    //           return {
    //             id: lendingMarketId,
    //             type: lendingMarketType,
    //             lendingMarketOwnerCapId,

    //             name:
    //               LENDING_MARKET_METADATA_MAP[lendingMarketId]?.name ??
    //               undefined,
    //             isHidden:
    //               LENDING_MARKET_METADATA_MAP[lendingMarketId]?.isHidden ??
    //               undefined,
    //           };
    //         }),
    //       )
    //     )
    //       .filter((x) => x !== undefined)
    //       .map((x) => [x.id, x]),
    //   );
    //   console.log(
    //     "[useFetchAppData] lendingMarketMetadataMap:",
    //     lendingMarketMetadataMap,
    //   );
    // } catch (err) {
    //   console.error(err);

    //   // Fallback
    //   lendingMarketMetadataMap = LENDING_MARKET_METADATA_MAP;
    // }

    const [allLendingMarketData, lstStatsMap, okxAprPercentMap] =
      await Promise.all([
        // Lending markets
        (async () => {
          const allLendingMarketData: AllAppData["allLendingMarketData"] =
            Object.fromEntries(
              await Promise.all(
                Object.entries(LENDING_MARKET_METADATA_MAP).map(
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
            const url = `${API_URL}/springsui/lst-info`;
            const res = await fetch(url);
            const json: Record<
              string,
              {
                LIQUID_STAKING_INFO: LiquidStakingObjectInfo;
                liquidStakingInfo: LiquidStakingInfo<string>;
                weightHook: WeightHook<string>;
                apy: string;
              }
            > = await res.json();
            if ((res as any)?.statusCode === 500)
              throw new Error("Failed to fetch SpringSui LSTs");

            return Object.fromEntries(
              Object.entries(json).map(
                ([
                  coinType,
                  { LIQUID_STAKING_INFO, liquidStakingInfo, weightHook, apy },
                ]) => {
                  // Staking info
                  const totalSuiSupply = new BigNumber(
                    liquidStakingInfo.storage.totalSuiSupply.toString(),
                  ).div(10 ** SUI_DECIMALS);
                  const totalLstSupply = new BigNumber(
                    liquidStakingInfo.lstTreasuryCap.totalSupply.value.toString(),
                  ).div(10 ** LST_DECIMALS);

                  const lstToSuiExchangeRate = !totalLstSupply.eq(0)
                    ? totalSuiSupply.div(totalLstSupply)
                    : new BigNumber(1);

                  return [
                    coinType,
                    {
                      lstToSuiExchangeRate,
                      aprPercent: new BigNumber(apy),
                    },
                  ];
                },
              ),
            );
          } catch (err) {
            console.error(err);
            return {} as AllAppData["lstStatsMap"];
          }
        })(),

        // OKX APR (won't throw on error)
        (async () => {
          try {
            const url = `${API_URL}/okx/apy?${new URLSearchParams({ raw: "true" })}`;
            const res = await fetch(url);
            const json: {
              data: {
                xbtc: { apy: number; baseApy: number; bonusApy: number };
                // usdc: { apy: number; baseApy: number; bonusApy: number };
              };
            } = await res.json();

            return {
              xBtcDepositAprPercent: new BigNumber(
                Math.log(1 + json.data.xbtc.bonusApy),
              ).times(100),
            };
          } catch (err) {
            console.error(err);
            return {} as AllAppData["okxAprPercentMap"];
          }
        })(),
      ]);

    const isEcosystemLst = (coinType: string) =>
      Object.keys(lstStatsMap).includes(coinType) && !issSui(coinType);

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
      lstStatsMap,
      okxAprPercentMap,
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
