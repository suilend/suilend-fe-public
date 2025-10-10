import { CoinMetadata, SuiClient } from "@mysten/sui/client";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";

import {
  LiquidStakingObjectInfo,
  LstClient,
  SPRING_SUI_UPGRADE_CAP_ID,
  getLatestPackageId as getLatestSpringSuiPackageId,
} from "@suilend/springsui-sdk";
import { LiquidStakingInfo } from "@suilend/springsui-sdk/_generated/liquid_staking/liquid-staking/structs";
import { WeightHook } from "@suilend/springsui-sdk/_generated/liquid_staking/weight/structs";
import {
  API_URL,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  isSui,
} from "@suilend/sui-fe";

import { RewardMap, getRewardsMap } from "./lib/liquidityMining";
import { STRATEGY_TYPE_INFO_MAP, StrategyType } from "./lib/strategyOwnerCap";
import { ParsedObligation, ParsedReserve } from "./parsers";

export const STRATEGY_E = 10 ** -7;
export const LST_DECIMALS = 9;

export type StrategyDeposit = { coinType: string; depositedAmount: BigNumber };
export type StrategyWithdraw = { coinType: string; withdrawnAmount: BigNumber };

export const addOrInsertStrategyDeposit = (
  _deposits: StrategyDeposit[],
  deposit: StrategyDeposit,
): StrategyDeposit[] => {
  const deposits = cloneDeep(_deposits);

  const existingDeposit = deposits.find((d) => d.coinType === deposit.coinType);
  if (existingDeposit)
    existingDeposit.depositedAmount = existingDeposit.depositedAmount.plus(
      deposit.depositedAmount,
    );
  else deposits.push(deposit);

  return deposits;
};

// Obligations
export const hasStrategyPosition = (obligation: ParsedObligation) =>
  obligation.deposits.length > 0;

// SUI
export const getStrategySuiReserve = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,
) => reserveMap[NORMALIZED_SUI_COINTYPE];

// LST
export type StrategyLstMap = Record<
  string,
  {
    client: LstClient;
    liquidStakingInfo: LiquidStakingInfo<string>;

    mintFeePercent: BigNumber;
    redeemFeePercent: BigNumber;

    suiToLstExchangeRate: BigNumber;
    lstToSuiExchangeRate: BigNumber;
  }
>;

export const fetchStrategyLstMap = async (suiClient: SuiClient) => {
  try {
    const lstCoinTypes = Array.from(
      new Set([
        ...(Object.values(STRATEGY_TYPE_INFO_MAP)
          .map(({ depositLstCoinType }) => depositLstCoinType)
          .filter(Boolean) as string[]),

        // LSTs that will be/are/have been used as rewards
        NORMALIZED_sSUI_COINTYPE,
      ]),
    );

    const publishedAt = await getLatestSpringSuiPackageId(
      suiClient,
      SPRING_SUI_UPGRADE_CAP_ID,
    );

    const lstInfoUrl = `${API_URL}/springsui/lst-info?${new URLSearchParams({
      coinTypes: lstCoinTypes.join(","),
    })}`;
    const lstInfoRes = await fetch(lstInfoUrl);
    const lstInfoJson: Record<
      string,
      {
        LIQUID_STAKING_INFO: LiquidStakingObjectInfo;
        liquidStakingInfo: LiquidStakingInfo<string>;
        weightHook: WeightHook<string>;
        apy: string;
      }
    > = await lstInfoRes.json();
    if ((lstInfoRes as any)?.statusCode === 500)
      throw new Error("Failed to fetch LST info");
    const lstInfoMap = Object.fromEntries(
      Object.entries(lstInfoJson).map(([lstCoinType, lstInfo]) => {
        return [lstCoinType, lstInfo];
      }),
    );

    const result: StrategyLstMap = Object.fromEntries(
      await Promise.all(
        lstCoinTypes.map(async (lstCoinType) => {
          const lstInfo = lstInfoMap[lstCoinType];

          const lstClient = await LstClient.initialize(
            suiClient,
            lstInfo.LIQUID_STAKING_INFO,
            publishedAt,
          );

          const mintFeePercent = new BigNumber(
            lstInfo.liquidStakingInfo.feeConfig.element?.suiMintFeeBps.toString() ??
              0,
          ).div(100);
          const redeemFeePercent = new BigNumber(
            lstInfo.liquidStakingInfo.feeConfig.element?.redeemFeeBps.toString() ??
              0,
          ).div(100);

          const res = await fetch(
            `${API_URL}/springsui/historical-rates?coinType=${lstCoinType}&timestamps=${Math.floor(Date.now() / 1000)}`,
          );
          const json: { timestamp: number; value: string }[] = await res.json();
          if ((json as any)?.statusCode === 500)
            throw new Error(
              `Failed to fetch historical LST to SUI exchange rates for ${lstCoinType}`,
            );

          const suiToLstExchangeRate = !new BigNumber(json[0].value).eq(0)
            ? new BigNumber(1).div(new BigNumber(json[0].value))
            : new BigNumber(1);
          const lstToSuiExchangeRate = new BigNumber(json[0].value);

          return [
            lstCoinType,
            {
              client: lstClient,
              liquidStakingInfo: lstInfo.liquidStakingInfo,

              mintFeePercent,
              redeemFeePercent,

              suiToLstExchangeRate,
              lstToSuiExchangeRate,
            },
          ];
        }),
      ),
    );

    return result;
  } catch (err) {
    console.error(err);
  }
};

