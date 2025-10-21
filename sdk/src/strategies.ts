import { AggregatorClient as CetusSdk } from "@cetusprotocol/aggregator-sdk";
import { CoinMetadata, DevInspectResults, SuiClient } from "@mysten/sui/client";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";
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
  MAX_U64,
  MS_PER_YEAR,
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_xBTC_COINTYPE,
  getAllCoins,
  isSui,
  mergeAllCoins,
} from "@suilend/sui-fe";

import { SuilendClient } from "./client";
import { RewardsMap, getNetAprPercent } from "./lib";
import { RewardMap, getRewardsMap } from "./lib/liquidityMining";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
  strategyBorrow,
  strategyClaimRewardsAndSwapForCoinType,
  strategyDeposit,
  strategyWithdraw,
} from "./lib/strategyOwnerCap";
import { MMT_CONTRACT_PACKAGE_ID, MMT_VERSION_OBJECT_ID } from "./mmt";
import { ParsedObligation, ParsedReserve } from "./parsers";
import { getWeightedBorrowsUsd } from "./utils";

export const STRATEGY_E = 10 ** -7;
export const LST_DECIMALS = 9;

export type StrategyDeposit = { coinType: string; depositedAmount: BigNumber };
export type StrategyWithdraw = { coinType: string; withdrawnAmount: BigNumber };

export enum StrategyFlashLoanProvider {
  MMT = "mmt",
}

export const STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP: Record<
  string,
  {
    provider: StrategyFlashLoanProvider;
    poolId: string;
    coinTypeA: string;
    coinTypeB: string;
    borrowA: boolean;
    feePercent: number;
  }
> = {
  [StrategyType.sSUI_SUI_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x9c92c5b8e9d83e485fb4c86804ac8b920bb0beaace5e61a5b0239218f627f8e9", // xSUI-SUI 0.01% https://app.mmt.finance/liquidity/0x9c92c5b8e9d83e485fb4c86804ac8b920bb0beaace5e61a5b0239218f627f8e9
    coinTypeA:
      "0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI",
    coinTypeB: NORMALIZED_SUI_COINTYPE,
    borrowA: false,
    feePercent: 0.01,
  },
  [StrategyType.stratSUI_SUI_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x9c92c5b8e9d83e485fb4c86804ac8b920bb0beaace5e61a5b0239218f627f8e9", // xSUI-SUI 0.01% https://app.mmt.finance/liquidity/0x9c92c5b8e9d83e485fb4c86804ac8b920bb0beaace5e61a5b0239218f627f8e9
    coinTypeA:
      "0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI",
    coinTypeB: NORMALIZED_SUI_COINTYPE,
    borrowA: false,
    feePercent: 0.01,
  },
  [StrategyType.USDC_sSUI_SUI_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x737ec6a4d3ed0c7e6cc18d8ba04e7ffd4806b726c97efd89867597368c4d06a9", // suiUSDT-USDC 0.001% https://app.mmt.finance/liquidity/0x737ec6a4d3ed0c7e6cc18d8ba04e7ffd4806b726c97efd89867597368c4d06a9
    coinTypeA: NORMALIZED_suiUSDT_COINTYPE,
    coinTypeB: NORMALIZED_USDC_COINTYPE,
    borrowA: false,
    feePercent: 0.001,
  },
  [StrategyType.AUSD_sSUI_SUI_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x900f25b27d2b1686886277d763223988d802f3b6152d02872c382d4dce05e25b", // AUSD-USDC 0.01% https://app.mmt.finance/liquidity/0x900f25b27d2b1686886277d763223988d802f3b6152d02872c382d4dce05e25b
    coinTypeA: NORMALIZED_AUSD_COINTYPE,
    coinTypeB: NORMALIZED_USDC_COINTYPE,
    borrowA: true,
    feePercent: 0.01,
  },
  [StrategyType.xBTC_sSUI_SUI_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x57a662791cea065610455797dfd2751a3c10d929455d3ea88154a2b40cf6614e", // xBTC-wBTC 0.01% https://app.mmt.finance/liquidity/0x57a662791cea065610455797dfd2751a3c10d929455d3ea88154a2b40cf6614e
    coinTypeA: NORMALIZED_xBTC_COINTYPE,
    coinTypeB: NORMALIZED_wBTC_COINTYPE,
    borrowA: true,
    feePercent: 0.01,
  },
  [StrategyType.xBTC_wBTC_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x57a662791cea065610455797dfd2751a3c10d929455d3ea88154a2b40cf6614e", // xBTC-wBTC 0.01% https://app.mmt.finance/liquidity/0x57a662791cea065610455797dfd2751a3c10d929455d3ea88154a2b40cf6614e
    coinTypeA: NORMALIZED_xBTC_COINTYPE,
    coinTypeB: NORMALIZED_wBTC_COINTYPE,
    borrowA: true,
    feePercent: 0.01,
  },
  [StrategyType.suiUSDT_sSUI_SUI_LOOPING]: {
    provider: StrategyFlashLoanProvider.MMT,
    poolId:
      "0x737ec6a4d3ed0c7e6cc18d8ba04e7ffd4806b726c97efd89867597368c4d06a9", // suiUSDT-USDC 0.001% https://app.mmt.finance/liquidity/0x737ec6a4d3ed0c7e6cc18d8ba04e7ffd4806b726c97efd89867597368c4d06a9
    coinTypeA: NORMALIZED_suiUSDT_COINTYPE,
    coinTypeB: NORMALIZED_USDC_COINTYPE,
    borrowA: true,
    feePercent: 0.001,
  },
};

export const getReserveSafeDepositLimit = (reserve: ParsedReserve) => {
  // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
  const tenMinsDepositAprPercent = reserve.depositAprPercent
    .div(MS_PER_YEAR)
    .times(10 * 60 * 1000);
  const safeDepositLimit = reserve.config.depositLimit.minus(
    reserve.depositedAmount.times(tenMinsDepositAprPercent.div(100)),
  );
  const safeDepositLimitUsd = reserve.config.depositLimitUsd.minus(
    reserve.depositedAmount
      .times(reserve.maxPrice)
      .times(tenMinsDepositAprPercent.div(100)),
  );

  return { safeDepositLimit, safeDepositLimitUsd };
};

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

export const getStrategyStepMaxBorrowedAmount = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  deposits: StrategyDeposit[],
  borrowedAmount: BigNumber,
): BigNumber => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  const obligation = getStrategySimulatedObligation(
    reserveMap,
    lstMap,
    strategyType,
    deposits,
    borrowedAmount,
  );

  const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;

  // "Borrows cannot exceed borrow limit"
  return !obligation ||
    obligation.maxPriceWeightedBorrowsUsd.gt(obligation.minPriceBorrowLimitUsd)
    ? new BigNumber(0)
    : obligation.minPriceBorrowLimitUsd
        .minus(obligation.maxPriceWeightedBorrowsUsd)
        .div(
          borrowReserve.maxPrice.times(
            borrowReserve.config.borrowWeightBps.div(10000),
          ),
        )
        .div(1 + borrowFeePercent / 100);
};

export const getStrategyStepMaxWithdrawnAmount = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  deposits: StrategyDeposit[],
  borrowedAmount: BigNumber,
  withdrawCoinType: string,
): BigNumber => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  const withdrawReserve = reserveMap[withdrawCoinType];

  //

  const obligation = getStrategySimulatedObligation(
    reserveMap,
    lstMap,
    strategyType,
    deposits,
    borrowedAmount,
  );

  return BigNumber.min(
    // "Withdraw is unhealthy"
    !obligation ||
      obligation.maxPriceWeightedBorrowsUsd.gt(
        obligation.minPriceBorrowLimitUsd,
      )
      ? new BigNumber(0)
      : withdrawReserve.config.openLtvPct > 0
        ? obligation.minPriceBorrowLimitUsd
            .minus(obligation.maxPriceWeightedBorrowsUsd)
            .div(withdrawReserve.minPrice)
            .div(withdrawReserve.config.openLtvPct / 100)
        : MAX_U64, // Infinity
    deposits.find((deposit) => deposit.coinType === withdrawReserve.coinType)
      ?.depositedAmount ?? new BigNumber(0),
  ).decimalPlaces(withdrawReserve.token.decimals, BigNumber.ROUND_DOWN);
};

