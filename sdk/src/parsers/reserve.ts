import { CoinMetadata } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { v4 as uuidv4 } from "uuid";

import {
  PoolReward,
  PoolRewardManager,
} from "../_generated/suilend/liquidity-mining/structs";
import { Reserve } from "../_generated/suilend/reserve/structs";
import { WAD } from "../lib/constants";
import { toHexString } from "../utils";
import * as simulate from "../utils/simulate";

export type ParsedReserve = ReturnType<typeof parseReserve>;
export type ParsedReserveConfig = ReturnType<typeof parseReserveConfig>;
export type ParsedPoolRewardManager = ReturnType<typeof parsePoolRewardManager>;
export type ParsedPoolReward = NonNullable<ReturnType<typeof parsePoolReward>>;

export const parseReserve = (
  reserve: Reserve<string>,
  coinMetadataMap: Record<string, CoinMetadata>,
) => {
  const config = parseReserveConfig(reserve);

  const $typeName = reserve.$typeName;
  const id = reserve.id;
  const arrayIndex = BigInt(reserve.arrayIndex);
  const coinType = normalizeStructTag(reserve.coinType.name);

  const coinMetadata = coinMetadataMap[coinType];

  const mintDecimals = reserve.mintDecimals;
  const priceIdentifier = `0x${toHexString(reserve.priceIdentifier.bytes)}`;
  const price = new BigNumber(reserve.price.value.toString()).div(WAD);
  const smoothedPrice = new BigNumber(
    reserve.smoothedPrice.value.toString(),
  ).div(WAD);
  const minPrice = BigNumber.min(price, smoothedPrice);
  const maxPrice = BigNumber.max(price, smoothedPrice);
  const priceLastUpdateTimestampS = reserve.priceLastUpdateTimestampS;
  const availableAmount = new BigNumber(reserve.availableAmount.toString()).div(
    10 ** mintDecimals,
  );
  const ctokenSupply = new BigNumber(reserve.ctokenSupply.toString()).div(
    10 ** mintDecimals,
  );
  const borrowedAmount = new BigNumber(reserve.borrowedAmount.value.toString())
    .div(WAD)
    .div(10 ** mintDecimals);
  const cumulativeBorrowRate = new BigNumber(
    reserve.cumulativeBorrowRate.value.toString(),
  ).div(WAD);
  const interestLastUpdateTimestampS = reserve.interestLastUpdateTimestampS;
  const unclaimedSpreadFees = new BigNumber(
    reserve.unclaimedSpreadFees.value.toString(),
  )
    .div(WAD)
    .div(10 ** mintDecimals);
  const attributedBorrowValue = new BigNumber(
    reserve.attributedBorrowValue.value.toString(),
  );
  const depositsPoolRewardManager = parsePoolRewardManager(
    reserve.depositsPoolRewardManager,
    coinMetadataMap,
  );
  const borrowsPoolRewardManager = parsePoolRewardManager(
    reserve.borrowsPoolRewardManager,
    coinMetadataMap,
  );

  // Custom
  const availableAmountUsd = availableAmount.times(price);
  const borrowedAmountUsd = borrowedAmount.times(price);

  const depositedAmount = borrowedAmount.plus(availableAmount);
  const depositedAmountUsd = depositedAmount.times(price);

  const cTokenExchangeRate = simulate.cTokenRatio(reserve);

  const borrowAprPercent = simulate.calculateBorrowAprPercent(reserve);
  const depositAprPercent = simulate.calculateDepositAprPercent(reserve);
  const utilizationPercent = simulate.calculateUtilizationPercent(reserve);

  const symbol = coinMetadata.symbol;
  const name = coinMetadata.name;
  const iconUrl = coinMetadata.iconUrl;
  const description = coinMetadata.description;

  return {
    config,

    $typeName,
    id,
    arrayIndex,
    coinType,

    mintDecimals,
    priceIdentifier,
    price,
    smoothedPrice,
    minPrice,
    maxPrice,
    priceLastUpdateTimestampS,
    availableAmount,
    ctokenSupply,
    borrowedAmount,
    cumulativeBorrowRate,
    interestLastUpdateTimestampS,
    unclaimedSpreadFees,
    attributedBorrowValue,
    depositsPoolRewardManager,
    borrowsPoolRewardManager,

    availableAmountUsd,
    borrowedAmountUsd,
    depositedAmount,
    depositedAmountUsd,
    cTokenExchangeRate,
    borrowAprPercent,
    depositAprPercent,
    utilizationPercent,

    token: {
      coinType,
      ...coinMetadata,
    },

    /**
     * @deprecated since version 1.1.19. Use `token.symbol` instead.
     */
    symbol,
    /**
     * @deprecated since version 1.1.19. Use `token.name` instead.
     */
    name,
    /**
     * @deprecated since version 1.1.19. Use `token.iconUrl` instead.
     */
    iconUrl,
    /**
     * @deprecated since version 1.1.19. Use `token.description` instead.
     */
    description,

    /**
     * @deprecated since version 1.0.3. Use `depositedAmount` instead.
     */
    totalDeposits: depositedAmount,
  };
};

