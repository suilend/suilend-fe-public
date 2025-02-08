import { SuiClient } from "@mysten/sui/client";
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
  NORMALIZED_LOFI_COINTYPE,
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
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  getCoinMetadataMap,
  getPrice,
  isSendPoints,
} from "@suilend/frontend-sui";

import { Reserve } from "../_generated/suilend/reserve/structs";
import { SuilendClient } from "../client";
import { ParsedReserve, parseLendingMarket, parseObligation } from "../parsers";
import * as simulate from "../utils/simulate";

import { WAD } from "./constants";

export const RESERVES_CUSTOM_ORDER = [
  // MAIN ASSETS
  NORMALIZED_sSUI_COINTYPE,

  // MAIN ASSETS - Ecosystem LSTs
  NORMALIZED_mSUI_COINTYPE,
  NORMALIZED_fudSUI_COINTYPE,
  NORMALIZED_kSUI_COINTYPE,
  NORMALIZED_trevinSUI_COINTYPE,
  NORMALIZED_upSUI_COINTYPE,

  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_suiETH_COINTYPE,
  NORMALIZED_SOL_COINTYPE,

  // ISOLATED ASSETS
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_DEEP_COINTYPE,
  NORMALIZED_BLUE_COINTYPE, // Not listed
  NORMALIZED_NS_COINTYPE,
  NORMALIZED_BUCK_COINTYPE,

  // ISOLATED ASSETS - Memecoins
  NORMALIZED_HIPPO_COINTYPE,
  NORMALIZED_LOFI_COINTYPE, // Not listed
  NORMALIZED_FUD_COINTYPE,

  // DEPRECATED ASSETS
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
];

export const initializeSuilend = async (
  suiClient: SuiClient,
  suilendClient: SuilendClient,
) => {
  const nowMs = Date.now();
  const nowS = Math.floor(nowMs / 1000);

  const refreshedRawReserves = await simulate.refreshReservePrice(
    suilendClient.lendingMarket.reserves.map((r) =>
      simulate.compoundReserveInterest(r, nowS),
    ),
    new SuiPriceServiceConnection("https://hermes.pyth.network"),
  );

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
  const uniqueReserveCoinTypes = Array.from(new Set(reserveCoinTypes));
  const uniqueRewardCoinTypes = Array.from(new Set(rewardCoinTypes));
  const uniqueActiveRewardsCoinTypes = Array.from(
    new Set(activeRewardCoinTypes),
  );

  const [reserveCoinMetadataMap, rewardCoinMetadataMap] = await Promise.all([
    getCoinMetadataMap(suiClient, uniqueReserveCoinTypes),
    getCoinMetadataMap(suiClient, uniqueRewardCoinTypes),
  ]);
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
    nowS,
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

  return {
    lendingMarket,
    coinMetadataMap,

    reserveMap,
    refreshedRawReserves,
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
      !(isSendPoints(coinType) || coinType === NORMALIZED_MAYA_COINTYPE) &&
      !rewardPriceMap[coinType],
  );
  const reservelessActiveRewardBirdeyePrices = await Promise.all(
    reservelessActiveRewardCoinTypes.map((coinType) => getPrice(coinType)),
  );
  for (let i = 0; i < reservelessActiveRewardCoinTypes.length; i++) {
    const birdeyePrice = reservelessActiveRewardBirdeyePrices[i];
    if (birdeyePrice === undefined) continue;

    rewardPriceMap[reservelessActiveRewardCoinTypes[i]] = new BigNumber(
      birdeyePrice,
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
  if (!address) return { obligationOwnerCaps: [], obligations: [] };

  const obligationOwnerCaps = await SuilendClient.getObligationOwnerCaps(
    address,
    suilendClient.lendingMarket.$typeArgs,
    suiClient,
  );

  const obligations = (
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

  return { obligationOwnerCaps, obligations };
};
