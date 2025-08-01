import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import {
  ParsedObligation,
  ParsedReserve,
  getNetAprPercent,
} from "@suilend/sdk";
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
} from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { getWeightedBorrowsUsd } from "@/components/shared/UtilizationBar";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export const E = 10 ** -6;
export const sSUI_DECIMALS = 9;

interface SsuiStrategyContext {
  // Obligation
  isObligationLooping: (obligation?: ParsedObligation) => boolean;

  // sSUI
  suiReserve: ParsedReserve;
  sSuiReserve: ParsedReserve;
  minExposure: BigNumber;
  maxExposure: BigNumber;
  defaultExposure: BigNumber;

  lstClient: LstClient | undefined;
  sSuiMintFeePercent: BigNumber;
  sSuiRedeemFeePercent: BigNumber;
  suiBorrowFeePercent: BigNumber;
  suiToSsuiExchangeRate: BigNumber;
  sSuiToSuiExchangeRate: BigNumber;

  getSsuiMintFee: (suiAmount: BigNumber) => BigNumber;
  getSsuiRedeemFee: (sSuiAmount: BigNumber) => BigNumber;
  getExposure: (
    sSuiDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;
  getStepMaxSuiBorrowedAmount: (
    sSuiDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;
  getStepMaxSsuiWithdrawnAmount: (
    sSuiDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
  ) => BigNumber;
  simulateLoopToExposure: (
    sSuiDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateUnloopToExposure: (
    sSuiDepositedAmount: BigNumber,
    suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  simulateDeposit: (
    suiAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };
  getTvlSuiAmount: (obligation?: ParsedObligation) => BigNumber;
  getAprPercent: (
    obligation?: ParsedObligation,
    exposure?: BigNumber,
  ) => BigNumber;
  getHealthPercent: (
    obligation?: ParsedObligation,
    exposure?: BigNumber,
  ) => BigNumber;
}
type LoadedSsuiStrategyContext = SsuiStrategyContext & {
  lstClient: LstClient;
};

const defaultContextValue: SsuiStrategyContext = {
  isObligationLooping: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },

  suiReserve: {} as ParsedReserve,
  sSuiReserve: {} as ParsedReserve,
  minExposure: new BigNumber(0),
  maxExposure: new BigNumber(0),
  defaultExposure: new BigNumber(0),

  lstClient: undefined,
  sSuiMintFeePercent: new BigNumber(0),
  sSuiRedeemFeePercent: new BigNumber(0),
  suiBorrowFeePercent: new BigNumber(0),
  suiToSsuiExchangeRate: new BigNumber(0),
  sSuiToSuiExchangeRate: new BigNumber(0),

  getSsuiMintFee: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getSsuiRedeemFee: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getExposure: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getStepMaxSuiBorrowedAmount: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getStepMaxSsuiWithdrawnAmount: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  simulateLoopToExposure: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  simulateUnloopToExposure: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  simulateDeposit: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getTvlSuiAmount: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getAprPercent: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
  getHealthPercent: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },
};

const SsuiStrategyContext =
  createContext<SsuiStrategyContext>(defaultContextValue);

export const useSsuiStrategyContext = () => useContext(SsuiStrategyContext);
export const useLoadedSsuiStrategyContext = () =>
  useSsuiStrategyContext() as LoadedSsuiStrategyContext;

export function SsuiStrategyContextProvider({ children }: PropsWithChildren) {
  const { suiClient } = useSettingsContext();
  const { userData } = useLoadedUserContext();
  const { allAppData, appData } = useLoadedAppContext();

  // Reserves
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const sSuiReserve = appData.reserveMap[NORMALIZED_sSUI_COINTYPE];

  const minExposure = useMemo(() => new BigNumber(1), []);
  const maxExposure = useMemo(
    () =>
      new BigNumber(
        1 / (1 - sSuiReserve.config.openLtvPct / 100),
      ).decimalPlaces(0, BigNumber.ROUND_DOWN), // Round down to 0dp e.g. 3.333x -> 3x
    [sSuiReserve.config.openLtvPct],
  );
  const defaultExposure = useMemo(() => maxExposure, [maxExposure]);

  // Obligation
  const isObligationLooping = useCallback((obligation?: ParsedObligation) => {
    if (!obligation) return false;

    return (
      obligation.deposits.length === 1 &&
      obligation.deposits[0].coinType === NORMALIZED_sSUI_COINTYPE &&
      (obligation.borrows.length === 0 ||
        (obligation.borrows.length === 1 &&
          obligation.borrows[0].coinType === NORMALIZED_SUI_COINTYPE))
    );
  }, []);

  // sSUI
  const [lstClient, setLstClient] = useState<LstClient | undefined>(undefined);
  const [liquidStakingInfo, setLiquidStakingInfo] = useState<
    LiquidStakingInfo<string> | undefined
  >(undefined);

  useEffect(() => {
    (async () => {
      try {
        const publishedAt = await getLatestSpringSuiPackageId(
          suiClient,
          SPRING_SUI_UPGRADE_CAP_ID,
        );

        const lstInfoRes = await fetch(
          `${API_URL}/springsui/lst-info?${new URLSearchParams({
            coinType: NORMALIZED_sSUI_COINTYPE,
          })}`,
        );
        const lstInfoJson: {
          LIQUID_STAKING_INFO: LiquidStakingObjectInfo;
          liquidStakingInfo: LiquidStakingInfo<string>;
          weightHook: WeightHook<string>;
          apy: string;
        } = await lstInfoRes.json();
        if ((lstInfoRes as any)?.statusCode === 500)
          throw new Error("Failed to fetch sSUI LST info");

        const _lstClient = await LstClient.initialize(
          suiClient,
          lstInfoJson.LIQUID_STAKING_INFO,
          publishedAt,
        );
        setLstClient(_lstClient);
        setLiquidStakingInfo(lstInfoJson.liquidStakingInfo);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [suiClient]);

  const sSuiMintFeePercent = useMemo(
    () =>
      liquidStakingInfo === undefined
        ? new BigNumber(0)
        : new BigNumber(
            liquidStakingInfo.feeConfig.element?.suiMintFeeBps.toString() ?? 0,
          ).div(100),
    [liquidStakingInfo],
  );
  const sSuiRedeemFeePercent = useMemo(
    () =>
      liquidStakingInfo === undefined
        ? new BigNumber(0)
        : new BigNumber(
            liquidStakingInfo.feeConfig.element?.redeemFeeBps.toString() ?? 0,
          ).div(100),
    [liquidStakingInfo],
  );
  const suiBorrowFeePercent = useMemo(
    () => new BigNumber(suiReserve.config.borrowFeeBps).div(100),
    [suiReserve.config.borrowFeeBps],
  );

  const [suiToSsuiExchangeRate, sSuiToSuiExchangeRate] = useMemo(() => {
    if (liquidStakingInfo === undefined)
      return [new BigNumber(0), new BigNumber(0)];

    const totalSuiSupply = new BigNumber(
      liquidStakingInfo.storage.totalSuiSupply.toString(),
    ).div(10 ** SUI_DECIMALS);
    const totalSsuiSupply = new BigNumber(
      liquidStakingInfo.lstTreasuryCap.totalSupply.value.toString(),
    ).div(10 ** sSUI_DECIMALS);

    return [
      !totalSuiSupply.eq(0)
        ? totalSsuiSupply.div(totalSuiSupply)
        : new BigNumber(1),
      !totalSsuiSupply.eq(0)
        ? totalSuiSupply.div(totalSsuiSupply)
        : new BigNumber(1),
    ];
  }, [liquidStakingInfo]);
  console.log(
    `[SsuiStrategyContextProvider] suiToSsuiExchangeRate: ${suiToSsuiExchangeRate}, sSuiToSuiExchangeRate: ${sSuiToSuiExchangeRate}`,
  );

  const getSsuiMintFee = useCallback(
    (suiAmount: BigNumber) =>
      suiAmount
        .times(sSuiMintFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP),
    [sSuiMintFeePercent],
  );
  const getSsuiRedeemFee = useCallback(
    (sSuiAmount: BigNumber) =>
      sSuiAmount
        .times(sSuiRedeemFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP),
    [sSuiRedeemFeePercent],
  );

  // Calculations
  const getExposure = useCallback(
    (
      sSuiDepositedAmount: BigNumber,
      suiBorrowedAmount: BigNumber,
    ): BigNumber =>
      sSuiDepositedAmount.gt(0)
        ? sSuiDepositedAmount.div(sSuiDepositedAmount.minus(suiBorrowedAmount))
        : new BigNumber(0),
    [],
  );

  const getStepMaxSuiBorrowedAmount = useCallback(
    (sSuiDepositedAmount: BigNumber, suiBorrowedAmount: BigNumber): BigNumber =>
      new BigNumber(
        new BigNumber(
          new BigNumber(sSuiReserve.config.openLtvPct)
            .div(100)
            .times(sSuiReserve.minPrice.div(sSuiReserve.maxPrice)),
        ).times(sSuiDepositedAmount),
      )
        .minus(suiBorrowedAmount)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN),
    [sSuiReserve.config.openLtvPct, sSuiReserve.minPrice, sSuiReserve.maxPrice],
  );
  const getStepMaxSsuiWithdrawnAmount = useCallback(
    (sSuiDepositedAmount: BigNumber, suiBorrowedAmount: BigNumber): BigNumber =>
      BigNumber.min(
        new BigNumber(
          sSuiDepositedAmount
            .times(sSuiReserve.minPrice)
            .times(sSuiReserve.config.openLtvPct / 100),
        )
          .minus(
            suiBorrowedAmount
              .times(suiReserve.maxPrice)
              .times(suiReserve.config.borrowWeightBps.div(10000)),
          )
          .div(sSuiReserve.minPrice)
          .div(sSuiReserve.config.openLtvPct / 100),
        sSuiDepositedAmount,
      ).decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN),
    [
      suiReserve.maxPrice,
      suiReserve.config.borrowWeightBps,
      sSuiReserve.minPrice,
      sSuiReserve.config.openLtvPct,
    ],
  );

  // Simulate
  const getSimulatedObligation = useCallback(
    (
      sSuiDepositedAmount: BigNumber,
      suiBorrowedAmount: BigNumber,
    ): ParsedObligation => {
      const obligation = {
        deposits: [
          {
            depositedAmount: sSuiDepositedAmount,
            depositedAmountUsd: sSuiDepositedAmount.times(sSuiReserve.price),
            reserve: sSuiReserve,
            coinType: NORMALIZED_sSUI_COINTYPE,
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
          sSuiDepositedAmount.times(sSuiReserve.price),
        ).minus(suiBorrowedAmount.times(suiReserve.price)),
        weightedBorrowsUsd: new BigNumber(
          suiBorrowedAmount.times(suiReserve.price),
        ).times(suiReserve.config.borrowWeightBps.div(10000)),
        maxPriceWeightedBorrowsUsd: new BigNumber(
          suiBorrowedAmount.times(suiReserve.maxPrice),
        ).times(suiReserve.config.borrowWeightBps.div(10000)),
        minPriceBorrowLimitUsd: BigNumber.min(
          sSuiDepositedAmount
            .times(sSuiReserve.minPrice)
            .times(sSuiReserve.config.openLtvPct / 100),
          30 * 10 ** 6, // Cap `minPriceBorrowLimitUsd` at $30m (account borrow limit)
        ),
        unhealthyBorrowValueUsd: sSuiDepositedAmount
          .times(sSuiReserve.price)
          .times(sSuiReserve.config.closeLtvPct / 100),
      } as ParsedObligation;

      return obligation;
    },
    [sSuiReserve, suiReserve],
  );

  const simulateLoopToExposure = useCallback(
    (
      _sSuiDepositedAmount: BigNumber,
      _suiBorrowedAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      sSuiDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      let sSuiDepositedAmount = _sSuiDepositedAmount;
      let suiBorrowedAmount = _suiBorrowedAmount;

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
        const pendingExposure = targetExposure.minus(exposure);
        if (pendingExposure.lte(E)) break;

        // 1) Max
        const stepMaxSuiBorrowedAmount = getStepMaxSuiBorrowedAmount(
          sSuiDepositedAmount,
          suiBorrowedAmount,
        )
          .times(0.99) // 1% buffer
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxSsuiDepositedAmount = new BigNumber(
          stepMaxSuiBorrowedAmount.minus(
            getSsuiMintFee(stepMaxSuiBorrowedAmount),
          ),
        )
          .times(suiToSsuiExchangeRate)
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxExposure = getExposure(
          sSuiDepositedAmount.plus(stepMaxSsuiDepositedAmount),
          suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
        ).minus(exposure);

        // 2) Borrow SUI
        const stepSuiBorrowedAmount = stepMaxSuiBorrowedAmount
          .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);

        suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

        // 3) Stake borrowed SUI for sSUI

        // 4) Deposit sSUI
        const stepSsuiDepositedAmount = new BigNumber(
          stepSuiBorrowedAmount.minus(getSsuiMintFee(stepSuiBorrowedAmount)),
        )
          .times(suiToSsuiExchangeRate)
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxDeposit = stepSsuiDepositedAmount.eq(
          stepMaxSsuiDepositedAmount,
        );

        sSuiDepositedAmount = sSuiDepositedAmount.plus(stepSsuiDepositedAmount);
      }

      // Obligation
      const obligation = getSimulatedObligation(
        sSuiDepositedAmount,
        suiBorrowedAmount,
      );

      return { sSuiDepositedAmount, suiBorrowedAmount, obligation };
    },
    [
      getSsuiMintFee,
      suiToSsuiExchangeRate,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getSimulatedObligation,
    ],
  );

  const simulateUnloopToExposure = useCallback(
    (
      _sSuiDepositedAmount: BigNumber,
      _suiBorrowedAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      sSuiDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      let sSuiDepositedAmount = _sSuiDepositedAmount;
      let suiBorrowedAmount = _suiBorrowedAmount;

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
        const pendingExposure = exposure.minus(targetExposure);
        if (pendingExposure.lte(E)) break;

        // 1) Max
        const stepMaxSsuiWithdrawnAmount = getStepMaxSsuiWithdrawnAmount(
          sSuiDepositedAmount,
          suiBorrowedAmount,
        )
          .times(0.99) // 1% buffer
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxSuiRepaidAmount = new BigNumber(
          stepMaxSsuiWithdrawnAmount.minus(
            getSsuiRedeemFee(stepMaxSsuiWithdrawnAmount),
          ),
        )
          .times(sSuiToSuiExchangeRate)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const stepMaxExposure = getExposure(
          sSuiDepositedAmount.plus(stepMaxSsuiWithdrawnAmount),
          suiBorrowedAmount.plus(stepMaxSuiRepaidAmount),
        ).minus(exposure);

        // 2) Withdraw sSUI
        const stepSsuiWithdrawnAmount = stepMaxSsuiWithdrawnAmount
          .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
          .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxWithdraw = stepSsuiWithdrawnAmount.eq(
          stepMaxSsuiWithdrawnAmount,
        );

        sSuiDepositedAmount = sSuiDepositedAmount.minus(
          stepSsuiWithdrawnAmount,
        );

        // 3) Unstake withdrawn sSUI for SUI

        // 4) Repay SUI
        const stepSuiRepaidAmount = new BigNumber(
          stepSsuiWithdrawnAmount.minus(
            getSsuiRedeemFee(stepSsuiWithdrawnAmount),
          ),
        )
          .times(sSuiToSuiExchangeRate)
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);

        suiBorrowedAmount = suiBorrowedAmount.minus(stepSuiRepaidAmount);
      }

      // Obligation
      const obligation = getSimulatedObligation(
        sSuiDepositedAmount,
        suiBorrowedAmount,
      );

      return { sSuiDepositedAmount, suiBorrowedAmount, obligation };
    },
    [
      getExposure,
      getStepMaxSsuiWithdrawnAmount,
      getSsuiRedeemFee,
      sSuiToSuiExchangeRate,
      getSimulatedObligation,
    ],
  );

  const simulateDeposit = useCallback(
    (
      suiAmount: BigNumber,
      targetExposure: BigNumber,
    ): {
      sSuiDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const sSuiAmount = suiAmount
        .minus(getSsuiMintFee(suiAmount))
        .times(suiToSsuiExchangeRate)
        .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);

      // Prepare
      let sSuiDepositedAmount = new BigNumber(0);
      let suiBorrowedAmount = new BigNumber(0);

      // 1) Stake SUI for sSUI

      // 2) Deposit sSUI (1x exposure)
      sSuiDepositedAmount = sSuiDepositedAmount.plus(sSuiAmount);

      // 3) Loop to target exposure
      const {
        sSuiDepositedAmount: _sSuiDepositedAmount,
        suiBorrowedAmount: _suiBorrowedAmount,
      } = simulateLoopToExposure(
        sSuiDepositedAmount,
        suiBorrowedAmount,
        targetExposure,
      );
      sSuiDepositedAmount = _sSuiDepositedAmount;
      suiBorrowedAmount = _suiBorrowedAmount;

      // Obligation
      const obligation = getSimulatedObligation(
        sSuiDepositedAmount,
        suiBorrowedAmount,
      );

      return { sSuiDepositedAmount, suiBorrowedAmount, obligation };
    },
    [
      getSsuiMintFee,
      suiToSsuiExchangeRate,
      simulateLoopToExposure,
      getSimulatedObligation,
    ],
  );

