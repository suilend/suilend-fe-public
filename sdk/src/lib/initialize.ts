import { CoinMetadata, SuiClient } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import BigNumber from "bignumber.js";

import {
  NORMALIZED_ALKIMI_COINTYPE,
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_BLUE_COINTYPE,
  NORMALIZED_BUCK_COINTYPE,
  NORMALIZED_DEEP_COINTYPE,
  NORMALIZED_DMC_COINTYPE,
  NORMALIZED_FUD_COINTYPE,
  NORMALIZED_HAEDAL_COINTYPE,
  NORMALIZED_HIPPO_COINTYPE,
  NORMALIZED_IKA_COINTYPE,
  NORMALIZED_KOBAN_COINTYPE,
  NORMALIZED_LBTC_COINTYPE,
  NORMALIZED_NS_COINTYPE,
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
  NORMALIZED_SEND_POINTS_S2_COINTYPE,
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_UP_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_WAL_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_XAUm_COINTYPE,
  NORMALIZED_flSUI_COINTYPE,
  NORMALIZED_fpSUI_COINTYPE,
  NORMALIZED_fudSUI_COINTYPE,
  NORMALIZED_iSUI_COINTYPE,
  NORMALIZED_jugSUI_COINTYPE,
  NORMALIZED_kSUI_COINTYPE,
  NORMALIZED_mSUI_COINTYPE,
  NORMALIZED_mUSD_COINTYPE,
  NORMALIZED_oshiSUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_sdeUSD_COINTYPE,
  NORMALIZED_stratSUI_COINTYPE,
  NORMALIZED_suiETH_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_trevinSUI_COINTYPE,
  NORMALIZED_upSUI_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
  NORMALIZED_xBTC_COINTYPE,
  NORMALIZED_yapSUI_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  getAllOwnedObjects,
  getCoinMetadataMap,
  getPrice,
  isSendPoints,
  isSteammPoints,
} from "@suilend/sui-fe";

import { Reserve } from "../_generated/suilend/reserve/structs";
import { LENDING_MARKET_ID, SuilendClient } from "../client";
import { ParsedReserve, parseLendingMarket, parseObligation } from "../parsers";
import * as simulate from "../utils/simulate";

import { WAD } from "./constants";
import { getWorkingPythEndpoint } from "./pyth";
import {
  STRATEGY_WRAPPER_PACKAGE_ID_V1,
  StrategyType,
} from "./strategyOwnerCap";
import { LendingMarketMetadata, StrategyOwnerCap } from "./types";

export const RESERVES_CUSTOM_ORDER: Record<string, string[]> = {
  [LENDING_MARKET_ID]: [
    // MAIN ASSETS
    NORMALIZED_sSUI_COINTYPE,

    // MAIN ASSETS - Ecosystem LSTs
    NORMALIZED_mSUI_COINTYPE,
    NORMALIZED_fudSUI_COINTYPE,
    NORMALIZED_kSUI_COINTYPE,
    NORMALIZED_trevinSUI_COINTYPE,
    NORMALIZED_upSUI_COINTYPE,
    NORMALIZED_yapSUI_COINTYPE,
    NORMALIZED_iSUI_COINTYPE,
    NORMALIZED_flSUI_COINTYPE,
    NORMALIZED_oshiSUI_COINTYPE,
    NORMALIZED_jugSUI_COINTYPE,
    NORMALIZED_stratSUI_COINTYPE,
    NORMALIZED_fpSUI_COINTYPE,

    NORMALIZED_SUI_COINTYPE,
    NORMALIZED_USDC_COINTYPE,
    NORMALIZED_wUSDC_COINTYPE,
    NORMALIZED_suiUSDT_COINTYPE,
    NORMALIZED_wUSDT_COINTYPE,
    NORMALIZED_AUSD_COINTYPE,
    NORMALIZED_LBTC_COINTYPE,
    NORMALIZED_wBTC_COINTYPE,
    NORMALIZED_xBTC_COINTYPE,
    NORMALIZED_suiETH_COINTYPE,
    NORMALIZED_WETH_COINTYPE,
    NORMALIZED_SOL_COINTYPE,
    NORMALIZED_DEEP_COINTYPE,
    NORMALIZED_WAL_COINTYPE,

    // ISOLATED ASSETS
    NORMALIZED_SEND_COINTYPE,
    NORMALIZED_IKA_COINTYPE,
    NORMALIZED_HAEDAL_COINTYPE,
    NORMALIZED_BLUE_COINTYPE,
    NORMALIZED_NS_COINTYPE,
    NORMALIZED_UP_COINTYPE,
    NORMALIZED_DMC_COINTYPE,
    NORMALIZED_ALKIMI_COINTYPE,
    NORMALIZED_KOBAN_COINTYPE,

    NORMALIZED_mUSD_COINTYPE,
    NORMALIZED_BUCK_COINTYPE,

    NORMALIZED_HIPPO_COINTYPE,
    NORMALIZED_FUD_COINTYPE,
  ],
  "0x8a8d8e138a28de1c637d0b0955e621b017da7010de388db5a18493eca99c5e82": [
    NORMALIZED_XAUm_COINTYPE,
    NORMALIZED_USDC_COINTYPE,
  ],
  "0xc1549fd5db74c3aad37a260c9fd251d93d6f2f3ccfacc277398a57718c275a17": [
    NORMALIZED_SEND_COINTYPE,
    NORMALIZED_USDC_COINTYPE,
  ],
  "0x0d3a7f758d19d11e8526f66cca43403a99da16862c570c43efe0f8c4a500f7f2": [
    NORMALIZED_sdeUSD_COINTYPE,
    NORMALIZED_USDC_COINTYPE,
  ],
};

