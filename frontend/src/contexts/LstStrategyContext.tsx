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

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import {
  STRATEGY_E as E,
  LENDING_MARKET_ID,
  LST_DECIMALS,
  ParsedObligation,
  ParsedReserve,
  STRATEGY_TYPE_EXPOSURE_MAP,
  StrategyDeposit,
  StrategyLstMap,
  WAD,
  fetchStrategyGlobalTvlAmountUsdMap as _fetchGlobalTvlAmountUsdMap,
  getStrategyBorrowReserve as _getBorrowReserve,
  getStrategyBorrowedAmount as _getBorrowedAmount,
  getStrategyDefaultCurrencyReserve as _getDefaultCurrencyReserve,
  getStrategyDepositReserves as _getDepositReserves,
  getStrategyDepositedAmount as _getDepositedAmount,
  getStrategyExposure as _getExposure,
  getStrategyLstMintFee as _getLstMintFee,
  getStrategyLstRedeemFee as _getLstRedeemFee,
  getStrategySimulatedObligation as _getSimulatedObligation,
  getStrategySuiReserve as _getSuiReserve,
  getStrategyTvlAmount as _getTvlAmount,
  getStrategyUnclaimedRewardsAmount as _getUnclaimedRewardsAmount,
  hasStrategyPosition as _hasStrategyPosition,
  addOrInsertStrategyDeposit as addOrInsertDeposit,
  fetchStrategyLstMap,
  getNetAprPercent,
} from "@suilend/sdk";
import { StrategyType } from "@suilend/sdk/lib/strategyOwnerCap";
import { LstClient } from "@suilend/springsui-sdk";
import { LiquidStakingInfo } from "@suilend/springsui-sdk/_generated/liquid_staking/liquid-staking/structs";
import { API_URL, MAX_U64, isSui } from "@suilend/sui-fe";
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
export type BorrowEvent = {
  type: EventType.BORROW;
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
export type RepayEvent = {
  type: EventType.REPAY;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type LiquidateEvent = {
  type: EventType.LIQUIDATE;
  timestampS: number;
  eventIndex: number;
  withdrawCoinType: string;
  repayCoinType: string;
  withdrawAmount: BigNumber;
  repayAmount: BigNumber;
  digest: string;
};
export type ForgiveEvent = {
  type: EventType.FORGIVE;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  liquidityAmount: BigNumber;
  digest: string;
};
export type SocializeLossEvent = {
  type: EventType.SOCIALIZE_LOSS;
  timestampS: number;
  eventIndex: number;
  coinType: string;
  lossAmount: BigNumber;
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
export type ObligationDataEvent = {
  type: EventType.OBLIGATION_DATA;
  timestampS: number;
  eventIndex: number;
  depositedValueUsd: BigNumber;
  digest: string;
};
export type HistoryEvent =
  | DepositEvent
  | BorrowEvent
  | WithdrawEvent
  | RepayEvent
  | LiquidateEvent
  | ForgiveEvent
  | SocializeLossEvent
  | ClaimRewardEvent
  | ObligationDataEvent;

interface LstStrategyContext {
  // More details
  isMoreDetailsOpen: boolean;
  setIsMoreDetailsOpen: Dispatch<SetStateAction<boolean>>;

  // Obligations
  hasPosition: (obligation: ParsedObligation) => boolean;

  // SUI
  suiReserve: ParsedReserve;

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
    lst?: ParsedReserve;
  };
  getBorrowReserve: (strategyType: StrategyType) => ParsedReserve;
  getDefaultCurrencyReserve: (strategyType: StrategyType) => ParsedReserve;

  // Calculations
  getSimulatedObligation: (
    strategyType: StrategyType,
    deposits: StrategyDeposit[],
    borrowedAmount: BigNumber,
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
  getStepMaxBorrowedAmount: (
    strategyType: StrategyType,
    deposits: StrategyDeposit[],
    borrowedAmount: BigNumber,
  ) => BigNumber;
  getStepMaxWithdrawnAmount: (
    strategyType: StrategyType,
    deposits: StrategyDeposit[],
    borrowedAmount: BigNumber,
    withdrawCoinType: string,
  ) => BigNumber;

  // Simulate
  simulateLoopToExposure: (
    strategyType: StrategyType,
    deposits: StrategyDeposit[],
    borrowedAmount: BigNumber,
    targetBorrowedAmount: BigNumber | undefined,
    targetExposure: BigNumber | undefined, // Must be defined if targetBorrowedAmount is undefined
  ) => {
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDeposit: (
    strategyType: StrategyType,
    deposits: StrategyDeposit[],
    borrowedAmount: BigNumber,
    deposit: StrategyDeposit,
  ) => {
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDepositAndLoopToExposure: (
    strategyType: StrategyType,
    deposits: StrategyDeposit[],
    borrowedAmount: BigNumber,
    deposit: StrategyDeposit,
    targetExposure: BigNumber,
  ) => {
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
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
  getBorrowReserve: () => {
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
  getStepMaxBorrowedAmount: () => {
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
  const { allUserData } = useLoadedUserContext();
  const { allAppData, isLst } = useLoadedAppContext();

  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const userDataMainMarket = allUserData[LENDING_MARKET_ID];

  // More details
  const [isMoreDetailsOpen, setIsMoreDetailsOpen] = useLocalStorage<boolean>(
    "LstStrategyContext_isMoreDetailsOpen",
    false,
  );

  // Obligations
  const hasPosition = useCallback(
    (obligation: ParsedObligation) => _hasStrategyPosition(obligation),
    [],
  );

  // SUI
  const suiReserve = useMemo(
    () => _getSuiReserve(appDataMainMarket.reserveMap),
    [appDataMainMarket.reserveMap],
  );

  // LST
  const [lstMap, setLstMap] = useState<StrategyLstMap | undefined>(undefined);

  const fetchLstMap = useCallback(async () => {
    try {
      const result = await fetchStrategyLstMap(suiClient);
      if (result) setLstMap(result);
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
    (lstCoinType: string, suiAmount: BigNumber) =>
      _getLstMintFee(lstMap ?? {}, lstCoinType, suiAmount),
    [lstMap],
  );
  const getLstRedeemFee = useCallback(
    (lstCoinType: string, lstAmount: BigNumber) =>
      _getLstRedeemFee(lstMap ?? {}, lstCoinType, lstAmount),
    [lstMap],
  );

  // Exposure map
  const exposureMap: Record<
    StrategyType,
    { min: BigNumber; max: BigNumber; default: BigNumber }
  > = useMemo(() => STRATEGY_TYPE_EXPOSURE_MAP, []);

  // Reserves
  const getDepositReserves = useCallback(
    (
      strategyType: StrategyType,
    ): { base?: ParsedReserve; lst?: ParsedReserve } =>
      _getDepositReserves(appDataMainMarket.reserveMap, strategyType),
    [appDataMainMarket.reserveMap],
  );

  const getBorrowReserve = useCallback(
    (strategyType: StrategyType): ParsedReserve =>
      _getBorrowReserve(appDataMainMarket.reserveMap, strategyType),
    [appDataMainMarket.reserveMap],
  );

  const getDefaultCurrencyReserve = useCallback(
    (strategyType: StrategyType) =>
      _getDefaultCurrencyReserve(appDataMainMarket.reserveMap, strategyType),
    [appDataMainMarket.reserveMap],
  );

  // Calculations
  const getSimulatedObligation = useCallback(
    (
      strategyType: StrategyType,
      deposits: StrategyDeposit[],
      _borrowedAmount: BigNumber,
    ): ParsedObligation =>
      _getSimulatedObligation(
        appDataMainMarket.reserveMap,
        lstMap ?? {},
        strategyType,
        deposits,
        _borrowedAmount,
      ),
    [appDataMainMarket.reserveMap, lstMap],
  );

  const getDepositedAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation) =>
      _getDepositedAmount(
        appDataMainMarket.reserveMap,
        lstMap ?? {},
        strategyType,
        obligation,
      ),
    [appDataMainMarket.reserveMap, lstMap],
  );
  const getBorrowedAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation) =>
      _getBorrowedAmount(
        appDataMainMarket.reserveMap,
        lstMap ?? {},
        strategyType,
        obligation,
      ),
    [appDataMainMarket.reserveMap, lstMap],
  );

  const getTvlAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation): BigNumber =>
      _getTvlAmount(
        appDataMainMarket.reserveMap,
        lstMap ?? {},
        strategyType,
        obligation,
      ),
    [appDataMainMarket.reserveMap, lstMap],
  );

  const getExposure = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation): BigNumber =>
      _getExposure(
        appDataMainMarket.reserveMap,
        lstMap ?? {},
        strategyType,
        obligation,
      ),
    [appDataMainMarket.reserveMap, lstMap],
  );

  const getStepMaxBorrowedAmount = useCallback(
    (
      strategyType: StrategyType,
      deposits: StrategyDeposit[],
      borrowedAmount: BigNumber,
    ): BigNumber => {
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      //

      const obligation = getSimulatedObligation(
        strategyType,
        deposits,
        borrowedAmount,
      );

      const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;

      // "Borrows cannot exceed borrow limit"
      return !obligation ||
        obligation.maxPriceWeightedBorrowsUsd.gt(
          obligation.minPriceBorrowLimitUsd,
        )
        ? new BigNumber(0)
        : obligation.minPriceBorrowLimitUsd
            .minus(obligation.maxPriceWeightedBorrowsUsd)
            .div(
              borrowReserve.maxPrice.times(
                borrowReserve.config.borrowWeightBps.div(10000),
              ),
            )
            .div(1 + borrowFeePercent / 100);
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      getSimulatedObligation,
    ],
  );
  const getStepMaxWithdrawnAmount = useCallback(
    (
      strategyType: StrategyType,
      deposits: StrategyDeposit[],
      borrowedAmount: BigNumber,
      withdrawCoinType: string,
    ): BigNumber => {
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const withdrawReserve = appDataMainMarket.reserveMap[withdrawCoinType];

      //

      const obligation = getSimulatedObligation(
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
        deposits.find(
          (deposit) => deposit.coinType === withdrawReserve.coinType,
        )?.depositedAmount ?? new BigNumber(0),
      ).decimalPlaces(withdrawReserve.token.decimals, BigNumber.ROUND_DOWN);
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      appDataMainMarket.reserveMap,
      getSimulatedObligation,
    ],
  );

  // Simulate
  const simulateLoopToExposure = useCallback(
    (
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
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const loopingDepositReserve = (depositReserves.lst ??
        depositReserves.base)!; // Must have base if no LST

      //

      let deposits = cloneDeep(_deposits);
      let borrowedAmount = _borrowedAmount;

      const tvlAmountUsd = getTvlAmount(
        strategyType,
        getSimulatedObligation(strategyType, deposits, borrowedAmount),
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
          const exposure = getExposure(
            strategyType,
            getSimulatedObligation(strategyType, deposits, borrowedAmount),
          );
          const pendingBorrowedAmount =
            targetBorrowedAmount.minus(borrowedAmount);

          if (pendingBorrowedAmount.lte(E)) break;

          // 1) Borrow SUI
          // 1.1) Max
          const stepMaxBorrowedAmount = getStepMaxBorrowedAmount(
            strategyType,
            deposits,
            borrowedAmount,
          )
            .times(0.9) // 10% buffer
            .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);
          const stepMaxDepositedAmount = new BigNumber(
            stepMaxBorrowedAmount.minus(
              getLstMintFee(
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
              getLstMintFee(loopingDepositReserve.coinType, stepBorrowedAmount),
            ),
          )
            .times(
              lstMap?.[depositReserves.lst.coinType]?.suiToLstExchangeRate ??
                new BigNumber(1),
            )
            .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
          const isMaxDeposit = stepDepositedAmount.eq(stepMaxDepositedAmount);

          // 2.3) Update state
          deposits = addOrInsertDeposit(deposits, {
            coinType: loopingDepositReserve.coinType,
            depositedAmount: stepDepositedAmount,
          });
        }
      }

      // Base only
      else if (
        loopingDepositReserve.coinType === depositReserves.base?.coinType
      ) {
        const borrowToBaseExchangeRate = new BigNumber(1); // Assume 1:1 exchange rate

        for (let i = 0; i < 30; i++) {
          const exposure = getExposure(
            strategyType,
            getSimulatedObligation(strategyType, deposits, borrowedAmount),
          );
          const pendingBorrowedAmount =
            targetBorrowedAmount.minus(borrowedAmount);

          if (pendingBorrowedAmount.lte(E)) break;

          // 1) Borrow
          // 1.1) Max
          const stepMaxBorrowedAmount = getStepMaxBorrowedAmount(
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
          deposits = addOrInsertDeposit(deposits, {
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
        obligation: getSimulatedObligation(
          strategyType,
          deposits,
          borrowedAmount,
        ),
      };
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      lstMap,
      getTvlAmount,
      getSimulatedObligation,
      getExposure,
      getStepMaxBorrowedAmount,
      getLstMintFee,
    ],
  );

  const simulateDeposit = useCallback(
    (
      strategyType: StrategyType,
      _deposits: StrategyDeposit[],
      _borrowedAmount: BigNumber,
      deposit: StrategyDeposit,
    ): {
      deposits: StrategyDeposit[];
      borrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

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
      else if (deposit.coinType === depositReserves.lst?.coinType) {
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
        borrowedAmount,
        obligation: getSimulatedObligation(
          strategyType,
          deposits,
          borrowedAmount,
        ),
      };
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      lstMap,
      getLstMintFee,
      getSimulatedObligation,
    ],
  );

  const simulateDepositAndLoopToExposure = useCallback(
    (
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
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      //

      let deposits = cloneDeep(_deposits);
      let borrowedAmount = _borrowedAmount;
      let obligation = getSimulatedObligation(
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
      } = simulateDeposit(strategyType, deposits, borrowedAmount, deposit);

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
        } = simulateLoopToExposure(
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
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      getSimulatedObligation,
      simulateDeposit,
      simulateLoopToExposure,
    ],
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
    try {
      const result = await _fetchGlobalTvlAmountUsdMap();
      if (result) setGlobalTvlAmountUsdMap(result);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const didFetchGlobalTvlAmountUsdMapRef = useRef<boolean>(false);
  useEffect(() => {
    if (didFetchGlobalTvlAmountUsdMapRef.current) return;
    didFetchGlobalTvlAmountUsdMapRef.current = true;

    fetchGlobalTvlAmountUsdMap();
  }, [fetchGlobalTvlAmountUsdMap]);

  // Stats - Unclaimed rewards
  const getUnclaimedRewardsAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation): BigNumber =>
      _getUnclaimedRewardsAmount(
        appDataMainMarket.reserveMap,
        appDataMainMarket.rewardPriceMap,
        appDataMainMarket.rewardCoinMetadataMap,
        userDataMainMarket.rewardMap,
        lstMap ?? {},
        strategyType,
        obligation,
      ),
    [
      appDataMainMarket.reserveMap,
      appDataMainMarket.rewardPriceMap,
      appDataMainMarket.rewardCoinMetadataMap,
      userDataMainMarket.rewardMap,
      lstMap,
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
      type BorrowResult = {
        timestamp: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: string; // Includes origination fees
        digest: string;
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
      type RepayResult = {
        timestamp: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: string;
        digest: string;
      };
      type LiquidateResult = {
        timestamp: number;
        eventIndex: number;
        withdrawCoinType: string;
        repayCoinType: string;
        withdrawAmount: string;
        repayAmount: string;
        digest: string;
      };
      type ForgiveResult = {
        timestamp: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: string;
        digest: string;
      };
      type SocializeLossResult = {
        timestamp: number;
        coinType: string;
        lossAmount: string;
        relatedForgiveDigest: string;
      };
      type ClaimRewardEventResult = {
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
      type Results = {
        deposits: DepositResult[];
        borrows: BorrowResult[];
        withdraws: WithdrawResult[];
        repays: RepayResult[];
        liquidateEvents: LiquidateResult[];
        forgiveEvents: ForgiveResult[];
        socializeLossSyntheticEvents: SocializeLossResult[];
        claimRewardEvents: ClaimRewardEventResult[];
        obligationDataEvents: ObligationDataEventResult[];
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
        for (const liquidateEvent of page.results.liquidateEvents) {
          events.push({
            type: EventType.LIQUIDATE,
            timestampS: liquidateEvent.timestamp,
            eventIndex: liquidateEvent.eventIndex,
            withdrawCoinType: normalizeStructTag(
              liquidateEvent.withdrawCoinType,
            ),
            repayCoinType: normalizeStructTag(liquidateEvent.repayCoinType),
            withdrawAmount: new BigNumber(liquidateEvent.withdrawAmount),
            repayAmount: new BigNumber(liquidateEvent.repayAmount),
            digest: liquidateEvent.digest,
          });
        }
        for (const forgiveEvent of page.results.forgiveEvents) {
          events.push({
            type: EventType.FORGIVE,
            timestampS: forgiveEvent.timestamp,
            eventIndex: forgiveEvent.eventIndex,
            coinType: normalizeStructTag(forgiveEvent.coinType),
            liquidityAmount: new BigNumber(forgiveEvent.liquidityAmount),
            digest: forgiveEvent.digest,
          });
        }
        for (const socializeLossEvent of page.results
          .socializeLossSyntheticEvents) {
          events.push({
            type: EventType.SOCIALIZE_LOSS,
            timestampS: socializeLossEvent.timestamp,
            eventIndex: 0,
            coinType: normalizeStructTag(socializeLossEvent.coinType),
            lossAmount: new BigNumber(socializeLossEvent.lossAmount),
            digest: socializeLossEvent.relatedForgiveDigest,
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
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      const loopingDepositReserve = (depositReserves.lst ??
        depositReserves.base)!; // Must have base if no LST

      //

      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

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
            if (
              loopingDepositReserve.coinType === depositReserves.base?.coinType
            )
              return true; // No filtering if loopingDepositReserve is base
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
        let lstToSuiExchangeRateMap: Record<number, BigNumber> = {};
        if (depositReserves.lst !== undefined) {
          const lstToSuiExchangeRateTimestampsS = Array.from(
            new Set(
              currentPositionFilteredSortedEvents
                .filter(
                  (event) =>
                    [EventType.DEPOSIT, EventType.WITHDRAW].includes(
                      event.type,
                    ) &&
                    (event as DepositEvent | WithdrawEvent).coinType ===
                      depositReserves.lst!.coinType,
                )
                .map((event) => event.timestampS),
            ),
          );

          if (lstToSuiExchangeRateTimestampsS.length > 0) {
            const res = await fetch(
              `${API_URL}/springsui/historical-rates?coinType=${depositReserves.lst.coinType}&timestamps=${lstToSuiExchangeRateTimestampsS.join(",")}`,
            );
            const json: { timestamp: number; value: string }[] =
              await res.json();
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
        }

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

            if (event.coinType === depositReserves.lst?.coinType) {
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
            } else if (
              loopingDepositReserve.coinType === depositReserves.base?.coinType
            ) {
              if (!previousEvent)
                depositedAmount = depositedAmount.plus(event.liquidityAmount); // Only count actual deposits, not looping deposits
            } else {
              depositedAmount = depositedAmount.plus(event.liquidityAmount);
            }
            // console.log(
            //   `XXX depositedAmount: ${+depositedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.WITHDRAW) {
            if (event.coinType === depositReserves.lst?.coinType) {
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
            } else if (
              loopingDepositReserve.coinType === depositReserves.base?.coinType
            ) {
              const nextRepayEventInTxn =
                currentPositionFilteredSortedEvents.find(
                  (e) =>
                    e.digest === event.digest &&
                    e.eventIndex > event.eventIndex &&
                    e.type === EventType.REPAY,
                );
              if (!nextRepayEventInTxn)
                depositedAmount = depositedAmount.minus(event.liquidityAmount); // Only count actual withdraws, not looping withdraws
            } else {
              depositedAmount = depositedAmount.minus(event.liquidityAmount);
            }
            // console.log(
            //   `XXX depositedAmount: ${+depositedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          }

          // Borrow/repay
          else if (event.type === EventType.BORROW) {
            if (
              loopingDepositReserve.coinType === depositReserves.base?.coinType
            ) {
              // Do nothing
            } else {
              borrowedAmount = borrowedAmount.plus(event.liquidityAmount);
            }
            // console.log(
            //   `XXX borrowedAmount: ${+borrowedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.REPAY) {
            if (
              loopingDepositReserve.coinType === depositReserves.base?.coinType
            ) {
              // Do nothing
            } else {
              borrowedAmount = borrowedAmount.minus(event.liquidityAmount);
            }
            // console.log(
            //   `XXX borrowedAmount: ${+borrowedAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          }
        }
        const tvlAmount = depositedAmount.minus(borrowedAmount);
        if (strategyType === StrategyType.xBTC_wBTC_LOOPING) {
          console.log(`XXX depositedAmount (final): ${depositedAmount}`);
          console.log(`XXX borrowedAmount (final): ${borrowedAmount}`);
          console.log(`XXX tvlAmount (final): ${tvlAmount}`);
        }

        return tvlAmount;
      } catch (err) {
        console.error(err);
        return undefined;
      }
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      hasPosition,
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
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      //

      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

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
        userDataMainMarket.rewardMap,
        allAppData.lstMap,
        !obligation ||
          !hasPosition(obligation) ||
          obligation.deposits.some((d) => !d.userRewardManager), // Simulated obligations don't have userRewardManager
      );
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      hasPosition,
      simulateDepositAndLoopToExposure,
      userDataMainMarket.rewardMap,
      allAppData.lstMap,
    ],
  );

  // Stats - Health
  const getHealthPercent = useCallback(
    (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
      exposure?: BigNumber,
    ): BigNumber => {
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      //

      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

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
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      hasPosition,
      simulateDepositAndLoopToExposure,
    ],
  );

  // Stats - Liquidation price
  const getLiquidationPrice = useCallback(
    (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
      exposure?: BigNumber,
    ): BigNumber | null => {
      const depositReserves = getDepositReserves(strategyType);
      const borrowReserve = getBorrowReserve(strategyType);
      const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

      //

      if (
        ![
          StrategyType.USDC_sSUI_SUI_LOOPING,
          StrategyType.AUSD_sSUI_SUI_LOOPING,
          StrategyType.xBTC_sSUI_SUI_LOOPING,
        ].includes(strategyType)
      )
        return new BigNumber(0); // Not shown in UI

      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

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
    },
    [
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      hasPosition,
      simulateDepositAndLoopToExposure,
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

      // LST
      lstMap,
      getLstMintFee,
      getLstRedeemFee,

      // Exposure map
      exposureMap,

      // Reserves
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,

      // Calculations
      getSimulatedObligation,
      getDepositedAmount,
      getBorrowedAmount,
      getTvlAmount,
      getExposure,
      getStepMaxBorrowedAmount,
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
      lstMap,
      getLstMintFee,
      getLstRedeemFee,
      exposureMap,
      getDepositReserves,
      getBorrowReserve,
      getDefaultCurrencyReserve,
      getSimulatedObligation,
      getDepositedAmount,
      getBorrowedAmount,
      getTvlAmount,
      getExposure,
      getStepMaxBorrowedAmount,
      getStepMaxWithdrawnAmount,
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
