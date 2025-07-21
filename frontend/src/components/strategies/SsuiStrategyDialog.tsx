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

import { Transaction } from "@mysten/sui/transactions";
import { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
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
import { SubmitButtonState } from "@/lib/types";

enum QueryParams {
  TAB = "action",
  // PARAMETERS_PANEL_TAB = "parametersPanelTab",
}

export enum Tab {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
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
    getSsuiMintFee,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxSsuiDepositedAmount,
    getDepositedBorrowedAmounts,
    getSsuiSuiStrategyDepositedSuiAmount,
    getSsuiSuiStrategyAprPercent,
    getSsuiSuiStrategyHealthPercent,
  } = useLoadedStrategiesContext();

  // Tabs
  const tabs = [
    { id: Tab.DEPOSIT, title: "Deposit" },
    { id: Tab.WITHDRAW, title: "Withdraw" },
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
  const maxAmount = getBalance(NORMALIZED_SUI_COINTYPE);

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

  // Deposited
  const depositedSuiAmount = getSsuiSuiStrategyDepositedSuiAmount(obligation);

  // APR
  const aprPercent = getSsuiSuiStrategyAprPercent(obligation);

  // Health
  const healthPercent = getSsuiSuiStrategyHealthPercent(obligation);

  // Fees
  const [openFeesSuiAmount, closeFeesSsuiAmount] = useMemo(() => {
    const [sSuiDepositedAmount, suiBorrowedAmount] =
      getDepositedBorrowedAmounts(
        new BigNumber(value || 0),
        sSUI_SUI_TARGET_EXPOSURE,
      );

    return [
      suiBorrowedAmount.times(suiBorrowFeePercent.div(100)),
      sSuiDepositedAmount.times(sSuiRedeemFeePercent.div(100)),
    ];
  }, [
    getDepositedBorrowedAmounts,
    value,
    suiBorrowFeePercent,
    sSuiRedeemFeePercent,
  ]);

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

    return {
      title: `${selectedTab === Tab.DEPOSIT ? "Deposit" : "Withdraw"} ${formatToken(
        new BigNumber(value),
        { dp: SUI_DECIMALS, trimTrailingZeros: true },
      )} SUI`,
    };
  })();

  const openPosition = async () => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    const suiAmount = new BigNumber(value);
    const targetExposure = sSUI_SUI_TARGET_EXPOSURE;

    // Exposure
    const minExposure = new BigNumber(1);
    const maxExposure = new BigNumber(
      1 / (1 - sSuiReserve.config.openLtvPct / 100),
    ); // 3.33333...x
    if (!(targetExposure.gt(minExposure) && targetExposure.lt(maxExposure)))
      throw Error(
        `Target exposure must be greater than ${minExposure}x and less than ${maxExposure}x`,
      );
    console.log(
      `[SsuiStrategyDialog] openPosition - targetExposure: ${targetExposure}x, (min, max): (${minExposure}x, ${maxExposure}x)`,
    );

    //

    const transaction = new Transaction();

    // 1) Refresh pyth oracles (sSUI and SUI) - required when borrowing
    await appData.suilendClient.refreshAll(transaction, undefined, [
      NORMALIZED_sSUI_COINTYPE,
      NORMALIZED_SUI_COINTYPE,
    ]);

    // 2.1) Stake SUI for sSUI
    const sSuiAmount = suiAmount
      .minus(getSsuiMintFee(suiAmount))
      .times(suiToSsuiExchangeRate);
    console.log(
      `[SsuiStrategyDialog] openPosition - suiAmount: ${suiAmount}, sSuiAmount: ${sSuiAmount}, suiToSsuiExchangeRate: ${suiToSsuiExchangeRate}`,
    );

    const suiCoinToStake = transaction.splitCoins(transaction.gas, [
      suiAmount
        .times(10 ** SUI_DECIMALS)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString(),
    ]);
    const sSuiCoinToDeposit = lstClient.mint(transaction, suiCoinToStake);

    // 2.2) Deposit sSUI (1x exposure)
    appData.suilendClient.deposit(
      sSuiCoinToDeposit,
      NORMALIZED_sSUI_COINTYPE,
      obligationOwnerCap.id,
      transaction,
    );

    let sSuiDepositedAmount = sSuiAmount;
    let suiBorrowedAmount = new BigNumber(0);
    for (let i = 0; i < 20; i++) {
      const currentExposure = getExposure(
        sSuiDepositedAmount,
        suiBorrowedAmount,
      );
      const pendingExposure = targetExposure.minus(currentExposure);
      console.log(
        `[SsuiStrategyDialog] openPosition - ${i} start |`,
        JSON.stringify(
          {
            sSuiDepositedAmount,
            suiBorrowedAmount,
            currentExposure,
            pendingExposure,
          },
          null,
          2,
        ),
      );
      if (currentExposure.times(1 + E).gte(targetExposure)) break;

      // 3.1) Max calculations
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
        `[SsuiStrategyDialog] openPosition - ${i} max |`,
        JSON.stringify(
          {
            stepMaxSuiBorrowedAmount,
            stepMaxSsuiDepositedAmount,
            stepMaxExposure,
          },
          null,
          2,
        ),
      );

      // 3.2) Borrow
      const stepSuiBorrowedAmount = pendingExposure.gte(stepMaxExposure)
        ? stepMaxSuiBorrowedAmount
        : stepMaxSuiBorrowedAmount
            .times(pendingExposure.div(stepMaxExposure))
            .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);
      console.log(
        `[SsuiStrategyDialog] openPosition - ${i} borrow |`,
        JSON.stringify({ stepSuiBorrowedAmount, isMaxBorrow }, null, 2),
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

      // 3.3) Stake borrowed SUI for sSUI
      const sSuiCoin = lstClient.mint(transaction, borrowedSuiCoin);

      // 3.4) Deposit sSUI
      const stepSsuiDepositedAmount = new BigNumber(
        stepSuiBorrowedAmount.minus(getSsuiMintFee(stepSuiBorrowedAmount)),
      )
        .times(suiToSsuiExchangeRate)
        .decimalPlaces(sSUI_DECIMALS, BigNumber.ROUND_DOWN);
      console.log(
        `[SsuiStrategyDialog] openPosition - ${i} deposit |`,
        JSON.stringify({ stepSsuiDepositedAmount }, null, 2),
      );

      appData.suilendClient.deposit(
        sSuiCoin,
        NORMALIZED_sSUI_COINTYPE,
        obligationOwnerCap.id,
        transaction,
      );
      sSuiDepositedAmount = sSuiDepositedAmount.plus(stepSsuiDepositedAmount);
    }

    // 4) Rebalance sSUI
    lstClient.rebalance(
      transaction,
      lstClient.liquidStakingObject.weightHookId,
    );

    const res = await signExecuteAndWaitForTransaction(transaction);
    const txUrl = explorer.buildTxUrl(res.digest);

    toast.success("Opened sSUI/SUI loop", {
      description: `${formatToken(suiAmount, { dp: SUI_DECIMALS, trimTrailingZeros: true })} SUI`,
      action: (
        <TextLink className="block" href={txUrl}>
          View tx on {explorer.name}
        </TextLink>
      ),
      duration: TX_TOAST_DURATION,
    });
  };

  const closePosition = async () => {
    if (!address) throw Error("Wallet not connected");
    if (!obligationOwnerCap || !obligation) throw Error("Obligation not found");

    // Calls
    const addRepayCalls = (
      transaction: Transaction,
      suiCoin: TransactionObjectArgument,
      addTransferCall?: boolean,
    ) => {
      appData.suilendClient.repay(
        obligation.id,
        NORMALIZED_SUI_COINTYPE,
        suiCoin,
        transaction,
      ); // Repay will throw if no SUI left to repay

      if (addTransferCall) transaction.transferObjects([suiCoin], address);

      return suiCoin;
    };

    //

    const transaction = new Transaction();

    // 1) Refresh pyth oracles (sSUI and SUI) - required when withdrawing
    await appData.suilendClient.refreshAll(transaction, undefined, [
      NORMALIZED_sSUI_COINTYPE,
      NORMALIZED_SUI_COINTYPE,
    ]);

    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 10; i++) {
      // 2.1) Withdraw sSUI
      const [withdrawnSsuiCoin] = await appData.suilendClient.withdraw(
        obligationOwnerCap.id,
        obligation.id,
        NORMALIZED_sSUI_COINTYPE,
        MAX_U64.toString(),
        transaction,
        false,
      );

      // 2.2) Unstake withdrawn sSUI for SUI
      const stepSuiCoin = lstClient.redeem(transaction, withdrawnSsuiCoin);
      if (suiCoin) transaction.mergeCoins(suiCoin, [stepSuiCoin]);
      else suiCoin = stepSuiCoin;

      // 2.3) Repay SUI (will throw if no SUI left to repay)
      try {
        const txCopy = Transaction.from(transaction);
        addRepayCalls(txCopy, suiCoin, true);
        await dryRunTransaction(txCopy);

        addRepayCalls(transaction, suiCoin);
      } catch (err) {
        if (!suiCoin) throw new Error("No SUI to transfer to user"); // Should not happen

        // 2.4) Transfer remaining SUI to user
        transaction.transferObjects([suiCoin], address);

        break;
      }
    }

    // 3) Rebalance sSUI
    lstClient.rebalance(
      transaction,
      lstClient.liquidStakingObject.weightHookId,
    );

    const res = await signExecuteAndWaitForTransaction(transaction);
    const txUrl = explorer.buildTxUrl(res.digest);

    toast.success("Closed sSUI/SUI loop", {
      action: (
        <TextLink className="block" href={txUrl}>
          View tx on {explorer.name}
        </TextLink>
      ),
      duration: TX_TOAST_DURATION,
    });
  };

  const onSubmitClick = async () => {
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      if (selectedTab === Tab.DEPOSIT) await openPosition();
      else await closePosition();

      setUseMaxAmount(false);
      setValue("");
    } catch (err) {
      showErrorToast(
        `Failed to ${selectedTab === Tab.DEPOSIT ? "open" : "close"} sSUI/SUI loop`,
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
                      depositedSuiAmount.gt(0)
                        ? `${formatToken(depositedSuiAmount, { dp: SUI_DECIMALS })} SUI`
                        : undefined
                    }
                  >
                    <TBody className="text-xs">
                      {formatToken(depositedSuiAmount, { exact: false })} SUI
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
                  value={formatPercent(healthPercent)}
                  horizontal
                />
                {selectedTab === Tab.DEPOSIT ? (
                  <LabelWithValue
                    label="Deposit fees"
                    value={`${formatToken(openFeesSuiAmount, {
                      dp: SUI_DECIMALS,
                      trimTrailingZeros: true,
                    })} SUI`}
                    horizontal
                  />
                ) : (
                  <LabelWithValue
                    label="Withdraw fees"
                    value={`${formatToken(
                      closeFeesSsuiAmount.div(suiToSsuiExchangeRate),
                      { dp: SUI_DECIMALS, trimTrailingZeros: true },
                    )} SUI`}
                    horizontal
                  />
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