const MAYA_COINTYPE =
  "0x3bf0aeb7b9698b18ec7937290a5701088fcd5d43ad11a2564b074d022a6d71ec::maya::MAYA";
const mPOINTS_COINTYPE =
  "0x7bae0b3b7b6c3da899fe3f4af95b7110633499c02b8c6945110d799d99deaa68::mpoints::MPOINTS";
const TREATS_COINTYPE =
  "0x0dadb7fa2771c2952f96161fc1f0c105d1f22d53926b9ff2498a8eea2f6eb204::treats::TREATS";

export const NORMALIZED_MAYA_COINTYPE = normalizeStructTag(MAYA_COINTYPE);
export const NORMALIZED_mPOINTS_COINTYPE = normalizeStructTag(mPOINTS_COINTYPE);
export const NORMALIZED_TREATS_COINTYPE = normalizeStructTag(TREATS_COINTYPE);

export const initializeSuilend = async (
  suiClient: SuiClient,
  suilendClient: SuilendClient,
  lendingMarketMetadata?: LendingMarketMetadata,
  fallbackPythEndpoint?: string,
) => {
  const nowMs = Date.now();
  const nowS = Math.floor(nowMs / 1000);

  const interestCompoundedRawReserves =
    suilendClient.lendingMarket.reserves.map((r) =>
      simulate.compoundReserveInterest(r, nowS),
    );

  // Split the reserves into two arrays
  const reservesWithoutTemporaryPythPriceFeeds = [];
  const reservesWithTemporaryPythPriceFeeds = [];
  for (const reserve of interestCompoundedRawReserves) {
    if (
      TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(
        normalizeStructTag(reserve.coinType.name),
      )
    ) {
      reservesWithTemporaryPythPriceFeeds.push(reserve);
    } else {
      reservesWithoutTemporaryPythPriceFeeds.push(reserve);
    }
  }

  // Get a working Pyth endpoint (try primary, fallback to fallbackPythEndpoint if provided)
  const pythEndpoint = await getWorkingPythEndpoint(fallbackPythEndpoint);
  const pythConnection = new SuiPriceServiceConnection(pythEndpoint, {
    timeout: 30 * 1000,
  });

  const [refreshedReservesWithoutTemporaryPythPriceFeeds] = await Promise.all([
    simulate.refreshReservePrice(
      reservesWithoutTemporaryPythPriceFeeds,
      pythConnection,
    ),
    Promise.all(
      reservesWithTemporaryPythPriceFeeds.map((reserve) =>
        (async () => {
          let cachedUsdPrice;
          try {
            cachedUsdPrice = await getPrice(
              normalizeStructTag(reserve.coinType.name),
            );
          } catch (err) {
            console.error(err);
          }
          if (cachedUsdPrice === undefined) cachedUsdPrice = 0.0001; // Non-zero price override if no price

          const parsedCachedUsdPrice = BigInt(
            +new BigNumber(cachedUsdPrice)
              .times(WAD)
              .integerValue(BigNumber.ROUND_DOWN),
          );
          (reserve.price.value as bigint) = parsedCachedUsdPrice;
          (reserve.smoothedPrice.value as bigint) = parsedCachedUsdPrice;
        })(),
      ),
    ),
  ]);

  // Recombine reserves back into a single array
  const refreshedRawReserves = [
    ...refreshedReservesWithoutTemporaryPythPriceFeeds,
    ...reservesWithTemporaryPythPriceFeeds,
  ];

  const miscCoinTypes: string[] = [
    NORMALIZED_SEND_POINTS_S1_COINTYPE,
    NORMALIZED_SEND_POINTS_S2_COINTYPE,
    NORMALIZED_SEND_COINTYPE,
  ];
  const reserveCoinTypes: string[] = [];
  const rewardCoinTypes: string[] = [];
  const activeRewardCoinTypes: string[] = [];
  refreshedRawReserves.forEach((r) => {
    reserveCoinTypes.push(normalizeStructTag(r.coinType.name));

    [
      ...r.depositsPoolRewardManager.poolRewards,
      ...r.borrowsPoolRewardManager.poolRewards,
    ].forEach((pr) => {
      if (!pr) return;

      const isActive =
        nowMs >= Number(pr.startTimeMs) && nowMs < Number(pr.endTimeMs);

      rewardCoinTypes.push(normalizeStructTag(pr.coinType.name));
      if (isActive)
        activeRewardCoinTypes.push(normalizeStructTag(pr.coinType.name));
    });
  });

  const uniqueMiscCoinTypes = Array.from(new Set(miscCoinTypes));
  const uniqueReserveCoinTypes = Array.from(new Set(reserveCoinTypes));
  const uniqueRewardCoinTypes = Array.from(new Set(rewardCoinTypes));
  const uniqueActiveRewardsCoinTypes = Array.from(
    new Set(activeRewardCoinTypes),
  );

  const [miscCoinMetadataMap, reserveCoinMetadataMap, rewardCoinMetadataMap] =
    await Promise.all([
      getCoinMetadataMap(uniqueMiscCoinTypes),
      getCoinMetadataMap(uniqueReserveCoinTypes),
      getCoinMetadataMap(uniqueRewardCoinTypes),
    ]);
  const coinMetadataMap: Record<string, CoinMetadata> = {
    ...miscCoinMetadataMap,
    ...reserveCoinMetadataMap,
    ...rewardCoinMetadataMap,
  };

  // const walReserve = refreshedRawReserves.find(
  //   (r) => normalizeStructTag(r.coinType.name) === NORMALIZED_WAL_COINTYPE,
  // );
  // if (walReserve) {
  //   const walPrice = BigInt(
  //     +new BigNumber(0.35).times(WAD).integerValue(BigNumber.ROUND_DOWN),
  //   );
  //   (walReserve.price.value as bigint) = walPrice;
  //   (walReserve.smoothedPrice.value as bigint) = walPrice;
  // }

  const lendingMarket = parseLendingMarket(
    suilendClient.lendingMarket,
    refreshedRawReserves,
    coinMetadataMap,
    nowS,
    lendingMarketMetadata,
  );
  if (!!RESERVES_CUSTOM_ORDER[lendingMarket.id]) {
    lendingMarket.reserves = lendingMarket.reserves.slice().sort((a, b) => {
      const aCustomOrderIndex = RESERVES_CUSTOM_ORDER[lendingMarket.id].indexOf(
        a.coinType,
      );
      const bCustomOrderIndex = RESERVES_CUSTOM_ORDER[lendingMarket.id].indexOf(
        b.coinType,
      );

      if (aCustomOrderIndex > -1 && bCustomOrderIndex > -1)
        return aCustomOrderIndex - bCustomOrderIndex;
      else if (aCustomOrderIndex === -1 && bCustomOrderIndex === -1) return 0;
      else return aCustomOrderIndex > -1 ? -1 : 1;
    });
  }

  const reserveMap = lendingMarket.reserves.reduce(
    (acc, reserve) => ({ ...acc, [reserve.coinType]: reserve }),
    {},
  ) as Record<string, ParsedReserve>;

  return {
    lendingMarket,
    coinMetadataMap,

    refreshedRawReserves,
    reserveMap,
    reserveCoinTypes: uniqueReserveCoinTypes,
    reserveCoinMetadataMap,

    rewardCoinTypes: uniqueRewardCoinTypes,
    activeRewardCoinTypes: uniqueActiveRewardsCoinTypes,
    rewardCoinMetadataMap,
  };
};