// Simulate
export const strategySimulateLoopToExposure = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  _targetBorrowedAmount: BigNumber | undefined,
  _targetExposure: BigNumber | undefined, // Must be defined if _targetBorrowedAmount is undefined
): {
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  obligation: ParsedObligation;
} => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  const loopingDepositReserve = (depositReserves.lst ?? depositReserves.base)!; // Must have base if no LST

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  const tvlAmountUsd = getStrategyTvlAmount(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  ).times(defaultCurrencyReserve.price);
  const targetBorrowedAmount =
    _targetBorrowedAmount ??
    tvlAmountUsd
      .times(_targetExposure!.minus(1))
      .div(borrowReserve.price)
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

  // Base+LST or LST only
  if (loopingDepositReserve.coinType === depositReserves.lst?.coinType) {
    for (let i = 0; i < 30; i++) {
      const exposure = getStrategyExposure(
        reserveMap,
        lstMap,
        strategyType,
        getStrategySimulatedObligation(
          reserveMap,
          lstMap,
          strategyType,
          deposits,
          borrowedAmount,
        ),
      );
      const pendingBorrowedAmount = targetBorrowedAmount.minus(borrowedAmount);

      if (pendingBorrowedAmount.lte(STRATEGY_E)) break;

      // 1) Borrow SUI
      // 1.1) Max
      const stepMaxBorrowedAmount = getStrategyStepMaxBorrowedAmount(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
      )
        .times(0.9) // 10% buffer
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const stepMaxDepositedAmount = new BigNumber(
        stepMaxBorrowedAmount.minus(
          getStrategyLstMintFee(
            lstMap,
            loopingDepositReserve.coinType,
            stepMaxBorrowedAmount,
          ),
        ),
      )
        .times(
          lstMap?.[depositReserves.lst.coinType]?.suiToLstExchangeRate ??
            new BigNumber(1),
        )
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

      // 1.2) Borrow
      const stepBorrowedAmount = BigNumber.min(
        pendingBorrowedAmount,
        stepMaxBorrowedAmount,
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepBorrowedAmount.eq(stepMaxBorrowedAmount);

      // 1.3) Update state
      borrowedAmount = borrowedAmount.plus(stepBorrowedAmount);

      // 2) Deposit LST
      // 2.1) Stake SUI for LST

      // 2.2) Deposit
      const stepDepositedAmount = new BigNumber(
        stepBorrowedAmount.minus(
          getStrategyLstMintFee(
            lstMap,
            loopingDepositReserve.coinType,
            stepBorrowedAmount,
          ),
        ),
      )
        .times(
          lstMap?.[depositReserves.lst.coinType]?.suiToLstExchangeRate ??
            new BigNumber(1),
        )
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

      // 2.3) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: loopingDepositReserve.coinType,
        depositedAmount: stepDepositedAmount,
      });
    }
  }

  // Base only
  else if (loopingDepositReserve.coinType === depositReserves.base?.coinType) {
    const borrowToBaseExchangeRate = new BigNumber(1); // Assume 1:1 exchange rate

    for (let i = 0; i < 30; i++) {
      const exposure = getStrategyExposure(
        reserveMap,
        lstMap,
        strategyType,
        getStrategySimulatedObligation(
          reserveMap,
          lstMap,
          strategyType,
          deposits,
          borrowedAmount,
        ),
      );
      const pendingBorrowedAmount = targetBorrowedAmount.minus(borrowedAmount);

      if (pendingBorrowedAmount.lte(STRATEGY_E)) break;

      // 1) Borrow
      // 1.1) Max
      const stepMaxBorrowedAmount = getStrategyStepMaxBorrowedAmount(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
      )
        .times(0.9) // 10% buffer
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const stepMaxDepositedAmount = stepMaxBorrowedAmount
        .times(borrowToBaseExchangeRate)
        .decimalPlaces(
          loopingDepositReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        );

      // 1.2) Borrow
      const stepBorrowedAmount = BigNumber.min(
        pendingBorrowedAmount,
        stepMaxBorrowedAmount,
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepBorrowedAmount.eq(stepMaxBorrowedAmount);

      // 1.3) Update state
      borrowedAmount = borrowedAmount.plus(stepBorrowedAmount);

      // 2) Deposit base
      // 2.1) Swap borrows for base

      // 2.2) Deposit
      const stepDepositedAmount = stepBorrowedAmount
        .times(borrowToBaseExchangeRate)
        .decimalPlaces(
          loopingDepositReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        );
      const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

      // 2.3) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: loopingDepositReserve.coinType,
        depositedAmount: stepDepositedAmount,
      });
    }
  } else {
    throw new Error("No LST or base reserve found"); // Should not happen
  }

  return {
    deposits,
    borrowedAmount,
    obligation: getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  };
};

export const strategySimulateDeposit = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  deposit: StrategyDeposit,
): {
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  obligation: ParsedObligation;
} => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

  //

  let deposits = cloneDeep(_deposits);
  const borrowedAmount = _borrowedAmount;

  // 1) Deposit
  // 1.1) SUI
  if (isSui(deposit.coinType)) {
    if (depositReserves.lst === undefined)
      throw new Error("LST reserve not found");

    const suiToLstExchangeRate =
      lstMap?.[depositReserves.lst.coinType]?.suiToLstExchangeRate ??
      new BigNumber(1);

    const suiAmount = deposit.depositedAmount;
    const lstAmount = new BigNumber(
      suiAmount
        .minus(
          getStrategyLstMintFee(
            lstMap,
            depositReserves.lst.coinType,
            suiAmount,
          ),
        )
        .times(suiToLstExchangeRate),
    ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

    // 1.1.1) Split coins

    // 1.1.2) Stake SUI for LST

    // 1.1.3) Deposit LST (1x exposure)

    // 1.1.4) Update state
    deposits = addOrInsertStrategyDeposit(deposits, {
      coinType: depositReserves.lst.coinType,
      depositedAmount: lstAmount,
    });
  }

  // 1.2) LST
  else if (deposit.coinType === depositReserves.lst?.coinType) {
    // 1.2.1) Split coins

    // 1.2.2) Deposit LST (1x exposure)

    // 1.2.3) Update state
    deposits = addOrInsertStrategyDeposit(deposits, deposit);
  }

  // 1.3) Other
  else {
    // 1.3.1) Split coins

    // 1.3.2) Deposit other (1x exposure)

    // 1.3.3) Update state
    deposits = addOrInsertStrategyDeposit(deposits, deposit);
  }

  return {
    deposits,
    borrowedAmount,
    obligation: getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  };
};

export const strategySimulateDepositAndLoopToExposure = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  deposit: StrategyDeposit,
  targetExposure: BigNumber,
): {
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  obligation: ParsedObligation;
} => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;
  let obligation = getStrategySimulatedObligation(
    reserveMap,
    lstMap,
    strategyType,
    deposits,
    borrowedAmount,
  );

  // 1) Deposit (1x exposure)
  // 1.1) Deposit
  const {
    deposits: newDeposits,
    borrowedAmount: newBorrowedAmount,
    obligation: newObligation,
  } = strategySimulateDeposit(
    reserveMap,
    lstMap,
    strategyType,
    deposits,
    borrowedAmount,
    deposit,
  );

  // 1.2) Update state
  deposits = newDeposits;
  borrowedAmount = newBorrowedAmount;
  obligation = newObligation;

  if (targetExposure.gt(1)) {
    // 2) Loop to target exposure
    // 2.1) Loop
    const {
      deposits: newDeposits2,
      borrowedAmount: newBorrowedAmount2,
      obligation: newObligation2,
    } = strategySimulateLoopToExposure(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
      undefined, // Don't pass targetBorrowedAmount
      targetExposure, // Pass targetExposure
    );

    // 2.2) Update state
    deposits = newDeposits2;
    borrowedAmount = newBorrowedAmount2;
    obligation = newObligation2;
  }

  return {
    deposits,
    borrowedAmount,
    obligation,
  };
};

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
export const getStrategyAprPercent = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,
  lstStatsMap: Record<
    string,
    {
      lstToSuiExchangeRate: BigNumber;
      aprPercent: BigNumber;
    }
  >,

  // UserContext
  rewardMap: RewardMap,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
  exposure?: BigNumber,
): BigNumber => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  let _obligation;
  if (!!obligation && hasStrategyPosition(obligation)) {
    _obligation = obligation;
  } else {
    if (exposure === undefined) return new BigNumber(0); // Not shown in UI

    _obligation = strategySimulateDepositAndLoopToExposure(
      reserveMap,
      lstMap,
      strategyType,
      [],
      new BigNumber(0),
      {
        coinType: defaultCurrencyReserve.coinType,
        depositedAmount: new BigNumber(1), // Any number will do
      },
      exposure,
    ).obligation;
  }

  return getNetAprPercent(
    _obligation,
    rewardMap,
    lstStatsMap,
    !obligation ||
      !hasStrategyPosition(obligation) ||
      obligation.deposits.some((d) => !d.userRewardManager), // Simulated obligations don't have userRewardManager
  );
};

// Stats - Health
export const getStrategyHealthPercent = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
  exposure?: BigNumber,
): BigNumber => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  let _obligation;
  if (!!obligation && hasStrategyPosition(obligation)) {
    _obligation = obligation;
  } else {
    if (exposure === undefined) return new BigNumber(0); // Not shown in UI

    _obligation = strategySimulateDepositAndLoopToExposure(
      reserveMap,
      lstMap,
      strategyType,
      [],
      new BigNumber(0),
      {
        coinType: defaultCurrencyReserve.coinType,
        depositedAmount: new BigNumber(1), // Any number will do
      },
      exposure,
    ).obligation;
  }

  const weightedBorrowsUsd = getWeightedBorrowsUsd(_obligation);
  const borrowLimitUsd = _obligation.minPriceBorrowLimitUsd.times(
    depositReserves.base !== undefined
      ? 0.99 // 1% buffer
      : 0.999, // 0.1% buffer
  );
  const liquidationThresholdUsd = _obligation.unhealthyBorrowValueUsd;

  if (weightedBorrowsUsd.lt(borrowLimitUsd)) return new BigNumber(100);
  return new BigNumber(100).minus(
    new BigNumber(weightedBorrowsUsd.minus(borrowLimitUsd))
      .div(liquidationThresholdUsd.minus(borrowLimitUsd))
      .times(100),
  );
};

