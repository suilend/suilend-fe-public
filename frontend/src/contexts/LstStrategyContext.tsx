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

export const E = 10 ** -6;
export const LST_DECIMALS = 9;

export type Deposit = { coinType: string; amount: BigNumber };
export type Withdraw = { coinType: string; amount: BigNumber };

interface LstStrategyContext {
  // More parameters
  isMoreParametersOpen: boolean;
  setIsMoreParametersOpen: Dispatch<SetStateAction<boolean>>;

  // Obligations
  hasPosition: (obligation: ParsedObligation) => boolean;

  // SUI
  suiReserve: ParsedReserve;
  suiBorrowFeePercent: BigNumber;

  // LSTs
  getLstReserve: (strategyType: StrategyType) => ParsedReserve;
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

  // Calculations
  getExposure: (obligation?: ParsedObligation) => BigNumber;
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
  getSimulatedObligation: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
  ) => ParsedObligation;
  simulateLoopToExposure: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateUnloopToExposure: (
    strategyType: StrategyType,
    deposits: Deposit[],
    suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDeposit: (
    strategyType: StrategyType,
    deposit: Deposit,
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDepositAndLoopToExposure: (
    strategyType: StrategyType,
    deposit: Deposit,
    targetExposure: BigNumber,
  ) => {
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };

  // Stats
  getDepositedSuiAmount: (obligation?: ParsedObligation) => BigNumber;
  getBorrowedSuiAmount: (obligation?: ParsedObligation) => BigNumber;
  getTvlSuiAmount: (obligation?: ParsedObligation) => BigNumber;
  getUnclaimedRewardsSuiAmount: (obligation?: ParsedObligation) => BigNumber;
  getHistoricalTvlSuiAmount: (
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
  // More parameters
  isMoreParametersOpen: false,
  setIsMoreParametersOpen: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Obligations
  hasPosition: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // SUI
  suiReserve: {} as ParsedReserve,
  suiBorrowFeePercent: new BigNumber(0),

  // LSTs
  getLstReserve: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
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

  // Calculations
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
  getSimulatedObligation: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  simulateLoopToExposure: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  simulateUnloopToExposure: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  simulateDeposit: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  simulateDepositAndLoopToExposure: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },

  // Stats
  getDepositedSuiAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getBorrowedSuiAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getTvlSuiAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getUnclaimedRewardsSuiAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getHistoricalTvlSuiAmount: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getAprPercent: () => {
    throw Error("LstStrategyContextProvider not initialized");
  },
  getHealthPercent: () => {
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

  // More parameters
  const [isMoreParametersOpen, setIsMoreParametersOpen] =
    useLocalStorage<boolean>("LstStrategyContext_isMoreParametersOpen", false);

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

  // LSTs
  const getLstReserve = useCallback(
    (strategyType: StrategyType) => {
      const lstCoinType = STRATEGY_TYPE_INFO_MAP[strategyType].lstCoinType;
      return appData.reserveMap[lstCoinType];
    },
    [appData.reserveMap],
  );

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
            ({ lstCoinType }) => lstCoinType,
          ),

          // LST rewards
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

            const totalSuiSupply = new BigNumber(
              lstInfo.liquidStakingInfo.storage.totalSuiSupply.toString(),
            ).div(10 ** SUI_DECIMALS);
            const totalLstSupply = new BigNumber(
              lstInfo.liquidStakingInfo.lstTreasuryCap.totalSupply.value.toString(),
            ).div(10 ** LST_DECIMALS);

            const suiToLstExchangeRate = !totalSuiSupply.eq(0)
              ? totalLstSupply.div(totalSuiSupply)
              : new BigNumber(1);
            const lstToSuiExchangeRate = !totalLstSupply.eq(0)
              ? totalSuiSupply.div(totalLstSupply)
              : new BigNumber(1);

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
  //       Object.entries(lstMap ?? {}).map(([lstCoinType, lst]) => {
  //         const { client, liquidStakingInfo, ...restLst } = lst;
  //         return [lstCoinType, restLst];
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
      suiAmount
        .times(
          (lstMap?.[lstCoinType].mintFeePercent ?? new BigNumber(0)).div(100),
        )
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP),
    [lstMap],
  );
  const getLstRedeemFee = useCallback(
    (lstCoinType: string, lstAmount: BigNumber) => {
      const suiAmount = lstAmount.times(
        lstMap?.[lstCoinType].lstToSuiExchangeRate ?? new BigNumber(1),
      );

      return suiAmount
        .times(
          (lstMap?.[lstCoinType].redeemFeePercent ?? new BigNumber(0)).div(100),
        )
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
        max: new BigNumber(3.3), // Actual max: 1 + (USDC Open LTV %) * (1 / (1 - (sSUI Open LTV %))) = 3.5666x, where USDC Open LTV % = 77% and sSUI Open LTV % = 70%
        default: new BigNumber(3.3),
      },
    }),
    [],
  );
  // Calculations
  const getExposure = useCallback(
    (obligation?: ParsedObligation): BigNumber => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      let suiDepositedAmount = new BigNumber(0);
      for (const deposit of obligation.deposits) {
        if (isSui(deposit.coinType) || isLst(deposit.coinType)) {
          suiDepositedAmount = suiDepositedAmount.plus(deposit.depositedAmount); // Ignore LST exchange rate here, as SpringSui LSTs use the same Pyth oracle as SUI on Suilend
        } else {
          const depositReserve = appData.reserveMap[deposit.coinType];
          const priceSui = depositReserve.price.div(suiReserve.price);

          suiDepositedAmount = suiDepositedAmount.plus(
            deposit.depositedAmount.times(priceSui),
          );
        }
      }

      const suiBorrowedAmount =
        obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow (SUI)

      return suiDepositedAmount.gt(0)
        ? suiDepositedAmount.div(suiDepositedAmount.minus(suiBorrowedAmount))
        : new BigNumber(0);
    },
    [hasPosition, isLst, appData.reserveMap, suiReserve.price],
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
              .times(deposit.amount)
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
      const withdrawReserve = appData.reserveMap[withdrawCoinType];

      return BigNumber.min(
        new BigNumber(
          deposits
            .reduce((acc, deposit) => {
              const depositReserve = appData.reserveMap[deposit.coinType];

              return acc.plus(
                deposit.amount
                  .times(depositReserve.minPrice)
                  .times(depositReserve.config.openLtvPct / 100),
              );
            }, new BigNumber(0))
            .minus(
              suiBorrowedAmount
                .times(suiReserve.maxPrice)
                .times(suiReserve.config.borrowWeightBps.div(10000)),
            ),
        )
          .div(withdrawReserve.minPrice)
          .div(withdrawReserve.config.openLtvPct / 100),
        deposits.find(
          (deposit) => deposit.coinType === withdrawReserve.coinType,
        )?.amount ?? new BigNumber(0),
      ).decimalPlaces(withdrawReserve.token.decimals, BigNumber.ROUND_DOWN);
    },
    [appData.reserveMap, suiReserve],
  );

  // Simulate
  const getSimulatedObligation = useCallback(
    (
      strategyType: StrategyType,
      deposits: Deposit[],
      suiBorrowedAmount: BigNumber,
    ): ParsedObligation => {
      const obligation = {
        deposits: deposits.reduce(
          (acc, deposit) => {
            const depositReserve = appData.reserveMap[deposit.coinType];

            return [
              ...acc,
              {
                depositedAmount: deposit.amount,
                depositedAmountUsd: deposit.amount.times(depositReserve.price),
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

            return acc.plus(deposit.amount.times(depositReserve.price));
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
              deposit.amount
                .times(depositReserve.minPrice)
                .times(depositReserve.config.openLtvPct / 100),
            );
          }, new BigNumber(0)),
          30 * 10 ** 6, // Cap `minPriceBorrowLimitUsd` at $30m (account borrow limit)
        ),
        unhealthyBorrowValueUsd: deposits.reduce((acc, deposit) => {
          const depositReserve = appData.reserveMap[deposit.coinType];

          return acc.plus(
            deposit.amount
              .times(depositReserve.price)
              .times(depositReserve.config.closeLtvPct / 100),
          );
        }, new BigNumber(0)),
      } as ParsedObligation;

      return obligation;
    },
    [appData.reserveMap, suiReserve],
  );

  const simulateLoopToExposure = useCallback(
    (
      strategyType: StrategyType,
      _deposits: Deposit[],
      _suiBorrowedAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const lstReserve = getLstReserve(strategyType);
      const suiToLstExchangeRate =
        lstMap?.[lstReserve.coinType].suiToLstExchangeRate ?? new BigNumber(1); // Fall back to 1:1, overcounting by 1-2%

      let deposits = cloneDeep(_deposits);
      let suiBorrowedAmount = _suiBorrowedAmount;

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
        );
        const pendingExposure = targetExposure.minus(exposure);
        if (pendingExposure.lte(E)) break;

        // 1) Max
        const stepMaxSuiBorrowedAmount = getStepMaxSuiBorrowedAmount(
          strategyType,
          deposits,
          suiBorrowedAmount,
        )
          .times(0.98) // 2% buffer
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxLstDepositedAmount = new BigNumber(
          stepMaxSuiBorrowedAmount.minus(
            getLstMintFee(lstReserve.coinType, stepMaxSuiBorrowedAmount),
          ),
        )
          .times(suiToLstExchangeRate)
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxExposure = getExposure(
          getSimulatedObligation(
            strategyType,
            deposits.map((d) =>
              d.coinType === lstReserve.coinType
                ? { ...d, amount: d.amount.plus(stepMaxLstDepositedAmount) }
                : d,
            ),
            suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
          ),
        ).minus(exposure);

        // 2) Borrow SUI
        const stepSuiBorrowedAmount = stepMaxSuiBorrowedAmount
          .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);

        suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

        // 3) Stake borrowed SUI for LST

        // 4) Deposit LST
        const stepLstDepositedAmount = new BigNumber(
          stepSuiBorrowedAmount.minus(
            getLstMintFee(lstReserve.coinType, stepSuiBorrowedAmount),
          ),
        )
          .times(suiToLstExchangeRate)
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxDeposit = stepLstDepositedAmount.eq(
          stepMaxLstDepositedAmount,
        );

        deposits = deposits.map((d) =>
          d.coinType === lstReserve.coinType
            ? { ...d, amount: d.amount.plus(stepLstDepositedAmount) }
            : d,
        );
      }

      // Obligation
      const obligation = getSimulatedObligation(
        strategyType,
        deposits,
        suiBorrowedAmount,
      );

      return { deposits, suiBorrowedAmount, obligation };
    },
    [
      getLstReserve,
      lstMap,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getLstMintFee,
      getSimulatedObligation,
    ],
  );

  const simulateUnloopToExposure = useCallback(
    (
      strategyType: StrategyType,
      _deposits: Deposit[],
      _suiBorrowedAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const lstReserve = getLstReserve(strategyType);
      const lstToSuiExchangeRate =
        lstMap?.[lstReserve.coinType].lstToSuiExchangeRate ?? new BigNumber(1); // Fall back to 1:1, undercounting by 1-2%

      let deposits = cloneDeep(_deposits);
      let suiBorrowedAmount = _suiBorrowedAmount;

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
        );
        const pendingExposure = exposure.minus(targetExposure);
        if (pendingExposure.lte(E)) break;

        // 1) Max
        const stepMaxLstWithdrawnAmount = getStepMaxWithdrawnAmount(
          strategyType,
          deposits,
          suiBorrowedAmount,
          lstReserve.coinType,
        )
          .times(0.98) // 2% buffer
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxSuiRepaidAmount = new BigNumber(
          new BigNumber(
            stepMaxLstWithdrawnAmount.times(lstToSuiExchangeRate),
          ).minus(
            getLstRedeemFee(lstReserve.coinType, stepMaxLstWithdrawnAmount),
          ),
        ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxExposure = exposure.minus(
          getExposure(
            getSimulatedObligation(
              strategyType,
              deposits.map((d) =>
                d.coinType === lstReserve.coinType
                  ? { ...d, amount: d.amount.minus(stepMaxLstWithdrawnAmount) }
                  : d,
              ),
              suiBorrowedAmount.minus(stepMaxSuiRepaidAmount),
            ),
          ),
        );

        // 2) Withdraw LST
        const stepLstWithdrawnAmount = stepMaxLstWithdrawnAmount
          .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxWithdraw = stepLstWithdrawnAmount.eq(
          stepMaxLstWithdrawnAmount,
        );

        deposits = deposits.map((d) =>
          d.coinType === lstReserve.coinType
            ? { ...d, amount: d.amount.minus(stepLstWithdrawnAmount) }
            : d,
        );

        // 3) Unstake withdrawn LST for SUI

        // 4) Repay SUI
        const stepSuiRepaidAmount = new BigNumber(
          new BigNumber(
            stepLstWithdrawnAmount.times(lstToSuiExchangeRate),
          ).minus(getLstRedeemFee(lstReserve.coinType, stepLstWithdrawnAmount)),
        ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);

        suiBorrowedAmount = suiBorrowedAmount.minus(stepSuiRepaidAmount);
      }

      // Obligation
      const obligation = getSimulatedObligation(
        strategyType,
        deposits,
        suiBorrowedAmount,
      );

      return { deposits, suiBorrowedAmount, obligation };
    },
    [
      getLstReserve,
      lstMap,
      getExposure,
      getStepMaxWithdrawnAmount,
      getLstRedeemFee,
      getSimulatedObligation,
    ],
  );

  const simulateDeposit = useCallback(
    (
      strategyType: StrategyType,
      deposit: Deposit,
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const lstReserve = getLstReserve(strategyType);
      const suiToLstExchangeRate =
        lstMap?.[lstReserve.coinType].suiToLstExchangeRate ?? new BigNumber(1); // Fall back to 1:1, overcounting by 1-2%

      const deposits: Deposit[] = [];
      const suiBorrowedAmount = new BigNumber(0);

      // 1) Deposit
      // 1.1) SUI
      if (isSui(deposit.coinType)) {
        const suiAmount = deposit.amount;
        const lstAmount = new BigNumber(
          suiAmount
            .minus(getLstMintFee(lstReserve.coinType, suiAmount))
            .times(suiToLstExchangeRate),
        ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

        // 1.1.1) Split coins

        // 1.1.2) Stake SUI for LST

        // 1.1.3) Deposit LST (1x exposure)
        deposits.push({
          coinType: lstReserve.coinType,
          amount: lstAmount,
        });
      }

      // 1.2) LST
      else if (deposit.coinType === lstReserve.coinType) {
        // 1.2.1) Split coins

        // 1.2.2) Deposit LST (1x exposure)
        deposits.push({
          coinType: lstReserve.coinType,
          amount: deposit.amount,
        });
      }

      // 1.3) Other
      else {
        // 1.3.1) Split coins

        // 1.3.2) Deposit other (1x exposure)
        deposits.push({
          coinType: deposit.coinType,
          amount: deposit.amount,
        });
      }

      // Obligation
      const obligation = getSimulatedObligation(
        strategyType,
        deposits,
        suiBorrowedAmount,
      );

      return { deposits, suiBorrowedAmount, obligation };
    },
    [getLstReserve, lstMap, getLstMintFee, getSimulatedObligation],
  );

  const simulateDepositAndLoopToExposure = useCallback(
    (
      strategyType: StrategyType,
      deposit: Deposit,
      targetExposure: BigNumber,
    ): {
      deposits: Deposit[];
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      let deposits: Deposit[] = [];
      let suiBorrowedAmount = new BigNumber(0);

      // 1) Deposit
      const { deposits: newDeposits, suiBorrowedAmount: newSuiBorrowedAmount } =
        simulateDeposit(strategyType, deposit);

      deposits = newDeposits;
      suiBorrowedAmount = newSuiBorrowedAmount;

      // 2) Loop to target exposure
      return simulateLoopToExposure(
        strategyType,
        deposits,
        suiBorrowedAmount,
        targetExposure,
      );
    },
    [simulateDeposit, simulateLoopToExposure],
  );

  // Stats
  // Stats - Deposited and borrowed
  const getDepositedSuiAmount = useCallback(
    (obligation?: ParsedObligation) => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      let result = new BigNumber(0);
      for (const deposit of obligation.deposits) {
        if (isSui(deposit.coinType)) {
          result = result.plus(deposit.depositedAmount);
        } else if (isLst(deposit.coinType)) {
          const lstToSuiExchangeRate =
            lstMap?.[deposit.coinType].lstToSuiExchangeRate ?? new BigNumber(1); // Fall back to 1:1, undercounting by 1-2%

          result = result.plus(
            deposit.depositedAmount.times(lstToSuiExchangeRate),
          );
        } else {
          const depositReserve = appData.reserveMap[deposit.coinType];
          const priceSui = depositReserve.price.div(suiReserve.price);

          result = result.plus(deposit.depositedAmount.times(priceSui));
        }
      }

      return result.decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
    },
    [hasPosition, isLst, lstMap, appData.reserveMap, suiReserve.price],
  );
  const getBorrowedSuiAmount = useCallback(
    (obligation?: ParsedObligation) => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      return (obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0)) // Assume up to 1 borrow (SUI)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
    },
    [hasPosition],
  );

  // Stats - TVL
  const getTvlSuiAmount = useCallback(
    (obligation?: ParsedObligation) => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      return getDepositedSuiAmount(obligation).minus(
        getBorrowedSuiAmount(obligation),
      );
    },
    [hasPosition, getDepositedSuiAmount, getBorrowedSuiAmount],
  );

  // Stats - Unclaimed rewards
  const getUnclaimedRewardsSuiAmount = useCallback(
    (obligation?: ParsedObligation) => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const rewardsMap = getRewardsMap(
        obligation,
        userData.rewardMap,
        appData.coinMetadataMap,
      );

      return Object.entries(rewardsMap).reduce(
        (acc, [coinType, { amount }]) => {
          if (isSui(coinType)) {
            return acc.plus(amount);
          } else if (isLst(coinType)) {
            const lstToSuiExchangeRate =
              lstMap?.[coinType].lstToSuiExchangeRate ?? new BigNumber(1); // Fall back to 1:1, undercounting by 1-2%

            return acc.plus(amount.times(lstToSuiExchangeRate));
          } else {
            const price = appData.rewardPriceMap[coinType] ?? new BigNumber(0);
            const priceSui = price.div(suiReserve.price);

            return acc.plus(amount.times(priceSui));
          }
        },
        new BigNumber(0),
      );
    },
    [
      hasPosition,
      userData.rewardMap,
      appData.coinMetadataMap,
      isLst,
      lstMap,
      appData.rewardPriceMap,
      suiReserve.price,
    ],
  );

  // Stats - Historical TVL
  const getHistoricalTvlSuiAmount = useCallback(
    async (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
    ): Promise<BigNumber | undefined> => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const lstReserve = getLstReserve(strategyType);
      // const lstToSuiExchangeRate =
      //   lstMap?.[lstReserve.coinType].lstToSuiExchangeRate ?? new BigNumber(1); // Fall back to 1:1, undercounting by 1-2%

      type ActionEvent = {
        type:
          | EventType.DEPOSIT
          | EventType.WITHDRAW
          | EventType.BORROW
          | EventType.REPAY;
        timestampS: number;
        eventIndex: number;
        liquidityAmount: BigNumber;
      };
      type ObligationDataEvent = {
        type: EventType.OBLIGATION_DATA;
        timestampS: number;
        eventIndex: number;
        depositedValueUsd: BigNumber;
      };
      type ClaimRewardEvent = {
        type: EventType.CLAIM_REWARD;
        timestampS: number;
        eventIndex: number;
        coinType: string;
        liquidityAmount: BigNumber;
      };
      type Page = {
        events: (ActionEvent | ObligationDataEvent | ClaimRewardEvent)[];
        cursor: string | null;
      };

      try {
        const getPage = async (cursor?: string): Promise<Page> => {
          const url = `${API_URL}/obligations/history?${new URLSearchParams({
            obligationId: obligation.id,
            ...(cursor ? { cursor } : {}),
          })}`;
          const res = await fetch(url);
          const json: {
            results: {
              deposits: {
                deposit: {
                  timestamp: number;
                  eventIndex: number;
                };
                liquidityAmount: string;
              }[];
              withdraws: {
                withdraw: {
                  timestamp: number;
                  eventIndex: number;
                };
                liquidityAmount: string;
              }[];
              borrows: {
                timestamp: number;
                eventIndex: number;
                liquidityAmount: string; // Includes origination fees
              }[];
              repays: {
                timestamp: number;
                eventIndex: number;
                liquidityAmount: string;
              }[];
              obligationDataEvents: {
                timestamp: number;
                eventIndex: number;
                depositedValueUsd: string;
              }[];
              claimRewardEvents: {
                timestamp: number;
                eventIndex: number;
                coinType: string;
                liquidityAmount: string;
              }[];
            };
            cursor: string | null;
          } = await res.json();
          if ((json as any)?.statusCode === 500)
            throw new Error("Failed to fetch obligation history");

          const events: Page["events"] = [];
          for (const deposit of json.results.deposits) {
            events.push({
              type: EventType.DEPOSIT,
              timestampS: deposit.deposit.timestamp,
              eventIndex: deposit.deposit.eventIndex,
              liquidityAmount: new BigNumber(deposit.liquidityAmount),
            });
          }
          for (const withdraw of json.results.withdraws) {
            events.push({
              type: EventType.WITHDRAW,
              timestampS: withdraw.withdraw.timestamp,
              eventIndex: withdraw.withdraw.eventIndex,
              liquidityAmount: new BigNumber(withdraw.liquidityAmount),
            });
          }
          for (const borrow of json.results.borrows) {
            events.push({
              type: EventType.BORROW,
              timestampS: borrow.timestamp,
              eventIndex: borrow.eventIndex,
              liquidityAmount: new BigNumber(borrow.liquidityAmount),
            });
          }
          for (const repay of json.results.repays) {
            events.push({
              type: EventType.REPAY,
              timestampS: repay.timestamp,
              eventIndex: repay.eventIndex,
              liquidityAmount: new BigNumber(repay.liquidityAmount),
            });
          }
          for (const obligationDataEvent of json.results.obligationDataEvents) {
            events.push({
              type: EventType.OBLIGATION_DATA,
              timestampS: obligationDataEvent.timestamp,
              eventIndex: obligationDataEvent.eventIndex,
              depositedValueUsd: new BigNumber(
                obligationDataEvent.depositedValueUsd,
              ).div(WAD),
            });
          }
          for (const claimRewardEvent of json.results.claimRewardEvents) {
            events.push({
              type: EventType.CLAIM_REWARD,
              timestampS: claimRewardEvent.timestamp,
              eventIndex: claimRewardEvent.eventIndex,
              coinType: normalizeStructTag(claimRewardEvent.coinType),
              liquidityAmount: new BigNumber(claimRewardEvent.liquidityAmount),
            });
          }
          return { events, cursor: json.cursor };
        };

        // console.log(
        //   "XXX obligation:",
        //   +obligation.deposits[0].depositedAmount.times(lstToSuiExchangeRate),
        //   +obligation.borrows[0].borrowedAmount,
        //   +lstToSuiExchangeRate,
        // );

        // Get all pages
        const pages: Page[] = [];
        let page = await getPage();
        pages.push(page);

        while (page.cursor !== null) {
          page = await getPage(page.cursor);
          pages.push(page);
        }
        // console.log("XXX pages:", pages);

        // Combine, sort, and filter events
        const events = pages.flatMap((page) => page.events);
        const sortedEvents = events.sort((a, b) => {
          if (a.timestampS !== b.timestampS) return a.timestampS - b.timestampS; // Sort by timestamp (asc)
          if (a.eventIndex !== b.eventIndex) return a.eventIndex - b.eventIndex; // Sort by eventIndex (asc) if timestamp is the same
          return 0; // Should never happen
        });
        // console.log(
        //   `XXX sortedEvents: ${JSON.stringify(
        //     sortedEvents.map((e, i) => ({ index: i, ...e })),
        //     null,
        //     2,
        //   )}`,
        // );

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

        // Return early if no non-filtered events for current position
        if (currentPositionSortedEvents.length === 0) {
          console.log(
            "XXX no non-filtered events for current position",
            strategyType,
          );
          return getTvlSuiAmount(obligation); // Return current TVL (no PnL)
        }

        // Get historical LST to SUI exchange rates for the relevant timestamps (current position deposits and withdraws)
        const lstToSuiExchangeRateTimestampsS = Array.from(
          new Set(
            currentPositionSortedEvents
              .filter((event) =>
                [EventType.DEPOSIT, EventType.WITHDRAW].includes(event.type),
              )
              .map((event) => event.timestampS),
          ),
        );

        let lstToSuiExchangeRateMap: Record<number, BigNumber> = {};
        if (lstToSuiExchangeRateTimestampsS.length > 0) {
          const res = await fetch(
            `${API_URL}/springsui/historical-rates?coinType=${lstReserve.coinType}&timestamps=${lstToSuiExchangeRateTimestampsS.join(",")}`,
          );
          const json: { timestamp: number; value: string }[] = await res.json();
          if ((json as any)?.statusCode === 500)
            throw new Error(
              `Failed to fetch historical LST to SUI exchange rates for ${lstReserve.coinType}`,
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
        let depositedSuiAmount = new BigNumber(0);
        let borrowedSuiAmount = new BigNumber(0);
        for (let i = 0; i < currentPositionSortedEvents.length; i++) {
          const event = currentPositionSortedEvents[i];
          const previousEvent = currentPositionSortedEvents[i - 1];

          // Deposit/withdraw
          if (event.type === EventType.DEPOSIT) {
            const lstToSuiExchangeRate =
              lstToSuiExchangeRateMap[event.timestampS];
            if (lstToSuiExchangeRate === undefined) {
              throw new Error(
                `lstToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
              );
            }

            const isDepositingClaimedReward =
              previousEvent && previousEvent.type === EventType.CLAIM_REWARD;
            if (isDepositingClaimedReward) {
              console.log("XXX skipping depositing claimed reward"); // Regardless of coinType, we don't want to count claimed+deposited rewards as deposited SUI
              continue;
            }

            depositedSuiAmount = depositedSuiAmount.plus(
              event.liquidityAmount.times(lstToSuiExchangeRate),
            );
            // console.log(
            //   `XXX depositedSuiAmount: ${+depositedSuiAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.WITHDRAW) {
            const lstToSuiExchangeRate =
              lstToSuiExchangeRateMap[event.timestampS];
            if (lstToSuiExchangeRate === undefined) {
              throw new Error(
                `lstToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
              );
            }

            depositedSuiAmount = depositedSuiAmount.minus(
              event.liquidityAmount.times(lstToSuiExchangeRate),
            );
            // console.log(
            //   `XXX depositedSuiAmount: ${+depositedSuiAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          }

          // Borrow/repay
          else if (event.type === EventType.BORROW) {
            borrowedSuiAmount = borrowedSuiAmount.plus(event.liquidityAmount);
            // console.log(
            //   `XXX borrowedSuiAmount: ${+borrowedSuiAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.REPAY) {
            borrowedSuiAmount = borrowedSuiAmount.minus(event.liquidityAmount);
            // console.log(
            //   `XXX borrowedSuiAmount: ${+borrowedSuiAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          }
        }
        console.log(`XXX depositedSuiAmount (final): ${depositedSuiAmount}`);
        console.log(`XXX borrowedSuiAmount (final): ${borrowedSuiAmount}`);

        const tvlSuiAmount = depositedSuiAmount.minus(borrowedSuiAmount);
        console.log(`XXX tvlSuiAmount (final): ${tvlSuiAmount}`);

        return tvlSuiAmount;
      } catch (err) {
        console.error(err);
        return undefined;
      }
    },
    [hasPosition, getLstReserve, getTvlSuiAmount],
  );

  // Stats - APR
  const getAprPercent = useCallback(
    (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
      exposure?: BigNumber,
    ) => {
      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

        _obligation = simulateDepositAndLoopToExposure(
          strategyType,
          {
            coinType:
              STRATEGY_TYPE_INFO_MAP[strategyType].defaultOpenCloseCoinType,
            amount: new BigNumber(1), // Any number will do
          },
          exposure,
        ).obligation;
      }

      return getNetAprPercent(
        _obligation,
        userData.rewardMap,
        allAppData.lstAprPercentMap,
        !obligation || !hasPosition(obligation),
      );
    },
    [
      hasPosition,
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
    ) => {
      let _obligation;
      if (!!obligation && hasPosition(obligation)) {
        _obligation = obligation;
      } else {
        if (exposure === undefined) return new BigNumber(0); // Not shown in UI

        _obligation = simulateDepositAndLoopToExposure(
          strategyType,
          {
            coinType:
              STRATEGY_TYPE_INFO_MAP[strategyType].defaultOpenCloseCoinType,
            amount: new BigNumber(1), // Any number will do
          },
          exposure,
        ).obligation;
      }

      const weightedBorrowsUsd = getWeightedBorrowsUsd(_obligation);
      const borrowLimitUsd = _obligation.minPriceBorrowLimitUsd;
      const liquidationThresholdUsd = _obligation.unhealthyBorrowValueUsd;

      if (weightedBorrowsUsd.lt(borrowLimitUsd)) return new BigNumber(100);
      return new BigNumber(100).minus(
        new BigNumber(weightedBorrowsUsd.minus(borrowLimitUsd))
          .div(liquidationThresholdUsd.minus(borrowLimitUsd))
          .times(100),
      );
    },
    [hasPosition, simulateDepositAndLoopToExposure],
  );

  // Context
  const contextValue: LstStrategyContext = useMemo(
    () => ({
      // More parameters
      isMoreParametersOpen,
      setIsMoreParametersOpen,

      // Obligations
      hasPosition,

      // SUI
      suiReserve,
      suiBorrowFeePercent,

      // LSTs
      getLstReserve,
      lstMap,
      getLstMintFee,
      getLstRedeemFee,

      // Exposure map
      exposureMap,

      // Calculations
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getStepMaxWithdrawnAmount,

      // Simulate
      getSimulatedObligation,
      simulateLoopToExposure,
      simulateUnloopToExposure,
      simulateDeposit,
      simulateDepositAndLoopToExposure,

      // Stats
      getDepositedSuiAmount,
      getBorrowedSuiAmount,
      getTvlSuiAmount,
      getUnclaimedRewardsSuiAmount,
      getHistoricalTvlSuiAmount,
      getAprPercent,
      getHealthPercent,
    }),
    [
      isMoreParametersOpen,
      setIsMoreParametersOpen,
      hasPosition,
      suiReserve,
      suiBorrowFeePercent,
      getLstReserve,
      lstMap,
      getLstMintFee,
      getLstRedeemFee,
      exposureMap,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getStepMaxWithdrawnAmount,
      getSimulatedObligation,
      simulateLoopToExposure,
      simulateUnloopToExposure,
      simulateDeposit,
      simulateDepositAndLoopToExposure,
      getDepositedSuiAmount,
      getBorrowedSuiAmount,
      getTvlSuiAmount,
      getUnclaimedRewardsSuiAmount,
      getHistoricalTvlSuiAmount,
      getAprPercent,
      getHealthPercent,
    ],
  );

  return (
    <LstStrategyContext.Provider value={contextValue}>
      {lstMap !== undefined ? children : <FullPageSpinner />}
    </LstStrategyContext.Provider>
  );
}
