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

export const sSUI_SUI_TARGET_EXPOSURE = new BigNumber(3);
export const sSUI_MAX_MAX_EXPOSURE = (sSuiReserve: ParsedReserve) =>
  new BigNumber(1 / (1 - sSuiReserve.config.openLtvPct / 100)); // 3.3333...

const sSUI_SUI_TARGET_EXPOSURE_HEALTH_PERCENT = 88.87; // Approximate getWeightedBorrowsUsd(obligation) / obligation.unhealthyBorrowValueUsd for 3x exposure

interface SsuiStrategyContext {
  // Obligation
  isObligationLooping: (obligation?: ParsedObligation) => boolean;

  // sSUI
  suiReserve: ParsedReserve;
  sSuiReserve: ParsedReserve;

  lstClient: LstClient | undefined;
  sSuiMintFeePercent: BigNumber | undefined;
  sSuiRedeemFeePercent: BigNumber | undefined;
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
  simulateDeposit: (
    suiAmount: BigNumber,
    targetExposure: BigNumber,
  ) => {
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
  };
  getTvlSuiAmount: (obligation?: ParsedObligation) => BigNumber;
  getAprPercent: (obligation?: ParsedObligation) => BigNumber;
  getHealthPercent: (obligation?: ParsedObligation) => BigNumber;
}
type LoadedSsuiStrategyContext = SsuiStrategyContext & {
  lstClient: LstClient;
  sSuiMintFeePercent: BigNumber;
  sSuiRedeemFeePercent: BigNumber;
};

