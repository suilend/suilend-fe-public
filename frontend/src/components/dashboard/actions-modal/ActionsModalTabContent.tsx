import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { capitalize } from "lodash";
import { AlertTriangle, Download, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Action, ApiDepositEvent, Side } from "@suilend/sdk/lib/types";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import {
  API_URL,
  MAX_U64,
  MS_PER_YEAR,
  NORMALIZED_FUD_COINTYPE,
  NORMALIZED_HIPPO_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  formatInteger,
  formatPrice,
  formatToken,
  getBalanceChange,
  isSui,
} from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import {
  ActionSignature,
  useActionsModalContext,
} from "@/components/dashboard/actions-modal/ActionsModalContext";
import ActionsModalInput from "@/components/dashboard/actions-modal/ActionsModalInput";
import ParametersPanel from "@/components/dashboard/actions-modal/ParametersPanel";
import AprWithRewardsBreakdown from "@/components/dashboard/AprWithRewardsBreakdown";
import Button from "@/components/shared/Button";
import Collapsible from "@/components/shared/Collapsible";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import YourBorrowLimitlabel from "@/components/shared/YourBorrowLimitLabel";
import YourUtilizationLabel from "@/components/shared/YourUtilizationLabel";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import {
  FIRST_DEPOSIT_DIALOG_START_DATE,
  MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
  TX_TOAST_DURATION,
} from "@/lib/constants";
import { EventType } from "@/lib/events";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ActionsModalTabContentProps {
  side: Side;
  reserve: ParsedReserve;
  action: Action;
  actionPastTense: string;
  getMaxValue: () => BigNumber;
  getNewBorrowUtilizationCalculations: (value: BigNumber) =>
    | {
        depositedAmountUsd: BigNumber;
        weightedBorrowsUsd: BigNumber;
        maxPriceWeightedBorrowsUsd: BigNumber;
        minPriceBorrowLimitUsd: BigNumber;
        unhealthyBorrowValueUsd: BigNumber;
        weightedConservativeBorrowUtilizationPercent: BigNumber;
      }
    | undefined;
  getSubmitButtonNoValueState?: () => SubmitButtonState | undefined;
  getSubmitButtonState: (value: BigNumber) => SubmitButtonState | undefined;
  getSubmitWarningMessages?: () => string[];
  submit: ActionSignature;
}

