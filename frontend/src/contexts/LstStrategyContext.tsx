import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import {
  ParsedObligation,
  ParsedReserve,
  WAD,
  getNetAprPercent,
  getRewardsMap,
} from "@suilend/sdk";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
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
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  isSui,
} from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { getWeightedBorrowsUsd } from "@/components/shared/UtilizationBar";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { EventType } from "@/lib/events";

export type DepositEvent = {
  type: EventType.DEPOSIT;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type WithdrawEvent = {
  type: EventType.WITHDRAW;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type BorrowEvent = {
  type: EventType.BORROW;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type RepayEvent = {
  type: EventType.REPAY;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type ObligationDataEvent = {
  type: EventType.OBLIGATION_DATA;
  timestampS: number;
  eventIndex: number;
  depositedValueUsd: BigNumber;
  digest: string;
};
export type ClaimRewardEvent = {
  type: EventType.CLAIM_REWARD;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type HistoryEvent =
  | DepositEvent
  | WithdrawEvent
  | BorrowEvent
  | RepayEvent
  | ObligationDataEvent
  | ClaimRewardEvent;

export const E = 10 ** -6;
export const LST_DECIMALS = 9;

export type Deposit = { coinType: string; depositedAmount: BigNumber };
export type Withdraw = { coinType: string; withdrawnAmount: BigNumber };

export const addOrInsertDeposit = (
  _deposits: Deposit[],
  deposit: Deposit,
): Deposit[] => {
  const deposits = cloneDeep(_deposits);

  const existingDeposit = deposits.find((d) => d.coinType === deposit.coinType);
  if (existingDeposit)
    existingDeposit.depositedAmount = existingDeposit.depositedAmount.plus(
      deposit.depositedAmount,
    );
  else deposits.push(deposit);

  return deposits;
};

interface LstStrategyContext {
  // More details
  isMoreDetailsOpen: boolean;
  setIsMoreDetailsOpen: Dispatch<SetStateAction<boolean>>;

  // Obligations
  hasPosition: (obligation: ParsedObligation) => boolean;

  // SUI
  suiReserve: ParsedReserve;
  suiBorrowFeePercent: BigNumber;

  // LST
  lstMap:
    | Record<
        string,
        {
          client: LstClient;
          liquidStakingInfo: LiquidStakingInfo<string>;

          mintFeePercent: BigNumber;
          redeemFeePercent: BigNumber;

          suiToLstExchangeRate: BigNumber;
          lstToSuiExchangeRate: BigNumber;
        }
      >
    | undefined;
  getLstMintFee: (lstCoinType: string, suiAmount: BigNumber) => BigNumber;
  getLstRedeemFee: (lstCoinType: string, lstAmount: BigNumber) => BigNumber;

  // Exposure map
  exposureMap: Record<
    StrategyType,
    { min: BigNumber; max: BigNumber; default: BigNumber }
  >;

  // Reserves
  getDepositReserves: (strategyType: StrategyType) => {
    base?: ParsedReserve;
    lst: ParsedReserve;
  };
  getDefaultCurrencyReserve: (strategyType: StrategyType) => ParsedReserve;

  // Calculations
  getSimulatedObligation: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
  ) => ParsedObligation;
  getDepositedAmount: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => BigNumber;
  getBorrowedAmount: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => BigNumber;
  getTvlAmount: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => BigNumber;
  getExposure: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => BigNumber;
  getStepMaxSuiBorrowedAmount: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;
  getStepMaxWithdrawnAmount: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
    withdrawCoinType: string,
  ) => BigNumber;

  // Simulate
  simulateLoopToExposure: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
    targetSuiBorrowedAmount: BigNumber | undefined,
    targetExposure: BigNumber | undefined, // Must be defined if targetSuiBorrowedAmount is undefined
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDeposit: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
    deposit: Deposit,
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDepositAndLoopToExposure: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
    deposit: Deposit,
    targetExposure: BigNumber,
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };

  // Stats
  getGlobalTvlAmountUsd: (
    strategyType: StrategyType,
  ) => BigNumber | null | undefined;
  getUnclaimedRewardsAmount: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => BigNumber;
  getHistory: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => Promise<HistoryEvent[]>;
  getHistoricalTvlAmount: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => Promise<BigNumber | undefined>;
  getAprPercent: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
    exposure?: BigNumber,
  ) => BigNumber;
  getHealthPercent: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
    exposure?: BigNumber,
  ) => BigNumber;
  getLiquidationPrice: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
    exposure?: BigNumber,
  ) => BigNumber | null;
}
type LoadedLstStrategyContext = LstStrategyContext & {
  lstMap: Record<
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
};

const defaultContextValue: LstStrategyContext = {
  // More details
  isMoreDetailsOpen: false,
  setIsMoreDetailsOpen: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Obligations
  hasPosition: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // SUI
  suiReserve: {} as ParsedReserve,
  suiBorrowFeePercent: new BigNumber(0),

  // LST
  lstMap: undefined,
  getLstMintFee: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getLstRedeemFee: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Exposure map
  exposureMap: {} as Record<
    StrategyType,
    { min: BigNumber; max: BigNumber; default: BigNumber }
  >,

  // Reserves
  getDepositReserves: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getDefaultCurrencyReserve: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Calculations
  getSimulatedObligation: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getDepositedAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getBorrowedAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getTvlAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getExposure: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getStepMaxSuiBorrowedAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getStepMaxWithdrawnAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Simulate
  simulateLoopToExposure: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  simulateDeposit: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  simulateDepositAndLoopToExposure: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Stats
  getGlobalTvlAmountUsd: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getUnclaimedRewardsAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getHistory: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getHistoricalTvlAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getAprPercent: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getHealthPercent: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getLiquidationPrice: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
};