const defaultContextValue: SsuiStrategyContext = {
  isObligationLooping: () => {
    throw Error("SsuiStrategyContextProvider not initialized");
  },

  suiReserve: {} as ParsedReserve,
  sSuiReserve: {} as ParsedReserve,

  lstClient: undefined,
  sSuiMintFeePercent: undefined,
  sSuiRedeemFeePercent: undefined,
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
  useContext(SsuiStrategyContext) as LoadedSsuiStrategyContext;

export function SsuiStrategyContextProvider({ children }: PropsWithChildren) {
  const { suiClient } = useSettingsContext();
  const { userData } = useLoadedUserContext();
  const { allAppData, appData } = useLoadedAppContext();

  // Reserves
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const sSuiReserve = appData.reserveMap[NORMALIZED_sSUI_COINTYPE];

  // Obligation
  const isObligationLooping = useCallback((obligation?: ParsedObligation) => {
    if (!obligation) return false;

    return (
      obligation.deposits.length === 1 &&
      obligation.deposits[0].coinType === NORMALIZED_sSUI_COINTYPE &&
      obligation.borrows.length === 1 &&
      obligation.borrows[0].coinType === NORMALIZED_SUI_COINTYPE
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
        ? undefined
        : new BigNumber(
            liquidStakingInfo.feeConfig.element?.suiMintFeeBps.toString() ?? 0,
          ).div(100),
    [liquidStakingInfo],
  );
  const sSuiRedeemFeePercent = useMemo(
    () =>
      liquidStakingInfo === undefined
        ? undefined
        : new BigNumber(
            liquidStakingInfo.feeConfig.element?.redeemFeeBps.toString() ?? 0,
          ).div(100),
    [liquidStakingInfo],
  );
  const suiBorrowFeePercent = useMemo(
    () => new BigNumber(suiReserve.config.borrowFeeBps).div(100),
    [suiReserve.config.borrowFeeBps],
  );

  const getSsuiMintFee = useCallback(
    (suiAmount: BigNumber) => {
      if (sSuiMintFeePercent === undefined)
        throw new Error("sSuiMintFeePercent is undefined");

      return suiAmount
        .times(sSuiMintFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
    },
    [sSuiMintFeePercent],
  );
  const getSsuiRedeemFee = useCallback(
    (sSuiAmount: BigNumber) => {
      if (sSuiRedeemFeePercent === undefined)
        throw new Error("sSuiRedeemFeePercent is undefined");

      return sSuiAmount
        .times(sSuiRedeemFeePercent.div(100))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_UP);
    },
    [sSuiRedeemFeePercent],
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
  const simulateDeposit = useCallback(
    (
      suiAmount: BigNumber,
      targetExposure: BigNumber,
    ): { sSuiDepositedAmount: BigNumber; suiBorrowedAmount: BigNumber } => {
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

      for (let i = 0; i < 30; i++) {
        const exposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
        const pendingExposure = targetExposure.minus(exposure);
        if (pendingExposure.lte(E)) break;

        // 3.1) Max
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

        // 3.2) Borrow SUI
        const stepSuiBorrowedAmount = stepMaxSuiBorrowedAmount
          .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
          .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
        const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);

        suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

        // 3.3) Stake borrowed SUI for sSUI

        // 3.4) Deposit sSUI
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

      return { sSuiDepositedAmount, suiBorrowedAmount };
    },
    [
      getSsuiMintFee,
      suiToSsuiExchangeRate,
      getExposure,
      getStepMaxSuiBorrowedAmount,
    ],
  );

  // TVL
  const getTvlSuiAmount = useCallback(
    (obligation?: ParsedObligation) => {
      if (isObligationLooping(obligation)) {
        return new BigNumber(
          obligation!.deposits[0].depositedAmount.times(sSuiToSuiExchangeRate),
        ).minus(obligation!.borrows[0].borrowedAmount);
      } else {
        return new BigNumber(0);
      }
    },
    [isObligationLooping, sSuiToSuiExchangeRate],
  );

  // APR
  const getAprPercent = useCallback(
    (obligation?: ParsedObligation) => {
      if (isObligationLooping(obligation)) {
        return getNetAprPercent(
          obligation!,
          userData.rewardMap,
          allAppData.lstAprPercentMap,
        );
      } else {
        const { sSuiDepositedAmount, suiBorrowedAmount } = simulateDeposit(
          new BigNumber(1), // Any number will do
          sSUI_SUI_TARGET_EXPOSURE,
        );

        const _obligation = {
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
        } as ParsedObligation;

        return getNetAprPercent(
          _obligation,
          userData.rewardMap,
          allAppData.lstAprPercentMap,
          true,
        );
      }
    },
    [
      isObligationLooping,
      userData.rewardMap,
      allAppData.lstAprPercentMap,
      simulateDeposit,
      sSuiReserve,
      suiReserve,
    ],
  );

  // Health
  const getHealthPercent = useCallback(
    (obligation?: ParsedObligation) => {
      if (isObligationLooping(obligation)) {
        const utilizationPercent = getWeightedBorrowsUsd(obligation!)
          .div(obligation!.unhealthyBorrowValueUsd)
          .times(100);

        return BigNumber.min(
          new BigNumber(100).minus(
            new BigNumber(
              utilizationPercent.minus(sSUI_SUI_TARGET_EXPOSURE_HEALTH_PERCENT),
            ).div(100 - sSUI_SUI_TARGET_EXPOSURE_HEALTH_PERCENT),
          ),
          100,
        );
      } else {
        return new BigNumber(100); // Shown as -- in the UI
      }
    },
    [isObligationLooping],
  );

  // Context
  const contextValue: SsuiStrategyContext = useMemo(
    () => ({
      isObligationLooping,

      suiReserve,
      sSuiReserve,

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
      simulateDeposit,
      getTvlSuiAmount,
      getAprPercent,
      getHealthPercent,
    }),
    [
      isObligationLooping,
      suiReserve,
      sSuiReserve,
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
      simulateDeposit,
      getTvlSuiAmount,
      getAprPercent,
      getHealthPercent,
    ],
  );

  return (
    <SsuiStrategyContext.Provider value={contextValue}>
      {lstClient !== undefined &&
      sSuiMintFeePercent !== undefined &&
      sSuiRedeemFeePercent !== undefined ? (
        children
      ) : (
        <FullPageSpinner />
      )}
    </SsuiStrategyContext.Provider>
  );
}