// Stats - Liquidation price
export const getStrategyLiquidationPrice = (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,
  obligation?: ParsedObligation,
  exposure?: BigNumber,
): BigNumber | null => {
  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  //

  if (
    ![
      StrategyType.USDC_sSUI_SUI_LOOPING,
      StrategyType.AUSD_sSUI_SUI_LOOPING,
      StrategyType.xBTC_sSUI_SUI_LOOPING,
      StrategyType.suiUSDT_sSUI_SUI_LOOPING,
    ].includes(strategyType)
  )
    return new BigNumber(0); // Not shown in UI

  let _obligation;
  if (!!obligation && hasStrategyPosition(obligation)) {
    _obligation = obligation;
  } else {
    if (exposure === undefined) return new BigNumber(0); // Not shown in UI

    _obligation = strategySimulateDepositAndLoopToExposure(
      reserveMap,
      lstMap,
      strategyType,
      [],
      new BigNumber(0),
      {
        coinType: defaultCurrencyReserve.coinType,
        depositedAmount: new BigNumber(1), // Any number will do
      },
      exposure,
    ).obligation;
  }

  const baseDeposit = _obligation.deposits.find(
    (d) => d.coinType === depositReserves.base!.coinType,
  );
  const lstDeposit = _obligation.deposits.find(
    (d) => d.coinType === depositReserves.lst!.coinType,
  );
  if (!baseDeposit || baseDeposit.depositedAmount.eq(0)) return null;

  const borrow = _obligation.borrows[0];
  if (!borrow || borrow.borrowedAmount.eq(0)) return null;

  const result = new BigNumber(
    baseDeposit.depositedAmount
      .times(depositReserves.base!.price)
      .times(+depositReserves.base!.config.closeLtvPct / 100),
  ).div(
    new BigNumber(
      borrow.borrowedAmount.times(
        borrowReserve.config.borrowWeightBps.div(10000),
      ),
    ).minus(
      (lstDeposit?.depositedAmount ?? new BigNumber(0)).times(
        +depositReserves.lst!.config.closeLtvPct / 100,
      ),
    ),
  );

  return result;
};

// --------------------------------