export const getStrategyLstMintFee = (
  // Strategy
  lstMap: StrategyLstMap,

  lstCoinType: string,
  suiAmount: BigNumber,
) => {
  const mintFeePercent =
    lstMap?.[lstCoinType]?.mintFeePercent ?? new BigNumber(0);

  return suiAmount
    .times(mintFeePercent.div(100))
    .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
};

export const getStrategyLstRedeemFee = (
  // Strategy
  lstMap: StrategyLstMap,

  lstCoinType: string,
  lstAmount: BigNumber,
) => {
  const lstToSuiExchangeRate =
    lstMap?.[lstCoinType]?.lstToSuiExchangeRate ?? new BigNumber(1);
  const redeemFeePercent =
    lstMap?.[lstCoinType]?.redeemFeePercent ?? new BigNumber(0);

  const suiAmount = lstAmount.times(lstToSuiExchangeRate);

  return suiAmount
    .times(redeemFeePercent.div(100))
    .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
};

// Exposure map
export const STRATEGY_TYPE_EXPOSURE_MAP: Record<
  StrategyType,
  { min: BigNumber; max: BigNumber; default: BigNumber }
> = {
  [StrategyType.sSUI_SUI_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(3), // Actual max: 1 / (1 - (sSUI Open LTV %)) = 3.333x, where sSUI Open LTV % = 70%
    default: new BigNumber(3),
  },
  [StrategyType.stratSUI_SUI_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(3), // Actual max: 1 / (1 - (sSUI Open LTV %)) = 3.333x, where sSUI Open LTV % = 70%
    default: new BigNumber(3),
  },
  [StrategyType.USDC_sSUI_SUI_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(3), // Actual max: 1 + (USDC Open LTV %) * (1 / (1 - (sSUI Open LTV %))) = 3.5666x, where USDC Open LTV % = 77% and sSUI Open LTV % = 70%
    default: new BigNumber(3),
  },
  [StrategyType.AUSD_sSUI_SUI_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(3), // Actual max: 1 + (AUSD Open LTV %) * (1 / (1 - (sSUI Open LTV %))) = 3.5666x, where AUSD Open LTV % = 77% and sSUI Open LTV % = 70%
    default: new BigNumber(3),
  },
  [StrategyType.xBTC_sSUI_SUI_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(2.5), // Actual max: 1 + (xBTC Open LTV %) * (1 / (1 - (sSUI Open LTV %))) = 3x, where xBTC Open LTV % = 60% and sSUI Open LTV % = 70%
    default: new BigNumber(2.5),
  },
  [StrategyType.xBTC_wBTC_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(2.2), // Actual max: 1 / (1 - (xBTC Open LTV %)) = 2.5x, where xBTC Open LTV % = 60%
    default: new BigNumber(2.2),
  },
  [StrategyType.suiUSDT_sSUI_SUI_LOOPING]: {
    min: new BigNumber(1),
    max: new BigNumber(3), // Actual max: 1 + (suiUSDT Open LTV %) * (1 / (1 - (sSUI Open LTV %))) = 3.5666x, where suiUSDT Open LTV % = 77% and sSUI Open LTV % = 70%
    default: new BigNumber(3),
  },
};

// Reserves
export const getStrategyDepositReserves = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  strategyType: StrategyType,
): {
  base?: ParsedReserve;
  lst?: ParsedReserve;
} => {
  const strategyTypeInfo = STRATEGY_TYPE_INFO_MAP[strategyType];

  return {
    base: strategyTypeInfo.depositBaseCoinType
      ? reserveMap[strategyTypeInfo.depositBaseCoinType]
      : undefined,
    lst: strategyTypeInfo.depositLstCoinType
      ? reserveMap[strategyTypeInfo.depositLstCoinType]
      : undefined,
  };
};

export const getStrategyBorrowReserve = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  strategyType: StrategyType,
): ParsedReserve => {
  const strategyTypeInfo = STRATEGY_TYPE_INFO_MAP[strategyType];

  return reserveMap[strategyTypeInfo.borrowCoinType];
};

