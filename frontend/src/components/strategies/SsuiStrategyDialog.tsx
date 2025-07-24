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
import BigNumber from "bignumber.js";
import { Download, Wallet } from "lucide-react";
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
  sSUI_SUI_TARGET_EXPOSURE,
  useLoadedStrategiesContext,
} from "@/contexts/StrategiesContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { MAX_BALANCE_SUI_SUBTRACTED_AMOUNT } from "@/lib/constants";
import { SubmitButtonState } from "@/lib/types";

const getTransactionMintedSuiAmount = (res: SuiTransactionBlockResponse) => {
  const mintEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::MintEvent>" &&
      normalizeStructTag((event.parsedJson as any).event.typename.name) ===
        NORMALIZED_sSUI_COINTYPE,
  );
  if (mintEvents.length === 0) return undefined;

  return mintEvents.reduce(
    (acc, mintEvent) =>
      acc.plus(
        new BigNumber(
          new BigNumber((mintEvent.parsedJson as any).event.sui_amount_in).plus(
            (mintEvent.parsedJson as any).event.fee_amount,
          ),
        ).div(10 ** SUI_DECIMALS),
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
const getTransactionRedeemedSuiAmount = (res: SuiTransactionBlockResponse) => {
  const redeemEvents = (res.events ?? []).filter(
    (event) =>
      event.type ===
        "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::RedeemEvent>" &&
      normalizeStructTag((event.parsedJson as any).event.typename.name) ===
        NORMALIZED_sSUI_COINTYPE,
  );
  if (redeemEvents.length === 0) return undefined;

  return redeemEvents.reduce(
    (acc, redeemEvent) =>
      acc.plus(
        new BigNumber(
          new BigNumber(
            (redeemEvent.parsedJson as any).event.sui_amount_out,
          ).plus((redeemEvent.parsedJson as any).event.fee_amount),
        ).div(10 ** SUI_DECIMALS),
      ),
    new BigNumber(0),
  );
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
    isObligationSsuiSuiLooping,
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
    getStepMaxSsuiDepositedAmount,
    getStepMaxSsuiWithdrawnAmount,
    getStepMaxSuiRepaidAmount,
    getDepositedBorrowedAmounts,
    getSsuiSuiStrategyTvlSuiAmount,
    getSsuiSuiStrategyAprPercent,
    getSsuiSuiStrategyHealthPercent,
  } = useLoadedStrategiesContext();

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

  // Reserve
  const suiReserve = appData.reserveMap[NORMALIZED_SUI_COINTYPE];
  const sSuiReserve = appData.reserveMap[NORMALIZED_sSUI_COINTYPE];

  // Obligation
  const OBLIGATION_ID =
    "0xf8dfef417a82155d5cbf485c4e7e061ff11dc1ddfa1370c6a46f0d7dfe4017f0";
  const obligation = userData.obligations.find((o) => o.id === OBLIGATION_ID);
  const obligationOwnerCap = userData.obligationOwnerCaps.find(
    (o) => o.obligationId === obligation?.id,
  );

  // Balance
  const suiBalance = getBalance(suiReserve.coinType);

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  const [useMaxAmount, setUseMaxAmount] = useState<boolean>(false);
  const maxAmount = useMemo(() => {
    if (selectedTab === Tab.DEPOSIT)
      return BigNumber.max(
        new BigNumber(0),
        getBalance(NORMALIZED_SUI_COINTYPE).minus(
          MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
        ),
      );
    else if (selectedTab === Tab.WITHDRAW)
      return BigNumber.max(
        new BigNumber(0),
        getSsuiSuiStrategyTvlSuiAmount(obligation),
      );
    else if (selectedTab === Tab.ADJUST) return new BigNumber(0); // TODO

    return new BigNumber(0); // Should not happen
  }, [selectedTab, getBalance, getSsuiSuiStrategyTvlSuiAmount, obligation]);

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

  // TVL
  const tvlSuiAmount = getSsuiSuiStrategyTvlSuiAmount(obligation);

  // APR
  const aprPercent = getSsuiSuiStrategyAprPercent(obligation);

  // Health
  const healthPercent = getSsuiSuiStrategyHealthPercent(obligation);

  // Fees
  const depositFeesSuiAmount = getDepositedBorrowedAmounts(
    new BigNumber(value || 0),
  )[1].times(suiBorrowFeePercent.div(100));

  const withdrawFeesSuiAmount = tvlSuiAmount.gt(0)
    ? new BigNumber(
        new BigNumber(value || 0)
          .div(tvlSuiAmount)
          .times(obligation!.deposits[0].depositedAmount),
      ).times(sSuiRedeemFeePercent.div(100))
    : new BigNumber(0);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting) return { isDisabled: true, isLoading: true };

    if (value === "") return { isDisabled: true, title: "Enter an amount" };
    if (new BigNumber(value).lt(0))
      return { isDisabled: true, title: "Enter a +ve amount" };
    if (new BigNumber(value).eq(0) && !(useMaxAmount && maxAmount.gt(0)))
      return { isDisabled: true, title: "Enter a non-zero amount" };

    if (selectedTab === Tab.DEPOSIT) {
      if (
        new BigNumber(value).gt(
          suiBalance.minus(MAX_BALANCE_SUI_SUBTRACTED_AMOUNT),
        )
      )
        return {
          isDisabled: true,
          title: `${MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
        };
      if (new BigNumber(value).gt(suiBalance))
        return { isDisabled: true, title: "Insufficient SUI" };
    } else if (selectedTab === Tab.WITHDRAW) {
      if (new BigNumber(value).gt(tvlSuiAmount))
        return { isDisabled: true, title: "Withdraw cannot exceed deposits" };
    } else if (selectedTab === Tab.ADJUST) {
      // TODO
    } else {
      throw new Error("Invalid tab");
    }

    return {
      title: `${
        selectedTab === Tab.DEPOSIT
          ? "Deposit"
          : selectedTab === Tab.WITHDRAW
            ? "Withdraw"
            : selectedTab === Tab.ADJUST
              ? "Adjust"
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
    sSuiCoin: TransactionObjectArgument,
    startingSsuiDepositedAmount?: BigNumber,
    startingSuiBorrowedAmount?: BigNumber,
  ) => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    const targetExposure = sSUI_SUI_TARGET_EXPOSURE;
    const sSuiAmount = suiAmount
      .minus(getSsuiMintFee(suiAmount))
      .times(suiToSsuiExchangeRate);
    console.log(
      `[SsuiStrategyDialog] deposit |`,
      JSON.stringify(
        {
          targetExposure: targetExposure.toFixed(20),
          suiAmount: suiAmount.toFixed(20),
          sSuiAmount: sSuiAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // Prepare
    let sSuiDepositedAmount =
      startingSsuiDepositedAmount ??
      (isObligationSsuiSuiLooping(obligation)
        ? obligation!.deposits[0].depositedAmount
        : new BigNumber(0));
    let suiBorrowedAmount =
      startingSuiBorrowedAmount ??
      (isObligationSsuiSuiLooping(obligation)
        ? obligation!.borrows[0].borrowedAmount
        : new BigNumber(0));

    console.log(
      `[SsuiStrategyDialog] deposit |`,
      JSON.stringify(
        {
          sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 1) Deposit sSUI (1x exposure)
    appData.suilendClient.deposit(
      sSuiCoin,
      NORMALIZED_sSUI_COINTYPE,
      obligationOwnerCap.id,
      transaction,
    );
    sSuiDepositedAmount = sSuiDepositedAmount.plus(sSuiAmount);

    for (let i = 0; i < 30; i++) {
      const currentExposure = getExposure(
        sSuiDepositedAmount,
        suiBorrowedAmount,
      );
      const pendingExposure = targetExposure.minus(currentExposure);
      console.log(
        `[SsuiStrategyDialog] deposit - ${i} start |`,
        JSON.stringify(
          {
            sSuiDepositedAmount: sSuiDepositedAmount.toFixed(20),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            currentExposure: currentExposure.toFixed(20),
            pendingExposure: pendingExposure.toFixed(20),
          },
          null,
          2,
        ),
      );
      if (currentExposure.times(1 + E).gte(targetExposure)) break;

      // 2.1) Max calculations
      const stepMaxSuiBorrowedAmount = getStepMaxSuiBorrowedAmount(
        sSuiDepositedAmount,
        suiBorrowedAmount,
      );
      const stepMaxSsuiDepositedAmount = getStepMaxSsuiDepositedAmount(
        stepMaxSuiBorrowedAmount,
      );
      const stepMaxExposure = getExposure(
        sSuiDepositedAmount.plus(stepMaxSsuiDepositedAmount),
        suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
      ).minus(currentExposure);
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

      // 2.2) Borrow SUI
      const stepSuiBorrowedAmount = pendingExposure.gte(stepMaxExposure)
        ? stepMaxSuiBorrowedAmount
        : stepMaxSuiBorrowedAmount
            .times(pendingExposure.div(stepMaxExposure))
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
        isMaxBorrow
          ? MAX_U64.toString()
          : stepSuiBorrowedAmount
              .times(10 ** SUI_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
        transaction,
        false,
      );
      suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

      // 2.3) Stake borrowed SUI for sSUI
      const stepSsuiCoin = lstClient.mint(transaction, borrowedSuiCoin);

      // 2.4) Deposit sSUI
      const stepSsuiDepositedAmount = new BigNumber(
        stepSuiBorrowedAmount.minus(getSsuiMintFee(stepSuiBorrowedAmount)),
      )
        .times(suiToSsuiExchangeRate)
        .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
      console.log(
        `[SsuiStrategyDialog] deposit - ${i} deposit |`,
        JSON.stringify(
          { stepSsuiDepositedAmount: stepSsuiDepositedAmount.toFixed(20) },
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
  };

  const maxWithdraw = async (
    transaction: Transaction,
  ): Promise<TransactionObjectArgument> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      console.log(`[SsuiStrategyDialog] maxWithdraw - ${i} start`);

      // 1.1) Withdraw sSUI
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

    return suiCoin;
  };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      const transaction = new Transaction();

      // 1) Refresh pyth oracles (sSUI and SUI) - required when borrowing
      await appData.suilendClient.refreshAll(transaction, undefined, [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
      ]);

      if (selectedTab === Tab.DEPOSIT) {
        const suiAmount = new BigNumber(value);

        // 2.1) Stake SUI for sSUI
        const suiCoinToStake = transaction.splitCoins(transaction.gas, [
          suiAmount
            .times(10 ** SUI_DECIMALS)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ]);
        const sSuiCoinToDeposit = lstClient.mint(transaction, suiCoinToStake);

        // 2.2) Deposit sSUI and borrow SUI to target exposure
        await deposit(transaction, suiAmount, sSuiCoinToDeposit);

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const mintedSuiAmount = getTransactionMintedSuiAmount(res);
        const borrowedSuiAmount = getTransactionBorrowedSuiAmount(res);

        toast.success(
          [
            "Deposited",
            mintedSuiAmount !== undefined && borrowedSuiAmount !== undefined
              ? formatToken(mintedSuiAmount.minus(borrowedSuiAmount), {
                  dp: SUI_DECIMALS,
                  trimTrailingZeros: true,
                })
              : null,
            "SUI",
            "into 3x sSUI/SUI loop strategy",
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
      } else if (selectedTab === Tab.WITHDRAW) {
        if (!useMaxAmount) {
          const withdrawnSuiAmount = new BigNumber(value);
          const remainingSuiAmount = tvlSuiAmount.minus(withdrawnSuiAmount);

          // 2.1) Max withdraw sSUI and max repay SUI
          const maxWithdrawSuiCoin = await maxWithdraw(transaction);

          // 2.2) Transfer withdrawn SUI to user
          const withdrawSuiCoin = transaction.splitCoins(maxWithdrawSuiCoin, [
            new BigNumber(value)
              .times(10 ** SUI_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ]);
          transaction.transferObjects([withdrawSuiCoin], address);

          // 2.3) Stake remaining SUI for sSUI
          const sSuiCoinToDeposit = lstClient.mint(
            transaction,
            maxWithdrawSuiCoin,
          );

          // 2.4) Deposit sSUI and borrow SUI
          await deposit(
            transaction,
            remainingSuiAmount,
            sSuiCoinToDeposit,
            new BigNumber(0), // We fully withdrew in step 2.1
            new BigNumber(0), // We fully repaid in step 2.1
          );
        } else {
          // 2.1) Max withdraw sSUI and max repay SUI
          const suiCoin = await maxWithdraw(transaction);
          transaction.transferObjects([suiCoin], address);
        }

        // 3) Rebalance sSUI
        lstClient.rebalance(
          transaction,
          lstClient.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const redeemedSuiAmount = getTransactionRedeemedSuiAmount(res);
        const repaidSuiAmount = getTransactionRepaidSuiAmount(res);

        toast.success(
          [
            "Withdrew",
            redeemedSuiAmount !== undefined && repaidSuiAmount !== undefined
              ? formatToken(redeemedSuiAmount.minus(repaidSuiAmount), {
                  dp: SUI_DECIMALS,
                  trimTrailingZeros: true,
                })
              : null,
            "SUI",
            "from 3x sSUI/SUI loop strategy",
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
        } 3x sSUI/SUI loop strategy`,
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
      headerProps={{
        className: "h-9",
        title: {
          className: "normal-case",
          children: <SsuiSuiStrategyHeader />,
        },
        showCloseButton: true,
      }}
    >
      <Tabs
        className="mb-4"
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
      >
        <div
          className="flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch"
          style={{
            height: `calc(100dvh - ${8 /* Top */}px - ${1 /* Border-top */}px - ${16 /* Padding-top */}px - ${36 /* Header */}px - ${16 /* Header margin-bottom */}px - ${16 /* Padding-bottom */}px - ${42 /* Tabs */}px - ${16 /* Tabs margin-bottom */}px - ${1 /* Border-bottom */}px - ${8 /* Bottom */}px)`,
          }}
        >
          <div className="flex h-full w-full flex-col gap-4 md:h-auto md:w-[28rem]">
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
                      tvlSuiAmount.gt(0)
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

            <div className="-m-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:pb-6">
              <div
                className="flex min-h-[84px] flex-col gap-3"
                style={{ "--bg-color": "hsl(var(--popover))" } as CSSProperties}
              >
                <LabelWithValue
                  label="APR"
                  value={formatPercent(aprPercent)}
                  horizontal
                />
                <LabelWithValue
                  label="Health"
                  value={
                    tvlSuiAmount.gt(0) ? formatPercent(healthPercent) : "--"
                  }
                  horizontal
                />
                {selectedTab === Tab.DEPOSIT ? (
                  <LabelWithValue
                    label="Deposit fees"
                    value={`${formatToken(depositFeesSuiAmount, {
                      dp: SUI_DECIMALS,
                      trimTrailingZeros: true,
                    })} SUI`}
                    horizontal
                  />
                ) : selectedTab === Tab.WITHDRAW ? (
                  <LabelWithValue
                    label="Withdraw fees"
                    value={`${formatToken(
                      withdrawFeesSuiAmount.times(sSuiToSuiExchangeRate),
                      { dp: SUI_DECIMALS, trimTrailingZeros: true },
                    )} SUI`}
                    horizontal
                  />
                ) : selectedTab === Tab.ADJUST ? (
                  <></> // TODO
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