export const strategyLoopToExposureTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string | undefined,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  _targetBorrowedAmount: BigNumber | undefined,
  _targetExposure: BigNumber | undefined, // Must be defined if _targetBorrowedAmount is undefined
  transaction: Transaction,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  console.log(
    `[loopStrategyToExposure] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        _targetBorrowedAmount: _targetBorrowedAmount?.toFixed(20),
        _targetExposure: _targetExposure?.toFixed(20),
      },
      null,
      2,
    ),
  );

  const loopingDepositReserve = (depositReserves.lst ?? depositReserves.base)!; // Must have base if no LST

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  const tvlAmountUsd = getStrategyTvlAmount(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  ).times(defaultCurrencyReserve.price);
  const targetBorrowedAmount =
    _targetBorrowedAmount ??
    tvlAmountUsd
      .times(_targetExposure!.minus(1))
      .div(borrowReserve.price)
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

  console.log(
    `[loopStrategyToExposure] processed_args |`,
    JSON.stringify({
      tvlAmountUsd: tvlAmountUsd.toFixed(20),
      targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
    }),
  );

  // Base+LST or LST only
  if (loopingDepositReserve.coinType === depositReserves.lst?.coinType) {
    for (let i = 0; i < 30; i++) {
      const exposure = getStrategyExposure(
        reserveMap,
        lstMap,
        strategyType,
        getStrategySimulatedObligation(
          reserveMap,
          lstMap,
          strategyType,
          deposits,
          borrowedAmount,
        ),
      );
      const pendingBorrowedAmount = targetBorrowedAmount.minus(borrowedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingBorrowedAmount: pendingBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      if (pendingBorrowedAmount.lte(STRATEGY_E)) break;

      // 1) Borrow SUI
      // 1.1) Max
      const stepMaxBorrowedAmount = getStrategyStepMaxBorrowedAmount(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
      )
        .times(0.9) // 10% buffer
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const stepMaxDepositedAmount = new BigNumber(
        stepMaxBorrowedAmount.minus(
          getStrategyLstMintFee(
            lstMap,
            loopingDepositReserve.coinType,
            stepMaxBorrowedAmount,
          ),
        ),
      )
        .times(lst?.suiToLstExchangeRate ?? 1)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[loopStrategyToExposure] ${i} borrow_sui.max |`,
        JSON.stringify(
          {
            stepMaxBorrowedAmount: stepMaxBorrowedAmount.toFixed(20),
            stepMaxDepositedAmount: stepMaxDepositedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Borrow
      const stepBorrowedAmount = BigNumber.min(
        pendingBorrowedAmount,
        stepMaxBorrowedAmount,
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepBorrowedAmount.eq(stepMaxBorrowedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} borrow_sui.borrow |`,
        JSON.stringify(
          {
            stepBorrowedAmount: stepBorrowedAmount.toFixed(20),
            isMaxBorrow,
          },
          null,
          2,
        ),
      );

      const [borrowedCoin] = strategyBorrow(
        borrowReserve.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(borrowReserve.coinType),
        BigInt(
          stepBorrowedAmount
            .times(10 ** borrowReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
        transaction,
      );

      // 1.3) Update state
      borrowedAmount = borrowedAmount.plus(stepBorrowedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} borrow_sui.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Deposit LST
      // 2.1) Stake SUI for LST
      const stepLstCoin = lst!.client.mint(transaction, borrowedCoin);

      // 2.2) Deposit
      const stepDepositedAmount = new BigNumber(
        stepBorrowedAmount.minus(
          getStrategyLstMintFee(
            lstMap,
            loopingDepositReserve.coinType,
            stepBorrowedAmount,
          ),
        ),
      )
        .times(lst?.suiToLstExchangeRate ?? 1)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} deposit_lst.deposit |`,
        JSON.stringify(
          {
            stepDepositedAmount: stepDepositedAmount.toFixed(20),
            isMaxDeposit,
          },
          null,
          2,
        ),
      );

      strategyDeposit(
        stepLstCoin,
        loopingDepositReserve.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(loopingDepositReserve.coinType),
        transaction,
      );

      // 2.3) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: loopingDepositReserve.coinType,
        depositedAmount: stepDepositedAmount,
      });

      console.log(
        `[loopStrategyToExposure] ${i} deposit_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }
  }

  // Base only
  else if (loopingDepositReserve.coinType === depositReserves.base?.coinType) {
    const exchangeRateRouters = await cetusSdk.findRouters({
      from: borrowReserve.coinType,
      target: loopingDepositReserve.coinType,
      amount: new BN(
        new BigNumber(0.1)
          .times(10 ** borrowReserve.token.decimals)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(), // e.g. 0.1 wBTC
      ),
      byAmountIn: true,
      splitCount: 0, // Use direct swap to avoid split algo
    });
    if (!exchangeRateRouters) throw new Error("No swap quote found");

    const borrowToBaseExchangeRate = new BigNumber(
      new BigNumber(exchangeRateRouters.amountOut.toString()).div(
        10 ** loopingDepositReserve.token.decimals,
      ),
    ).div(
      new BigNumber(exchangeRateRouters.amountIn.toString()).div(
        10 ** borrowReserve.token.decimals,
      ),
    );

    for (let i = 0; i < 30; i++) {
      const exposure = getStrategyExposure(
        reserveMap,
        lstMap,
        strategyType,
        getStrategySimulatedObligation(
          reserveMap,
          lstMap,
          strategyType,
          deposits,
          borrowedAmount,
        ),
      );
      const pendingBorrowedAmount = targetBorrowedAmount.minus(borrowedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingBorrowedAmount: pendingBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      if (pendingBorrowedAmount.lte(STRATEGY_E)) break;

      // 1) Borrow
      // 1.1) Max
      const stepMaxBorrowedAmount = getStrategyStepMaxBorrowedAmount(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
      )
        .times(0.9) // 10% buffer
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const stepMaxDepositedAmount = new BigNumber(
        stepMaxBorrowedAmount.times(borrowToBaseExchangeRate),
      ).decimalPlaces(
        loopingDepositReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );

      console.log(
        `[loopStrategyToExposure] ${i} borrow.max |`,
        JSON.stringify(
          {
            stepMaxBorrowedAmount: stepMaxBorrowedAmount.toFixed(20),
            stepMaxDepositedAmount: stepMaxDepositedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Borrow
      const stepBorrowedAmount = BigNumber.min(
        pendingBorrowedAmount,
        stepMaxBorrowedAmount,
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepBorrowedAmount.eq(stepMaxBorrowedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} borrow.borrow |`,
        JSON.stringify(
          {
            stepBorrowedAmount: stepBorrowedAmount.toFixed(20),
            isMaxBorrow,
          },
          null,
          2,
        ),
      );

      const [stepBorrowedCoin] = strategyBorrow(
        borrowReserve.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(borrowReserve.coinType),
        BigInt(
          stepBorrowedAmount
            .times(10 ** borrowReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
        transaction,
      );

      // 1.3) Update state
      borrowedAmount = borrowedAmount.plus(stepBorrowedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} borrow.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Deposit base
      // 2.1) Swap borrows for base
      const routers = await cetusSdk.findRouters({
        from: borrowReserve.coinType,
        target: loopingDepositReserve.coinType,
        amount: new BN(
          stepBorrowedAmount
            .times(10 ** borrowReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ), // Estimate for loop 2 onwards (don't know exact out amount, we are not accounting for swap fees, etc)
        byAmountIn: true,
        splitCount: 0, // Use direct swap to avoid split algo
      });
      if (!routers) throw new Error("No swap quote found");

      const slippagePercent = 0.1;
      let stepBaseCoin;
      try {
        stepBaseCoin = await cetusSdk.fixableRouterSwapV3({
          router: routers,
          inputCoin: stepBorrowedCoin,
          slippage: slippagePercent / 100,
          txb: transaction,
          partner: cetusPartnerId,
        });
      } catch (err) {
        throw new Error("No swap quote found");
      }
      console.log(
        `[loopStrategyToExposure] ${i} swap_borrows_for_base.swap |`,
        JSON.stringify(
          {
            inCoinType: borrowReserve.coinType,
            outCoinType: loopingDepositReserve.coinType,
            amountIn: stepBorrowedAmount.toFixed(20),
            amountOut: new BigNumber(routers.amountOut.toString())
              .div(10 ** loopingDepositReserve.token.decimals)
              .decimalPlaces(
                loopingDepositReserve.token.decimals,
                BigNumber.ROUND_DOWN,
              )
              .toFixed(20),
          },
          null,
          2,
        ),
        routers,
      );

      // 2.2) Deposit
      const stepDepositedAmount = new BigNumber(
        new BigNumber(routers.amountOut.toString()).div(
          10 ** loopingDepositReserve.token.decimals,
        ),
      ).decimalPlaces(
        loopingDepositReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );
      const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

      console.log(
        `[loopStrategyToExposure] ${i} deposit.deposit |`,
        JSON.stringify(
          {
            stepDepositedAmount: stepDepositedAmount.toFixed(20),
            isMaxDeposit,
          },
          null,
          2,
        ),
      );

      strategyDeposit(
        stepBaseCoin,
        loopingDepositReserve.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(loopingDepositReserve.coinType),
        transaction,
      );

      // 2.3) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: loopingDepositReserve.coinType,
        depositedAmount: stepDepositedAmount,
      });

      console.log(
        `[loopStrategyToExposure] ${i} deposit.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }
  } else {
    throw new Error("No LST or base reserve found"); // Should not happen
  }

  return { deposits, borrowedAmount, transaction };
};

export const strategyUnloopToExposureTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  _targetBorrowedAmount: BigNumber | undefined,
  _targetExposure: BigNumber | undefined, // Must be defined if _targetBorrowedAmount is undefined
  transaction: Transaction,
) => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  console.log(
    `[unloopStrategyToExposure] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        _targetBorrowedAmount: _targetBorrowedAmount?.toFixed(20),
        _targetExposure: _targetExposure?.toFixed(20),
      },
      null,
      2,
    ),
  );

  const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base
  const loopingDepositReserve = (depositReserves.lst ?? depositReserves.base)!; // Must have base if no LST

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  const tvlAmountUsd = getStrategyTvlAmount(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  ).times(defaultCurrencyReserve.price);
  const targetBorrowedAmount =
    _targetBorrowedAmount ??
    tvlAmountUsd
      .times(_targetExposure!.minus(1))
      .div(borrowReserve.price)
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

  console.log(
    `[unloopStrategyToExposure] processed_args |`,
    JSON.stringify({
      tvlAmountUsd: tvlAmountUsd.toFixed(20),
      targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
    }),
  );

  if (borrowedAmount.eq(targetBorrowedAmount))
    return { deposits, borrowedAmount, transaction };

  const fullyRepayBorrowsUsingLst = async (
    maxWithdrawRemainingLstAndRedepositAsBase: boolean,
  ) => {
    if (depositReserves.lst === undefined)
      throw new Error("LST reserve not found");

    const borrowedAmountUsd = borrowedAmount.times(borrowReserve.price);
    const fullRepaymentAmount = (
      borrowedAmountUsd.lt(0.02)
        ? new BigNumber(0.02).div(borrowReserve.price) // $0.02 in borrow coinType (still well over E borrows, e.g. E SUI, or E wBTC)
        : borrowedAmountUsd.lt(1)
          ? borrowedAmount.times(1.1) // 10% buffer
          : borrowedAmountUsd.lt(10)
            ? borrowedAmount.times(1.01) // 1% buffer
            : borrowedAmount.times(1.001)
    ) // 0.1% buffer
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] |`,
      JSON.stringify({
        borrowedAmount: borrowedAmount.toFixed(20),
        fullRepaymentAmount: fullRepaymentAmount.toFixed(20),
      }),
    );

    // 1) Withdraw LST
    const lstWithdrawnAmount = fullRepaymentAmount
      .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
      .div(lst?.lstToSuiExchangeRate ?? 1)
      .decimalPlaces(depositReserves.lst.token.decimals, BigNumber.ROUND_DOWN);
    if (
      (
        deposits.find((d) => d.coinType === depositReserves.lst!.coinType)
          ?.depositedAmount ?? new BigNumber(0)
      ).lt(lstWithdrawnAmount)
    )
      throw new Error("Not enough LST deposited");

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] withdraw_lst |`,
      JSON.stringify({
        lstWithdrawnAmount: lstWithdrawnAmount.toFixed(20),
      }),
    );

    // 1.1) Withdraw
    const [withdrawnLstCoin] = strategyWithdraw(
      depositReserves.lst.coinType,
      strategyOwnerCapId,
      suilendClient.findReserveArrayIndex(depositReserves.lst.coinType),
      BigInt(
        new BigNumber(
          lstWithdrawnAmount
            .times(10 ** LST_DECIMALS)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        )
          .div(depositReserves.lst.cTokenExchangeRate)
          .integerValue(BigNumber.ROUND_UP)
          .toString(),
      ),
      transaction,
    );

    // 1.2) Update state
    deposits = addOrInsertStrategyDeposit(deposits, {
      coinType: depositReserves.lst.coinType,
      depositedAmount: lstWithdrawnAmount.times(-1),
    });

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] withdraw_lst.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 2) Unstake LST for SUI
    const fullRepaymentCoin = lst!.client.redeem(transaction, withdrawnLstCoin);

    // 3) Repay borrows
    // 3.1) Repay
    const repaidAmount = new BigNumber(
      new BigNumber(
        lstWithdrawnAmount.times(lst?.lstToSuiExchangeRate ?? 1),
      ).minus(
        getStrategyLstRedeemFee(
          lstMap,
          depositReserves.lst.coinType,
          lstWithdrawnAmount,
        ),
      ),
    ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] repay_borrows.repay |`,
      JSON.stringify(
        {
          repaidAmount: repaidAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    suilendClient.repay(
      obligationId,
      borrowReserve.coinType,
      fullRepaymentCoin,
      transaction,
    );
    transaction.transferObjects([fullRepaymentCoin], _address); // Transfer remaining SUI to user

    // 2.3) Update state
    borrowedAmount = BigNumber.max(
      borrowedAmount.minus(repaidAmount),
      new BigNumber(0),
    );

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] repay_borrows.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 3) Swap remaining borrow to LST and redeposit (not possible because coin is a mutable reference (?))

    // Max withdraw remaining LST and redeposit as base:
    if (maxWithdrawRemainingLstAndRedepositAsBase) {
      if (depositReserves.base === undefined)
        throw new Error("Base reserve not found");

      // 1) MAX withdraw LST
      const remainingLstWithdrawnAmount = (
        deposits.find((d) => d.coinType === depositReserves.lst!.coinType)
          ?.depositedAmount ?? new BigNumber(0)
      ).decimalPlaces(depositReserves.lst.token.decimals, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] max_withdraw_lst |`,
        JSON.stringify({
          remainingLstWithdrawnAmount: remainingLstWithdrawnAmount.toFixed(20),
        }),
      );

      // 1.1) MAX Withdraw
      const [withdrawnRemainingLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(depositReserves.lst.coinType),
        BigInt(MAX_U64.toString()),
        transaction,
      );

      // 1.2) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: remainingLstWithdrawnAmount.times(-1), // Should be 0 after this
      });

      console.log(
        `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] max_withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Swap LST for base and redeposit
      // 2.1) Get routers
      const routers = await cetusSdk.findRouters({
        from: depositReserves.lst.coinType,
        target: depositReserves.base.coinType,
        amount: new BN(
          remainingLstWithdrawnAmount
            .times(10 ** depositReserves.lst.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
        byAmountIn: true,
      });
      if (!routers) throw new Error("No swap quote found");

      console.log(
        `[unloopStrategyToExposure.fullyRepayBorrowsUsingLst] swap_lst_for_base.get_routers`,
        {
          routers,
          amountIn: new BigNumber(routers.amountIn.toString())
            .div(10 ** depositReserves.lst.token.decimals)
            .decimalPlaces(
              depositReserves.lst.token.decimals,
              BigNumber.ROUND_DOWN,
            )
            .toFixed(20),
          amountOut: new BigNumber(routers.amountOut.toString())
            .div(10 ** depositReserves.base.token.decimals)
            .decimalPlaces(
              depositReserves.base.token.decimals,
              BigNumber.ROUND_DOWN,
            )
            .toFixed(20),
        },
      );

      // 2.2) Swap
      let baseCoin: TransactionObjectArgument;
      try {
        baseCoin = await cetusSdk.fixableRouterSwapV3({
          router: routers,
          inputCoin: withdrawnRemainingLstCoin,
          slippage: 100 / 100,
          txb: transaction,
          partner: cetusPartnerId,
        });
      } catch (err) {
        throw new Error("No swap quote found");
      }

      // 3) Deposit base
      strategyDeposit(
        baseCoin,
        depositReserves.base.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(depositReserves.base.coinType),
        transaction,
      );
    }
  };

  const fullyRepayBorrowsUsingBase = async () => {
    if (depositReserves.base === undefined)
      throw new Error("Base reserve not found");

    const borrowedAmountUsd = borrowedAmount.times(borrowReserve.price);
    const fullRepaymentAmount = (
      borrowedAmountUsd.lt(0.02)
        ? new BigNumber(0.02).div(borrowReserve.price) // $0.02 in borrow coinType (still well over E borrows, e.g. E SUI, or E wBTC)
        : borrowedAmountUsd.lt(1)
          ? borrowedAmount.times(1.1) // 10% buffer
          : borrowedAmountUsd.lt(10)
            ? borrowedAmount.times(1.01) // 1% buffer
            : borrowedAmount.times(1.001)
    ) // 0.1% buffer
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] |`,
      JSON.stringify({
        borrowedAmount: borrowedAmount.toFixed(20),
        fullRepaymentAmount: fullRepaymentAmount.toFixed(20),
      }),
    );

    // 1) MAX withdraw LST
    if (depositReserves.lst !== undefined) {
      // 1.1) MAX withdraw
      const [withdrawnMaxLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(depositReserves.lst.coinType),
        BigInt(MAX_U64.toString()),
        transaction,
      );

      // 1.2) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: (
          deposits.find((d) => d.coinType === depositReserves.lst!.coinType)
            ?.depositedAmount ?? new BigNumber(0)
        ).times(-1),
      });

      console.log(
        `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] max_withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.3) Unstake LST for SUI
      const suiCoin = lst!.client.redeem(transaction, withdrawnMaxLstCoin);

      // 1.4) Transfer SUI to user
      transaction.transferObjects([suiCoin], _address);
    }

    // 2) Withdraw base
    const baseWithdrawnAmount = new BigNumber(
      fullRepaymentAmount.times(borrowReserve.price),
    )
      .div(depositReserves.base.price)
      .times(1.03); // 3% buffer

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] withdraw_base |`,
      JSON.stringify(
        {
          baseWithdrawnAmount: baseWithdrawnAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 2.1) Withdraw
    const [withdrawnBaseCoin] = strategyWithdraw(
      depositReserves.base.coinType,
      strategyOwnerCapId,
      suilendClient.findReserveArrayIndex(depositReserves.base.coinType),
      BigInt(
        new BigNumber(
          baseWithdrawnAmount
            .times(10 ** depositReserves.base.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        )
          .div(depositReserves.base.cTokenExchangeRate)
          .integerValue(BigNumber.ROUND_UP)
          .toString(),
      ),
      transaction,
    );

    // 2.2) Update state
    deposits = addOrInsertStrategyDeposit(deposits, {
      coinType: depositReserves.base.coinType,
      depositedAmount: baseWithdrawnAmount.times(-1),
    });

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] withdraw_base.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 3) Swap base for borrow
    // 3.1) Get routers
    const routers = await cetusSdk.findRouters({
      from: depositReserves.base.coinType,
      target: borrowReserve.coinType,
      amount: new BN(
        baseWithdrawnAmount
          .times(10 ** depositReserves.base.token.decimals)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      ),
      byAmountIn: true,
    });
    if (!routers) throw new Error("No swap quote found");

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] swap_base_for_borrows.get_routers`,
      {
        routers,
        amountIn: new BigNumber(routers.amountIn.toString())
          .div(10 ** depositReserves.base.token.decimals)
          .decimalPlaces(
            depositReserves.base.token.decimals,
            BigNumber.ROUND_DOWN,
          )
          .toFixed(20),
        amountOut: new BigNumber(routers.amountOut.toString())
          .div(10 ** borrowReserve.token.decimals)
          .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN)
          .toFixed(20),
      },
    );

    // 3.2) Swap
    let borrowCoin: TransactionObjectArgument;
    try {
      borrowCoin = await cetusSdk.fixableRouterSwapV3({
        router: routers,
        inputCoin: withdrawnBaseCoin,
        slippage: 1 / 100,
        txb: transaction,
        partner: cetusPartnerId,
      });
    } catch (err) {
      throw new Error("No swap quote found");
    }

    // 4) Repay borrows
    // 4.1) Repay
    const repaidAmount = fullRepaymentAmount;

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] repay_borrows.repay |`,
      JSON.stringify(
        {
          repaidAmount: repaidAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    suilendClient.repay(
      obligationId,
      borrowReserve.coinType,
      borrowCoin,
      transaction,
    );
    transaction.transferObjects([borrowCoin], _address); // Transfer remaining borrow to user

    // 4.2) Update state
    borrowedAmount = BigNumber.max(
      borrowedAmount.minus(repaidAmount),
      new BigNumber(0),
    );

    console.log(
      `[unloopStrategyToExposure.fullyRepayBorrowsUsingBase] repay_borrows.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 5) Swap remaining borrow to base and redeposit (not possible because coin is a mutable reference (?))
  };

  for (let i = 0; i < 30; i++) {
    const exposure = getStrategyExposure(
      reserveMap,
      lstMap,
      strategyType,
      getStrategySimulatedObligation(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
      ),
    );
    const pendingBorrowedAmount = borrowedAmount.minus(targetBorrowedAmount);

    console.log(
      `[unloopStrategyToExposure] ${i} start |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
          exposure: exposure.toFixed(20),
          pendingBorrowedAmount: pendingBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // Base+LST or LST only
    if (loopingDepositReserve.coinType === depositReserves.lst?.coinType) {
      // Target: 1x leverage
      if (targetBorrowedAmount.eq(0)) {
        if (pendingBorrowedAmount.lt(0)) break; // Fully repaid already

        if (depositReserve.coinType === depositReserves.base?.coinType) {
          const lstDeposit = deposits.find(
            (d) => d.coinType === depositReserves.lst!.coinType,
          )!;

          // Ran out of LST
          if (lstDeposit.depositedAmount.lte(STRATEGY_E)) {
            // 1. MAX withdraws LST (transferred to user as SUI)
            // 2. Withdraws base to cover borrows
            // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
            await fullyRepayBorrowsUsingBase();
            break;
          }

          // Borrows almost fully repaid
          if (pendingBorrowedAmount.lte(STRATEGY_E)) {
            try {
              // 1. Withdraws LST to cover borrows
              // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
              // 2. MAX withdraws remaining LST and redeposits as base
              await fullyRepayBorrowsUsingLst(true);
              break;
            } catch (err) {
              console.error(err);
            }

            // 1. MAX withdraws LST (transferred to user as SUI)
            // 2. Withdraws base to cover borrows
            // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
            await fullyRepayBorrowsUsingBase();
            break;
          }
        } else {
          // Borrows almost fully repaid
          if (pendingBorrowedAmount.lte(STRATEGY_E)) {
            // 1. Withdraws LST to cover borrows
            // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
            await fullyRepayBorrowsUsingLst(false);
            break;
          }
        }
      } else {
        if (pendingBorrowedAmount.lte(STRATEGY_E)) break;
      }

      // 1) Withdraw LST
      // 1.1) Max
      const stepMaxWithdrawnAmount = getStrategyStepMaxWithdrawnAmount(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
        loopingDepositReserve.coinType,
      )
        .times(0.9) // 10% buffer
        .decimalPlaces(
          loopingDepositReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        );
      const stepMaxRepaidAmount = new BigNumber(
        new BigNumber(
          stepMaxWithdrawnAmount.times(lst?.lstToSuiExchangeRate ?? 1),
        ).minus(
          getStrategyLstRedeemFee(
            lstMap,
            loopingDepositReserve.coinType,
            stepMaxWithdrawnAmount,
          ),
        ),
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopStrategyToExposure] ${i} withdraw_lst.max |`,
        JSON.stringify(
          {
            stepMaxWithdrawnAmount: stepMaxWithdrawnAmount.toFixed(20),
            stepMaxRepaidAmount: stepMaxRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Withdraw
      const stepWithdrawnAmount = BigNumber.min(
        pendingBorrowedAmount,
        stepMaxRepaidAmount,
      )
        .times(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
        .div(lst?.lstToSuiExchangeRate ?? 1)
        .decimalPlaces(
          loopingDepositReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        );
      const isMaxWithdraw = stepWithdrawnAmount.eq(stepMaxWithdrawnAmount);

      console.log(
        `[unloopStrategyToExposure] ${i} withdraw_lst.withdraw |`,
        JSON.stringify(
          {
            stepWithdrawnAmount: stepWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [stepWithdrawnCoin] = strategyWithdraw(
        loopingDepositReserve.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(loopingDepositReserve.coinType),
        BigInt(
          new BigNumber(
            stepWithdrawnAmount
              .times(10 ** loopingDepositReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(loopingDepositReserve.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );

      // 1.3) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: loopingDepositReserve.coinType,
        depositedAmount: stepWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopStrategyToExposure] ${i} withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Unstake LST for SUI
      const stepSuiCoin = lst!.client.redeem(transaction, stepWithdrawnCoin);

      // 3) Repay SUI
      // 3.1) Repay
      const stepRepaidAmount = new BigNumber(
        new BigNumber(
          stepWithdrawnAmount.times(lst?.lstToSuiExchangeRate ?? 1),
        ).minus(
          getStrategyLstRedeemFee(
            lstMap,
            loopingDepositReserve.coinType,
            stepWithdrawnAmount,
          ),
        ),
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const isMaxRepay = stepRepaidAmount.eq(stepMaxRepaidAmount);

      console.log(
        `[unloopStrategyToExposure] ${i} repay_sui.repay |`,
        JSON.stringify(
          {
            stepRepaidAmount: stepRepaidAmount.toFixed(20),
            isMaxRepay,
          },
          null,
          2,
        ),
      );

      suilendClient.repay(
        obligationId,
        borrowReserve.coinType,
        stepSuiCoin,
        transaction,
      );
      transaction.transferObjects([stepSuiCoin], _address);

      // 3.2) Update state
      borrowedAmount = borrowedAmount.minus(stepRepaidAmount);

      console.log(
        `[unloopStrategyToExposure] ${i} repay_sui.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    // Base only
    else if (
      loopingDepositReserve.coinType === depositReserves.base?.coinType
    ) {
      const exchangeRateRouters = await cetusSdk.findRouters({
        from: loopingDepositReserve.coinType,
        target: borrowReserve.coinType,
        amount: new BN(
          new BigNumber(0.1)
            .times(10 ** loopingDepositReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(), // e.g. 0.1 xBTC
        ),
        byAmountIn: true,
        splitCount: 0, // Use direct swap to avoid split algo
      });
      if (!exchangeRateRouters) throw new Error("No swap quote found");

      const baseToBorrowExchangeRate = new BigNumber(
        new BigNumber(exchangeRateRouters.amountOut.toString()).div(
          10 ** borrowReserve.token.decimals,
        ),
      ).div(
        new BigNumber(exchangeRateRouters.amountIn.toString()).div(
          10 ** loopingDepositReserve.token.decimals,
        ),
      );

      // Target: 1x leverage
      if (targetBorrowedAmount.eq(0)) {
        if (pendingBorrowedAmount.lt(0)) break; // Fully repaid already

        // Borrows almost fully repaid
        if (pendingBorrowedAmount.lte(STRATEGY_E)) {
          // 1. Withdraws base to cover borrows
          // - Leftover transferred to user as borrow coinType, e.g. SUI or wBTC
          await fullyRepayBorrowsUsingBase();
          break;
        }
      } else {
        if (pendingBorrowedAmount.lte(STRATEGY_E)) break;
      }

      // 1) Withdraw base
      // 1.1) Max
      const stepMaxWithdrawnAmount = getStrategyStepMaxWithdrawnAmount(
        reserveMap,
        lstMap,
        strategyType,
        deposits,
        borrowedAmount,
        loopingDepositReserve.coinType,
      )
        .times(0.9) // 10% buffer
        .decimalPlaces(
          loopingDepositReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        );
      const stepMaxRepaidAmount = new BigNumber(
        stepMaxWithdrawnAmount.times(baseToBorrowExchangeRate),
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopStrategyToExposure] ${i} withdraw_base.max |`,
        JSON.stringify(
          {
            stepMaxWithdrawnAmount: stepMaxWithdrawnAmount.toFixed(20),
            stepMaxRepaidAmount: stepMaxRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Withdraw
      const stepWithdrawnAmount = BigNumber.min(
        pendingBorrowedAmount,
        stepMaxRepaidAmount,
      )
        .div(baseToBorrowExchangeRate)
        .decimalPlaces(
          loopingDepositReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        );
      const isMaxWithdraw = stepWithdrawnAmount.eq(stepMaxWithdrawnAmount);

      console.log(
        `[unloopStrategyToExposure] ${i} withdraw_base.withdraw |`,
        JSON.stringify(
          {
            stepWithdrawnAmount: stepWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [stepWithdrawnCoin] = strategyWithdraw(
        loopingDepositReserve.coinType,
        strategyOwnerCapId,
        suilendClient.findReserveArrayIndex(loopingDepositReserve.coinType),
        BigInt(
          new BigNumber(
            stepWithdrawnAmount
              .times(10 ** loopingDepositReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(loopingDepositReserve.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );

      // 1.3) Update state
      deposits = addOrInsertStrategyDeposit(deposits, {
        coinType: loopingDepositReserve.coinType,
        depositedAmount: stepWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopStrategyToExposure] ${i} withdraw_base.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Swap base for borrows
      const routers = await cetusSdk.findRouters({
        from: loopingDepositReserve.coinType,
        target: borrowReserve.coinType,
        amount: new BN(
          stepWithdrawnAmount
            .times(10 ** loopingDepositReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ), // Estimate for loop 2 onwards (don't know exact out amount, we are not accounting for swap fees, etc)
        byAmountIn: true,
        splitCount: 0, // Use direct swap to avoid split algo
      });
      if (!routers) throw new Error("No swap quote found");

      const slippagePercent = 0.1;
      let stepBorrowCoin;
      try {
        stepBorrowCoin = await cetusSdk.fixableRouterSwapV3({
          router: routers,
          inputCoin: stepWithdrawnCoin,
          slippage: slippagePercent / 100,
          txb: transaction,
          partner: cetusPartnerId,
        });
      } catch (err) {
        throw new Error("No swap quote found");
      }
      console.log(
        `[unloopStrategyToExposure] ${i} swap_base_for_borrows |`,
        JSON.stringify(
          {
            inCoinType: loopingDepositReserve.coinType,
            outCoinType: borrowReserve.coinType,
            amountIn: stepWithdrawnAmount.toFixed(20),
            amountOut: new BigNumber(routers.amountOut.toString())
              .div(10 ** borrowReserve.token.decimals)
              .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN)
              .toFixed(20),
          },
          null,
          2,
        ),
        routers,
      );

      // 3) Repay borrows
      // 3.1) Repay
      const stepRepaidAmount = new BigNumber(
        new BigNumber(routers.amountOut.toString()).div(
          10 ** borrowReserve.token.decimals,
        ),
      ).decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
      const isMaxRepay = stepRepaidAmount.eq(stepMaxRepaidAmount);

      console.log(
        `[unloopStrategyToExposure] ${i} repay_borrows.repay |`,
        JSON.stringify(
          {
            stepRepaidAmount: stepRepaidAmount.toFixed(20),
            isMaxRepay,
          },
          null,
          2,
        ),
      );

      suilendClient.repay(
        obligationId,
        borrowReserve.coinType,
        stepBorrowCoin,
        transaction,
      );
      transaction.transferObjects([stepBorrowCoin], _address);

      // 3.2) Update state
      borrowedAmount = borrowedAmount.minus(stepRepaidAmount);

      console.log(
        `[unloopStrategyToExposure] ${i} repay_borrows.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            borrowedAmount: borrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    } else {
      throw new Error("No LST or base reserve found"); // Should not happen
    }
  }

  return { deposits, borrowedAmount, transaction };
};

export const strategyDepositTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string | undefined,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  deposit: StrategyDeposit,
  transaction: Transaction,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  console.log(
    `[strategyDepositTx] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        deposit: {
          coinType: deposit.coinType,
          depositedAmount: deposit.depositedAmount.toFixed(20),
        },
      },
      null,
      2,
    ),
  );

  const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

  //

  let deposits = cloneDeep(_deposits);
  const borrowedAmount = _borrowedAmount;

  // 1) Deposit
  // 1.1) SUI
  if (isSui(deposit.coinType)) {
    if (depositReserves.lst === undefined)
      throw new Error("LST reserve not found");

    const suiAmount = deposit.depositedAmount;
    const lstAmount = new BigNumber(
      suiAmount
        .minus(
          getStrategyLstMintFee(
            lstMap,
            depositReserves.lst.coinType,
            suiAmount,
          ),
        )
        .times(lst?.suiToLstExchangeRate ?? 1),
    ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

    // 1.1.1) Split coins
    const suiCoin = transaction.splitCoins(transaction.gas, [
      suiAmount
        .times(10 ** SUI_DECIMALS)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(),
    ]);

    // 1.1.2) Stake SUI for LST
    const lstCoin = lst!.client.mint(transaction, suiCoin);

    // 1.1.3) Deposit LST (1x exposure)
    strategyDeposit(
      lstCoin,
      depositReserves.lst.coinType,
      strategyOwnerCapId,
      suilendClient.findReserveArrayIndex(depositReserves.lst.coinType),
      transaction,
    );

    // 1.1.4) Update state
    deposits = addOrInsertStrategyDeposit(deposits, {
      coinType: depositReserves.lst.coinType,
      depositedAmount: lstAmount,
    });
  }

  // 1.2) LST
  else if (deposit.coinType === depositReserves.lst?.coinType) {
    // 1.2.1) Split coins
    const allCoinsLst = await getAllCoins(
      suiClient,
      _address,
      depositReserves.lst.coinType,
    );
    const mergeCoinLst = mergeAllCoins(
      depositReserves.lst.coinType,
      transaction,
      allCoinsLst,
    );

    const lstCoin = transaction.splitCoins(
      transaction.object(mergeCoinLst.coinObjectId),
      [
        BigInt(
          deposit.depositedAmount
            .times(10 ** LST_DECIMALS)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
      ],
    );

    // 1.2.2) Deposit LST (1x exposure)
    strategyDeposit(
      lstCoin,
      depositReserves.lst.coinType,
      strategyOwnerCapId,
      suilendClient.findReserveArrayIndex(depositReserves.lst.coinType),
      transaction,
    );

    // 1.2.3) Update state
    deposits = addOrInsertStrategyDeposit(deposits, deposit);

    // 1.3) Other
  } else {
    const otherReserve = reserveMap[deposit.coinType];

    // 1.3.1) Split coins
    const allCoinsOther = await getAllCoins(
      suiClient,
      _address,
      otherReserve.coinType,
    );
    const mergeCoinOther = mergeAllCoins(
      otherReserve.coinType,
      transaction,
      allCoinsOther,
    );

    const otherCoin = transaction.splitCoins(
      transaction.object(mergeCoinOther.coinObjectId),
      [
        BigInt(
          deposit.depositedAmount
            .times(10 ** otherReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
      ],
    );

    // 1.3.2) Deposit other (1x exposure)
    strategyDeposit(
      otherCoin,
      otherReserve.coinType,
      strategyOwnerCapId,
      suilendClient.findReserveArrayIndex(otherReserve.coinType),
      transaction,
    );

    // 1.3.3) Update state
    deposits = addOrInsertStrategyDeposit(deposits, deposit);
  }

  console.log(
    `[deposit] deposit |`,
    JSON.stringify(
      {
        deposits: deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        borrowedAmount: borrowedAmount.toFixed(20),
      },
      null,
      2,
    ),
  );

  return { deposits, borrowedAmount, transaction };
};

export const strategyDepositAndLoopToExposureTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string | undefined,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  deposit: StrategyDeposit,
  targetExposure: BigNumber,
  transaction: Transaction,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  console.log(
    `[depositAndLoopToExposure] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        deposit: {
          coinType: deposit.coinType,
          depositedAmount: deposit.depositedAmount.toFixed(20),
        },
        targetExposure: targetExposure.toFixed(20),
      },
      null,
      2,
    ),
  );

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  // 1) Deposit (1x exposure)
  // 1.1) Deposit
  const {
    deposits: newDeposits,
    borrowedAmount: newBorrowedAmount,
    transaction: newTransaction,
  } = await strategyDepositTx(
    reserveMap,
    lstMap,
    strategyType,

    suiClient,
    suilendClient,
    cetusSdk,
    cetusPartnerId,

    _address,
    strategyOwnerCapId,
    obligationId,
    deposits,
    borrowedAmount,
    deposit,
    transaction,
  );

  // 1.2) Update state
  deposits = newDeposits;
  borrowedAmount = newBorrowedAmount;
  transaction = newTransaction;

  if (targetExposure.gt(1)) {
    // 2) Loop to target exposure
    // 2.1) Loop
    const {
      deposits: newDeposits2,
      borrowedAmount: newBorrowedAmount2,
      transaction: newTransaction2,
    } = await strategyLoopToExposureTx(
      reserveMap,
      lstMap,
      strategyType,

      suiClient,
      suilendClient,
      cetusSdk,
      cetusPartnerId,

      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      borrowedAmount,
      undefined, // Don't pass targetBorrowedAmount
      targetExposure, // Pass targetExposure
      transaction,
    );

    // 2.2) Update state
    deposits = newDeposits2;
    borrowedAmount = newBorrowedAmount2;
    transaction = newTransaction2;
  }

  return { deposits, borrowedAmount, transaction };
};