export const getStrategyDefaultCurrencyReserve = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  strategyType: StrategyType,
) => {
  const defaultCurrencyCoinType =
    STRATEGY_TYPE_INFO_MAP[strategyType].defaultCurrencyCoinType;

  return reserveMap[defaultCurrencyCoinType];
};

// Calculations
export const getStrategySimulatedObligation = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
): ParsedObligation => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  const borrowedAmount = BigNumber.max(new BigNumber(0), _borrowedAmount); // Can't be negative

  const obligation = {
    deposits: deposits.reduce(
      (acc, deposit) => {
        const depositReserve = reserveMap[deposit.coinType];

        return [
          ...acc,
          {
            depositedAmount: deposit.depositedAmount,
            depositedAmountUsd: deposit.depositedAmount.times(
              depositReserve.price,
            ),
            reserve: depositReserve,
            coinType: depositReserve.coinType,
          },
        ];
      },
      [] as {
        depositedAmount: BigNumber;
        depositedAmountUsd: BigNumber;
        reserve: ParsedReserve;
        coinType: string;
      }[],
    ),
    borrows: [
      {
        borrowedAmount: borrowedAmount,
        borrowedAmountUsd: borrowedAmount.times(borrowReserve.price),
        reserve: borrowReserve,
        coinType: borrowReserve.coinType,
      },
    ],

    netValueUsd: deposits
      .reduce((acc, deposit) => {
        const depositReserve = reserveMap[deposit.coinType];

        return acc.plus(deposit.depositedAmount.times(depositReserve.price));
      }, new BigNumber(0))
      .minus(borrowedAmount.times(borrowReserve.price)),
    weightedBorrowsUsd: new BigNumber(
      borrowedAmount.times(borrowReserve.price),
    ).times(borrowReserve.config.borrowWeightBps.div(10000)),
    maxPriceWeightedBorrowsUsd: new BigNumber(
      borrowedAmount.times(borrowReserve.maxPrice),
    ).times(borrowReserve.config.borrowWeightBps.div(10000)),
    minPriceBorrowLimitUsd: BigNumber.min(
      deposits.reduce((acc, deposit) => {
        const depositReserve = reserveMap[deposit.coinType];

        return acc.plus(
          deposit.depositedAmount
            .times(depositReserve.minPrice)
            .times(depositReserve.config.openLtvPct / 100),
        );
      }, new BigNumber(0)),
      30 * 10 ** 6, // Cap `minPriceBorrowLimitUsd` at $30m (account borrow limit)
    ),
    unhealthyBorrowValueUsd: deposits.reduce((acc, deposit) => {
      const depositReserve = reserveMap[deposit.coinType];

      return acc.plus(
        deposit.depositedAmount
          .times(depositReserve.price)
          .times(depositReserve.config.closeLtvPct / 100),
      );
    }, new BigNumber(0)),
  } as ParsedObligation;

  return obligation;
};

export const getStrategyDepositedAmount = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
) => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  if (!obligation || !hasStrategyPosition(obligation)) return new BigNumber(0);

  let resultSui = new BigNumber(0);
  for (const deposit of obligation.deposits) {
    if (isSui(deposit.coinType)) {
      resultSui = resultSui.plus(deposit.depositedAmount);
    } else if (Object.keys(lstMap).includes(deposit.coinType)) {
      const lstToSuiExchangeRate =
        lstMap?.[deposit.coinType]?.lstToSuiExchangeRate ?? new BigNumber(1);
      // const redeemFeePercent =
      //   lstMap?.[deposit.coinType]?.redeemFeePercent ?? new BigNumber(0);

      resultSui = resultSui.plus(
        deposit.depositedAmount.times(lstToSuiExchangeRate), // Don't include LST redemption fees (i.e. don't multiply by `new BigNumber(1).minus(redeemFeePercent.div(100))`)
      );
    } else {
      const depositReserve = reserveMap[deposit.coinType];
      const priceSui = depositReserve.price.div(
        getStrategySuiReserve(reserveMap).price,
      );

      resultSui = resultSui.plus(deposit.depositedAmount.times(priceSui));
    }
  }

  const resultUsd = resultSui.times(getStrategySuiReserve(reserveMap).price);
  const resultDefaultCurrency = new BigNumber(
    resultUsd.div(defaultCurrencyReserve.price),
  ).decimalPlaces(defaultCurrencyReserve.token.decimals, BigNumber.ROUND_DOWN);

  return resultDefaultCurrency;
};