export const initializeSuilendRewards = async (
  reserveMap: Record<string, ParsedReserve>,
  activeRewardCoinTypes: string[],
) => {
  const rewardPriceMap: Record<string, BigNumber | undefined> = Object.entries(
    reserveMap,
  ).reduce(
    (acc, [coinType, reserve]) => ({ ...acc, [coinType]: reserve.price }),
    {},
  );
  rewardPriceMap[NORMALIZED_TREATS_COINTYPE] = new BigNumber(0.1);

  const reservelessActiveRewardCoinTypes = activeRewardCoinTypes.filter(
    (coinType) =>
      !(
        isSendPoints(coinType) ||
        isSteammPoints(coinType) ||
        coinType === NORMALIZED_MAYA_COINTYPE ||
        coinType === NORMALIZED_mPOINTS_COINTYPE
      ) && !rewardPriceMap[coinType],
  );
  const reservelessActiveRewardCachedUsdPrices = await Promise.all(
    reservelessActiveRewardCoinTypes.map((coinType) => getPrice(coinType)),
  );
  for (let i = 0; i < reservelessActiveRewardCoinTypes.length; i++) {
    const cachedUsdPrice = reservelessActiveRewardCachedUsdPrices[i];
    if (cachedUsdPrice === undefined) continue;

    rewardPriceMap[reservelessActiveRewardCoinTypes[i]] = new BigNumber(
      cachedUsdPrice,
    );
  }

  return { rewardPriceMap };
};