const LstStrategyContext =
  createContext<LstStrategyContext>(defaultContextValue);

export const useLstStrategyContext = () => useContext(LstStrategyContext);
export const useLoadedLstStrategyContext = () =>
  useLstStrategyContext() as LoadedLstStrategyContext;

export function LstStrategyContextProvider({ children }: PropsWithChildren) {
  const { suiClient } = useSettingsContext();
  const { userData } = useLoadedUserContext();
  const { allAppData, appData, isLst } = useLoadedAppContext();

  // More details
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useLocalStorage<boolean>(
    "LstStrategyContext_isMoreDetailsOpen",
    false,
  );

  // Obligations
  const hasPosition = useCallback(
    (obligation: ParsedObligation) => obligation.deposits.length > 0,
    [],
  );

  // SUI
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const suiBorrowFeePercent = useMemo(
    () => new BigNumber(suiReserve.config.borrowFeeBps).div(100),
    [suiReserve.config.borrowFeeBps],
  );

  // LST
  const [lstMap, setLstMap] = useState<
    | Record<
        string,
        {
          client: LstClient;
          liquidStakingInfo: LiquidStakingInfo<string>;

          mintFeePercent: BigNumber;
          redeemFeePercent: BigNumber;

          suiToLstExchangeRate: BigNumber;
          lstToSuiExchangeRate: BigNumber;
        }
      >
    | undefined
  >(undefined);

  const fetchLstMap = useCallback(async () => {
    try {
      const lstCoinTypes = Array.from(
        new Set([
          ...Object.values(STRATEGY_TYPE_INFO_MAP).map(
            ({ depositLstCoinType }) => depositLstCoinType,
          ),

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

      const result: Record<
        string,
        {
          client: LstClient;
          liquidStakingInfo: LiquidStakingInfo<string>;

          mintFeePercent: BigNumber;
          redeemFeePercent: BigNumber;

          suiToLstExchangeRate: BigNumber;
          lstToSuiExchangeRate: BigNumber;
        }
      > = Object.fromEntries(
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
            const json: { timestamp: number; value: string }[] =
              await res.json();
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
      setLstMap(result);
    } catch (err) {
      console.error(err);
    }
  }, [suiClient]);
  // console.log(
  //   `[LstStrategyContextProvider] lstMap: ${JSON.stringify(
  //     Object.fromEntries(
  //       Object.entries(lstMap ?? {}).map(([depositLstCoinType, lst]) => {
  //         const { client, liquidStakingInfo, ...restLst } = lst;
  //         return [depositLstCoinType, restLst];
  //       }),
  //     ),
  //     null,
  //     2,
  //   )}`,
  // );

  const didFetchLstMap = useRef<boolean>(false);
  useEffect(() => {
    if (didFetchLstMap.current) return;
    didFetchLstMap.current = true;

    fetchLstMap();
  }, [fetchLstMap]);

  const getLstMintFee = useCallback(
    (lstCoinType: string, suiAmount: BigNumber) => {
      const mintFeePercent =
        lstMap?.[lstCoinType]?.mintFeePercent ?? new BigNumber(0);

      return suiAmount
        .times(mintFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
    },
    [lstMap],
  );
  const getLstRedeemFee = useCallback(
    (lstCoinType: string, lstAmount: BigNumber) => {
      const lstToSuiExchangeRate =
        lstMap?.[lstCoinType]?.lstToSuiExchangeRate ?? new BigNumber(1);
      const redeemFeePercent =
        lstMap?.[lstCoinType]?.redeemFeePercent ?? new BigNumber(0);

      const suiAmount = lstAmount.times(lstToSuiExchangeRate);

      return suiAmount
        .times(redeemFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
    },
    [lstMap],
  );

  // Exposure map
  const exposureMap = useMemo(
    () => ({
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
    }),
    [],
  );

  // Reserves
  const getDepositReserves = useCallback(
    (
      strategyType: StrategyType,
    ): {
      base?: ParsedReserve;
      lst: ParsedReserve;
    } => {
      const depositBaseCoinType =
        STRATEGY_TYPE_INFO_MAP[strategyType].depositBaseCoinType;
      const depositLstCoinType =
        STRATEGY_TYPE_INFO_MAP[strategyType].depositLstCoinType;

      return {
        base:
          depositBaseCoinType === undefined
            ? undefined
            : appData.reserveMap[depositBaseCoinType],
        lst: appData.reserveMap[depositLstCoinType],
      };
    },
    [appData.reserveMap],
  );

  const getDefaultCurrencyReserve = useCallback(
    (strategyType: StrategyType) => {
      const defaultCurrencyCoinType =
        STRATEGY_TYPE_INFO_MAP[strategyType].defaultCurrencyCoinType;

      return appData.reserveMap[defaultCurrencyCoinType];
    },
    [appData.reserveMap],
  );

  // Calculations
  const getSimulatedObligation = useCallback(
    (
      strategyType: StrategyType,
      deposits: Deposit[],
      _suiBorrowedAmount: BigNumber,
    ): ParsedObligation => {
      const suiBorrowedAmount = BigNumber.max(
        new BigNumber(0),
        _suiBorrowedAmount,
      ); // Can't be negative

      const obligation = {
        deposits: deposits.reduce(
          (acc, deposit) => {
            const depositReserve = appData.reserveMap[deposit.coinType];

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
            borrowedAmount: suiBorrowedAmount,
            borrowedAmountUsd: suiBorrowedAmount.times(suiReserve.price),
            reserve: suiReserve,
            coinType: NORMALIZED_SUI_COINTYPE,
          },
        ],

        netValueUsd: deposits
          .reduce((acc, deposit) => {
            const depositReserve = appData.reserveMap[deposit.coinType];

            return acc.plus(
              deposit.depositedAmount.times(depositReserve.price),
            );
          }, new BigNumber(0))
          .minus(suiBorrowedAmount.times(suiReserve.price)),
        weightedBorrowsUsd: new BigNumber(
          suiBorrowedAmount.times(suiReserve.price),
        ).times(suiReserve.config.borrowWeightBps.div(10000)),
        maxPriceWeightedBorrowsUsd: new BigNumber(
          suiBorrowedAmount.times(suiReserve.maxPrice),
        ).times(suiReserve.config.borrowWeightBps.div(10000)),
        minPriceBorrowLimitUsd: BigNumber.min(
          deposits.reduce((acc, deposit) => {
            const depositReserve = appData.reserveMap[deposit.coinType];

            return acc.plus(
              deposit.depositedAmount
                .times(depositReserve.minPrice)
                .times(depositReserve.config.openLtvPct / 100),
            );
          }, new BigNumber(0)),
          30 * 10 ** 6, // Cap `minPriceBorrowLimitUsd` at $30m (account borrow limit)
        ),
        unhealthyBorrowValueUsd: deposits.reduce((acc, deposit) => {
          const depositReserve = appData.reserveMap[deposit.coinType];

          return acc.plus(
            deposit.depositedAmount
              .times(depositReserve.price)
              .times(depositReserve.config.closeLtvPct / 100),
          );
        }, new BigNumber(0)),
      } as ParsedObligation;

      return obligation;
    },
    [appData.reserveMap, suiReserve],
  );

  const getDepositedAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation) => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      let resultSui = new BigNumber(0);
      for (const deposit of obligation.deposits) {
        if (isSui(deposit.coinType)) {
          resultSui = resultSui.plus(deposit.depositedAmount);
        } else if (isLst(deposit.coinType)) {
          const lstToSuiExchangeRate =
            lstMap?.[deposit.coinType]?.lstToSuiExchangeRate ??
            new BigNumber(1);
          // const redeemFeePercent =
          //   lstMap?.[deposit.coinType]?.redeemFeePercent ?? new BigNumber(0);

          resultSui = resultSui.plus(
            deposit.depositedAmount.times(lstToSuiExchangeRate), // Don't include LST redemption fees (i.e. don't multiply by `new BigNumber(1).minus(redeemFeePercent.div(100))`)
          );
        } else {
          const depositReserve = appData.reserveMap[deposit.coinType];
          const priceSui = depositReserve.price.div(suiReserve.price);

          resultSui = resultSui.plus(deposit.depositedAmount.times(priceSui));
        }
      }

      const resultUsd = resultSui.times(suiReserve.price);
      const result = resultUsd.div(defaultCurrencyReserve.price);

      return result.decimalPlaces(
        defaultCurrencyReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );
    },
    [
      hasPosition,
      getDefaultCurrencyReserve,
      isLst,
      lstMap,
      appData.reserveMap,
      suiReserve.price,
    ],
  );
  const getBorrowedAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation) => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      let resultSui = new BigNumber(0);
      for (const borrow of obligation.borrows) {
        if (isSui(borrow.coinType)) {
          resultSui = resultSui.plus(borrow.borrowedAmount);
        } else {
          // TODO: Handle other borrow types
        }
      }

      const resultUsd = resultSui.times(suiReserve.price);
      const result = resultUsd.div(defaultCurrencyReserve.price);

      return result.decimalPlaces(
        defaultCurrencyReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );
    },
    [hasPosition, getDefaultCurrencyReserve, suiReserve.price],
  );

  const getTvlAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation): BigNumber => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      return getDepositedAmount(strategyType, obligation).minus(
        getBorrowedAmount(strategyType, obligation),
      );
    },
    [hasPosition, getDepositedAmount, getBorrowedAmount],
  );

  const getExposure = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation): BigNumber => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const depositedAmountUsd = getDepositedAmount(
        strategyType,
        obligation,
      ).times(defaultCurrencyReserve.price);
      const borrowedAmountUsd = getBorrowedAmount(
        strategyType,
        obligation,
      ).times(defaultCurrencyReserve.price);

      return depositedAmountUsd.eq(0)
        ? new BigNumber(0)
        : depositedAmountUsd.div(depositedAmountUsd.minus(borrowedAmountUsd));
    },
    [
      hasPosition,
      getDefaultCurrencyReserve,
      getDepositedAmount,
      getBorrowedAmount,
    ],
  );

  const getStepMaxSuiBorrowedAmount = useCallback(
    (
      strategyType: StrategyType,
      deposits: Deposit[],
      suiBorrowedAmount: BigNumber,
    ): BigNumber => {
      return deposits
        .reduce((acc, deposit) => {
          const depositReserve = appData.reserveMap[deposit.coinType];
          const priceSui = depositReserve.price.div(suiReserve.price);

          return acc.plus(
            new BigNumber(
              new BigNumber(depositReserve.config.openLtvPct)
                .div(100)
                .times(depositReserve.minPrice.div(depositReserve.maxPrice)),
            )
              .times(deposit.depositedAmount)
              .times(priceSui),
          );
        }, new BigNumber(0))
        .minus(suiBorrowedAmount)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
    },
    [appData.reserveMap, suiReserve],
  );
  const getStepMaxWithdrawnAmount = useCallback(
    (
      strategyType: StrategyType,
      deposits: Deposit[],
      suiBorrowedAmount: BigNumber,
      withdrawCoinType: string,
    ): BigNumber => {
      const obligation = getSimulatedObligation(
        strategyType,
        deposits,
        suiBorrowedAmount,
      );

      const withdrawReserve = appData.reserveMap[withdrawCoinType];

      return obligation.maxPriceWeightedBorrowsUsd.gt(
        obligation.minPriceBorrowLimitUsd,
      )
        ? new BigNumber(0)
        : withdrawReserve.config.openLtvPct > 0
          ? BigNumber.min(
              obligation.minPriceBorrowLimitUsd
                .minus(obligation.maxPriceWeightedBorrowsUsd)
                .div(withdrawReserve.minPrice)
                .div(withdrawReserve.config.openLtvPct / 100),
              deposits.find(
                (deposit) => deposit.coinType === withdrawReserve.coinType,
              )?.depositedAmount ?? new BigNumber(0),
            ).decimalPlaces(
              withdrawReserve.token.decimals,
              BigNumber.ROUND_DOWN,
            )
          : MAX_U64; // Infinity
    },
    [getSimulatedObligation, appData.reserveMap],
  );

  // Simulate
  const simulateLoopToExposure = useCallback(
    (
      strategyType: StrategyType,
      _deposits: Deposit[],
      _suiBorrowedAmount: BigNumber,
      _targetSuiBorrowedAmount: BigNumber | undefined,
      _targetExposure: BigNumber | undefined, // Must be defined if _targetSuiBorrowedAmount is undefined
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const depositReserves = getDepositReserves(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const suiToLstExchangeRate =
        lstMap?.[depositReserves.lst.coinType]?.suiToLstExchangeRate ??
        new BigNumber(1);

      //

      let deposits = cloneDeep(_deposits);
      let suiBorrowedAmount = _suiBorrowedAmount;

      const tvlAmountUsd = getTvlAmount(
        strategyType,
        getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
      ).times(defaultCurrencyReserve.price);
      const targetSuiBorrowedAmount =
        _targetSuiBorrowedAmount ??
        tvlAmountUsd
          .times(_targetExposure!.minus(1))
          .div(suiReserve.price)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          strategyType,
          getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
        );
        const pendingSuiBorrowedAmount =
          targetSuiBorrowedAmount.minus(suiBorrowedAmount);

        if (pendingSuiBorrowedAmount.lte(E)) break;

        // 1) Borrow SUI
        // 1.1) Max
        const stepMaxSuiBorrowedAmount = getStepMaxSuiBorrowedAmount(
          strategyType,
          deposits,
          suiBorrowedAmount,
        )
          .times(0.9) // 10% buffer
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxLstDepositedAmount = new BigNumber(
          stepMaxSuiBorrowedAmount.minus(
            getLstMintFee(
              depositReserves.lst.coinType,
              stepMaxSuiBorrowedAmount,
            ),
          ),
        )
          .times(suiToLstExchangeRate)
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

        // 1.2) Borrow
        const stepSuiBorrowedAmount = BigNumber.min(
          pendingSuiBorrowedAmount,
          stepMaxSuiBorrowedAmount,
        ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);

        // 1.3) Update state
        suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

        // 2) Deposit LST
        // 2.1) Stake SUI for LST

        // 2.2) Deposit
        const stepLstDepositedAmount = new BigNumber(
          stepSuiBorrowedAmount.minus(
            getLstMintFee(depositReserves.lst.coinType, stepSuiBorrowedAmount),
          ),
        )
          .times(suiToLstExchangeRate)
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxDeposit = stepLstDepositedAmount.eq(
          stepMaxLstDepositedAmount,
        );

        // 2.3) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: depositReserves.lst.coinType,
          depositedAmount: stepLstDepositedAmount,
        });
      }

      return {
        deposits,
        suiBorrowedAmount,
        obligation: getSimulatedObligation(
          strategyType,
          deposits,
          suiBorrowedAmount,
        ),
      };
    },
    [
      getDepositReserves,
      getDefaultCurrencyReserve,
      lstMap,
      getTvlAmount,
      getSimulatedObligation,
      suiReserve.price,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getLstMintFee,
    ],
  );

  const simulateDeposit = useCallback(
    (
      strategyType: StrategyType,
      _deposits: Deposit[],
      _suiBorrowedAmount: BigNumber,
      deposit: Deposit,
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const depositReserves = getDepositReserves(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const suiToLstExchangeRate =
        lstMap?.[depositReserves.lst.coinType]?.suiToLstExchangeRate ??
        new BigNumber(1);

      //

      let deposits = cloneDeep(_deposits);
      const suiBorrowedAmount = _suiBorrowedAmount;

      // 1) Deposit
      // 1.1) SUI
      if (isSui(deposit.coinType)) {
        const suiAmount = deposit.depositedAmount;
        const lstAmount = new BigNumber(
          suiAmount
            .minus(getLstMintFee(depositReserves.lst.coinType, suiAmount))
            .times(suiToLstExchangeRate),
        ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

        // 1.1.1) Split coins

        // 1.1.2) Stake SUI for LST

        // 1.1.3) Deposit LST (1x exposure)

        // 1.1.4) Update state
        deposits = addOrInsertDeposit(deposits, {
          coinType: depositReserves.lst.coinType,
          depositedAmount: lstAmount,
        });
      }

      // 1.2) LST
      else if (deposit.coinType === depositReserves.lst.coinType) {
        // 1.2.1) Split coins

        // 1.2.2) Deposit LST (1x exposure)

        // 1.2.3) Update state
        deposits = addOrInsertDeposit(deposits, deposit);
      }

      // 1.3) Other
      else {
        // 1.3.1) Split coins

        // 1.3.2) Deposit other (1x exposure)

        // 1.3.3) Update state
        deposits = addOrInsertDeposit(deposits, deposit);
      }

      return {
        deposits,
        suiBorrowedAmount,
        obligation: getSimulatedObligation(
          strategyType,
          deposits,
          suiBorrowedAmount,
        ),
      };
    },
    [
      getDepositReserves,
      getDefaultCurrencyReserve,
      lstMap,
      getLstMintFee,
      getSimulatedObligation,
    ],
  );

  const simulateDepositAndLoopToExposure = useCallback(
    (
      strategyType: StrategyType,
      _deposits: Deposit[],
      _suiBorrowedAmount: BigNumber,
      deposit: Deposit,
      targetExposure: BigNumber,
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      let deposits = cloneDeep(_deposits);
      let suiBorrowedAmount = _suiBorrowedAmount;
      let obligation = getSimulatedObligation(
        strategyType,
        deposits,
        suiBorrowedAmount,
      );

      // 1) Deposit (1x exposure)
      // 1.1) Deposit
      const {
        deposits: newDeposits,
        suiBorrowedAmount: newSuiBorrowedAmount,
        obligation: newObligation,
      } = simulateDeposit(strategyType, deposits, suiBorrowedAmount, deposit);

      // 1.2) Update state
      deposits = newDeposits;
      suiBorrowedAmount = newSuiBorrowedAmount;
      obligation = newObligation;

      if (targetExposure.gt(1)) {
        // 2) Loop to target exposure
        // 2.1) Loop
        const {
          deposits: newDeposits2,
          suiBorrowedAmount: newSuiBorrowedAmount2,
          obligation: newObligation2,
        } = simulateLoopToExposure(
          strategyType,
          deposits,
          suiBorrowedAmount,
          undefined, // Don't pass targetSuiBorrowedAmount
          targetExposure, // Pass targetExposure
        );

        // 2.2) Update state
        deposits = newDeposits2;
        suiBorrowedAmount = newSuiBorrowedAmount2;
        obligation = newObligation2;
      }

      return { deposits, suiBorrowedAmount, obligation };
    },
    [getSimulatedObligation, simulateDeposit, simulateLoopToExposure],
  );

  // Stats
  // Stats - Global TVL
  const [globalTvlAmountUsdMap, setGlobalTvlAmountUsdMap] = useState<
    Record<StrategyType, BigNumber | null>
  >(
    Object.values(StrategyType).reduce(
      (acc, strategyType) => ({ ...acc, [strategyType]: undefined }),
      {} as Record<StrategyType, BigNumber>,
    ),
  );

  const getGlobalTvlAmountUsd = useCallback(
    (strategyType: StrategyType): BigNumber | null | undefined =>
      globalTvlAmountUsdMap[strategyType],
    [globalTvlAmountUsdMap],
  );

  const fetchGlobalTvlAmountUsdMap = useCallback(async () => {
    (async () => {
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
        setGlobalTvlAmountUsdMap(result);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const didFetchGlobalTvlAmountUsdMapRef = useRef<boolean>(false);
  useEffect(() => {
    if (didFetchGlobalTvlAmountUsdMapRef.current) return;
    didFetchGlobalTvlAmountUsdMapRef.current = true;

    fetchGlobalTvlAmountUsdMap();
  }, [fetchGlobalTvlAmountUsdMap]);

  // Stats - Unclaimed rewards
  const getUnclaimedRewardsAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation): BigNumber => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const rewardsMap = getRewardsMap(
        obligation,
        userData.rewardMap,
        appData.coinMetadataMap,
      );

      const resultSui = Object.entries(rewardsMap).reduce(
        (acc, [coinType, { amount }]) => {
          if (isSui(coinType)) {
            return acc.plus(amount);
          } else if (isLst(coinType)) {
            const lstToSuiExchangeRate =
              lstMap?.[coinType]?.lstToSuiExchangeRate ?? new BigNumber(1);

            return acc.plus(amount.times(lstToSuiExchangeRate));
          } else {
            const price = appData.rewardPriceMap[coinType] ?? new BigNumber(0);
            const priceSui = price.div(suiReserve.price);

            return acc.plus(amount.times(priceSui));
          }
        },
        new BigNumber(0),
      );

      const resultUsd = resultSui.times(suiReserve.price);
      const result = resultUsd.div(defaultCurrencyReserve.price);

      return result.decimalPlaces(
        defaultCurrencyReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );
    },
    [
      hasPosition,
      getDefaultCurrencyReserve,
      userData.rewardMap,
      appData.coinMetadataMap,
      isLst,
      lstMap,
      appData.rewardPriceMap,
      suiReserve.price,
    ],
  );

  // Stats - History
  const getHistory = useCallback(
    async (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
    ): Promise<HistoryEvent[]> => {
      if (!obligation) return [];

      type DepositResult = {
        deposit: {
          timestamp: number;
          eventIndex: number;
          coinType: string;
          digest: string;
        };
        liquidityAmount: string;
      };
      type WithdrawResult = {
        withdraw: {
          timestamp: number;
          eventIndex: number;
          coinType: string;
          digest: string;
        };
        liquidityAmount: string;
      };
      type BorrowResult = {
        timestamp: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: string; // Includes origination fees
        digest: string;
      };
      type RepayResult = {
        timestamp: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: string;
        digest: string;
      };
      type ObligationDataEventResult = {
        timestamp: number;
        eventIndex: number;
        depositedValueUsd: string;
        digest: string;
      };
      type ClaimRewardEventResult = {
        timestamp: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: string;
        digest: string;
      };
      type Results = {
        deposits: DepositResult[];
        withdraws: WithdrawResult[];
        borrows: BorrowResult[];
        repays: RepayResult[];
        obligationDataEvents: ObligationDataEventResult[];
        claimRewardEvents: ClaimRewardEventResult[];
      };

      type Page = {
        results: Results;
        cursor: string | null;
      };

      const getPage = async (cursor?: string): Promise<Page> => {
        const url = `${API_URL}/obligations/history?${new URLSearchParams({
          obligationId: obligation.id,
          ...(cursor ? { cursor } : {}),
        })}`;
        const res = await fetch(url);
        const json: Page = await res.json();
        if ((json as any)?.statusCode === 500)
          throw new Error("Failed to fetch obligation history");

        return json;
      };

      // Get all pages
      const pages: Page[] = [];
      let page = await getPage();
      pages.push(page);

      while (page.cursor !== null) {
        page = await getPage(page.cursor);
        pages.push(page);
      }

      // Process pages
      const events: HistoryEvent[] = [];
      for (const page of pages) {
        for (const deposit of page.results.deposits) {
          events.push({
            type: EventType.DEPOSIT,
            timestampS: deposit.deposit.timestamp,
            eventIndex: deposit.deposit.eventIndex,
            coinType: normalizeStructTag(deposit.deposit.coinType),
            liquidityAmount: new BigNumber(deposit.liquidityAmount),
            digest: deposit.deposit.digest,
          });
        }
        for (const withdraw of page.results.withdraws) {
          events.push({
            type: EventType.WITHDRAW,
            timestampS: withdraw.withdraw.timestamp,
            eventIndex: withdraw.withdraw.eventIndex,
            coinType: normalizeStructTag(withdraw.withdraw.coinType),
            liquidityAmount: new BigNumber(withdraw.liquidityAmount),
            digest: withdraw.withdraw.digest,
          });
        }
        for (const borrow of page.results.borrows) {
          events.push({
            type: EventType.BORROW,
            timestampS: borrow.timestamp,
            eventIndex: borrow.eventIndex,
            coinType: normalizeStructTag(borrow.coinType),
            liquidityAmount: new BigNumber(borrow.liquidityAmount),
            digest: borrow.digest,
          });
        }
        for (const repay of page.results.repays) {
          events.push({
            type: EventType.REPAY,
            timestampS: repay.timestamp,
            eventIndex: repay.eventIndex,
            coinType: normalizeStructTag(repay.coinType),
            liquidityAmount: new BigNumber(repay.liquidityAmount),
            digest: repay.digest,
          });
        }
        for (const obligationDataEvent of page.results.obligationDataEvents) {
          events.push({
            type: EventType.OBLIGATION_DATA,
            timestampS: obligationDataEvent.timestamp,
            eventIndex: obligationDataEvent.eventIndex,
            depositedValueUsd: new BigNumber(
              obligationDataEvent.depositedValueUsd,
            ).div(WAD),
            digest: obligationDataEvent.digest,
          });
        }
        for (const claimRewardEvent of page.results.claimRewardEvents) {
          events.push({
            type: EventType.CLAIM_REWARD,
            timestampS: claimRewardEvent.timestamp,
            eventIndex: claimRewardEvent.eventIndex,
            coinType: normalizeStructTag(claimRewardEvent.coinType),
            liquidityAmount: new BigNumber(claimRewardEvent.liquidityAmount),
            digest: claimRewardEvent.digest,
          });
        }
      }
      const sortedEvents = events.sort((a, b) => {
        if (a.timestampS !== b.timestampS) return a.timestampS - b.timestampS; // Sort by timestamp (asc)
        if (a.eventIndex !== b.eventIndex) return a.eventIndex - b.eventIndex; // Sort by eventIndex (asc) if timestamp is the same
        return 0; // Should never happen
      });

      return sortedEvents;
    },
    [],
  );

  // Stats - Historical TVL
  const getHistoricalTvlAmount = useCallback(
    async (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
    ): Promise<BigNumber | undefined> => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const depositReserves = getDepositReserves(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      try {
        type ActionEvent =
          | DepositEvent
          | WithdrawEvent
          | BorrowEvent
          | RepayEvent;

        // Combine, sort, and filter events
        const sortedEvents = await getHistory(strategyType, obligation);
        // console.log(
        //   `XXX sortedEvents: ${JSON.stringify(
        //     sortedEvents.map((e, i) => ({ index: i, ...e })),
        //     null,
        //     2,
        //   )}`,
        // );

        // Only keep events for the current position (since last obligationDataEvent.depositedValueUsd === 0)
        const lastZeroDepositedValueUsdObligationDataEventIndex =
          sortedEvents.findLastIndex(
            (event) =>
              event.type === EventType.OBLIGATION_DATA &&
              (event as ObligationDataEvent).depositedValueUsd.eq(0),
          );
        // console.log(
        //   "XXX lastZeroDepositedValueUsdObligationDataEventIndex:",
        //   lastZeroDepositedValueUsdObligationDataEventIndex,
        // );

        const currentPositionSortedEvents =
          lastZeroDepositedValueUsdObligationDataEventIndex === -1
            ? sortedEvents
            : sortedEvents.slice(
                lastZeroDepositedValueUsdObligationDataEventIndex +
                  1 + // Exclude ObligationDataEvent
                  1, // Exclude last WithdrawEvent (ObligationDataEvent goes before WithdrawEvent)
              );

        while (
          currentPositionSortedEvents.length > 0 &&
          currentPositionSortedEvents[0].type === EventType.CLAIM_REWARD
        )
          currentPositionSortedEvents.shift(); // Remove all ClaimRewardEvents from the start (rewards are claimed after a MAX withdraw)

        // console.log(
        //   `XXX currentPositionSortedEvents: ${JSON.stringify(
        //     currentPositionSortedEvents.map((e, i) => ({
        //       index: i,
        //       ...e,
        //     })),
        //     null,
        //     2,
        //   )}`,
        // );

        const currentPositionFilteredSortedEvents =
          currentPositionSortedEvents.filter((event) => {
            if (depositReserves.base === undefined) return true; // No filtering if depositReserves.base is undefined (include LST/SUI looping events)
            return (
              event.type === EventType.OBLIGATION_DATA ||
              (event as ActionEvent | ClaimRewardEvent).coinType ===
                depositReserves.base.coinType // e.g. USDC
            );
          });
        // console.log(
        //   `XXX currentPositionFilteredSortedEvents: ${JSON.stringify(
        //     currentPositionFilteredSortedEvents.map((e, i) => ({
        //       index: i,
        //       ...e,
        //     })),
        //     null,
        //     2,
        //   )}`,
        // );

        // Return early if no events for current position
        if (currentPositionFilteredSortedEvents.length === 0) {
          console.log("XXX no events for current position", strategyType);
          return getTvlAmount(strategyType, obligation); // Return current TVL (no PnL)
        }

        // Get historical LST to SUI exchange rates for the relevant timestamps (current position deposits and withdraws)
        const lstToSuiExchangeRateTimestampsS = Array.from(
          new Set(
            currentPositionFilteredSortedEvents
              .filter(
                (event) =>
                  [EventType.DEPOSIT, EventType.WITHDRAW].includes(
                    event.type,
                  ) &&
                  (event as DepositEvent | WithdrawEvent).coinType ===
                    depositReserves.lst.coinType,
              )
              .map((event) => event.timestampS),
          ),
        );

        let lstToSuiExchangeRateMap: Record<number, BigNumber> = {};
        if (lstToSuiExchangeRateTimestampsS.length > 0) {
          const res = await fetch(
            `${API_URL}/springsui/historical-rates?coinType=${depositReserves.lst.coinType}&timestamps=${lstToSuiExchangeRateTimestampsS.join(",")}`,
          );
          const json: { timestamp: number; value: string }[] = await res.json();
          if ((json as any)?.statusCode === 500)
            throw new Error(
              `Failed to fetch historical LST to SUI exchange rates for ${depositReserves.lst.coinType}`,
            );

          lstToSuiExchangeRateMap = Object.fromEntries(
            json.map(({ timestamp, value }) => [
              timestamp,
              new BigNumber(value),
            ]),
          );
        }
        // console.log(
        //   "XXX lstToSuiExchangeRateMap:",
        //   JSON.stringify(lstToSuiExchangeRateMap, null, 2),
        // );

        // Calculate current position
        let depositedAmount = new BigNumber(0);
        let borrowedAmount = new BigNumber(0);
        for (let i = 0; i < currentPositionFilteredSortedEvents.length; i++) {
          const event = currentPositionFilteredSortedEvents[i];
          const previousEvent = currentPositionFilteredSortedEvents[i - 1];

          // Deposit/withdraw
          if (event.type === EventType.DEPOSIT) {
            const isDepositingClaimedReward =
              previousEvent && previousEvent.type === EventType.CLAIM_REWARD;
            if (isDepositingClaimedReward) {
              console.log("XXX skipping depositing claimed reward"); // Regardless of coinType, we don't want to count claimed+deposited rewards as deposited SUI
              continue;
            }

            if (event.coinType === depositReserves.lst.coinType) {
              const lstToSuiExchangeRate =
                lstToSuiExchangeRateMap[event.timestampS];
              if (lstToSuiExchangeRate === undefined) {
                throw new Error(
                  `lstToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
                );
              }

              depositedAmount = depositedAmount.plus(
                event.liquidityAmount.times(lstToSuiExchangeRate),
              );
            } else {
              depositedAmount = depositedAmount.plus(event.liquidityAmount);
            }
            // console.log(
            //   `XXX depositedAmount: ${+depositedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.WITHDRAW) {
            if (event.coinType === depositReserves.lst.coinType) {
              const lstToSuiExchangeRate =
                lstToSuiExchangeRateMap[event.timestampS];
              if (lstToSuiExchangeRate === undefined) {
                throw new Error(
                  `lstToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
                );
              }

              depositedAmount = depositedAmount.minus(
                event.liquidityAmount.times(lstToSuiExchangeRate),
              );
            } else {
              depositedAmount = depositedAmount.minus(event.liquidityAmount);
            }
            // console.log(
            //   `XXX depositedAmount: ${+depositedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          }

          // Borrow/repay
          else if (event.type === EventType.BORROW) {
            borrowedAmount = borrowedAmount.plus(event.liquidityAmount);
            // console.log(
            //   `XXX borrowedAmount: ${+borrowedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.REPAY) {
            borrowedAmount = borrowedAmount.minus(event.liquidityAmount);
            // console.log(
            //   `XXX borrowedAmount: ${+borrowedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          }
        }
        console.log(`XXX depositedAmount (final): ${depositedAmount}`);
        console.log(`XXX borrowedAmount (final): ${borrowedAmount}`);

        const tvlAmount = depositedAmount.minus(borrowedAmount);
        console.log(`XXX tvlAmount (final): ${tvlAmount}`);

        return tvlAmount;
      } catch (err) {
        console.error(err);
        return undefined;
      }
    },
    [
      hasPosition,
      getDepositReserves,
      getDefaultCurrencyReserve,
      getHistory,
      getTvlAmount,
    ],
  );

  // Stats - APR
  const getAprPercent = useCallback(
    (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
      exposure?: BigNumber,
    ): BigNumber => {
      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

        const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

        _obligation = simulateDepositAndLoopToExposure(
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
        userData.rewardMap,
        allAppData.lstAprPercentMap,
        !obligation ||
          !hasPosition(obligation) ||
          obligation.deposits.some((d) => !d.userRewardManager), // Simulated obligations don't have userRewardManager
      );
    },
    [
      hasPosition,
      getDefaultCurrencyReserve,
      simulateDepositAndLoopToExposure,
      userData.rewardMap,
      allAppData.lstAprPercentMap,
    ],
  );

  // Stats - Health
  const getHealthPercent = useCallback(
    (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
      exposure?: BigNumber,
    ): BigNumber => {
      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

        const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

        _obligation = simulateDepositAndLoopToExposure(
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
      const borrowLimitUsd = _obligation.minPriceBorrowLimitUsd.times(0.99); // 1% buffer
      const liquidationThresholdUsd = _obligation.unhealthyBorrowValueUsd;

      if (weightedBorrowsUsd.lt(borrowLimitUsd)) return new BigNumber(100);
      return new BigNumber(100).minus(
        new BigNumber(weightedBorrowsUsd.minus(borrowLimitUsd))
          .div(liquidationThresholdUsd.minus(borrowLimitUsd))
          .times(100),
      );
    },
    [hasPosition, getDefaultCurrencyReserve, simulateDepositAndLoopToExposure],
  );

  // Stats - Liquidation price
  const getLiquidationPrice = useCallback(
    (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
      exposure?: BigNumber,
    ): BigNumber | null => {
      if (
        ![
          StrategyType.USDC_sSUI_SUI_LOOPING,
          StrategyType.AUSD_sSUI_SUI_LOOPING,
        ].includes(strategyType)
      )
        return new BigNumber(0); // Not shown in UI

      const depositReserves = getDepositReserves(strategyType);

      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

        const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

        _obligation = simulateDepositAndLoopToExposure(
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

      const usdcDeposit = _obligation.deposits.find(
        (d) => d.coinType === depositReserves.base!.coinType,
      );
      const lstDeposit = _obligation.deposits.find(
        (d) => d.coinType === depositReserves.lst.coinType,
      );
      if (!usdcDeposit || usdcDeposit.depositedAmount.eq(0)) return null;

      const suiBorrow = _obligation.borrows.find((b) => isSui(b.coinType));
      if (!suiBorrow || suiBorrow.borrowedAmount.eq(0)) return null;

      const result = new BigNumber(
        usdcDeposit.depositedAmount
          .times(depositReserves.base!.price)
          .times(+depositReserves.base!.config.closeLtvPct / 100),
      ).div(
        new BigNumber(
          suiBorrow.borrowedAmount.times(
            suiReserve.config.borrowWeightBps.div(10000),
          ),
        ).minus(
          (lstDeposit?.depositedAmount ?? new BigNumber(0)).times(
            +depositReserves.lst.config.closeLtvPct / 100,
          ),
        ),
      );

      return result;
    },
    [
      getDepositReserves,
      hasPosition,
      getDefaultCurrencyReserve,
      simulateDepositAndLoopToExposure,
      suiReserve,
    ],
  );

  // Context
  const contextValue: LstStrategyContext = useMemo(
    () => ({
      // More details
      isMoreDetailsOpen,
      setIsMoreDetailsOpen,

      // Obligations
      hasPosition,

      // SUI
      suiReserve,
      suiBorrowFeePercent,

      // LST
      lstMap,
      getLstMintFee,
      getLstRedeemFee,

      // Exposure map
      exposureMap,

      // Reserves
      getDepositReserves,
      getDefaultCurrencyReserve,

      // Calculations
      getSimulatedObligation,
      getDepositedAmount,
      getBorrowedAmount,
      getTvlAmount,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getStepMaxWithdrawnAmount,

      // Simulate
      simulateLoopToExposure,
      simulateDeposit,
      simulateDepositAndLoopToExposure,

      // Stats
      getGlobalTvlAmountUsd,
      getUnclaimedRewardsAmount,
      getHistory,
      getHistoricalTvlAmount,
      getAprPercent,
      getHealthPercent,
      getLiquidationPrice,
    }),
    [
      isMoreDetailsOpen,
      setIsMoreDetailsOpen,
      hasPosition,
      suiReserve,
      suiBorrowFeePercent,
      getDepositReserves,
      getDefaultCurrencyReserve,
      lstMap,
      getLstMintFee,
      getLstRedeemFee,
      exposureMap,
      getDepositedAmount,
      getBorrowedAmount,
      getTvlAmount,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getStepMaxWithdrawnAmount,
      getSimulatedObligation,
      simulateLoopToExposure,
      simulateDeposit,
      simulateDepositAndLoopToExposure,
      getGlobalTvlAmountUsd,
      getUnclaimedRewardsAmount,
      getHistory,
      getHistoricalTvlAmount,
      getAprPercent,
      getHealthPercent,
      getLiquidationPrice,
    ],
  );

  return (
    <LstStrategyContext.Provider value={contextValue}>
      {lstMap !== undefined ? children : <FullPageSpinner />}
    </LstStrategyContext.Provider>
  );
}