export const getStrategyBorrowedAmount = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
) => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  if (!obligation || !hasStrategyPosition(obligation)) return new BigNumber(0);

  let resultSui = new BigNumber(0);
  for (const borrow of obligation.borrows) {
    if (isSui(borrow.coinType)) {
      resultSui = resultSui.plus(borrow.borrowedAmount);
    } else if (Object.keys(lstMap).includes(borrow.coinType)) {
      // Can't borrow LSTs
      continue;
    } else {
      const priceSui = borrowReserve.price.div(
        getStrategySuiReserve(reserveMap).price,
      );

      resultSui = resultSui.plus(borrow.borrowedAmount.times(priceSui));
    }
  }

  const resultUsd = resultSui.times(getStrategySuiReserve(reserveMap).price);
  const resultDefaultCurrency = new BigNumber(
    resultUsd.div(defaultCurrencyReserve.price),
  ).decimalPlaces(defaultCurrencyReserve.token.decimals, BigNumber.ROUND_DOWN);

  return resultDefaultCurrency;
};

export const getStrategyTvlAmount = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
): BigNumber => {
  if (!obligation || !hasStrategyPosition(obligation)) return new BigNumber(0);

  return getStrategyDepositedAmount(
    reserveMap,
    lstMap,
    strategyType,
    obligation,
  ).minus(
    getStrategyBorrowedAmount(reserveMap, lstMap, strategyType, obligation),
  );
};

export const getStrategyExposure = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // StrategyContext
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
): BigNumber => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  if (!obligation || !hasStrategyPosition(obligation)) return new BigNumber(0);

  const depositedAmountUsd = getStrategyDepositedAmount(
    reserveMap,
    lstMap,
    strategyType,
    obligation,
  ).times(defaultCurrencyReserve.price);
  const borrowedAmountUsd = getStrategyBorrowedAmount(
    reserveMap,
    lstMap,
    strategyType,
    obligation,
  ).times(defaultCurrencyReserve.price);

  return depositedAmountUsd.eq(0)
    ? new BigNumber(0)
    : depositedAmountUsd.div(depositedAmountUsd.minus(borrowedAmountUsd));
};

// Simulate

// Stats
// Stats - Global TVL
export const fetchStrategyGlobalTvlAmountUsdMap = async () => {
  try {
    const url = `${API_URL}/strategies/tvl`;
    const res = await fetch(url);
    const json: {
      strategies: {
        strategyType: StrategyType;
        tvlUsd: string;
      }[];
    } = await res.json();
    if ((json as any)?.statusCode === 500)
      throw new Error("Failed to fetch Strategies TVL");

    const result = Object.values(StrategyType).reduce(
      (acc, strategyType) => {
        const entry = json.strategies.find(
          (s) => `${s.strategyType}` === strategyType,
        );
        const tvlUsd: BigNumber | null = entry
          ? new BigNumber(entry.tvlUsd)
          : null;

        return { ...acc, [strategyType]: tvlUsd };
      },
      {} as Record<StrategyType, BigNumber | null>,
    );

    return result;
  } catch (err) {
    console.error(err);
  }
};

// Stats - Unclaimed rewards
export const getStrategyUnclaimedRewardsAmount = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,
  rewardPriceMap: Record<string, BigNumber | undefined>,
  rewardCoinMetadataMap: Record<string, CoinMetadata>,

  // UserContext
  rewardMap: RewardMap,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
): BigNumber => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  if (!obligation || !hasStrategyPosition(obligation)) return new BigNumber(0);

  const rewardsMap = getRewardsMap(
    obligation,
    rewardMap,
    rewardCoinMetadataMap,
  );

  const resultSui = Object.entries(rewardsMap).reduce(
    (acc, [coinType, { amount }]) => {
      if (isSui(coinType)) {
        return acc.plus(amount);
      } else if (Object.keys(lstMap).includes(coinType)) {
        const lstToSuiExchangeRate =
          lstMap?.[coinType]?.lstToSuiExchangeRate ?? new BigNumber(1);

        return acc.plus(amount.times(lstToSuiExchangeRate));
      } else {
        const price = rewardPriceMap[coinType] ?? new BigNumber(0);
        const priceSui = price.div(getStrategySuiReserve(reserveMap).price);

        return acc.plus(amount.times(priceSui));
      }
    },
    new BigNumber(0),
  );

  const resultUsd = resultSui.times(getStrategySuiReserve(reserveMap).price);
  const resultDefaultCurrency = new BigNumber(
    resultUsd.div(defaultCurrencyReserve.price),
  ).decimalPlaces(defaultCurrencyReserve.token.decimals, BigNumber.ROUND_DOWN);

  return resultDefaultCurrency;
};

// Stats - History

// Stats - Historical TVL

// Stats - APR

// Stats - Health

// Stats - Liquidation price