export default function ActionsModalTabContent({
  side,
  reserve,
  action,
  actionPastTense,
  getMaxValue,
  getNewBorrowUtilizationCalculations,
  getSubmitButtonNoValueState,
  getSubmitButtonState,
  getSubmitWarningMessages,
  submit,
}: ActionsModalTabContentProps) {
  const { explorer } = useSettingsContext();
  const { address } = useWalletContext();
  const { closeLedgerHashDialog } = useLoadedAppContext();
  const { getBalance, refresh, obligation } = useLoadedUserContext();

  const { setIsFirstDepositDialogOpen } = useDashboardContext();
  const { isMoreParametersOpen, setIsMoreParametersOpen } =
    useActionsModalContext();

  const { md } = useBreakpoint();

  // First deposit
  const [justDeposited, setJustDeposited] = useState<boolean>(false);

  const isFetchingDepositEventsRef = useRef<boolean>(false);
  useEffect(() => {
    if (!justDeposited) return;
    if (!obligation) return;

    // Fetch deposit events
    if (isFetchingDepositEventsRef.current) return;
    isFetchingDepositEventsRef.current = true;

    (async () => {
      try {
        const url = `${API_URL}/events?${new URLSearchParams({
          eventTypes: [EventType.DEPOSIT].join(","),
          obligationId: obligation.id,
        })}`;
        const res = await fetch(url);
        const json = await res.json();

        const depositEvents = (json.deposit ?? []) as ApiDepositEvent[];
        for (const event of depositEvents) {
          event.coinType = normalizeStructTag(event.coinType);
        }

        const depositsSinceDialogStart = depositEvents.filter(
          (depositEvent) =>
            depositEvent.timestamp >
            FIRST_DEPOSIT_DIALOG_START_DATE.getTime() / 1000,
        ).length;

        if (depositsSinceDialogStart <= 1) setIsFirstDepositDialogOpen(true);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [justDeposited, obligation, setIsFirstDepositDialogOpen]);

  // Balance
  const balance = getBalance(reserve.coinType);

  // Position
  const depositPosition = obligation?.deposits?.find(
    (d) => d.coinType === reserve.coinType,
  );
  const borrowPosition = obligation?.borrows?.find(
    (b) => b.coinType === reserve.coinType,
  );
  const positionAmount =
    (side === Side.DEPOSIT
      ? depositPosition?.depositedAmount
      : borrowPosition?.borrowedAmount) ?? new BigNumber(0);

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  const [useMaxAmount, setUseMaxAmount] = useState<boolean>(false);
  const maxAmount = getMaxValue();

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
          Math.min(decimals.length, reserve.mintDecimals),
        );
        formattedValue = `${integersFormatted}.${decimalsFormatted}`;
      }

      setValue(formattedValue);
    },
    [reserve.mintDecimals],
  );

  const onValueChange = (_value: string) => {
    if (useMaxAmount) setUseMaxAmount(false);
    formatAndSetValue(_value);
  };

  const useMaxValueWrapper = () => {
    setUseMaxAmount(true);
    formatAndSetValue(
      maxAmount.toFixed(reserve.mintDecimals, BigNumber.ROUND_DOWN),
    );
  };

  useEffect(() => {
    // If user has specified intent to use max amount, we continue this intent
    // even if the max value updates
    if (useMaxAmount)
      formatAndSetValue(
        maxAmount.toFixed(reserve.mintDecimals, BigNumber.ROUND_DOWN),
      );
  }, [useMaxAmount, maxAmount, formatAndSetValue, reserve.mintDecimals]);

  // Utilization
  const newObligation =
    obligation && new BigNumber(value || 0).gt(0)
      ? {
          ...obligation,
          ...(getNewBorrowUtilizationCalculations(new BigNumber(value || 0)) ??
            {}),
        }
      : undefined;

  // Borrow fee
  const borrowFee = new BigNumber(value || 0)
    .times(reserve.config.borrowFeeBps)
    .div(10000);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting) return { isDisabled: true, isLoading: true };

    if (
      getSubmitButtonNoValueState !== undefined &&
      getSubmitButtonNoValueState() !== undefined
    )
      return getSubmitButtonNoValueState() as SubmitButtonState;

    if (value === "") return { isDisabled: true, title: "Enter an amount" };
    if (new BigNumber(value).lt(0))
      return { isDisabled: true, title: "Enter a +ve amount" };
    if (new BigNumber(value).eq(0) && !(useMaxAmount && maxAmount.gt(0)))
      return { isDisabled: true, title: "Enter a non-zero amount" };

    if (getSubmitButtonState(new BigNumber(value)))
      return getSubmitButtonState(new BigNumber(value)) as SubmitButtonState;

    return {
      title: `${capitalize(action)} ${formatToken(new BigNumber(value), {
        dp: reserve.mintDecimals,
        trimTrailingZeros: true,
      })} ${reserve.token.symbol}`,
    };
  })();

  const onSubmitClick = async () => {
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    let submitAmount = new BigNumber(value)
      .times(10 ** reserve.mintDecimals)
      .integerValue(BigNumber.ROUND_DOWN)
      .toString();

    switch (action) {
      case Action.DEPOSIT: {
        break;
      }
      case Action.WITHDRAW: {
        if (!depositPosition) return;

        // TODO: Remove workaround for DMC, FUD, and HIPPO
        if (
          useMaxAmount &&
          reserve.coinType !==
            "0x4c981f3ff786cdb9e514da897ab8a953647dae2ace9679e8358eec1e3e8871ac::dmc::DMC" &&
          reserve.coinType !== NORMALIZED_FUD_COINTYPE &&
          reserve.coinType !== NORMALIZED_HIPPO_COINTYPE
        )
          submitAmount = MAX_U64.toString();
        else
          submitAmount = BigNumber.min(
            new BigNumber(submitAmount)
              .div(reserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP),
            depositPosition.depositedCtokenAmount,
          ).toString();
        break;
      }
      case Action.BORROW: {
        if (useMaxAmount) submitAmount = MAX_U64.toString();
        break;
      }
      case Action.REPAY: {
        if (useMaxAmount) {
          const threeMinsBorrowAprPercent = reserve.borrowAprPercent
            .div(MS_PER_YEAR)
            .times(3 * 60 * 1000);

          submitAmount = BigNumber.min(
            balance.minus(
              isSui(reserve.coinType) ? MAX_BALANCE_SUI_SUBTRACTED_AMOUNT : 0,
            ),
            new BigNumber(value).times(
              new BigNumber(1).plus(threeMinsBorrowAprPercent.div(100)),
            ),
          )
            .times(10 ** reserve.mintDecimals)
            .integerValue(BigNumber.ROUND_UP)
            .toString();
        }
        break;
      }
      default: {
        break;
      }
    }

    try {
      const res = await submit(reserve.coinType, submitAmount);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(
        res,
        address!,
        reserve.token,
        [Action.DEPOSIT, Action.REPAY].includes(action) ? -1 : 1,
      );

      toast.success(
        [
          capitalize(actionPastTense),
          balanceChange !== undefined
            ? formatToken(balanceChange, {
                dp: reserve.mintDecimals,
                trimTrailingZeros: true,
              })
            : null,
          reserve.token.symbol,
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
      setUseMaxAmount(false);
      setValue("");

      if (action === Action.DEPOSIT)
        setTimeout(() => setJustDeposited(true), 1000);
    } catch (err) {
      showErrorToast(
        `Failed to ${action.toLowerCase()}`,
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
      refresh();

      closeLedgerHashDialog();
    }
  };

  return (
    <>
      <div className="relative flex w-full flex-col">
        <div className="relative z-[2] w-full">
          <ActionsModalInput
            ref={inputRef}
            value={value}
            onChange={onValueChange}
            reserve={reserve}
            action={action}
            useMaxAmount={useMaxAmount}
            onMaxClick={useMaxValueWrapper}
          />
        </div>

        <div className="relative z-[1] -mt-2 flex w-full flex-row flex-wrap justify-between gap-x-2 gap-y-1 rounded-b-md bg-primary/25 px-3 pb-2 pt-4">
          <div
            className={cn(
              "flex flex-row items-center gap-1.5",
              [Action.DEPOSIT].includes(action) && "cursor-pointer",
            )}
            onClick={
              [Action.DEPOSIT].includes(action) ? useMaxValueWrapper : undefined
            }
          >
            <Wallet className="h-3 w-3 text-foreground" />
            <Tooltip
              title={
                balance.gt(0)
                  ? `${formatToken(balance, { dp: reserve.mintDecimals })} ${reserve.token.symbol}`
                  : undefined
              }
            >
              <TBody className="text-xs">
                {formatToken(balance, { exact: false })} {reserve.token.symbol}
              </TBody>
            </Tooltip>
          </div>

          <div className="flex flex-row items-center gap-1.5">
            {side === Side.DEPOSIT ? (
              <Download className="h-3 w-3 text-foreground" />
            ) : (
              <Upload className="h-3 w-3 text-foreground" />
            )}
            <Tooltip
              title={
                positionAmount.gt(0)
                  ? `${formatToken(positionAmount, { dp: reserve.mintDecimals })} ${reserve.token.symbol}`
                  : undefined
              }
            >
              <TBody className="text-xs">
                {formatToken(positionAmount, { exact: false })}{" "}
                {reserve.token.symbol}
              </TBody>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="-m-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:pb-6">
        <div
          className="flex min-h-[116px] flex-col gap-3"
          style={{ "--bg-color": "hsl(var(--popover))" } as CSSProperties}
        >
          <LabelWithValue
            label="Price"
            value={
              !TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(reserve.coinType)
                ? formatPrice(reserve.price)
                : "--"
            }
            horizontal
          />
          <LabelWithValue
            label={`${capitalize(side)} APR`}
            customChild={
              <AprWithRewardsBreakdown
                side={side}
                reserve={reserve}
                action={action}
                changeAmount={value === "" ? undefined : new BigNumber(value)}
              />
            }
            horizontal
            value="0"
          />
          {[Action.DEPOSIT, Action.WITHDRAW].includes(action) && (
            <YourBorrowLimitlabel
              obligation={obligation}
              newObligation={newObligation}
            />
          )}
          <YourUtilizationLabel
            obligation={obligation}
            newObligation={newObligation}
            noUtilizationBar
          />
          {action === Action.BORROW && (
            <LabelWithValue
              label="Borrow fee"
              value={`${formatToken(borrowFee)} ${reserve.token.symbol}`}
              horizontal
            />
          )}
        </div>

        {!md && isMoreParametersOpen && (
          <>
            <Separator />
            <ParametersPanel side={side} reserve={reserve} />
          </>
        )}
      </div>

      <div className="flex w-full flex-col gap-3">
        {!md && (
          <Collapsible
            open={isMoreParametersOpen}
            onOpenChange={setIsMoreParametersOpen}
            closedTitle="More parameters"
            openTitle="Less parameters"
            hasSeparator
          />
        )}

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
            {submitButtonState.description && (
              <span className="mt-0.5 block font-sans text-xs normal-case">
                {submitButtonState.description}
              </span>
            )}
          </Button>

          {getSubmitWarningMessages &&
            getSubmitWarningMessages().length > 0 &&
            getSubmitWarningMessages().map((warningMessage) => (
              <TLabelSans key={warningMessage} className="text-warning">
                <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                {warningMessage}
              </TLabelSans>
            ))}
        </div>
      </div>
    </>
  );
}
