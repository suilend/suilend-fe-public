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
import { Transaction } from "@mysten/sui/transactions";
import { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import BigNumber from "bignumber.js";
import { Download, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import {
  MAX_U64,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  TX_TOAST_DURATION,
  formatInteger,
  formatPercent,
  formatToken,
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
import { TBody } from "@/components/shared/Typography";
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
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
      // [QueryParams.PARAMETERS_PANEL_TAB]: router.query[
      //   QueryParams.PARAMETERS_PANEL_TAB
      // ] as ParametersPanelTab | undefined,
    }),
    [router.query],
  );

  const { explorer } = useSettingsContext();
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
  } = useLoadedSsuiStrategyContext();

  // Tabs
  const tabs = [
    { id: Tab.DEPOSIT, title: "Deposit" },
    { id: Tab.WITHDRAW, title: "Withdraw" },
    { id: Tab.ADJUST, title: "Adjust" },
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
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Obligation
  const OBLIGATION_ID =
    "0xf8dfef417a82155d5cbf485c4e7e061ff11dc1ddfa1370c6a46f0d7dfe4017f0";
  const obligation = userData.obligations.find((o) => o.id === OBLIGATION_ID);
  const obligationOwnerCap = userData.obligationOwnerCaps.find(
    (o) => o.obligationId === obligation?.id,
  );

  // Balance
  const suiBalance = getBalance(suiReserve.coinType);

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

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  const [useMaxAmount, setUseMaxAmount] = useState<boolean>(false);
  const maxAmount = useMemo(() => {
    if (selectedTab === Tab.DEPOSIT)
      return BigNumber.max(
        new BigNumber(0),
        getBalance(NORMALIZED_SUI_COINTYPE).minus(
          STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
        ),
      );
    else if (selectedTab === Tab.WITHDRAW)
      return BigNumber.max(new BigNumber(0), getTvlSuiAmount(obligation));
    else if (selectedTab === Tab.ADJUST) return new BigNumber(0); // Not relevant (adjust tab only has a slider)

    return new BigNumber(0); // Should not happen
  }, [selectedTab, getBalance, getTvlSuiAmount, obligation]);

  const formatAndSetValue = useCallback((_value: string) => {
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
        Math.min(decimals.length, SUI_DECIMALS),
      );
      formattedValue = `${integersFormatted}.${decimalsFormatted}`;
    }

    setValue(formattedValue);
  }, []);

  const onValueChange = (_value: string) => {
    if (useMaxAmount) setUseMaxAmount(false);
    formatAndSetValue(_value);
  };

  const useMaxValueWrapper = () => {
    setUseMaxAmount(true);
    formatAndSetValue(maxAmount.toFixed(SUI_DECIMALS, BigNumber.ROUND_DOWN));
  };

  useEffect(() => {
    // If user has specified intent to use max amount, we continue this intent
    // even if the max value updates
    if (useMaxAmount)
      formatAndSetValue(maxAmount.toFixed(SUI_DECIMALS, BigNumber.ROUND_DOWN));
  }, [useMaxAmount, maxAmount, formatAndSetValue]);

  // Stats - TVL
  const tvlSuiAmount = getTvlSuiAmount(obligation);

  // Stats - Exposure
  const exposure = useMemo(
    () =>
      isObligationLooping(obligation)
        ? getExposure(
            obligation!.deposits[0].depositedAmount,
            obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
          )
        : new BigNumber(depositSliderValue || 0),
    [isObligationLooping, obligation, getExposure, depositSliderValue],
  );
  const adjustExposure = useMemo(
    () => new BigNumber(adjustSliderValue || 0),
    [adjustSliderValue],
  );

  // Stats - APR
  const aprPercent = getAprPercent(obligation, exposure);
  const adjustAprPercent = getAprPercent(undefined, adjustExposure);

  // Stats - Health
  const healthPercent = getHealthPercent(obligation, exposure);
  const adjustHealthPercent = getHealthPercent(undefined, adjustExposure);

  // Stats - Fees
  const depositFeesSuiAmount = useMemo(() => {
    const { suiBorrowedAmount } = simulateDeposit(
      new BigNumber(value || 0),
      exposure,
    );

    // TODO: Add sSUI mint fee
    return suiBorrowedAmount.times(suiBorrowFeePercent.div(100));
  }, [simulateDeposit, value, exposure, suiBorrowFeePercent]);

  const withdrawFeesSuiAmount = useMemo(() => {
    if (!isObligationLooping(obligation)) return new BigNumber(0);

    const unloopPercent = new BigNumber(value || 0)
      .div(tvlSuiAmount)
      .times(100);
    const withdrawnSsuiAmount = obligation!.deposits[0].depositedAmount.times(
      unloopPercent.div(100),
    );

    return getSsuiRedeemFee(withdrawnSsuiAmount)
      .times(sSuiToSuiExchangeRate)
      .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
  }, [
    isObligationLooping,
    obligation,
    value,
    tvlSuiAmount,
    getSsuiRedeemFee,
    sSuiToSuiExchangeRate,
  ]);

  const adjustFeesSuiAmount = useMemo(() => {
    if (!isObligationLooping(obligation)) return new BigNumber(0);

    const currentExposure = exposure;
    const targetExposure = adjustExposure;

    return new BigNumber(0); // TODO
  }, [isObligationLooping, obligation, exposure, adjustExposure]);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting) return { isDisabled: true, isLoading: true };

    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      if (value === "") return { isDisabled: true, title: "Enter an amount" };
      if (new BigNumber(value).lt(0))
        return { isDisabled: true, title: "Enter a +ve amount" };
      if (new BigNumber(value).eq(0) && !(useMaxAmount && maxAmount.gt(0)))
        return { isDisabled: true, title: "Enter a non-zero amount" };

      if (selectedTab === Tab.DEPOSIT) {
        if (new BigNumber(value).gt(suiBalance))
          return { isDisabled: true, title: "Insufficient SUI" };
        if (
          new BigNumber(value).gt(
            suiBalance.minus(STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT),
          )
        )
          return {
            isDisabled: true,
            title: `${STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
          };
      } else {
        if (new BigNumber(value).gt(tvlSuiAmount))
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
        selectedTab === Tab.ADJUST
          ? `Adjust to ${adjustExposure.toFixed(1)}x`
          : `${
              selectedTab === Tab.DEPOSIT
                ? "Deposit"
                : selectedTab === Tab.WITHDRAW
                  ? "Withdraw"
                  : "--" // Should not happen
            } ${formatToken(new BigNumber(value), {
              dp: SUI_DECIMALS,
              trimTrailingZeros: true,
            })} SUI`,
    };
  })();

  const deposit = async (
    transaction: Transaction,
    suiAmount: BigNumber,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    const sSuiAmount = suiAmount
      .minus(getSsuiMintFee(suiAmount))
      .times(suiToSsuiExchangeRate)
      .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
    console.log(
      `[SsuiStrategyDialog] deposit |`,
      JSON.stringify(
        {
          suiAmount: suiAmount.toFixed(20),
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
    let suiBorrowedAmount = isObligationLooping(obligation)
      ? (
          obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0)
        ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN)
      : new BigNumber(0);
    const targetExposure = isObligationLooping(obligation)
      ? getExposure(
          obligation!.deposits[0].depositedAmount,
          obligation!.borrows[0]?.borrowedAmount ?? new BigNumber(0),
        )
      : new BigNumber(depositSliderValue || 0);

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

    // 1) Stake SUI for sSUI
    const suiCoinToStake = transaction.splitCoins(transaction.gas, [
      suiAmount
        .times(10 ** SUI_DECIMALS)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(),
    ]);
    const sSuiCoinToDeposit = lstClient.mint(transaction, suiCoinToStake);

    // 2) Deposit sSUI (1x exposure)
    appData.suilendClient.deposit(
      sSuiCoinToDeposit,
      NORMALIZED_sSUI_COINTYPE,
      obligationOwnerCap.id,
      transaction,
    );
    sSuiDepositedAmount = sSuiDepositedAmount.plus(sSuiAmount);

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(sSuiDepositedAmount, suiBorrowedAmount);
      const pendingExposure = targetExposure.minus(exposure);
      console.log(
        `[SsuiStrategyDialog] deposit - ${i} start |`,
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
      console.log(
        `[SsuiStrategyDialog] deposit - ${i} max |`,
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

      // 3.2) Borrow SUI
      const stepSuiBorrowedAmount = stepMaxSuiBorrowedAmount
        .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);
      console.log(
        `[SsuiStrategyDialog] deposit - ${i} borrow |`,
        JSON.stringify(
          {
            stepSuiBorrowedAmount: stepSuiBorrowedAmount.toFixed(20),
            isMaxBorrow,
          },
          null,
          2,
        ),
      );

      const [borrowedSuiCoin] = await appData.suilendClient.borrow(
        obligationOwnerCap.id,
        obligation.id,
        NORMALIZED_SUI_COINTYPE,
        stepSuiBorrowedAmount
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
        transaction,
        false,
      );
      suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

      // 3.3) Stake borrowed SUI for sSUI
      const stepSsuiCoin = lstClient.mint(transaction, borrowedSuiCoin);

      // 3.4) Deposit sSUI
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

      appData.suilendClient.deposit(
        stepSsuiCoin,
        NORMALIZED_sSUI_COINTYPE,
        obligationOwnerCap.id,
        transaction,
      );
      sSuiDepositedAmount = sSuiDepositedAmount.plus(stepSsuiDepositedAmount);
    }

    return transaction;
  };

  const withdraw = async (
    transaction: Transaction,
    unloopPercent: BigNumber,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

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

      const [withdrawnSsuiCoin] = await appData.suilendClient.withdraw(
        obligationOwnerCap.id,
        obligation.id,
        NORMALIZED_sSUI_COINTYPE,
        stepSsuiWithdrawnAmount
          .times(10 ** sSUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
        transaction,
        false,
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

    // 2) Transfer SUI to user
    transaction.transferObjects([suiCoin], address);

    return transaction;
  };

  const maxWithdraw = async (
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      console.log(`[SsuiStrategyDialog] maxWithdraw - ${i} start`);

      // 1.1) Max withdraw sSUI
      const [withdrawnSsuiCoin] = await appData.suilendClient.withdraw(
        obligationOwnerCap.id,
        obligation.id,
        NORMALIZED_sSUI_COINTYPE,
        MAX_U64.toString(),
        transaction,
        false,
      );

      // 1.2) Unstake withdrawn sSUI for SUI
      const stepSuiCoin = lstClient.redeem(transaction, withdrawnSsuiCoin);
      if (suiCoin) transaction.mergeCoins(suiCoin, [stepSuiCoin]);
      else suiCoin = stepSuiCoin;

      // 1.3) Repay SUI
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

    // 2) Transfer SUI to user
    transaction.transferObjects([suiCoin], address);

    return transaction;
  };

  // const adjust = async (
  //   transaction: Transaction,
  //   targetExposure: BigNumber,
  // ): Promise<Transaction> => {
  //   if (!address) throw Error("Wallet not connected");
  //   if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

  //   console.log(
  //     `[SsuiStrategyDialog] adjust |`,
  //     JSON.stringify({ targetExposure: targetExposure.toFixed(20) }, null, 2),
  //   );
  // };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (sSUI and SUI) - required when borrowing or withdrawing
      await appData.suilendClient.refreshAll(transaction, undefined, [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
      ]);

      if (selectedTab === Tab.DEPOSIT) {
        // 2) Deposit
        transaction = await deposit(transaction, new BigNumber(value));

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const mintAmounts = getTransactionMintAmounts(res);
        const borrowedSuiAmount =
          getTransactionBorrowedSuiAmount(res) ?? new BigNumber(0);

        toast.success(
          [
            "Deposited",
            mintAmounts !== undefined && borrowedSuiAmount !== undefined
              ? formatToken(
                  new BigNumber(
                    mintAmounts.suiAmountIn.plus(mintAmounts.suiFeeAmount),
                  ).minus(borrowedSuiAmount),
                  { dp: SUI_DECIMALS, trimTrailingZeros: true },
                )
              : null,
            "SUI",
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
        // 2) Withdraw
        transaction = !useMaxAmount
          ? await withdraw(
              transaction,
              new BigNumber(value).div(tvlSuiAmount).times(100),
            )
          : await maxWithdraw(transaction);

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const redeemAmounts = getTransactionRedeemAmounts(res);
        const repaidSuiAmount =
          getTransactionRepaidSuiAmount(res) ?? new BigNumber(0);

        toast.success(
          [
            "Withdrew",
            redeemAmounts !== undefined && repaidSuiAmount !== undefined
              ? formatToken(
                  new BigNumber(
                    redeemAmounts.suiAmountOut.plus(
                      redeemAmounts.sSuiFeeAmount.times(sSuiToSuiExchangeRate),
                    ),
                  ).minus(repaidSuiAmount),
                  { dp: SUI_DECIMALS, trimTrailingZeros: true },
                )
              : null,
            "SUI",
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
        // TODO
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
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={children}
      dialogContentProps={{ className: "md:inset-x-10" }}
      dialogContentInnerClassName="max-w-max"
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
          <div className="flex h-full w-full flex-col gap-4 md:h-auto md:w-[28rem]">
            {/* Amount */}
            {(selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) && (
              <div className="relative flex w-full flex-col">
                <div className="relative z-[2] w-full">
                  <StrategyInput
                    ref={inputRef}
                    value={value}
                    onChange={onValueChange}
                    reserve={suiReserve}
                    tab={selectedTab}
                    useMaxAmount={useMaxAmount}
                    onMaxClick={useMaxValueWrapper}
                  />
                </div>

                <div className="relative z-[1] -mt-2 flex w-full flex-row flex-wrap justify-between gap-x-2 gap-y-1 rounded-b-md bg-primary/25 px-3 pb-2 pt-4">
                  <div
                    className="flex cursor-pointer flex-row items-center gap-1.5"
                    onClick={useMaxValueWrapper}
                  >
                    <Wallet className="h-3 w-3 text-foreground" />
                    <Tooltip
                      title={
                        suiBalance.gt(0)
                          ? `${formatToken(suiBalance, { dp: SUI_DECIMALS })} SUI`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(suiBalance, { exact: false })} SUI
                      </TBody>
                    </Tooltip>
                  </div>

                  <div className="flex flex-row items-center gap-1.5">
                    <Download className="h-3 w-3 text-foreground" />
                    <Tooltip
                      title={
                        isObligationLooping(obligation)
                          ? `${formatToken(tvlSuiAmount, { dp: SUI_DECIMALS })} SUI`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(tvlSuiAmount, { exact: false })} SUI
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
                    className="absolute inset-y-0 left-0 z-[2] max-w-full rounded-l-full border border-primary bg-primary/25"
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
                    <TBody className="text-muted-foreground">
                      {minExposure.toFixed(0, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>

                  {/* Max */}
                  <div className="flex w-0 flex-row justify-center">
                    <TBody className="text-muted-foreground">
                      {maxExposure.toFixed(0, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>
                </div>
              </div>
            )}

            <div className="-m-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:pb-6">
              <div
                className="flex min-h-[84px] flex-col gap-3"
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
                      {formatPercent(aprPercent)}
                      {selectedTab === Tab.ADJUST &&
                        formatPercent(adjustAprPercent) !==
                          formatPercent(aprPercent) && (
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
                      {formatPercent(healthPercent)}
                      {selectedTab === Tab.ADJUST &&
                        formatPercent(adjustHealthPercent) !==
                          formatPercent(healthPercent) && (
                          <>
                            <FromToArrow />
                            {formatPercent(adjustHealthPercent)}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />
                {selectedTab === Tab.DEPOSIT ? (
                  <LabelWithValue
                    label="Deposit fee"
                    value={`${formatToken(depositFeesSuiAmount, {
                      dp: SUI_DECIMALS,
                      trimTrailingZeros: true,
                    })} SUI`}
                    horizontal
                  />
                ) : selectedTab === Tab.WITHDRAW ? (
                  <LabelWithValue
                    label="Withdraw fee"
                    value={`${formatToken(withdrawFeesSuiAmount, {
                      dp: SUI_DECIMALS,
                      trimTrailingZeros: true,
                    })} SUI`}
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
            </div>
          </div>
        </div>
      </Tabs>
    </Dialog>
  );
}
