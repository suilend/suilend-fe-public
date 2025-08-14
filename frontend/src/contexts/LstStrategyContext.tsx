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
import { useLocalStorage } from "usehooks-ts";

import {
  ParsedObligation,
  ParsedReserve,
  RewardSummary,
  WAD,
  getNetAprPercent,
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
  formatList,
  isSendPoints,
} from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { getWeightedBorrowsUsd } from "@/components/shared/UtilizationBar";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { EventType } from "@/lib/events";

export const E = 10 ** -6;
export const LST_DECIMALS = 9;

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
  getExposure: (
    strategyType: StrategyType,
    lstDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;
  getStepMaxSuiBorrowedAmount: (
    strategyType: StrategyType,
    lstDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;
  getStepMaxLstWithdrawnAmount: (
    strategyType: StrategyType,
    lstDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;

  // Simulate
  getSimulatedObligation: (
    strategyType: StrategyType,
    lstDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => ParsedObligation;
  simulateLoopToExposure: (
    strategyType: StrategyType,
    lstDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    lstDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateUnloopToExposure: (
    strategyType: StrategyType,
    lstDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    lstDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDeposit: (
    strategyType: StrategyType,
    amount: { sui: BigNumber } | { lst: BigNumber },
    targetExposure: BigNumber,
  ) => {
    lstDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };

  // Stats
  getTvlSuiAmount: (
    strategyType: StrategyType,
    obligation?: ParsedObligation,
  ) => BigNumber;
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
  getStepMaxLstWithdrawnAmount: () => {
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

  // Stats
  getTvlSuiAmount: () => {
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
  const { allAppData, appData } = useLoadedAppContext();

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
      const publishedAt = await getLatestSpringSuiPackageId(
        suiClient,
        SPRING_SUI_UPGRADE_CAP_ID,
      );

      const lstInfoUrl = `${API_URL}/springsui/lst-info?${new URLSearchParams({
        coinTypes: Array.from(
          new Set(
            Object.values(STRATEGY_TYPE_INFO_MAP).map(
              ({ lstCoinType }) => lstCoinType,
            ),
          ),
        ).join(","),
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
          Object.values(STRATEGY_TYPE_INFO_MAP).map(async ({ lstCoinType }) => {
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
    (lstCoinType: string, lstAmount: BigNumber) =>
      lstAmount
        .times(
          (lstMap?.[lstCoinType].redeemFeePercent ?? new BigNumber(0)).div(100),
        )
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP),
    [lstMap],
  );

  // Exposure map
  const exposureMap = useMemo(
    () =>
      Object.values(StrategyType).reduce(
        (acc, strategyType) => ({
          ...acc,
          [strategyType]: (() => {
            const lstReserve = getLstReserve(strategyType as StrategyType);

            const minExposure = new BigNumber(1);
            const maxExposure = new BigNumber(
              1 / (1 - lstReserve.config.openLtvPct / 100),
            ).decimalPlaces(0, BigNumber.ROUND_DOWN); // Round down to 0dp e.g. 3.333x -> 3x
            const defaultExposure = maxExposure;

            return {
              min: minExposure,
              max: maxExposure,
              default: defaultExposure,
            };
          })(),
        }),
        {} as Record<
          StrategyType,
          { min: BigNumber; max: BigNumber; default: BigNumber }
        >,
      ),
    [getLstReserve],
  );

  // Calculations
  const getExposure = useCallback(
    (
      strategyType: StrategyType,
      lstDepositedAmount: BigNumber,
      suiBorrowedAmount: BigNumber,
    ): BigNumber =>
      lstDepositedAmount.gt(0)
        ? lstDepositedAmount.div(lstDepositedAmount.minus(suiBorrowedAmount))
        : new BigNumber(0),
    [],
  );

  const getStepMaxSuiBorrowedAmount = useCallback(
    (
      strategyType: StrategyType,
      lstDepositedAmount: BigNumber,
      suiBorrowedAmount: BigNumber,
    ): BigNumber => {
      const lstReserve = getLstReserve(strategyType);

      return new BigNumber(
        new BigNumber(
          new BigNumber(lstReserve.config.openLtvPct)
            .div(100)
            .times(lstReserve.minPrice.div(lstReserve.maxPrice)),
        ).times(lstDepositedAmount),
      )
        .minus(suiBorrowedAmount)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
    },
    [getLstReserve],
  );
  const getStepMaxLstWithdrawnAmount = useCallback(
    (
      strategyType: StrategyType,
      lstDepositedAmount: BigNumber,
      suiBorrowedAmount: BigNumber,
    ): BigNumber => {
      const lstReserve = getLstReserve(strategyType);

      return BigNumber.min(
        new BigNumber(
          lstDepositedAmount
            .times(lstReserve.minPrice)
            .times(lstReserve.config.openLtvPct / 100),
        )
          .minus(
            suiBorrowedAmount
              .times(suiReserve.maxPrice)
              .times(suiReserve.config.borrowWeightBps.div(10000)),
          )
          .div(lstReserve.minPrice)
          .div(lstReserve.config.openLtvPct / 100),
        lstDepositedAmount,
      ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
    },
    [getLstReserve, suiReserve],
  );

  // Simulate
  const getSimulatedObligation = useCallback(
    (
      strategyType: StrategyType,
      lstDepositedAmount: BigNumber,
      suiBorrowedAmount: BigNumber,
    ): ParsedObligation => {
      const lstReserve = getLstReserve(strategyType);

      const obligation = {
        deposits: [
          {
            depositedAmount: lstDepositedAmount,
            depositedAmountUsd: lstDepositedAmount.times(lstReserve.price),
            reserve: lstReserve,
            coinType: lstReserve.coinType,
          },
        ],
        borrows: [
          {
            borrowedAmount: suiBorrowedAmount,
            borrowedAmountUsd: suiBorrowedAmount.times(suiReserve.price),
            reserve: suiReserve,
            coinType: NORMALIZED_SUI_COINTYPE,
          },
        ],

        netValueUsd: new BigNumber(
          lstDepositedAmount.times(lstReserve.price),
        ).minus(suiBorrowedAmount.times(suiReserve.price)),
        weightedBorrowsUsd: new BigNumber(
          suiBorrowedAmount.times(suiReserve.price),
        ).times(suiReserve.config.borrowWeightBps.div(10000)),
        maxPriceWeightedBorrowsUsd: new BigNumber(
          suiBorrowedAmount.times(suiReserve.maxPrice),
        ).times(suiReserve.config.borrowWeightBps.div(10000)),
        minPriceBorrowLimitUsd: BigNumber.min(
          lstDepositedAmount
            .times(lstReserve.minPrice)
            .times(lstReserve.config.openLtvPct / 100),
          30 * 10 ** 6, // Cap `minPriceBorrowLimitUsd` at $30m (account borrow limit)
        ),
        unhealthyBorrowValueUsd: lstDepositedAmount
          .times(lstReserve.price)
          .times(lstReserve.config.closeLtvPct / 100),
      } as ParsedObligation;

      return obligation;
    },
    [getLstReserve, suiReserve],
  );

  const simulateLoopToExposure = useCallback(
    (
      strategyType: StrategyType,
      _lstDepositedAmount: BigNumber,
      _suiBorrowedAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      lstDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const lstReserve = getLstReserve(strategyType);
      const suiToLstExchangeRate =
        lstMap?.[lstReserve.coinType].suiToLstExchangeRate ?? new BigNumber(0);

      let lstDepositedAmount = _lstDepositedAmount;
      let suiBorrowedAmount = _suiBorrowedAmount;

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          strategyType,
          lstDepositedAmount,
          suiBorrowedAmount,
        );
        const pendingExposure = targetExposure.minus(exposure);
        if (pendingExposure.lte(E)) break;

        // 1) Max
        const stepMaxSuiBorrowedAmount = getStepMaxSuiBorrowedAmount(
          strategyType,
          lstDepositedAmount,
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
          strategyType,
          lstDepositedAmount.plus(stepMaxLstDepositedAmount),
          suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
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

        lstDepositedAmount = lstDepositedAmount.plus(stepLstDepositedAmount);
      }

      // Obligation
      const obligation = getSimulatedObligation(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      );

      return { lstDepositedAmount, suiBorrowedAmount, obligation };
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
      _lstDepositedAmount: BigNumber,
      _suiBorrowedAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      lstDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      let lstDepositedAmount = _lstDepositedAmount;
      let suiBorrowedAmount = _suiBorrowedAmount;

      const lstReserve = getLstReserve(strategyType);
      const lstToSuiExchangeRate =
        lstMap?.[lstReserve.coinType].lstToSuiExchangeRate ?? new BigNumber(0);

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(
          strategyType,
          lstDepositedAmount,
          suiBorrowedAmount,
        );
        const pendingExposure = exposure.minus(targetExposure);
        if (pendingExposure.lte(E)) break;

        // 1) Max
        const stepMaxLstWithdrawnAmount = getStepMaxLstWithdrawnAmount(
          strategyType,
          lstDepositedAmount,
          suiBorrowedAmount,
        )
          .times(0.98) // 2% buffer
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxSuiRepaidAmount = new BigNumber(
          stepMaxLstWithdrawnAmount.minus(
            getLstRedeemFee(lstReserve.coinType, stepMaxLstWithdrawnAmount),
          ),
        )
          .times(lstToSuiExchangeRate)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxExposure = getExposure(
          strategyType,
          lstDepositedAmount.plus(stepMaxLstWithdrawnAmount),
          suiBorrowedAmount.plus(stepMaxSuiRepaidAmount),
        ).minus(exposure);

        // 2) Withdraw LST
        const stepLstWithdrawnAmount = stepMaxLstWithdrawnAmount
          .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
          .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxWithdraw = stepLstWithdrawnAmount.eq(
          stepMaxLstWithdrawnAmount,
        );

        lstDepositedAmount = lstDepositedAmount.minus(stepLstWithdrawnAmount);

        // 3) Unstake withdrawn LST for SUI

        // 4) Repay SUI
        const stepSuiRepaidAmount = new BigNumber(
          stepLstWithdrawnAmount.minus(
            getLstRedeemFee(lstReserve.coinType, stepLstWithdrawnAmount),
          ),
        )
          .times(lstToSuiExchangeRate)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);

        suiBorrowedAmount = suiBorrowedAmount.minus(stepSuiRepaidAmount);
      }

      // Obligation
      const obligation = getSimulatedObligation(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      );

      return { lstDepositedAmount, suiBorrowedAmount, obligation };
    },
    [
      getLstReserve,
      lstMap,
      getExposure,
      getStepMaxLstWithdrawnAmount,
      getLstRedeemFee,
      getSimulatedObligation,
    ],
  );

  const simulateDeposit = useCallback(
    (
      strategyType: StrategyType,
      amount: { sui: BigNumber } | { lst: BigNumber },
      targetExposure: BigNumber,
    ): {
      lstDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const lstReserve = getLstReserve(strategyType);
      const suiToLstExchangeRate =
        lstMap?.[lstReserve.coinType].suiToLstExchangeRate ?? new BigNumber(0);

      const lstAmount = (
        "sui" in amount
          ? amount.sui
              .minus(getLstMintFee(lstReserve.coinType, amount.sui))
              .times(suiToLstExchangeRate)
          : amount.lst
      ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

      // Prepare
      let lstDepositedAmount = new BigNumber(0);
      let suiBorrowedAmount = new BigNumber(0);

      // 1) Stake SUI for LST OR split LST coins

      // 2) Deposit LST (1x exposure)
      lstDepositedAmount = lstDepositedAmount.plus(lstAmount);

      // 3) Loop to target exposure
      const {
        lstDepositedAmount: _lstDepositedAmount,
        suiBorrowedAmount: _suiBorrowedAmount,
      } = simulateLoopToExposure(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
        targetExposure,
      );
      lstDepositedAmount = _lstDepositedAmount;
      suiBorrowedAmount = _suiBorrowedAmount;

      // Obligation
      const obligation = getSimulatedObligation(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      );

      return { lstDepositedAmount, suiBorrowedAmount, obligation };
    },
    [
      getLstReserve,
      lstMap,
      getLstMintFee,
      simulateLoopToExposure,
      getSimulatedObligation,
    ],
  );

  // Stats
  // Stats - TVL
  const getTvlSuiAmount = useCallback(
    (strategyType: StrategyType, obligation?: ParsedObligation) => {
      if (!!obligation && hasPosition(obligation)) {
        const lstReserve = getLstReserve(strategyType);
        const lstToSuiExchangeRate =
          lstMap?.[lstReserve.coinType].lstToSuiExchangeRate ??
          new BigNumber(0);

        // Raw TVL
        let result = new BigNumber(
          obligation.deposits[0].depositedAmount.times(lstToSuiExchangeRate),
        ).minus(obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0));

        // Unclaimed rewards
        const rewardsMap: Record<
          string,
          { amount: BigNumber; rewards: RewardSummary[] }
        > = {};
        if (obligation) {
          Object.values(userData.rewardMap).flatMap((rewards) =>
            [...rewards.deposit, ...rewards.borrow].forEach((r) => {
              if (isSendPoints(r.stats.rewardCoinType)) return;
              if (!r.obligationClaims[obligation.id]) return;
              if (r.obligationClaims[obligation.id].claimableAmount.eq(0))
                return;

              const minAmount = 10 ** (-1 * r.stats.mintDecimals);
              if (
                r.obligationClaims[obligation.id].claimableAmount.lt(minAmount)
              )
                return;

              if (!rewardsMap[r.stats.rewardCoinType])
                rewardsMap[r.stats.rewardCoinType] = {
                  amount: new BigNumber(0),
                  rewards: [],
                };
              rewardsMap[r.stats.rewardCoinType].amount = rewardsMap[
                r.stats.rewardCoinType
              ].amount.plus(r.obligationClaims[obligation.id].claimableAmount);
              rewardsMap[r.stats.rewardCoinType].rewards.push(r);
            }),
          );
        }

        // Add unclaimed rewards to TVL
        Object.entries(rewardsMap).forEach(([coinType, { amount }]) => {
          const priceSui = (
            appData.rewardPriceMap[coinType] ?? new BigNumber(0)
          ).div(suiReserve.price);

          result = result.plus(amount.times(priceSui));
        });

        return result;
      } else {
        return new BigNumber(0);
      }
    },
    [
      hasPosition,
      getLstReserve,
      lstMap,
      userData.rewardMap,
      appData.rewardPriceMap,
      suiReserve.price,
    ],
  );

  // Stats - PnL
  const getHistoricalTvlSuiAmount = useCallback(
    async (
      strategyType: StrategyType,
      obligation?: ParsedObligation,
    ): Promise<BigNumber | undefined> => {
      if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

      const lstReserve = getLstReserve(strategyType);
      // const lstToSuiExchangeRate =
      //   lstMap?.[lstReserve.coinType].lstToSuiExchangeRate ?? new BigNumber(0);

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

        const filteredSortedEvents = sortedEvents.filter((event) => {
          const diffS = Date.now() / 1000 - event.timestampS;
          return !(diffS < 30); // Exclude events that are less than 30 seconds old (indexer may not have indexed all event types yet)
        });
        // console.log(
        //   `XXX filteredSortedEvents: ${JSON.stringify(
        //     filteredSortedEvents.map((e, i) => ({ index: i, ...e })),
        //     null,
        //     2,
        //   )}`,
        // );

        // Only keep events for the current position (since last obligationDataEvent.depositedValueUsd === 0)
        const lastZeroDepositedValueUsdObligationDataEventIndex =
          filteredSortedEvents.findLastIndex(
            (event) =>
              event.type === EventType.OBLIGATION_DATA &&
              (event as ObligationDataEvent).depositedValueUsd.eq(0),
          );
        // console.log(
        //   "XXX lastZeroDepositedValueUsdObligationDataEventIndex:",
        //   lastZeroDepositedValueUsdObligationDataEventIndex,
        // );

        const currentPositionFilteredSortedEvents =
          lastZeroDepositedValueUsdObligationDataEventIndex === -1
            ? filteredSortedEvents
            : filteredSortedEvents.slice(
                lastZeroDepositedValueUsdObligationDataEventIndex +
                  1 + // Exclude ObligationDataEvent
                  1, // Exclude last WithdrawEvent (ObligationDataEvent goes before WithdrawEvent)
              );
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

        // Return early if no non-filtered events for current position
        if (currentPositionFilteredSortedEvents.length === 0) {
          console.log(
            "XXX no non-filtered events for current position",
            strategyType,
          );
          return getTvlSuiAmount(strategyType, obligation); // Return current TVL (no PnL)
        }

        // Get historical LST to SUI exchange rates for the relevant timestamps (current position deposits and withdraws)
        const lstToSuiExchangeRateTimestampsS = Array.from(
          new Set(
            currentPositionFilteredSortedEvents
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
        for (let i = 0; i < currentPositionFilteredSortedEvents.length; i++) {
          const event = currentPositionFilteredSortedEvents[i];

          // Deposit/withdraw
          if (event.type === EventType.DEPOSIT) {
            const lstToSuiExchangeRate =
              lstToSuiExchangeRateMap[event.timestampS];
            if (lstToSuiExchangeRate === undefined) {
              throw new Error(
                `lstToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
              );
            }

            const previousEvent = currentPositionFilteredSortedEvents[i - 1];
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
        if (exposure === undefined)
          throw new Error(
            "exposure must be defined if obligation is not defined or has no position",
          );

        _obligation = simulateDeposit(
          strategyType,
          { sui: new BigNumber(1) }, // Any number will do
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
      simulateDeposit,
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
        if (exposure === undefined)
          throw new Error(
            "exposure must be defined if obligation is not defined",
          );

        _obligation = simulateDeposit(
          strategyType,
          { sui: new BigNumber(1) }, // Any number will do
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
    [hasPosition, simulateDeposit],
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
      getStepMaxLstWithdrawnAmount,

      // Simulate
      getSimulatedObligation,
      simulateLoopToExposure,
      simulateUnloopToExposure,
      simulateDeposit,

      // Stats
      getTvlSuiAmount,
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
      getStepMaxLstWithdrawnAmount,
      getSimulatedObligation,
      simulateLoopToExposure,
      simulateUnloopToExposure,
      simulateDeposit,
      getTvlSuiAmount,
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
