import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import {
  ParsedObligation,
  ParsedReserve,
  WAD,
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
  isSui,
} from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { getWeightedBorrowsUsd } from "@/components/shared/UtilizationBar";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { EventType } from "@/lib/events";

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
    amount: BigNumber,
    coinType: string,
    targetExposure: BigNumber,
  ) => {
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
    obligation: ParsedObligation;
  };

  getHistoricalTvlSuiAmount: (
    obligation?: ParsedObligation,
  ) => Promise<BigNumber | undefined>;
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

  getHistoricalTvlSuiAmount: () => {
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

        const lstInfoUrl = `${API_URL}/springsui/lst-info?${new URLSearchParams(
          { coinType: NORMALIZED_sSUI_COINTYPE },
        )}`;
        const lstInfoRes = await fetch(lstInfoUrl);
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
          .times(0.98) // 2% buffer
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
          .times(0.98) // 2% buffer
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
      amount: BigNumber,
      coinType: string,
      targetExposure: BigNumber,
    ): {
      sSuiDepositedAmount: BigNumber;
      suiBorrowedAmount: BigNumber;
      obligation: ParsedObligation;
    } => {
      const sSuiAmount = (
        isSui(coinType)
          ? amount.minus(getSsuiMintFee(amount)).times(suiToSsuiExchangeRate)
          : amount
      ).decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);

      // Prepare
      let sSuiDepositedAmount = new BigNumber(0);
      let suiBorrowedAmount = new BigNumber(0);

      // 1) Stake SUI for sSUI OR split sSUI coins

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

  // Stats - Historical TVL
  const getHistoricalTvlSuiAmount = useCallback(
    async (obligation?: ParsedObligation): Promise<BigNumber | undefined> => {
      if (!obligation) return new BigNumber(0);

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
        //   +obligation.deposits[0].depositedAmount.times(sSuiToSuiExchangeRate),
        //   +obligation.borrows[0].borrowedAmount,
        //   +sSuiToSuiExchangeRate,
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

        // Combine and sort events
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
        console.log(
          `XXX currentPositionSortedEvents: ${JSON.stringify(
            currentPositionSortedEvents.map((e, i) => ({ index: i, ...e })),
            null,
            2,
          )}`,
        );

        // Get historical sSUI to SUI exchange rates for the relevant timestamps (current position deposits and withdraws)
        const sSuiToSuiExchangeRateTimestampsS = Array.from(
          new Set(
            currentPositionSortedEvents
              .filter((event) =>
                [EventType.DEPOSIT, EventType.WITHDRAW].includes(event.type),
              )
              .map((event) => event.timestampS),
          ),
        );

        let sSuiToSuiExchangeRateMap: Record<number, BigNumber> = {};
        if (sSuiToSuiExchangeRateTimestampsS.length > 0) {
          const res = await fetch(
            `${API_URL}/springsui/historical-rates?coinType=${NORMALIZED_sSUI_COINTYPE}&timestamps=${sSuiToSuiExchangeRateTimestampsS.join(",")}`,
          );
          const json: { timestamp: number; value: string }[] = await res.json();
          if ((json as any)?.statusCode === 500)
            throw new Error(
              "Failed to fetch historical sSUI to SUI exchange rates",
            );

          sSuiToSuiExchangeRateMap = Object.fromEntries(
            json.map(({ timestamp, value }) => [
              timestamp,
              new BigNumber(value),
            ]),
          );
        }
        // console.log(
        //   "XXX sSuiToSuiExchangeRateMap:",
        //   JSON.stringify(sSuiToSuiExchangeRateMap, null, 2),
        // );

        // Calculate current position
        let depositedSuiAmount = new BigNumber(0);
        let borrowedSuiAmount = new BigNumber(0);
        for (let i = 0; i < currentPositionSortedEvents.length; i++) {
          const event = currentPositionSortedEvents[i];

          // Deposit/withdraw
          if (event.type === EventType.DEPOSIT) {
            const sSuiToSuiExchangeRate =
              sSuiToSuiExchangeRateMap[event.timestampS];
            if (sSuiToSuiExchangeRate === undefined) {
              throw new Error(
                `sSuiToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
              );
            }

            const previousEvent = currentPositionSortedEvents[i - 1];
            const isDepositingClaimedReward =
              previousEvent && previousEvent.type === EventType.CLAIM_REWARD;
            if (isDepositingClaimedReward) {
              console.log("XXX skipping depositing claimed reward"); // Regardless of coinType, we don't want to count claimed+deposited rewards as deposited SUI
              continue;
            }

            depositedSuiAmount = depositedSuiAmount.plus(
              event.liquidityAmount.times(sSuiToSuiExchangeRate),
            );
            // console.log(
            //   `XXX depositedSuiAmount: ${+depositedSuiAmount} (after ${event.type}ing ${(event as ActionEvent).liquidityAmount})`,
            // );
          } else if (event.type === EventType.WITHDRAW) {
            const sSuiToSuiExchangeRate =
              sSuiToSuiExchangeRateMap[event.timestampS];
            if (sSuiToSuiExchangeRate === undefined) {
              throw new Error(
                `sSuiToSuiExchangeRate is undefined for timestamp ${event.timestampS}`,
              );
            }

            depositedSuiAmount = depositedSuiAmount.minus(
              event.liquidityAmount.times(sSuiToSuiExchangeRate),
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
    [],
  );

  // Stats - TVL
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

  // Stats - APR
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
          NORMALIZED_SUI_COINTYPE,
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

  // Stats - Health
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
          NORMALIZED_SUI_COINTYPE,
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

      getHistoricalTvlSuiAmount,
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
      getHistoricalTvlSuiAmount,
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