  // TVL
  const getTvlSuiAmount = useCallback(
    (obligation?: ParsedObligation) => {
      if (isObligationLooping(obligation)) {
        return new BigNumber(
          obligation!.deposits[0].depositedAmount.times(sSuiToSuiExchangeRate),
        ).minus(obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0));
      } else {
        return new BigNumber(0);
      }
    },
    [isObligationLooping, sSuiToSuiExchangeRate],
  );

  // APR
  const getAprPercent = useCallback(
    (obligation?: ParsedObligation, exposure?: BigNumber) => {
      let _obligation;
      if (isObligationLooping(obligation)) {
        _obligation = obligation!;
      } else {
        if (exposure === undefined)
          throw new Error(
            "exposure must be defined if obligation is not defined",
          );

        _obligation = simulateDeposit(
          new BigNumber(1), // Any number will do
          exposure,
        ).obligation;
      }

      return getNetAprPercent(
        _obligation,
        userData.rewardMap,
        allAppData.lstAprPercentMap,
        !isObligationLooping(obligation),
      );
    },
    [
      isObligationLooping,
      simulateDeposit,
      userData.rewardMap,
      allAppData.lstAprPercentMap,
    ],
  );

  // Health
  const getHealthPercent = useCallback(
    (obligation?: ParsedObligation, exposure?: BigNumber) => {
      let _obligation;
      if (isObligationLooping(obligation)) _obligation = obligation!;
      else {
        if (exposure === undefined)
          throw new Error(
            "exposure must be defined if obligation is not defined",
          );

        _obligation = simulateDeposit(
          new BigNumber(1), // Any number will do
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
    [isObligationLooping, simulateDeposit],
  );

  // Context
  const contextValue: SsuiStrategyContext = useMemo(
    () => ({
      isObligationLooping,

      suiReserve,
      sSuiReserve,
      minExposure,
      maxExposure,
      defaultExposure,

      lstClient,
      sSuiMintFeePercent,
      sSuiRedeemFeePercent,
      suiBorrowFeePercent,
      suiToSsuiExchangeRate,
      sSuiToSuiExchangeRate,

      getSsuiMintFee,
      getSsuiRedeemFee,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getStepMaxSsuiWithdrawnAmount,
      simulateLoopToExposure,
      simulateUnloopToExposure,
      simulateDeposit,
      getTvlSuiAmount,
      getAprPercent,
      getHealthPercent,
    }),
    [
      isObligationLooping,
      suiReserve,
      sSuiReserve,
      minExposure,
      maxExposure,
      defaultExposure,
      lstClient,
      sSuiMintFeePercent,
      sSuiRedeemFeePercent,
      suiBorrowFeePercent,
      suiToSsuiExchangeRate,
      sSuiToSuiExchangeRate,
      getSsuiMintFee,
      getSsuiRedeemFee,
      getExposure,
      getStepMaxSuiBorrowedAmount,
      getStepMaxSsuiWithdrawnAmount,
      simulateLoopToExposure,
      simulateUnloopToExposure,
      simulateDeposit,
      getTvlSuiAmount,
      getAprPercent,
      getHealthPercent,
    ],
  );

  return (
    <SsuiStrategyContext.Provider value={contextValue}>
      {lstClient !== undefined ? children : <FullPageSpinner />}
    </SsuiStrategyContext.Provider>
  );
}