export const initializeObligations = async (
  suiClient: SuiClient,
  suilendClient: SuilendClient,
  refreshedRawReserves: Reserve<string>[],
  reserveMap: Record<string, ParsedReserve>,
  address?: string,
) => {
  if (!address)
    return {
      strategyOwnerCaps: [],
      strategyObligations: [],

      obligationOwnerCaps: [],
      obligations: [],
    };

  const [strategyOwnerCaps, obligationOwnerCaps] = await Promise.all([
    (async () => {
      if (suilendClient.lendingMarket.id !== LENDING_MARKET_ID) return []; // Only main lending market has strategy owner caps

      const objects = await getAllOwnedObjects(suiClient, address, {
        StructType: `${STRATEGY_WRAPPER_PACKAGE_ID_V1}::strategy_wrapper::StrategyOwnerCap<${suilendClient.lendingMarket.$typeArgs[0]}>`,
      });

      return objects.map((obj) => {
        const fields = (obj.data?.content as any).fields;

        const id = fields.id.id;
        const strategyType = fields.strategy_type;
        const obligationOwnerCapId = fields.inner_cap.fields.id.id;
        const obligationId = fields.inner_cap.fields.obligation_id;

        const result: StrategyOwnerCap = {
          id,
          strategyType: `${strategyType}` as StrategyType,
          obligationOwnerCapId,
          obligationId,
        };
        return result;
      });
    })(),
    SuilendClient.getObligationOwnerCaps(
      address,
      suilendClient.lendingMarket.$typeArgs,
      suiClient,
    ),
  ]);

  const obligations = (
    await Promise.all(
      [
        ...strategyOwnerCaps.map((soc) => soc.obligationId),
        ...obligationOwnerCaps.map((ownerCap) => ownerCap.obligationId),
      ].map((obligationId) =>
        SuilendClient.getObligation(
          obligationId,
          suilendClient.lendingMarket.$typeArgs,
          suiClient,
        ),
      ),
    )
  )
    .map((rawObligation) =>
      simulate.refreshObligation(rawObligation, refreshedRawReserves),
    )
    .map((refreshedObligation) =>
      parseObligation(
        refreshedObligation,
        reserveMap,
        strategyOwnerCaps.some(
          (soc) => soc.obligationId === refreshedObligation.id,
        ),
      ),
    )
    .sort((a, b) => +b.netValueUsd.minus(a.netValueUsd));

  // Divide into strategy and non-strategy
  const strategyObligations = obligations.filter((o) =>
    strategyOwnerCaps.some((soc) => soc.obligationId === o.id),
  );
  const nonStrategyObligations = obligations.filter(
    (o) => !strategyObligations.some((so) => so.id === o.id),
  );

  return {
    strategyOwnerCaps,
    strategyObligations,

    obligationOwnerCaps,
    obligations: nonStrategyObligations,
  };
};