export const strategyWithdrawTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  withdraw: StrategyWithdraw,
  transaction: Transaction,
  returnWithdrawnCoin?: boolean,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
  withdrawnCoin?: TransactionArgument;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  console.log(
    `[strategyWithdraw] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        withdraw: {
          coinType: withdraw.coinType,
          withdrawnAmount: withdraw.withdrawnAmount.toFixed(20),
        },
        returnWithdrawnCoin,
      },
      null,
      2,
    ),
  );

  const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  const withdrawnAmount = (
    depositReserve.coinType === depositReserves.base?.coinType
      ? withdraw.withdrawnAmount
      : isSui(withdraw.coinType)
        ? withdraw.withdrawnAmount
            .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
            .div(lst?.lstToSuiExchangeRate ?? 1)
        : withdraw.withdrawnAmount
  ).decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_DOWN);
  const withdrawnAmountUsd = withdrawnAmount
    .times(depositReserve.price)
    .times(
      depositReserve.coinType === depositReserves.base?.coinType
        ? 1
        : new BigNumber(lst?.lstToSuiExchangeRate ?? 1).times(
            1 - +(lst?.redeemFeePercent ?? 0) / 100,
          ),
    );

  const exposure = getStrategyExposure(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  );
  const tvlAmountUsd = getStrategyTvlAmount(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  ).times(defaultCurrencyReserve.price);
  const targetTvlAmountUsd = tvlAmountUsd.minus(withdrawnAmountUsd);
  const targetBorrowedAmount = targetTvlAmountUsd
    .times(exposure.minus(1))
    .div(borrowReserve.price)
    .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

  console.log(
    `[withdraw] processed_args |`,
    JSON.stringify(
      {
        depositReserve_coinType: depositReserve.coinType,
        withdrawnAmount: withdrawnAmount.toFixed(20),
        withdrawnAmountUsd: withdrawnAmountUsd.toFixed(20),

        exposure: exposure.toFixed(20),
        tvlAmountUsd: tvlAmountUsd.toFixed(20),
        targetTvlAmountUsd: targetTvlAmountUsd.toFixed(20),
        targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
      },
      null,
      2,
    ),
  );

  // 1) Unloop to targetBorrowedAmount borrows
  // 1.1) Unloop
  if (borrowedAmount.gt(targetBorrowedAmount)) {
    const {
      deposits: newDeposits,
      borrowedAmount: newBorrowedAmount,
      transaction: newTransaction,
    } = await strategyUnloopToExposureTx(
      reserveMap,
      lstMap,
      strategyType,

      suiClient,
      suilendClient,
      cetusSdk,
      cetusPartnerId,

      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      borrowedAmount,
      targetBorrowedAmount, // Pass targetBorrowedAmount
      undefined, // Don't pass targetExposure
      transaction,
    );

    // 1.2) Update state
    deposits = newDeposits;
    borrowedAmount = newBorrowedAmount;
    transaction = newTransaction;

    console.log(
      `[withdraw] unloop.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),

          targetBorrowedAmount: targetBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );
  }

  // 2) Withdraw base or LST
  // 2.1) Withdraw
  const [withdrawnCoin] = strategyWithdraw(
    depositReserve.coinType,
    strategyOwnerCapId,
    suilendClient.findReserveArrayIndex(depositReserve.coinType),
    BigInt(
      new BigNumber(
        withdrawnAmount
          .times(10 ** depositReserve.token.decimals)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      )
        .div(depositReserve.cTokenExchangeRate)
        .integerValue(BigNumber.ROUND_UP)
        .toString(),
    ),
    transaction,
  );

  // 2.2) Update state
  deposits = addOrInsertStrategyDeposit(deposits, {
    coinType: depositReserve.coinType,
    depositedAmount: withdrawnAmount.times(-1),
  });

  const newExposure = getStrategyExposure(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  );
  const newTvlAmountUsd = getStrategyTvlAmount(
    reserveMap,
    lstMap,
    strategyType,
    getStrategySimulatedObligation(
      reserveMap,
      lstMap,
      strategyType,
      deposits,
      borrowedAmount,
    ),
  ).times(defaultCurrencyReserve.price);

  console.log(
    `[withdraw] withdraw.update_state |`,
    JSON.stringify(
      {
        deposits: deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        borrowedAmount: borrowedAmount.toFixed(20),

        exposure: exposure.toFixed(20),
        newExposure: newExposure.toFixed(20),

        tvlAmountUsd: tvlAmountUsd.toFixed(20),
        targetTvlAmountUsd: targetTvlAmountUsd.toFixed(20),
        newTvlAmountUsd: newTvlAmountUsd.toFixed(20),
      },
      null,
      2,
    ),
  );

  // 3) Transfer coin to user, or return coin
  if (returnWithdrawnCoin)
    return { deposits, borrowedAmount, transaction, withdrawnCoin };
  else {
    if (depositReserve.coinType === depositReserves.base?.coinType) {
      // 3.1) Transfer base to user
      transaction.transferObjects([withdrawnCoin], _address);
    } else {
      if (isSui(withdraw.coinType)) {
        // 3.1) Unstake LST for SUI
        const suiWithdrawnCoin = lst!.client.redeem(transaction, withdrawnCoin);

        // 3.2) Transfer SUI to user
        transaction.transferObjects([suiWithdrawnCoin], _address);
      } else {
        // 3.1) Transfer LST to user
        transaction.transferObjects([withdrawnCoin], _address);
      }
    }
  }

  return { deposits, borrowedAmount, transaction };
};

