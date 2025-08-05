import { useRouter } from "next/router";
import {
  CSSProperties,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction, TransactionObjectInput } from "@mysten/sui/transactions";
import { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { Download, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import {
  STRATEGY_SUI_LOOPING_SSUI,
  createStrategyOwnerCapIfNoneExists,
  sendStrategyOwnerCapToUser,
  strategyBorrow,
  strategyDeposit,
  strategyWithdraw,
} from "@suilend/sdk/lib/strategyOwnerCap";
import {
  MAX_U64,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  TX_TOAST_DURATION,
  formatInteger,
  formatPercent,
  formatToken,
  getAllCoins,
  getBalanceChange,
  isSui,
  mergeAllCoins,
} from "@suilend/sui-fe";
import {
  shallowPushQuery,
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import FromToArrow from "@/components/shared/FromToArrow";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Spinner from "@/components/shared/Spinner";
import Tabs from "@/components/shared/Tabs";
import TextLink from "@/components/shared/TextLink";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import SsuiSuiStrategyHeader from "@/components/strategies/SsuiSuiStrategyHeader";
import StrategyInput from "@/components/strategies/StrategyInput";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  E,
  sSUI_DECIMALS,
  useLoadedSsuiStrategyContext,
} from "@/contexts/SsuiStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";

const STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT = 0.1;

const getTransactionMintAmounts = (res: SuiTransactionBlockResponse) => {
  const mintEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::MintEvent>" &&
      normalizeStructTag((event.parsedJson as any).event.typename.name) ===
        NORMALIZED_sSUI_COINTYPE,
  );
  if (mintEvents.length === 0) return undefined;

  return mintEvents.reduce(
    (acc, mintEvent) => {
      return {
        suiFeeAmount: acc.suiFeeAmount.plus(
          new BigNumber((mintEvent.parsedJson as any).event.fee_amount).div(
            10 ** SUI_DECIMALS,
          ),
        ),
        suiAmountIn: acc.suiAmountIn.plus(
          new BigNumber((mintEvent.parsedJson as any).event.sui_amount_in).div(
            10 ** SUI_DECIMALS,
          ),
        ),
        sSuiAmountOut: acc.sSuiAmountOut.plus(
          new BigNumber((mintEvent.parsedJson as any).event.lst_amount_out).div(
            10 ** sSUI_DECIMALS,
          ),
        ),
      };
    },
    {
      suiFeeAmount: new BigNumber(0),
      suiAmountIn: new BigNumber(0),
      sSuiAmountOut: new BigNumber(0),
    },
  );
};
const getTransactionRedeemAmounts = (res: SuiTransactionBlockResponse) => {
  const redeemEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::RedeemEvent>" &&
      normalizeStructTag((event.parsedJson as any).event.typename.name) ===
        NORMALIZED_sSUI_COINTYPE,
  );
  if (redeemEvents.length === 0) return undefined;

  return redeemEvents.reduce(
    (acc, redeemEvent) => {
      return {
        sSuiFeeAmount: acc.sSuiFeeAmount.plus(
          new BigNumber((redeemEvent.parsedJson as any).event.fee_amount).div(
            10 ** sSUI_DECIMALS,
          ),
        ),
        sSuiAmountIn: acc.sSuiAmountIn.plus(
          new BigNumber(
            (redeemEvent.parsedJson as any).event.lst_amount_in,
          ).div(10 ** sSUI_DECIMALS),
        ),
        suiAmountOut: acc.suiAmountOut.plus(
          new BigNumber(
            (redeemEvent.parsedJson as any).event.sui_amount_out,
          ).div(10 ** SUI_DECIMALS),
        ),
      };
    },
    {
      sSuiFeeAmount: new BigNumber(0),
      sSuiAmountIn: new BigNumber(0),
      suiAmountOut: new BigNumber(0),
    },
  );
};

const getTransactionDepositedSsuiAmount = (
  res: SuiTransactionBlockResponse,
) => {
  const mintEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::MintEvent" &&
      normalizeStructTag((event.parsedJson as any).coin_type.name) ===
        NORMALIZED_sSUI_COINTYPE,
  );
  if (mintEvents.length === 0) return undefined;

  return mintEvents.reduce(
    (acc, mintEvent) =>
      acc.plus(
        new BigNumber((mintEvent.parsedJson as any).liquidity_amount).div(
          10 ** sSUI_DECIMALS,
        ),
      ),
    new BigNumber(0),
  );
};
const getTransactionBorrowedSuiAmount = (res: SuiTransactionBlockResponse) => {
  const borrowEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::BorrowEvent" &&
      normalizeStructTag((event.parsedJson as any).coin_type.name) ===
        NORMALIZED_SUI_COINTYPE,
  );
  if (borrowEvents.length === 0) return undefined;

  return borrowEvents.reduce((acc, borrowEvent) => {
    const incFeesAmount = new BigNumber(
      (borrowEvent.parsedJson as any).liquidity_amount,
    ).div(10 ** SUI_DECIMALS);
    const feesAmount = new BigNumber(
      (borrowEvent.parsedJson as any).origination_fee_amount,
    ).div(10 ** SUI_DECIMALS);
    const amount = incFeesAmount.minus(feesAmount);

    return acc.plus(amount);
  }, new BigNumber(0));
};
const getTransactionRepaidSuiAmount = (res: SuiTransactionBlockResponse) => {
  const repayEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::RepayEvent" &&
      normalizeStructTag((event.parsedJson as any).coin_type.name) ===
        NORMALIZED_SUI_COINTYPE,
  );
  if (repayEvents.length === 0) return undefined;

  return repayEvents.reduce(
    (acc, repayEvent) =>
      acc.plus(
        new BigNumber((repayEvent.parsedJson as any).liquidity_amount).div(
          10 ** SUI_DECIMALS,
        ),
      ),
    new BigNumber(0),
  );
};

enum QueryParams {
  STRATEGY_NAME = "strategy",
  TAB = "action",
  // PARAMETERS_PANEL_TAB = "parametersPanelTab",
}

export enum Tab {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
  ADJUST = "adjust",
}

