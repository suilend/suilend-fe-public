import { CoinMetadata, SuiClient } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import BigNumber from "bignumber.js";

import {
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_BLUE_COINTYPE,
  NORMALIZED_BUCK_COINTYPE,
  NORMALIZED_DEEP_COINTYPE,
  NORMALIZED_FUD_COINTYPE,
  NORMALIZED_HIPPO_COINTYPE,
  NORMALIZED_MAYA_COINTYPE,
  NORMALIZED_NS_COINTYPE,
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_TREATS_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_fudSUI_COINTYPE,
  NORMALIZED_kSUI_COINTYPE,
  NORMALIZED_mSUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_suiETH_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_trevinSUI_COINTYPE,
  NORMALIZED_upSUI_COINTYPE,
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  getCoinMetadataMap,
  getPrice,
  isSendPoints,
} from "@suilend/frontend-sui";

import { SuilendClient } from "../client";
import { WAD } from "../constants";
import {
  ParsedObligation,
  ParsedReserve,
  parseLendingMarket,
  parseObligation,
} from "../parsers";
import * as simulate from "../utils/simulate";

import { formatRewards } from "./liquidityMining";

export const RESERVES_CUSTOM_ORDER = [
  // Main assets
  NORMALIZED_sSUI_COINTYPE,

  // Main assets - Ecosystem LSTs
  NORMALIZED_mSUI_COINTYPE,
  NORMALIZED_fudSUI_COINTYPE,
  NORMALIZED_kSUI_COINTYPE,
  NORMALIZED_trevinSUI_COINTYPE,
  NORMALIZED_upSUI_COINTYPE,

  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_suiETH_COINTYPE,
  NORMALIZED_SOL_COINTYPE,

  // Isolated assets
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_DEEP_COINTYPE,
  NORMALIZED_BLUE_COINTYPE, // Not listed
  NORMALIZED_NS_COINTYPE,
  NORMALIZED_BUCK_COINTYPE,

  // Isolated assets - Memecoins
  NORMALIZED_FUD_COINTYPE,
  NORMALIZED_HIPPO_COINTYPE,

  // Deprecated assets
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
];

export const initializeSuilend = async (
  suiClient: SuiClient,
  suilendClient: SuilendClient,
  address?: string,
) => {
  const now = Math.floor(Date.now() / 1000);

  const refreshedRawReserves = await simulate.refreshReservePrice(
    suilendClient.lendingMarket.reserves.map((r) =>
      simulate.compoundReserveInterest(r, now),
    ),
    new SuiPriceServiceConnection("https://hermes.pyth.network"),
  );

  const reserveCoinTypes: string[] = [];
  const rewardCoinTypes: string[] = [];
  refreshedRawReserves.forEach((r) => {
    reserveCoinTypes.push(normalizeStructTag(r.coinType.name));

    [
      ...r.depositsPoolRewardManager.poolRewards,
      ...r.borrowsPoolRewardManager.poolRewards,
    ].forEach((pr) => {
      if (!pr) return;

      rewardCoinTypes.push(normalizeStructTag(pr.coinType.name));
    });
  });
  const uniqueReservesCoinTypes = Array.from(new Set(reserveCoinTypes));
  const uniqueRewardsCoinTypes = Array.from(new Set(rewardCoinTypes));

  const reserveCoinMetadataMap = await getCoinMetadataMap(
    suiClient,
    uniqueReservesCoinTypes,
  );
  const rewardCoinMetadataMap = await getCoinMetadataMap(
    suiClient,
    uniqueRewardsCoinTypes,
  );
  const coinMetadataMap = {
    ...reserveCoinMetadataMap,
    ...rewardCoinMetadataMap,
  };

  const reservesWithTemporaryPythPriceFeeds = refreshedRawReserves.filter((r) =>
    TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(
      normalizeStructTag(r.coinType.name),
    ),
  );
  for (const reserve of reservesWithTemporaryPythPriceFeeds) {
    const birdeyePrice = await getPrice(
      normalizeStructTag(reserve.coinType.name),
    );
    if (birdeyePrice === undefined) continue;

    const parsedBirdeyePrice = BigInt(
      +new BigNumber(birdeyePrice)
        .times(WAD)
        .integerValue(BigNumber.ROUND_DOWN),
    );
    (reserve.price.value as bigint) = parsedBirdeyePrice;
    (reserve.smoothedPrice.value as bigint) = parsedBirdeyePrice;
  }

  const lendingMarket = parseLendingMarket(
    suilendClient.lendingMarket,
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

  // Obligations
  let obligationOwnerCaps, obligations;
  if (address) {
    obligationOwnerCaps = await SuilendClient.getObligationOwnerCaps(
      address,
      suilendClient.lendingMarket.$typeArgs,
      suiClient,
    );

    obligations = (
      await Promise.all(
        obligationOwnerCaps.map((ownerCap) =>
          SuilendClient.getObligation(
            ownerCap.obligationId,
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
        parseObligation(refreshedObligation, reserveMap),
      )
      .sort((a, b) => +b.netValueUsd.minus(a.netValueUsd));
  }

  return {
    lendingMarket,
    refreshedRawReserves,
    reserveMap,

    reserveCoinTypes: uniqueReservesCoinTypes,
    rewardCoinTypes: uniqueRewardsCoinTypes,

    reserveCoinMetadataMap,
    rewardCoinMetadataMap,
    coinMetadataMap,

    obligationOwnerCaps,
    obligations,
  };
};

export const initializeSuilendRewards = async (
  reserveMap: Record<string, ParsedReserve>,
  rewardCoinTypes: string[],
  rewardCoinMetadataMap: Record<string, CoinMetadata>,
  obligations?: ParsedObligation[],
) => {
  const rewardPriceMap: Record<string, BigNumber | undefined> = Object.entries(
    reserveMap,
  ).reduce(
    (acc, [coinType, reserve]) => ({ ...acc, [coinType]: reserve.price }),
    {},
  );
  rewardPriceMap[NORMALIZED_TREATS_COINTYPE] = new BigNumber(0.1);

  const reservelessRewardCoinTypes = rewardCoinTypes.filter(
    (coinType) =>
      !(isSendPoints(coinType) || coinType === NORMALIZED_MAYA_COINTYPE) &&
      !rewardPriceMap[coinType],
  );
  const reservelessRewardBirdeyePrices = await Promise.all(
    reservelessRewardCoinTypes.map((coinType) => getPrice(coinType)),
  );
  for (let i = 0; i < reservelessRewardCoinTypes.length; i++) {
    const birdeyePrice = reservelessRewardBirdeyePrices[i];
    if (birdeyePrice === undefined) continue;

    rewardPriceMap[reservelessRewardCoinTypes[i]] = new BigNumber(birdeyePrice);
  }

  const rewardMap = formatRewards(
    reserveMap,
    rewardCoinMetadataMap,
    rewardPriceMap,
    obligations,
  );

  return { rewardPriceMap, rewardMap };
};