export const strategyMaxWithdrawTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,
  rewardPriceMap: Record<string, BigNumber | undefined>,
  rewardsMap: RewardsMap,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  withdrawCoinType: string,
  transaction: Transaction,
  dryRunTransaction: (
    transaction: Transaction,
    setGasBudget?: boolean,
  ) => Promise<DevInspectResults>,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  const hasClaimableRewards = Object.values(rewardsMap).some(({ amount }) =>
    amount.gt(0),
  );

  console.log(
    `[strategyMaxWithdraw] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        withdrawCoinType,
      },
      null,
      2,
    ),
  );

  const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  // 1) Unloop to 1x (base+LST: no LST and no borrows, LST: no borrows)
  if (borrowedAmount.gt(0)) {
    // 1.1) Unloop
    const {
      deposits: newDeposits,
      borrowedAmount: newBorrowedAmount,
      transaction: newTransaction,
    } = await strategyUnloopToExposureTx(
      reserveMap,
      lstMap,
      strategyType,

      suiClient,
      suilendClient,
      cetusSdk,
      cetusPartnerId,

      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      borrowedAmount,
      undefined, // Don't pass targetBorrowedAmount
      new BigNumber(1), // Pass targetExposure
      transaction,
    );

    // 1.2) Update state
    deposits = newDeposits;
    borrowedAmount = newBorrowedAmount;
    transaction = newTransaction;

    console.log(
      `[strategyMaxWithdraw] unloop.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          borrowedAmount: borrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );
  }

  // 2) MAX withdraw base or LST
  const [withdrawnCoin] = strategyWithdraw(
    depositReserve.coinType,
    strategyOwnerCapId,
    suilendClient.findReserveArrayIndex(depositReserve.coinType),
    BigInt(MAX_U64.toString()),
    transaction,
  );

  // 2.2) Update state
  deposits = [];

  console.log(
    `[strategyMaxWithdraw] max_withdraw.update_state |`,
    JSON.stringify(
      {
        deposits: deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        borrowedAmount: borrowedAmount.toFixed(20),
      },
      null,
      2,
    ),
  );

  // 3) Transfer coin to user
  if (depositReserve.coinType === depositReserves.base?.coinType) {
    // 3.1) Transfer base to user
    transaction.transferObjects([withdrawnCoin], _address);
  } else {
    if (isSui(withdrawCoinType)) {
      // 3.1) Unstake LST for SUI
      const suiWithdrawnCoin = lst!.client.redeem(transaction, withdrawnCoin);

      // 3.2) Transfer SUI to user
      transaction.transferObjects([suiWithdrawnCoin], _address);
    } else {
      // 3.1) Transfer LST to user
      transaction.transferObjects([withdrawnCoin], _address);
    }
  }

  // 4) Claim rewards, swap for withdrawCoinType, and transfer to user
  if (hasClaimableRewards) {
    try {
      const txCopy = Transaction.from(transaction);
      await strategyClaimRewardsAndSwapForCoinType(
        _address,
        cetusSdk,
        cetusPartnerId,
        rewardsMap,
        rewardPriceMap,
        reserveMap[withdrawCoinType],
        strategyOwnerCapId,
        false, // isDepositing (false = transfer to user)
        txCopy,
      );
      await dryRunTransaction(txCopy); // Throws error if fails

      transaction = txCopy;
    } catch (err) {
      // Don't block user if fails
      console.error(err);
    }
  }

  return { deposits, borrowedAmount, transaction };
};

export const strategyDepositAdjustWithdrawTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligationId: string,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  flashLoanBorrowedAmount: BigNumber,
  transaction: Transaction,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  const depositAdjustWithdrawExposure =
    STRATEGY_TYPE_EXPOSURE_MAP[strategyType].max;

  console.log(
    `[strategyDepositAdjustWithdraw] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        flashLoanBorrowedAmount: flashLoanBorrowedAmount.toFixed(20),
      },
      null,
      2,
    ),
  );

  const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

  //

  let deposits = cloneDeep(_deposits);
  let borrowedAmount = _borrowedAmount;

  // 1) Flash loan borrow
  const flashLoanObj = STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP[strategyType];

  if (depositReserve.coinType === depositReserves.lst?.coinType) {
    // TODO: Account for LST mint fees
    flashLoanBorrowedAmount = flashLoanBorrowedAmount
      .times(lst?.lstToSuiExchangeRate ?? 1)
      .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
  }

  let borrowedBalanceA, borrowedBalanceB, receipt;
  if (flashLoanObj.provider === StrategyFlashLoanProvider.MMT) {
    [borrowedBalanceA, borrowedBalanceB, receipt] = transaction.moveCall({
      target: `${MMT_CONTRACT_PACKAGE_ID}::trade::flash_loan`,
      typeArguments: [flashLoanObj.coinTypeA, flashLoanObj.coinTypeB],
      arguments: [
        transaction.object(flashLoanObj.poolId),
        transaction.pure.u64(
          flashLoanObj.borrowA
            ? flashLoanBorrowedAmount
                .times(
                  10 **
                    (depositReserve.coinType === depositReserves.lst?.coinType
                      ? SUI_DECIMALS
                      : depositReserve.token.decimals),
                )
                .integerValue(BigNumber.ROUND_DOWN)
                .toString()
            : 0,
        ),
        transaction.pure.u64(
          flashLoanObj.borrowA
            ? 0
            : flashLoanBorrowedAmount
                .times(
                  10 **
                    (depositReserve.coinType === depositReserves.lst?.coinType
                      ? SUI_DECIMALS
                      : depositReserve.token.decimals),
                )
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
        ),
        transaction.object(MMT_VERSION_OBJECT_ID),
      ],
    });
  } else {
    throw new Error("Invalid flash loan provider");
  }

  // 2) Deposit additional (to get back up to 100% health, so the user can then unloop back down to the max leverage shown in the UI)
  // 2.1) Deposit
  let depositedAmount = flashLoanBorrowedAmount;
  if (depositReserve.coinType === depositReserves.lst?.coinType)
    depositedAmount = new BigNumber(
      depositedAmount.minus(
        getStrategyLstMintFee(lstMap, depositReserve.coinType, depositedAmount),
      ),
    )
      .times(lst?.suiToLstExchangeRate ?? 1)
      .decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_DOWN);

  let flashLoanBorrowedCoin: any = transaction.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [
      flashLoanObj.borrowA ? flashLoanObj.coinTypeA : flashLoanObj.coinTypeB,
    ],
    arguments: [flashLoanObj.borrowA ? borrowedBalanceA : borrowedBalanceB],
  });
  if (depositReserve.coinType === depositReserves.lst?.coinType)
    flashLoanBorrowedCoin = lst!.client.mint(
      transaction,
      flashLoanBorrowedCoin,
    );

  strategyDeposit(
    flashLoanBorrowedCoin,
    depositReserve.coinType,
    strategyOwnerCapId,
    suilendClient.findReserveArrayIndex(depositReserve.coinType),
    transaction,
  );

  // 2.2) Update state
  deposits = addOrInsertStrategyDeposit(deposits, {
    coinType: depositReserve.coinType,
    depositedAmount,
  });

  // 3) Unloop to max exposure
  // 3.1) Unloop
  const {
    deposits: newDeposits,
    borrowedAmount: newBorrowedAmount,
    transaction: newTransaction,
  } = await strategyUnloopToExposureTx(
    reserveMap,
    lstMap,
    strategyType,

    suiClient,
    suilendClient,
    cetusSdk,
    cetusPartnerId,

    _address,
    strategyOwnerCapId,
    obligationId,
    deposits,
    borrowedAmount,
    undefined, // Don't pass targetBorrowedAmount
    depositAdjustWithdrawExposure, // Pass targetExposure
    transaction,
  );

  // 3.2) Update state
  deposits = newDeposits;
  borrowedAmount = newBorrowedAmount;
  transaction = newTransaction;

  // 4) Repay flash loan + fee
  // 4.1) Withdraw additional + fee
  let withdrawnAmount = depositedAmount
    .times(1 + flashLoanObj.feePercent / 100)
    .decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_UP);
  if (depositReserve.coinType === depositReserves.lst?.coinType)
    withdrawnAmount = withdrawnAmount
      .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
      .decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_UP);

  const {
    deposits: newDeposits2,
    borrowedAmount: newBorrowedAmount2,
    transaction: newTransaction2,
    withdrawnCoin,
  } = await strategyWithdrawTx(
    reserveMap,
    lstMap,
    strategyType,

    suiClient,
    suilendClient,
    cetusSdk,
    cetusPartnerId,

    _address,
    strategyOwnerCapId,
    obligationId,
    deposits,
    borrowedAmount,
    {
      coinType: depositReserve.coinType,
      withdrawnAmount,
    },
    transaction,
    true,
  );
  if (!withdrawnCoin) throw new Error("Withdrawn coin not found");

  let flashLoanRepayCoin = withdrawnCoin;
  if (depositReserve.coinType === depositReserves.lst?.coinType)
    flashLoanRepayCoin = lst!.client.redeem(
      transaction,
      flashLoanRepayCoin as TransactionObjectInput,
    );

  // 4.2) Repay flash loan
  const flashLoanRepayBalance = transaction.moveCall({
    target: "0x2::coin::into_balance",
    typeArguments: [
      flashLoanObj.borrowA ? flashLoanObj.coinTypeA : flashLoanObj.coinTypeB,
    ],
    arguments: [flashLoanRepayCoin],
  });
  if (flashLoanObj.provider === StrategyFlashLoanProvider.MMT) {
    transaction.moveCall({
      target: `${MMT_CONTRACT_PACKAGE_ID}::trade::repay_flash_loan`,
      typeArguments: [flashLoanObj.coinTypeA, flashLoanObj.coinTypeB],
      arguments: [
        transaction.object(flashLoanObj.poolId),
        receipt,
        flashLoanObj.borrowA ? flashLoanRepayBalance : borrowedBalanceA,
        flashLoanObj.borrowA ? borrowedBalanceB : flashLoanRepayBalance,
        transaction.object(MMT_VERSION_OBJECT_ID),
      ],
    });
  } else {
    throw new Error("Invalid flash loan provider");
  }

  // 4.3) Update state
  deposits = newDeposits2;
  borrowedAmount = newBorrowedAmount2;
  transaction = newTransaction2;

  return { deposits, borrowedAmount, transaction };
};

export const strategyAdjustTx = async (
  // AppContext
  reserveMap: Record<string, ParsedReserve>,

  // Strategy
  lstMap: StrategyLstMap,
  strategyType: StrategyType,

  suiClient: SuiClient,
  suilendClient: SuilendClient,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,

  _address: string,
  strategyOwnerCapId: TransactionObjectInput,
  obligation: ParsedObligation,
  _deposits: StrategyDeposit[],
  _borrowedAmount: BigNumber,
  targetExposure: BigNumber,
  transaction: Transaction,
): Promise<{
  deposits: StrategyDeposit[];
  borrowedAmount: BigNumber;
  transaction: Transaction;
}> => {
  const strategyInfo = STRATEGY_TYPE_INFO_MAP[strategyType];
  const lst =
    strategyInfo.depositLstCoinType !== undefined
      ? lstMap[strategyInfo.depositLstCoinType]
      : undefined;

  const depositReserves = getStrategyDepositReserves(reserveMap, strategyType);
  const borrowReserve = getStrategyBorrowReserve(reserveMap, strategyType);
  const defaultCurrencyReserve = getStrategyDefaultCurrencyReserve(
    reserveMap,
    strategyType,
  );

  const exposure = getStrategyExposure(
    reserveMap,
    lstMap,
    strategyType,
    obligation,
  );

  console.log(
    `[strategyAdjust] args |`,
    JSON.stringify(
      {
        _address,
        strategyOwnerCapId,
        obligationId: obligation.id,
        _deposits: _deposits.map((d) => ({
          coinType: d.coinType,
          depositedAmount: d.depositedAmount.toFixed(20),
        })),
        _borrowedAmount: _borrowedAmount.toFixed(20),
        targetExposure: targetExposure.toFixed(20),
      },
      null,
      2,
    ),
  );

  //

  const deposits = cloneDeep(_deposits);
  const borrowedAmount = _borrowedAmount;

  // 1) Loop or unloop to target exposure
  if (targetExposure.gt(exposure))
    return strategyLoopToExposureTx(
      reserveMap,
      lstMap,
      strategyType,

      suiClient,
      suilendClient,
      cetusSdk,
      cetusPartnerId,

      _address,
      strategyOwnerCapId,
      obligation.id,
      deposits,
      borrowedAmount,
      undefined, // Don't pass targetBorrowedAmount
      targetExposure, // Pass targetExposure
      transaction,
    );
  else if (targetExposure.lt(exposure))
    return strategyUnloopToExposureTx(
      reserveMap,
      lstMap,
      strategyType,

      suiClient,
      suilendClient,
      cetusSdk,
      cetusPartnerId,

      _address,
      strategyOwnerCapId,
      obligation.id,
      deposits,
      borrowedAmount,
      undefined, // Don't pass targetBorrowedAmount
      targetExposure, // Pass targetExposure
      transaction,
    );
  else return { deposits, borrowedAmount, transaction };
};
