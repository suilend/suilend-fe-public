import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import useSWR, { useSWRConfig } from "swr";

import {
  LST_DECIMALS,
  LendingMarketMetadata,
  ParsedReserve,
  RESERVES_CUSTOM_ORDER,
  initializeSuilend,
  initializeSuilendRewards,
} from "@suilend/sdk";
import {
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
import { FALLBACK_PYTH_ENDPOINT } from "@/lib/pyth";

export default function useFetchAppData() {
  const { suiClient } = useSettingsContext();

  const { cache } = useSWRConfig();

  // Data
  const dataFetcher = async () => {
    // Get lending markets metadata (non-hidden)
    const lendingMarketsMetadataRes = await fetch(
      `${API_URL}/markets?includeHidden=true`,
    );
    const lendingMarketsMetadataJson: LendingMarketMetadata[] =
      await lendingMarketsMetadataRes.json();

    const NON_HIDDEN_LENDING_MARKET_METADATA_MAP: Record<
      string,
      LendingMarketMetadata
    > = Object.fromEntries(
      lendingMarketsMetadataJson.map((lendingMarket) => [
        lendingMarket.id,
        {
          id: lendingMarket.id,
          type: lendingMarket.type,
          lendingMarketOwnerCapId: lendingMarket.lendingMarketOwnerCapId,
          name: lendingMarket.name,
          isHidden:
            lendingMarket.id ===
            "0xd12df5fede59f1ac5e1f8413bc86bd6bc77fff2001366878df58ef6a26d58c67"
              ? !(Date.now() > 1765972800000) // 2025-12-17 12:00:00 UTC
              : lendingMarket.isHidden,
        },
      ]),
    );
    const HIDDEN_LENDING_MARKET_METADATA_MAP: Record<
      string,
      LendingMarketMetadata
    > = {
      [STEAMM_LM_LENDING_MARKET_ID]: {
        id: STEAMM_LM_LENDING_MARKET_ID,
        type: STEAMM_LM_LENDING_MARKET_TYPE,
        lendingMarketOwnerCapId:
          "0x55a0f33b24e091830302726c8cfbff8cf8abd2ec1f83a4e6f4bf51c7ba3ad5ab",

        name: "STEAMM LM",
        isHidden: true,
      },
    };

    const LENDING_MARKET_METADATA_MAP = Object.fromEntries(
      Object.entries({
        ...NON_HIDDEN_LENDING_MARKET_METADATA_MAP,
        ...HIDDEN_LENDING_MARKET_METADATA_MAP,
      }).sort((a, b) => {
        const aIndex = Object.keys(RESERVES_CUSTOM_ORDER).indexOf(a[0]);
        const bIndex = Object.keys(RESERVES_CUSTOM_ORDER).indexOf(b[0]);

        // Both have custom order - sort by index
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        // Only a has custom order - a comes first
        if (aIndex > -1) return -1;
        // Only b has custom order - b comes first
        if (bIndex > -1) return 1;
        // Neither has custom order - keep original order
        return 0;
      }),
    );

    const [
      allLendingMarketData,
      lstStatsMap,
      // okxAprPercentMap,
      elixirSdeUsdAprPercent,
    ] = await Promise.all([
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
                      FALLBACK_PYTH_ENDPOINT,
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
          return {};
        }
      })(),

      // OKX APR (won't throw on error)
      // (async () => {
      //   try {
      //     const url = `${API_URL}/okx/apy?${new URLSearchParams({ raw: "true" })}`;
      //     const res = await fetch(url);
      //     const json: {
      //       data: {
      //         xbtc: { apy: number; baseApy: number; bonusApy: number };
      //         usdc: { apy: number; baseApy: number; bonusApy: number };
      //       };
      //     } = await res.json();

      //     return {
      //       xBtcDepositAprPercent: new BigNumber(
      //         Math.log(1 + json.data.xbtc.bonusApy),
      //       ).times(100),
      //       usdcBorrowAprPercent: new BigNumber(
      //         Math.log(1 + json.data.usdc.bonusApy),
      //       ).times(100),
      //     };
      //   } catch (err) {
      //     console.error(err);
      //     return undefined;
      //   }
      // })(),

      // Elixir sdeUSD APR (won't throw on error)
      (async () => {
        return undefined; // Deprecated
        // try {
        //   const url = `${API_URL}/elixir/apy`;
        //   const res = await fetch(url);
        //   const json: {
        //     data: {
        //       apy: number;
        //     };
        //   } = await res.json();

        //   return new BigNumber(json.data.apy);
        // } catch (err) {
        //   console.error(err);
        //   return undefined;
        // }
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
      LENDING_MARKET_METADATA_MAP,
      allLendingMarketData,
      lstStatsMap,
      elixirSdeUsdAprPercent,
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