export const parseReserveConfig = (reserve: Reserve<string>) => {
  const config = reserve.config.element;
  if (!config) throw new Error("Reserve config not found");

  const mintDecimals = reserve.mintDecimals;

  const $typeName = config.$typeName;
  const openLtvPct = config.openLtvPct;
  const closeLtvPct = config.closeLtvPct;
  const maxCloseLtvPct = config.maxCloseLtvPct;
  const borrowWeightBps = BigNumber(config.borrowWeightBps.toString());
  const depositLimit = new BigNumber(config.depositLimit.toString()).div(
    10 ** mintDecimals,
  );
  const borrowLimit = new BigNumber(config.borrowLimit.toString()).div(
    10 ** mintDecimals,
  );
  const liquidationBonusBps = Number(config.liquidationBonusBps.toString());
  const maxLiquidationBonusBps = Number(
    config.maxLiquidationBonusBps.toString(),
  );
  const depositLimitUsd = new BigNumber(config.depositLimitUsd.toString());
  const borrowLimitUsd = new BigNumber(config.borrowLimitUsd.toString());
  const borrowFeeBps = Number(config.borrowFeeBps.toString());
  const spreadFeeBps = Number(config.spreadFeeBps.toString());
  const protocolLiquidationFeeBps = Number(
    config.protocolLiquidationFeeBps.toString(),
  );
  const isolated = config.isolated;
  const openAttributedBorrowLimitUsd = Number(
    config.openAttributedBorrowLimitUsd.toString(),
  );
  const closeAttributedBorrowLimitUsd = Number(
    config.closeAttributedBorrowLimitUsd.toString(),
  );
  // additionalFields
  const interestRate = config.interestRateUtils.map((util, index) => ({
    id: uuidv4(),
    utilPercent: new BigNumber(util.toString()),
    aprPercent: new BigNumber(config.interestRateAprs[index].toString()).div(
      100,
    ),
  }));

  return {
    $typeName,
    openLtvPct,
    closeLtvPct,
    maxCloseLtvPct,
    borrowWeightBps,
    depositLimit,
    borrowLimit,
    liquidationBonusBps,
    maxLiquidationBonusBps,
    depositLimitUsd,
    borrowLimitUsd,
    borrowFeeBps,
    spreadFeeBps,
    protocolLiquidationFeeBps,
    isolated,
    openAttributedBorrowLimitUsd,
    closeAttributedBorrowLimitUsd,
    // additionalFields,
    interestRate,
  };
};

export const parsePoolRewardManager = (
  poolRewardManager: PoolRewardManager,
  coinMetadataMap: Record<string, CoinMetadata>,
) => {
  const $typeName = poolRewardManager.$typeName;
  const id = poolRewardManager.id;
  const totalShares = poolRewardManager.totalShares;
  const poolRewards = poolRewardManager.poolRewards
    .map((pr, index) => parsePoolReward(pr, index, coinMetadataMap))
    .filter(Boolean) as ParsedPoolReward[];

  const lastUpdateTimeMs = poolRewardManager.lastUpdateTimeMs;

  return {
    $typeName,
    id,
    totalShares,
    poolRewards,
    lastUpdateTimeMs,
  };
};

export const parsePoolReward = (
  poolReward: PoolReward | null,
  rewardIndex: number,
  coinMetadataMap: Record<string, CoinMetadata>,
) => {
  if (!poolReward) return null;

  const $typeName = poolReward.$typeName;
  const id = poolReward.id;
  const poolRewardManagerId = poolReward.poolRewardManagerId;
  const coinType = normalizeStructTag(poolReward.coinType.name);

  const coinMetadata = coinMetadataMap[coinType];
  const mintDecimals = coinMetadata.decimals;

  const startTimeMs = Number(poolReward.startTimeMs);
  const endTimeMs = Number(poolReward.endTimeMs);
  const totalRewards = new BigNumber(poolReward.totalRewards.toString()).div(
    10 ** coinMetadata.decimals,
  );
  const allocatedRewards = new BigNumber(
    poolReward.allocatedRewards.value.toString(),
  )
    .div(WAD)
    .div(10 ** coinMetadata.decimals);
  const cumulativeRewardsPerShare = new BigNumber(
    poolReward.cumulativeRewardsPerShare.value.toString(),
  )
    .div(WAD)
    .div(10 ** coinMetadata.decimals);
  const numUserRewardManagers = poolReward.numUserRewardManagers;
  // additionalFields

  // Custom
  const symbol = coinMetadata.symbol;

  return {
    $typeName,
    id,
    poolRewardManagerId,
    coinType,
    startTimeMs,
    endTimeMs,
    totalRewards,
    allocatedRewards,
    cumulativeRewardsPerShare,
    numUserRewardManagers,

    rewardIndex,
    symbol,
    mintDecimals,
  };
};
