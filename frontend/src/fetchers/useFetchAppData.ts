import { useRef } from "react";

import { CoinBalance, SuiClient } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import BigNumber from "bignumber.js";
import { toast } from "sonner";
import useSWR from "swr";

import {
  COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP,
  LIQUID_STAKING_INFO_MAP,
  NORMALIZED_LST_COINTYPES,
  RESERVES_CUSTOM_ORDER,
  isSendPoints,
} from "@suilend/frontend-sui";
import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import { WAD } from "@suilend/sdk/constants";
import { parseLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { parseObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { toHexString } from "@suilend/sdk/utils";
import * as simulate from "@suilend/sdk/utils/simulate";
import { LstClient } from "@suilend/springsui-sdk";

import { AppContext, AppData } from "@/contexts/AppContext";
import { ParsedCoinBalance, parseCoinBalances } from "@/lib/coinBalance";
import { getCoinMetadataMap } from "@/lib/coinMetadata";
import { formatRewards } from "@/lib/liquidityMining";

export default function useFetchAppData(
  suiClient: SuiClient,
  address: string | undefined,
) {
  // Suilend client
  const suilendClientRef = useRef<AppContext["suilendClient"]>(null);

  // Data
  const dataFetcher = async () => {
    const now = Math.floor(Date.now() / 1000);
    const rawLendingMarket = await LendingMarket.fetch(
      suiClient,
      phantom(LENDING_MARKET_TYPE),
      LENDING_MARKET_ID,
    );

    if (!suilendClientRef.current) {
      suilendClientRef.current =
        await SuilendClient.initializeWithLendingMarket(
          rawLendingMarket,
          suiClient,
        );
    } else suilendClientRef.current.lendingMarket = rawLendingMarket;

    const refreshedRawReserves = await simulate.refreshReservePrice(
      rawLendingMarket.reserves.map((r) =>
        simulate.compoundReserveInterest(r, now),
      ),
      new SuiPriceServiceConnection("https://hermes.pyth.network"),
    );

    const fakePriceIdentifierReserves = refreshedRawReserves.filter(
      (r) =>
        `0x${toHexString(r.priceIdentifier.bytes)}` !==
        COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP[normalizeStructTag(r.coinType.name)]
          ?.priceIdentifier,
    );
    for (const fakePriceIdentifierReserve of fakePriceIdentifierReserves) {
      let price = 0.01;

      try {
        const url = `https://public-api.birdeye.so/defi/price?address=${normalizeStructTag(fakePriceIdentifierReserve.coinType.name)}`;
        const res = await fetch(url, {
          headers: {
            "X-API-KEY": process.env.NEXT_PUBLIC_BIRDEYE_API_KEY as string,
            "x-chain": "sui",
          },
        });
        const json = await res.json();
        price = json.data.value;
      } catch (err) {
        console.error(err);
      }

      (fakePriceIdentifierReserve.price.value as bigint) = BigInt(
        +new BigNumber(price).times(WAD).integerValue(BigNumber.ROUND_DOWN),
      );
      (fakePriceIdentifierReserve.smoothedPrice.value as bigint) = BigInt(
        +new BigNumber(price).times(WAD).integerValue(BigNumber.ROUND_DOWN),
      );
    }

    const coinTypes: string[] = [];
    const rewardCoinTypes: string[] = [];
    refreshedRawReserves.forEach((r) => {
      coinTypes.push(normalizeStructTag(r.coinType.name));

      [
        ...r.depositsPoolRewardManager.poolRewards,
        ...r.borrowsPoolRewardManager.poolRewards,
      ].forEach((pr) => {
        if (!pr) return;

        const coinType = normalizeStructTag(pr.coinType.name);
        coinTypes.push(coinType);
        rewardCoinTypes.push(coinType);
      });
    });
    const uniqueCoinTypes = Array.from(new Set(coinTypes));
    const uniqueRewardCoinTypes = Array.from(new Set(rewardCoinTypes));

    const coinMetadataMap = await getCoinMetadataMap(
      suiClient,
      uniqueCoinTypes,
    );

    const lendingMarket = parseLendingMarket(
      rawLendingMarket,
      refreshedRawReserves,
      coinMetadataMap,
      now,
    );
    lendingMarket.reserves = lendingMarket.reserves.slice().sort((a, b) => {
      const aCustomOrderIndex = RESERVES_CUSTOM_ORDER.indexOf(a.coinType);
      const bCustomOrderIndex = RESERVES_CUSTOM_ORDER.indexOf(b.coinType);

      if (aCustomOrderIndex > -1 && bCustomOrderIndex > -1)
        return aCustomOrderIndex - bCustomOrderIndex;
      else if (aCustomOrderIndex === -1 && bCustomOrderIndex === -1) return 0;
      else return aCustomOrderIndex > -1 ? -1 : 1;
    });

    const reserveMap = lendingMarket.reserves.reduce(
      (acc, reserve) => ({ ...acc, [reserve.coinType]: reserve }),
      {},
    ) as Record<string, ParsedReserve>;

    let lendingMarketOwnerCapId, obligationOwnerCaps, obligations;
    let coinBalancesRaw: CoinBalance[] = [];
    let coinBalancesMap: Record<string, ParsedCoinBalance> = {};

    if (address) {
      lendingMarketOwnerCapId = await SuilendClient.getLendingMarketOwnerCapId(
        address,
        rawLendingMarket.$typeArgs,
        suiClient,
      );

      obligationOwnerCaps = await SuilendClient.getObligationOwnerCaps(
        address,
        rawLendingMarket.$typeArgs,
        suiClient,
      );

      if (obligationOwnerCaps.length > 0) {
        if (obligationOwnerCaps.length > 1) {
          const obligationOwnerCapTimestampsMs = (
            await Promise.all(
              obligationOwnerCaps.map((ownerCap) =>
                suiClient.queryTransactionBlocks({
                  limit: 1,
                  order: "ascending",
                  filter: { ChangedObject: ownerCap.id },
                  options: { showRawInput: true },
                }),
              ),
            )
          ).map((res) =>
            res?.data?.[0]?.timestampMs
              ? +(res.data[0].timestampMs as string)
              : 0,
          );

          obligationOwnerCaps = obligationOwnerCaps
            .map((ownerCap, index) => ({
              ...ownerCap,
              timestampMs: obligationOwnerCapTimestampsMs[index],
            }))
            .slice()
            .sort((a, b) => a.timestampMs - b.timestampMs);
        }

        const rawObligations = await Promise.all(
          obligationOwnerCaps.map((ownerCap) =>
            SuilendClient.getObligation(
              ownerCap.obligationId,
              rawLendingMarket.$typeArgs,
              suiClient,
            ),
          ),
        );

        obligations = rawObligations
          .map((rawObligation) =>
            simulate.refreshObligation(rawObligation, refreshedRawReserves),
          )
          .map((refreshedObligation) =>
            parseObligation(refreshedObligation, reserveMap),
          );
      }

      // Wallet assets
      coinBalancesRaw = (
        await suiClient.getAllBalances({
          owner: address,
        })
      )
        .map((cb) => ({ ...cb, coinType: normalizeStructTag(cb.coinType) }))
        .sort((a, b) => (a.coinType < b.coinType ? -1 : 1));

      const reserveCoinTypes = lendingMarket.reserves.map(
        (reserve) => reserve.coinType,
      );
      const uniqueReserveCoinTypes = Array.from(new Set(reserveCoinTypes));

      coinBalancesMap = parseCoinBalances(
        coinBalancesRaw,
        uniqueReserveCoinTypes,
        reserveMap,
      );
    }

    // Rewards
    const rewardsBirdeyePriceMap: Record<string, BigNumber | undefined> = {};

    const rewardsWithoutReserves = uniqueRewardCoinTypes.filter(
      (coinType) => !isSendPoints(coinType) && !reserveMap[coinType],
    );
    const rewardsBirdeyePrices = await Promise.all(
      rewardsWithoutReserves.map(async (coinType) => {
        try {
          const url = `https://public-api.birdeye.so/defi/price?address=${coinType}`;
          const res = await fetch(url, {
            headers: {
              "X-API-KEY": process.env.NEXT_PUBLIC_BIRDEYE_API_KEY as string,
              "x-chain": "sui",
            },
          });
          const json = await res.json();
          return new BigNumber(json.data.value);
        } catch (err) {
          console.error(err);
        }
      }),
    );
    for (let i = 0; i < rewardsWithoutReserves.length; i++) {
      rewardsBirdeyePriceMap[rewardsWithoutReserves[i]] =
        rewardsBirdeyePrices[i];
    }

    const rewardMap = formatRewards(
      reserveMap,
      coinMetadataMap,
      rewardsBirdeyePriceMap,
      obligations,
    );

    // LSTs
    const lstAprPercentMap: Record<string, BigNumber> = {};
    for (const lstCoinType of NORMALIZED_LST_COINTYPES) {
      const reserve = reserveMap[lstCoinType];
      if (!reserve) continue;

      const LIQUID_STAKING_INFO = Object.values(LIQUID_STAKING_INFO_MAP).find(
        (info) => info.type === lstCoinType,
      );
      if (!LIQUID_STAKING_INFO) continue;

      const lstClient = await LstClient.initialize(
        suiClient,
        LIQUID_STAKING_INFO,
      );
      const apr = await lstClient.getSpringSuiApy(); // TODO: Use APR
      const aprPercent = new BigNumber(apr).times(100);

      lstAprPercentMap[lstCoinType] = aprPercent;
    }

    return {
      lendingMarket,
      lendingMarketOwnerCapId: lendingMarketOwnerCapId ?? undefined,
      reserveMap,
      obligationOwnerCaps,
      obligations,
      coinBalancesMap,
      coinMetadataMap,
      rewardMap,
      coinBalancesRaw,

      lstAprPercentMap,
    } as AppData;
  };

  const { data, mutate } = useSWR<AppContext["data"]>(
    `appData-${address}`,
    dataFetcher,
    {
      refreshInterval: 30 * 1000,
      onSuccess: (data) => {
        console.log("Refreshed app data", data);
      },
      onError: (err) => {
        toast.error(
          "Failed to refresh app data. Please check your internet connection or change RPC providers in Settings.",
          {
            description: (err as Error)?.message || "An unknown error occured",
          },
        );
        console.error(err);
      },
    },
  );

  return {
    data,
    mutate,
    suilendClient: suilendClientRef.current,
  };
}