export default function SsuiStrategyDialog({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.STRATEGY_NAME]: router.query[QueryParams.STRATEGY_NAME] as
        | string
        | undefined,
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
      // [QueryParams.PARAMETERS_PANEL_TAB]: router.query[
      //   QueryParams.PARAMETERS_PANEL_TAB
      // ] as ParametersPanelTab | undefined,
    }),
    [router.query],
  );

  const { explorer, suiClient } = useSettingsContext();
  const { address, dryRunTransaction, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { appData } = useLoadedAppContext();
  const { getBalance, userData, refresh } = useLoadedUserContext();

  const {
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
    getTvlSuiAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedSsuiStrategyContext();

  // Tabs
  const tabs = [
    { id: Tab.DEPOSIT, title: "Deposit" },
    { id: Tab.WITHDRAW, title: "Withdraw" },
    {
      id: Tab.ADJUST,
      title: "Adjust",
      tooltip: "Modify leverage while keeping Strategy value the same",
    },
  ];

  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : Tab.DEPOSIT,
    [queryParams],
  );
  const onSelectedTabChange = useCallback(
    (tab: Tab) => {
      shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
    },
    [router],
  );

  // State
  const isOpen = useMemo(
    () => queryParams[QueryParams.STRATEGY_NAME] === "sSUI-SUI-looping",
    [queryParams],
  );

  const open = useCallback(() => {
    shallowPushQuery(router, {
      ...router.query,
      [QueryParams.STRATEGY_NAME]: "sSUI-SUI-looping",
    });
  }, [router]);
  const close = useCallback(() => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[QueryParams.STRATEGY_NAME];
    shallowPushQuery(router, restQuery);
  }, [router]);

  // Obligation
  const strategyOwnerCap = userData.strategyOwnerCaps.find(
    (soc) => soc.strategyType === STRATEGY_SUI_LOOPING_SSUI,
  );
  const obligation = userData.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Slider
  const [depositSliderValue, setDepositSliderValue] = useState<string>(
    defaultExposure.toFixed(1),
  );

  const [adjustSliderValue, setAdjustSliderValue] = useState<string>(
    isObligationLooping(obligation)
      ? BigNumber.min(
          maxExposure,
          getExposure(
            obligation!.deposits[0].depositedAmount,
            obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
          ),
        ).toFixed(1)
      : defaultExposure.toFixed(1),
  );

  // CoinType, reserve, and balance
  const [coinType, setCoinType] = useState<string>(NORMALIZED_SUI_COINTYPE);

  const reserveOptions = useMemo(
    () => [
      { id: NORMALIZED_SUI_COINTYPE, name: "SUI" },
      { id: NORMALIZED_sSUI_COINTYPE, name: "sSUI" },
    ],
    [],
  );
  const reserve = useMemo(
    () => appData.reserveMap[coinType],
    [coinType, appData.reserveMap],
  );

  const reserveBalance = useMemo(
    () => getBalance(coinType),
    [coinType, getBalance],
  );

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  const [useMaxAmount, setUseMaxAmount] = useState<boolean>(false);
  const getMaxAmount = useCallback(
    (_coinType?: string) => {
      const balance = getBalance(_coinType ?? reserve.coinType);

      if (selectedTab === Tab.DEPOSIT)
        return BigNumber.max(
          new BigNumber(0),
          isSui(_coinType ?? reserve.coinType)
            ? balance.minus(STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT)
            : balance,
        );
      else if (selectedTab === Tab.WITHDRAW)
        return BigNumber.max(
          new BigNumber(0),
          getTvlSuiAmount(obligation).times(
            isSui(_coinType ?? reserve.coinType) ? 1 : suiToSsuiExchangeRate,
          ),
        );
      else if (selectedTab === Tab.ADJUST) return new BigNumber(0); // Not relevant (adjust tab only has a slider)

      return new BigNumber(0); // Should not happen
    },
    [
      getBalance,
      reserve.coinType,
      selectedTab,
      getTvlSuiAmount,
      obligation,
      suiToSsuiExchangeRate,
    ],
  );

  const formatAndSetValue = useCallback(
    (_value: string) => {
      let formattedValue;
      if (new BigNumber(_value || 0).lt(0)) formattedValue = _value;
      else if (!_value.includes(".")) formattedValue = _value;
      else {
        const [integers, decimals] = _value.split(".");
        const integersFormatted = formatInteger(
          integers !== "" ? parseInt(integers) : 0,
          false,
        );
        const decimalsFormatted = decimals.slice(
          0,
          Math.min(decimals.length, reserve.token.decimals),
        );
        formattedValue = `${integersFormatted}.${decimalsFormatted}`;
      }

      setValue(formattedValue);
    },
    [reserve.token.decimals],
  );

  const onValueChange = (_value: string) => {
    if (useMaxAmount) setUseMaxAmount(false);
    formatAndSetValue(_value);
  };

  const useMaxValueWrapper = () => {
    setUseMaxAmount(true);
    formatAndSetValue(
      getMaxAmount().toFixed(reserve.token.decimals, BigNumber.ROUND_DOWN),
    );
  };

  const onReserveChange = useCallback(
    (newCoinType: string) => {
      const newReserve = appData.reserveMap[newCoinType];

      setCoinType(newCoinType);

      if (value === "") return;
      formatAndSetValue(
        (useMaxAmount
          ? getMaxAmount(newCoinType)
          : new BigNumber(value)
        ).toFixed(newReserve.token.decimals, BigNumber.ROUND_DOWN),
      );
    },
    [appData.reserveMap, formatAndSetValue, useMaxAmount, getMaxAmount, value],
  );

  useEffect(() => {
    // If user has specified intent to use max amount, we continue this intent
    // even if the max value updates
    if (useMaxAmount)
      formatAndSetValue(
        getMaxAmount().toFixed(reserve.token.decimals, BigNumber.ROUND_DOWN),
      );
  }, [useMaxAmount, formatAndSetValue, getMaxAmount, reserve.token.decimals]);

  // Stats - TVL
  const tvlAmount = useMemo(
    () =>
      getTvlSuiAmount(obligation)
        .times(isSui(reserve.coinType) ? 1 : suiToSsuiExchangeRate)
        .decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN),
    [
      getTvlSuiAmount,
      obligation,
      reserve.coinType,
      suiToSsuiExchangeRate,
      reserve.token.decimals,
    ],
  );

  // Stats - Exposure
  const exposure = useMemo(
    () =>
      isObligationLooping(obligation)
        ? getExposure(
            obligation!.deposits[0].depositedAmount,
            obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
          )
        : new BigNumber(depositSliderValue),
    [isObligationLooping, obligation, getExposure, depositSliderValue],
  );
  const adjustExposure = useMemo(
    () => new BigNumber(adjustSliderValue),
    [adjustSliderValue],
  );

  // Stats - APR
  const aprPercent = getAprPercent(obligation, exposure);
  const adjustAprPercent = getAprPercent(undefined, adjustExposure);

  // Stats - Health
  const healthPercent = getHealthPercent(obligation, exposure);
  const adjustHealthPercent = getHealthPercent(undefined, adjustExposure);

  // Stats - Fees
  const depositFeesAmount = useMemo(() => {
    const { suiBorrowedAmount } = simulateDeposit(
      new BigNumber(value || 0),
      reserve.coinType,
      exposure,
    );

    // TODO: Add sSUI mint fee (currently 0)
    const suiBorrowFeesAmount = suiBorrowedAmount.times(
      suiBorrowFeePercent.div(100),
    );

    return (
      isSui(reserve.coinType)
        ? suiBorrowFeesAmount
        : suiBorrowFeesAmount.times(suiToSsuiExchangeRate)
    ).decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN);
  }, [
    simulateDeposit,
    value,
    reserve.coinType,
    exposure,
    suiBorrowFeePercent,
    suiToSsuiExchangeRate,
    reserve.token.decimals,
  ]);

  const withdrawFeesAmount = useMemo(() => {
    if (!isObligationLooping(obligation)) return new BigNumber(0);

    const unloopPercent = new BigNumber(value || 0).div(tvlAmount).times(100);
    const withdrawnSsuiAmount = obligation!.deposits[0].depositedAmount.times(
      unloopPercent.div(100),
    );

    // TODO: Add sSUI mint fee (currently 0)
    const sSuiRedeemFeesAmount = getSsuiRedeemFee(withdrawnSsuiAmount);

    return (
      isSui(reserve.coinType)
        ? sSuiRedeemFeesAmount.times(sSuiToSuiExchangeRate)
        : sSuiRedeemFeesAmount
    ).decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN);
  }, [
    isObligationLooping,
    obligation,
    value,
    tvlAmount,
    reserve.coinType,
    getSsuiRedeemFee,
    sSuiToSuiExchangeRate,
    reserve.token.decimals,
  ]);

  const adjustFeesSuiAmount = useMemo(() => {
    if (!isObligationLooping(obligation)) return new BigNumber(0);

    const sSuiDepositedAmount = obligation!.deposits[0].depositedAmount;
    const suiBorrowedAmount =
      obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0);
    const targetExposure = adjustExposure;

    if (targetExposure.gt(exposure)) {
      const { suiBorrowedAmount: _suiBorrowedAmount } = simulateLoopToExposure(
        sSuiDepositedAmount,
        suiBorrowedAmount,
        targetExposure,
      );

      // TODO: Add sSUI mint fee (currently 0)
      const suiBorrowFeesAmount = new BigNumber(
        _suiBorrowedAmount.minus(suiBorrowedAmount),
      ).times(suiBorrowFeePercent.div(100));

      return suiBorrowFeesAmount.decimalPlaces(
        SUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    } else {
      const { sSuiDepositedAmount: _sSuiDepositedAmount } =
        simulateUnloopToExposure(
          sSuiDepositedAmount,
          suiBorrowedAmount,
          targetExposure,
        );

      // TODO: Add sSUI mint fee (currently 0)
      const sSuiRedeemFeesAmount = getSsuiRedeemFee(
        sSuiDepositedAmount.minus(_sSuiDepositedAmount),
      );

      return sSuiRedeemFeesAmount
        .times(sSuiToSuiExchangeRate)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
    }
  }, [
    isObligationLooping,
    obligation,
    adjustExposure,
    exposure,
    simulateLoopToExposure,
    suiBorrowFeePercent,
    simulateUnloopToExposure,
    getSsuiRedeemFee,
    sSuiToSuiExchangeRate,
  ]);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting) return { isDisabled: true, isLoading: true };

    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      if (value === "") return { isDisabled: true, title: "Enter an amount" };
      if (new BigNumber(value).lt(0))
        return { isDisabled: true, title: "Enter a +ve amount" };
      if (new BigNumber(value).eq(0))
        return { isDisabled: true, title: "Enter a non-zero amount" };

      if (selectedTab === Tab.DEPOSIT) {
        if (new BigNumber(value).gt(reserveBalance))
          return {
            isDisabled: true,
            title: `Insufficient ${reserve.token.symbol}`,
          };
        if (
          isSui(reserve.coinType) &&
          new BigNumber(value).gt(
            reserveBalance.minus(STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT),
          )
        )
          return {
            isDisabled: true,
            title: `${STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
          };
      } else {
        if (new BigNumber(value).gt(tvlAmount))
          return { isDisabled: true, title: "Withdraw cannot exceed deposits" };
      }

      if (healthPercent.lt(100)) {
        return {
          isDisabled: true,
          title: "Adjust leverage to 100% health",
        };
      }
    }

    return {
      title:
        selectedTab === Tab.DEPOSIT
          ? `Deposit ${formatToken(new BigNumber(value), {
              dp: reserve.token.decimals,
              trimTrailingZeros: true,
            })} ${reserve.token.symbol}`
          : selectedTab === Tab.WITHDRAW
            ? `Withdraw ${formatToken(new BigNumber(value), {
                dp: reserve.token.decimals,
                trimTrailingZeros: true,
              })} ${reserve.token.symbol}`
            : selectedTab === Tab.ADJUST
              ? `Adjust to ${adjustExposure.toFixed(1)}x`
              : "--", // Should not happen
    };
  })();

  const loopToExposure = async (
    strategyOwnerCapId: TransactionObjectInput,
    transaction: Transaction,
    _sSuiDepositedAmount: BigNumber,
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ): Promise<{
    transaction: Transaction;
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
  }> => {
    if (!address) throw Error("Wallet not connected");

    let sSuiDepositedAmount = _sSuiDepositedAmount;
    let suiBorrowedAmount = _suiBorrowedAmount;

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
      const pendingExposure = targetExposure.minus(exposure);
      console.log(
        `[loopToExposure] ${i} start |`,
        JSON.stringify(
          {
            sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingExposure: pendingExposure.toFixed(20),
          },
          null,
          2,
        ),
      );
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
      console.log(
        `[loopToExposure] ${i} max |`,
        JSON.stringify(
          {
            stepMaxSuiBorrowedAmount: stepMaxSuiBorrowedAmount.toFixed(20),
            stepMaxSsuiDepositedAmount: stepMaxSsuiDepositedAmount.toFixed(20),
            stepMaxExposure: stepMaxExposure.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Borrow SUI
      const stepSuiBorrowedAmount = stepMaxSuiBorrowedAmount
        .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);
      console.log(
        `[loopToExposure] ${i} borrow |`,
        JSON.stringify(
          {
            stepSuiBorrowedAmount: stepSuiBorrowedAmount.toFixed(20),
            isMaxBorrow,
          },
          null,
          2,
        ),
      );

      const [borrowedSuiCoin] = strategyBorrow(
        NORMALIZED_SUI_COINTYPE,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(NORMALIZED_SUI_COINTYPE),
        BigInt(
          stepSuiBorrowedAmount
            .times(10 ** SUI_DECIMALS)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
        transaction,
      );
      suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

      // 3) Stake borrowed SUI for sSUI
      const stepSsuiCoin = lstClient.mint(transaction, borrowedSuiCoin);

      // 4) Deposit sSUI
      const stepSsuiDepositedAmount = new BigNumber(
        stepSuiBorrowedAmount.minus(getSsuiMintFee(stepSuiBorrowedAmount)),
      )
        .times(suiToSsuiExchangeRate)
        .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxDeposit = stepSsuiDepositedAmount.eq(
        stepMaxSsuiDepositedAmount,
      );
      console.log(
        `[SsuiStrategyDialog] deposit - ${i} deposit |`,
        JSON.stringify(
          {
            stepSsuiDepositedAmount: stepSsuiDepositedAmount.toFixed(20),
            isMaxDeposit,
          },
          null,
          2,
        ),
      );

      strategyDeposit(
        stepSsuiCoin,
        NORMALIZED_sSUI_COINTYPE,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(NORMALIZED_sSUI_COINTYPE),
        transaction,
      );
      sSuiDepositedAmount = sSuiDepositedAmount.plus(stepSsuiDepositedAmount);
    }

    return { transaction, sSuiDepositedAmount, suiBorrowedAmount };
  };

  const unloopToExposure = async (
    strategyOwnerCapId: TransactionObjectInput,
    transaction: Transaction,
    _sSuiDepositedAmount: BigNumber,
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ): Promise<{
    transaction: Transaction;
    sSuiDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
  }> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    let sSuiDepositedAmount = _sSuiDepositedAmount;
    let suiBorrowedAmount = _suiBorrowedAmount;

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
      const pendingExposure = exposure.minus(targetExposure);
      console.log(
        `[unloopToExposure] ${i} start |`,
        JSON.stringify(
          {
            sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingExposure: pendingExposure.toFixed(20),
          },
          null,
          2,
        ),
      );
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
      console.log(
        `[unloopToExposure] ${i} max |`,
        JSON.stringify(
          {
            stepMaxSsuiWithdrawnAmount: stepMaxSsuiWithdrawnAmount.toFixed(20),
            stepMaxSuiRepaidAmount: stepMaxSuiRepaidAmount.toFixed(20),
            stepMaxExposure: stepMaxExposure.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Withdraw sSUI
      const stepSsuiWithdrawnAmount = stepMaxSsuiWithdrawnAmount
        .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
        .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxWithdraw = stepSsuiWithdrawnAmount.eq(
        stepMaxSsuiWithdrawnAmount,
      );
      console.log(
        `[unloopToExposure] ${i} withdraw |`,
        JSON.stringify(
          {
            stepSsuiWithdrawnAmount: stepSsuiWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [withdrawnSsuiCoin] = strategyWithdraw(
        NORMALIZED_sSUI_COINTYPE,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(NORMALIZED_sSUI_COINTYPE),
        BigInt(
          BigNumber.min(
            new BigNumber(
              stepSsuiWithdrawnAmount
                .times(10 ** sSUI_DECIMALS)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(sSuiReserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP),
            obligation.deposits[0].depositedCtokenAmount,
          ).toString(),
        ),
        transaction,
      );
      sSuiDepositedAmount = sSuiDepositedAmount.minus(stepSsuiWithdrawnAmount);

      // 3) Unstake withdrawn sSUI for SUI
      const stepSuiCoin = lstClient.redeem(transaction, withdrawnSsuiCoin);

      // 4) Repay SUI
      const stepSuiRepaidAmount = new BigNumber(
        stepSsuiWithdrawnAmount.minus(
          getSsuiRedeemFee(stepSsuiWithdrawnAmount),
        ),
      )
        .times(sSuiToSuiExchangeRate)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);
      console.log(
        `[unloopToExposure] ${i} repay |`,
        JSON.stringify(
          {
            stepSuiRepaidAmount: stepSuiRepaidAmount.toFixed(20),
            isMaxRepay,
          },
          null,
          2,
        ),
      );

      appData.suilendClient.repay(
        obligation.id,
        NORMALIZED_SUI_COINTYPE,
        stepSuiCoin,
        transaction,
      );
      transaction.transferObjects([stepSuiCoin], address);

      suiBorrowedAmount = suiBorrowedAmount.minus(stepSuiRepaidAmount);
    }

    return { transaction, sSuiDepositedAmount, suiBorrowedAmount };
  };

  const deposit = async (
    strategyOwnerCapId: TransactionObjectInput,
    transaction: Transaction,
    amount: BigNumber,
    coinType: string,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");

    const sSuiAmount = (
      isSui(coinType)
        ? amount.minus(getSsuiMintFee(amount)).times(suiToSsuiExchangeRate)
        : amount
    ).decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
    console.log(
      `[SsuiStrategyDialog] deposit |`,
      JSON.stringify(
        {
          amount: amount.toFixed(20),
          coinType,
          sSuiAmount: sSuiAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // Prepare
    let sSuiDepositedAmount = isObligationLooping(obligation)
      ? obligation!.deposits[0].depositedAmount.decimalPlaces(
          sSUI_DECIMALS,
          BigNumber.ROUND_DOWN,
        )
      : new BigNumber(0);
    const suiBorrowedAmount = isObligationLooping(obligation)
      ? (
          obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0)
        ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN)
      : new BigNumber(0);
    const targetExposure = isObligationLooping(obligation)
      ? getExposure(
          obligation!.deposits[0].depositedAmount,
          obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
        )
      : new BigNumber(depositSliderValue);

    console.log(
      `[SsuiStrategyDialog] deposit |`,
      JSON.stringify(
        {
          sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 1) Stake SUI for sSUI OR split sSUI coins
    let sSuiCoinToDeposit;
    if (isSui(coinType)) {
      const suiCoinToStake = transaction.splitCoins(transaction.gas, [
        amount
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      ]);
      sSuiCoinToDeposit = lstClient.mint(transaction, suiCoinToStake);
    } else {
      const allCoinsSsui = await getAllCoins(
        suiClient,
        address,
        NORMALIZED_sSUI_COINTYPE,
      );
      const mergeCoinSsui = mergeAllCoins(
        NORMALIZED_sSUI_COINTYPE,
        transaction,
        allCoinsSsui,
      );

      sSuiCoinToDeposit = transaction.splitCoins(
        transaction.object(mergeCoinSsui.coinObjectId),
        [
          BigInt(
            sSuiAmount
              .times(10 ** sSUI_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      );
    }

    // 2) Deposit sSUI (1x exposure)
    strategyDeposit(
      sSuiCoinToDeposit,
      NORMALIZED_sSUI_COINTYPE,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(NORMALIZED_sSUI_COINTYPE),
      transaction,
    );
    sSuiDepositedAmount = sSuiDepositedAmount.plus(sSuiAmount);

    // 3) Loop to target exposure
    transaction = (
      await loopToExposure(
        strategyOwnerCapId,
        transaction,
        sSuiDepositedAmount,
        suiBorrowedAmount,
        targetExposure,
      )
    ).transaction;

    return transaction;
  };

  const withdraw = async (
    strategyOwnerCapId: TransactionObjectInput,
    unloopPercent: BigNumber,
    coinType: string,
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    console.log(
      `[SsuiStrategyDialog] withdraw |`,
      JSON.stringify({ unloopPercent: unloopPercent.toFixed(20) }, null, 2),
    );

    // Prepare
    let sSuiDepositedAmount =
      obligation!.deposits[0].depositedAmount.decimalPlaces(
        sSUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    let suiBorrowedAmount = (
      obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0)
    ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    const targetSsuiDepositedAmount = sSuiDepositedAmount
      .times(new BigNumber(1).minus(unloopPercent.div(100)))
      .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
    const targetSuiBorrowedAmount = suiBorrowedAmount
      .times(new BigNumber(1).minus(unloopPercent.div(100)))
      .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[SsuiStrategyDialog] withdraw |`,
      JSON.stringify(
        {
          sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          targetSsuiDepositedAmount: targetSsuiDepositedAmount.toFixed(20),
          targetSuiBorrowedAmount: targetSuiBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      const pendingSsuiWithdrawAmount = sSuiDepositedAmount.minus(
        targetSsuiDepositedAmount,
      );
      const pendingSuiRepayAmount = suiBorrowedAmount.minus(
        targetSuiBorrowedAmount,
      );

      console.log(
        `[SsuiStrategyDialog] withdraw - ${i} start |`,
        JSON.stringify(
          {
            sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            pendingSsuiWithdrawAmount: pendingSsuiWithdrawAmount.toFixed(20),
            pendingSuiRepayAmount: pendingSuiRepayAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
      if (pendingSsuiWithdrawAmount.lte(E) && pendingSuiRepayAmount.lte(E))
        break;

      // 1.1) Max
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
      console.log(
        `[SsuiStrategyDialog] withdraw - ${i} max |`,
        JSON.stringify(
          {
            stepMaxSsuiWithdrawnAmount: stepMaxSsuiWithdrawnAmount.toFixed(20),
            stepMaxSuiRepaidAmount: stepMaxSuiRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Withdraw sSUI
      const stepSsuiWithdrawnAmount = BigNumber.min(
        pendingSsuiWithdrawAmount,
        stepMaxSsuiWithdrawnAmount,
      );
      const isMaxWithdraw = stepSsuiWithdrawnAmount.eq(
        stepMaxSsuiWithdrawnAmount,
      );
      console.log(
        `[SsuiStrategyDialog] withdraw - ${i} withdraw |`,
        JSON.stringify(
          {
            stepMaxSsuiWithdrawnAmount: stepMaxSsuiWithdrawnAmount.toFixed(20),
            stepSsuiWithdrawnAmount: stepSsuiWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [withdrawnSsuiCoin] = strategyWithdraw(
        NORMALIZED_sSUI_COINTYPE,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(NORMALIZED_sSUI_COINTYPE),
        BigInt(
          BigNumber.min(
            new BigNumber(
              stepSsuiWithdrawnAmount
                .times(10 ** sSUI_DECIMALS)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(sSuiReserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP),
            obligation.deposits[0].depositedCtokenAmount,
          ).toString(),
        ),
        transaction,
      );
      sSuiDepositedAmount = sSuiDepositedAmount.minus(stepSsuiWithdrawnAmount);

      // 1.3) Unstake withdrawn sSUI for SUI
      const stepSuiCoin = lstClient.redeem(transaction, withdrawnSsuiCoin);

      // 1.4) Repay SUI
      const stepSuiRepaidAmount = BigNumber.min(
        pendingSuiRepayAmount,
        stepMaxSuiRepaidAmount,
      );
      const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);
      console.log(
        `[SsuiStrategyDialog] withdraw - ${i} repay |`,
        JSON.stringify(
          {
            stepMaxSuiRepaidAmount: stepMaxSuiRepaidAmount.toFixed(20),
            stepSuiRepaidAmount: stepSuiRepaidAmount.toFixed(20),
            isMaxRepay,
          },
          null,
          2,
        ),
      );

      if (stepSuiRepaidAmount.eq(0)) {
        if (suiCoin) transaction.mergeCoins(suiCoin, [stepSuiCoin]);
        else suiCoin = stepSuiCoin;
      } else {
        const repaySuiCoin = transaction.splitCoins(stepSuiCoin, [
          stepSuiRepaidAmount
            .times(10 ** SUI_DECIMALS)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ]);

        if (suiCoin) transaction.mergeCoins(suiCoin, [stepSuiCoin]);
        else suiCoin = stepSuiCoin;

        appData.suilendClient.repay(
          obligation.id,
          NORMALIZED_SUI_COINTYPE,
          repaySuiCoin,
          transaction,
        );
        if (suiCoin) transaction.mergeCoins(suiCoin, [repaySuiCoin]);
        else suiCoin = repaySuiCoin;

        suiBorrowedAmount = suiBorrowedAmount.minus(stepSuiRepaidAmount);
      }
    }
    if (!suiCoin) throw Error("Failed to withdraw"); // Should not happen

    if (isSui(coinType)) {
      // 1.5) Transfer SUI to user
      transaction.transferObjects([suiCoin], address);
    } else {
      // 1.5) Stake SUI for sSUI
      const sSuiCoin = lstClient.mint(transaction, suiCoin);

      // 1.6) Transfer sSUI to user
      transaction.transferObjects([sSuiCoin], address);
    }

    return transaction;
  };

  const maxWithdraw = async (
    strategyOwnerCapId: TransactionObjectInput,
    coinType: string,
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    // 1) Claim and deposit pending rewards
    // appData.suilendClient.claimRewardsAndDeposit(address, obligationOwnerCap, rewards, transaction)
    // Object.values(userData.rewardMap).flatMap((rewards) =>
    //   [...rewards.deposit, ...rewards.borrow].forEach((r) => {
    //     if (!r.obligationClaims[obligation.id]) return;

    //     appData.suilendClient.claimRewardsAndDeposit(
    //       obligation.id,
    //       r.stats.reserve.arrayIndex,
    //       BigInt(r.stats.rewardIndex),
    //       r.stats.rewardCoinType,
    //       r.stats.side,
    //       appData.suilendClient.findReserveArrayIndex(r.stats.rewardCoinType),
    //       transaction,
    //     );
    //   }),
    // );

    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      console.log(`[SsuiStrategyDialog] maxWithdraw - ${i} start`);

      // 2.1) Max withdraw sSUI
      const [withdrawnSsuiCoin] = strategyWithdraw(
        NORMALIZED_sSUI_COINTYPE,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(NORMALIZED_sSUI_COINTYPE),
        BigInt(MAX_U64.toString()),
        transaction,
      );

      // 2.2) Unstake withdrawn sSUI for SUI
      const stepSuiCoin = lstClient.redeem(transaction, withdrawnSsuiCoin);
      if (suiCoin) transaction.mergeCoins(suiCoin, [stepSuiCoin]);
      else suiCoin = stepSuiCoin;

      // 2.3) Repay SUI
      try {
        const txCopy = Transaction.from(transaction);
        appData.suilendClient.repay(
          obligation.id,
          NORMALIZED_SUI_COINTYPE,
          suiCoin,
          txCopy,
        );
        txCopy.transferObjects([suiCoin], address);
        await dryRunTransaction(txCopy); // Throws error if nothing to repay

        appData.suilendClient.repay(
          obligation.id,
          NORMALIZED_SUI_COINTYPE,
          suiCoin,
          transaction,
        );
      } catch (err) {
        break;
      }
    }
    if (!suiCoin) throw Error("Failed to withdraw"); // Should not happen

    if (isSui(coinType)) {
      // 2.4) Transfer SUI to user
      transaction.transferObjects([suiCoin], address);
    } else {
      // 2.4) Stake SUI for sSUI
      const sSuiCoin = lstClient.mint(transaction, suiCoin);

      // 2.5) Transfer sSUI to user
      transaction.transferObjects([sSuiCoin], address);
    }

    return transaction;
  };

  const adjust = async (
    strategyOwnerCapId: TransactionObjectInput,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    // Prepare
    const sSuiDepositedAmount =
      obligation!.deposits[0].depositedAmount.decimalPlaces(
        sSUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    const suiBorrowedAmount = (
      obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0)
    ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[SsuiStrategyDialog] adjust |`,
      JSON.stringify(
        {
          sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    if (targetExposure.gt(exposure))
      return (
        await loopToExposure(
          strategyOwnerCapId,
          transaction,
          sSuiDepositedAmount,
          suiBorrowedAmount,
          targetExposure,
        )
      ).transaction;
    else
      return (
        await unloopToExposure(
          strategyOwnerCapId,
          transaction,
          sSuiDepositedAmount,
          suiBorrowedAmount,
          targetExposure,
        )
      ).transaction;
  };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    // if (obligation) {
    //   Object.values(userData.rewardMap).flatMap((rewards) =>
    //     [...rewards.deposit, ...rewards.borrow].forEach((r) => {
    //       if (!r.obligationClaims[obligation.id]) return;

    //       console.log(
    //         "XXX",
    //         +r.obligationClaims[obligation.id].claimableAmount,
    //       );
    //     }),
    //   );
    // } else {
    //   console.log("XXX", "no obligation");
    // }

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (sSUI and SUI) - required when borrowing or withdrawing
      await appData.suilendClient.refreshAll(transaction, undefined, [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
      ]);

      if (selectedTab === Tab.DEPOSIT) {
        const { strategyOwnerCapId, didCreate } =
          createStrategyOwnerCapIfNoneExists(transaction, strategyOwnerCap);

        // 2) Deposit
        transaction = await deposit(
          strategyOwnerCapId,
          transaction,
          new BigNumber(value),
          reserve.coinType,
        );

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        if (didCreate)
          sendStrategyOwnerCapToUser(strategyOwnerCapId, address, transaction);

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeOut = getBalanceChange(
          res,
          address,
          reserve.token,
          -1,
        );

        toast.success(
          [
            "Deposited",
            balanceChangeOut !== undefined
              ? formatToken(balanceChangeOut, {
                  dp: reserve.token.decimals,
                  trimTrailingZeros: true,
                })
              : null,
            reserve.token.symbol,
            "into sSUI/SUI loop strategy",
          ]
            .filter(Boolean)
            .join(" "),
          {
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );

        // Set slider value (if initial deposit)
        if (!isObligationLooping(obligation))
          setAdjustSliderValue(depositSliderValue);
      } else if (selectedTab === Tab.WITHDRAW) {
        if (!strategyOwnerCap || !obligation)
          throw Error("StrategyOwnerCap or Obligation not found");

        // 2) Withdraw
        transaction = !useMaxAmount
          ? await withdraw(
              strategyOwnerCap.id,
              new BigNumber(value).div(tvlAmount).times(100),
              reserve.coinType,
              transaction,
            )
          : await maxWithdraw(
              strategyOwnerCap.id,
              reserve.coinType,
              transaction,
            );

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeIn = getBalanceChange(res, address, reserve.token);

        toast.success(
          [
            "Withdrew",
            balanceChangeIn !== undefined
              ? formatToken(balanceChangeIn, {
                  dp: reserve.token.decimals,
                  trimTrailingZeros: true,
                })
              : null,
            reserve.token.symbol,
            "from sSUI/SUI loop strategy",
          ]
            .filter(Boolean)
            .join(" "),
          {
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );

        if (useMaxAmount) {
          // Reset slider values
          setDepositSliderValue(defaultExposure.toFixed(1));
          setAdjustSliderValue(defaultExposure.toFixed(1));
        }
      } else if (selectedTab === Tab.ADJUST) {
        if (!strategyOwnerCap || !obligation)
          throw Error("StrategyOwnerCap or Obligation not found");

        // 2) Adjust
        await adjust(
          strategyOwnerCap.id,
          new BigNumber(adjustSliderValue),
          transaction,
        );

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success(
          `Adjusted to ${new BigNumber(adjustSliderValue).toFixed(1)}x`,
          {
            action: (
              <TextLink className="block" href={txUrl}>
                View tx on {explorer.name}
              </TextLink>
            ),
            duration: TX_TOAST_DURATION,
          },
        );
      } else {
        throw new Error("Invalid tab");
      }

      setUseMaxAmount(false);
      setValue("");
    } catch (err) {
      showErrorToast(
        `Failed to ${
          selectedTab === Tab.DEPOSIT
            ? "deposit into"
            : selectedTab === Tab.WITHDRAW
              ? "withdraw from"
              : selectedTab === Tab.ADJUST
                ? "adjust"
                : "--" // Should not happen
        } sSUI/SUI loop strategy`,
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
      refresh();
    }
  };

  return (
    <Dialog
      rootProps={{
        open: isOpen,
        onOpenChange: (isOpen) => (isOpen ? open() : close()),
      }}
      trigger={children}
      dialogContentProps={{ className: "md:inset-x-10" }}
      dialogContentInnerClassName="max-w-[28rem]"
      dialogContentInnerChildrenWrapperClassName="pt-4"
    >
      <Tabs
        className="-mr-2 mb-4"
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
        topEndDecorator={
          <DialogPrimitive.Close asChild>
            <Button
              className="shrink-0 text-muted-foreground"
              icon={<X className="h-5 w-5" />}
              variant="ghost"
              size="icon"
            >
              Close
            </Button>
          </DialogPrimitive.Close>
        }
      >
        <div className="mb-4 w-full">
          <SsuiSuiStrategyHeader />
        </div>

        <div
          className="flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch"
          style={{
            height: `calc(100dvh - ${8 /* Top */}px - ${1 /* Border-top */}px - ${16 /* Padding-top */}px - ${42 /* Tabs */}px - ${16 /* Tabs margin-bottom */}px - ${40 /* Header */}px - ${16 /* Header margin-bottom */}px - ${16 /* Padding-bottom */}px - ${1 /* Border-bottom */}px - ${8 /* Bottom */}px)`,
          }}
        >
          <div className="flex h-full w-full flex-col gap-4 md:h-auto">
            {/* Amount */}
            {(selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) && (
              <div className="relative flex w-full flex-col">
                <div className="relative z-[2] w-full">
                  <StrategyInput
                    ref={inputRef}
                    value={value}
                    onChange={onValueChange}
                    reserveOptions={reserveOptions}
                    reserve={reserve}
                    onReserveChange={onReserveChange}
                    tab={selectedTab}
                    useMaxAmount={useMaxAmount}
                    onMaxClick={useMaxValueWrapper}
                  />
                </div>

                <div className="relative z-[1] -mt-2 flex w-full flex-row flex-wrap justify-between gap-x-2 gap-y-1 rounded-b-md bg-primary/25 px-3 pb-2 pt-4">
                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5",
                      selectedTab === Tab.DEPOSIT && "cursor-pointer",
                    )}
                    onClick={
                      selectedTab === Tab.DEPOSIT
                        ? useMaxValueWrapper
                        : undefined
                    }
                  >
                    <Wallet className="h-3 w-3 text-foreground" />
                    <Tooltip
                      title={
                        reserveBalance.gt(0)
                          ? `${formatToken(reserveBalance, { dp: reserve.token.decimals })} ${reserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(reserveBalance, { exact: false })}{" "}
                        {reserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>

                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5",
                      selectedTab === Tab.WITHDRAW && "cursor-pointer",
                    )}
                    onClick={
                      selectedTab === Tab.WITHDRAW
                        ? useMaxValueWrapper
                        : undefined
                    }
                  >
                    <Download className="h-3 w-3 text-foreground" />
                    <Tooltip
                      title={
                        tvlAmount.gt(0)
                          ? `${formatToken(tvlAmount, { dp: reserve.token.decimals })} ${reserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(tvlAmount, { exact: false })}{" "}
                        {reserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Exposure */}
            {((selectedTab === Tab.DEPOSIT &&
              !isObligationLooping(obligation)) ||
              selectedTab === Tab.ADJUST) && (
              <div className="flex w-full flex-col gap-2">
                {/* Slider */}
                <div className="relative flex h-4 w-full flex-row items-center">
                  <div className="absolute inset-0 z-[1] rounded-full bg-card" />

                  <div
                    className="absolute inset-y-0 left-0 z-[2] max-w-full rounded-l-full bg-primary/25"
                    style={{
                      width: `calc(${16 / 2}px + ${new BigNumber(
                        new BigNumber(
                          (selectedTab === Tab.DEPOSIT
                            ? depositSliderValue
                            : adjustSliderValue) || 0,
                        ).minus(minExposure),
                      )
                        .div(maxExposure.minus(minExposure))
                        .times(100)}% - ${
                        (16 / 2) *
                        2 *
                        +new BigNumber(
                          new BigNumber(
                            (selectedTab === Tab.DEPOSIT
                              ? depositSliderValue
                              : adjustSliderValue) || 0,
                          ).minus(minExposure),
                        ).div(maxExposure.minus(minExposure))
                      }px)`,
                    }}
                  />
                  <div className="absolute inset-x-[calc(16px/2)] inset-y-0 z-[3]">
                    {Array.from({ length: 5 }).map((_, detentIndex, array) => (
                      <div
                        key={detentIndex}
                        className={cn(
                          "absolute inset-y-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2",
                          detentIndex !== 0 &&
                            detentIndex !== array.length - 1 &&
                            "rounded-[calc(4px/2)] bg-foreground",
                        )}
                        style={{
                          left: `${detentIndex * (100 / (array.length - 1))}%`,
                        }}
                      />
                    ))}
                  </div>

                  <input
                    className="relative z-[4] h-6 w-full min-w-0 appearance-none bg-[transparent] !shadow-none !outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[calc(16px/2)] [&::-webkit-slider-thumb]:bg-foreground"
                    type="range"
                    min={+minExposure}
                    max={+maxExposure}
                    step={10 ** -1} // 1dp
                    value={
                      (selectedTab === Tab.DEPOSIT
                        ? depositSliderValue
                        : adjustSliderValue) || "0"
                    }
                    onChange={(e) =>
                      (selectedTab === Tab.DEPOSIT
                        ? setDepositSliderValue
                        : setAdjustSliderValue)(e.target.value)
                    }
                    autoComplete="off"
                    disabled={
                      selectedTab === Tab.ADJUST &&
                      !isObligationLooping(obligation)
                    }
                  />
                </div>

                {/* Labels */}
                <div className="flex w-full flex-row items-center justify-between px-[calc(16px/2)]">
                  {/* Min */}
                  <div className="flex w-0 flex-row justify-center">
                    <TBody>
                      {minExposure.toFixed(0, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>

                  {/* Max */}
                  <div className="flex w-0 flex-row justify-center">
                    <TBody>
                      {maxExposure.toFixed(0, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>
                </div>
              </div>
            )}

            <div className="-m-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:pb-6">
              <div
                className="flex flex-col gap-3"
                style={{ "--bg-color": "hsl(var(--popover))" } as CSSProperties}
              >
                <LabelWithValue
                  label="Leverage"
                  value={
                    <>
                      {exposure.toFixed(selectedTab === Tab.ADJUST ? 6 : 1)}x
                      {selectedTab === Tab.ADJUST &&
                        `${adjustExposure.toFixed(1)}x` !==
                          `${exposure.toFixed(6)}x` && (
                          <>
                            <FromToArrow />
                            {adjustExposure.toFixed(1)}x
                          </>
                        )}
                    </>
                  }
                  valueTooltip={
                    selectedTab === Tab.ADJUST ? undefined : (
                      <>{exposure.toFixed(6)}x</>
                    )
                  }
                  horizontal
                />

                <LabelWithValue
                  label="APR"
                  value={
                    <>
                      {formatPercent(aprPercent, {
                        dp: selectedTab === Tab.ADJUST ? 4 : 2,
                      })}
                      {selectedTab === Tab.ADJUST &&
                        formatPercent(adjustAprPercent) !==
                          formatPercent(aprPercent, { dp: 4 }) && (
                          <>
                            <FromToArrow />
                            {formatPercent(adjustAprPercent)}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />
                <LabelWithValue
                  label="Health"
                  value={
                    <>
                      {formatPercent(healthPercent, {
                        dp: selectedTab === Tab.ADJUST ? 2 : 0,
                      })}
                      {selectedTab === Tab.ADJUST &&
                        formatPercent(adjustHealthPercent, { dp: 0 }) !==
                          formatPercent(healthPercent, { dp: 2 }) && (
                          <>
                            <FromToArrow />
                            {formatPercent(adjustHealthPercent, { dp: 0 })}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />
                {selectedTab === Tab.DEPOSIT ? (
                  <LabelWithValue
                    label="Deposit fee"
                    value={`${formatToken(depositFeesAmount, {
                      dp: reserve.token.decimals,
                      trimTrailingZeros: true,
                    })} ${reserve.token.symbol}`}
                    horizontal
                  />
                ) : selectedTab === Tab.WITHDRAW ? (
                  <LabelWithValue
                    label="Withdraw fee"
                    value={`${formatToken(withdrawFeesAmount, {
                      dp: reserve.token.decimals,
                      trimTrailingZeros: true,
                    })} ${reserve.token.symbol}`}
                    horizontal
                  />
                ) : selectedTab === Tab.ADJUST ? (
                  <LabelWithValue
                    label="Adjust fee"
                    value={`${formatToken(adjustFeesSuiAmount, {
                      dp: SUI_DECIMALS,
                      trimTrailingZeros: true,
                    })} SUI`}
                    horizontal
                  />
                ) : (
                  <></> // Should not happen
                )}
              </div>

              {/* Parameters panel */}
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                className="h-auto min-h-14 w-full rounded-md py-2"
                labelClassName="text-wrap uppercase"
                style={{ overflowWrap: "anywhere" }}
                disabled={submitButtonState.isDisabled}
                onClick={onSubmitClick}
              >
                {submitButtonState.isLoading ? (
                  <Spinner size="md" />
                ) : (
                  submitButtonState.title
                )}
              </Button>

              {selectedTab === Tab.WITHDRAW && useMaxAmount && (
                <TLabelSans className="text-center">
                  Any pending rewards will also be withdrawn
                </TLabelSans>
              )}
            </div>
          </div>
        </div>
      </Tabs>
    </Dialog>
  );
}
