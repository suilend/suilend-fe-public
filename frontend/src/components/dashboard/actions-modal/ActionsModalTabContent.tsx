import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { capitalize } from "lodash";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP,
  SUI_GAS_MIN,
  isFud,
  isSui,
} from "@suilend/frontend-sui";
import useIsTouchscreen from "@suilend/frontend-sui/hooks/useIsTouchscreen";
import { maxU64 } from "@suilend/sdk/constants";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Action, ApiDepositEvent, Side } from "@suilend/sdk/types";

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
import { Separator } from "@/components/ui/separator";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useWalletContext } from "@/contexts/WalletContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import {
  FIRST_DEPOSIT_DIALOG_START_DATE,
  TX_TOAST_DURATION,
} from "@/lib/constants";
import { EventType } from "@/lib/events";
import {
  formatInteger,
  formatPercent,
  formatPrice,
  formatToken,
  formatUsd,
} from "@/lib/format";
import { API_URL } from "@/lib/navigation";
import { getBalanceChange } from "@/lib/transactions";
import { cn } from "@/lib/utils";

export type SubmitButtonState = {
  isLoading?: boolean;
  isDisabled?: boolean;
  title?: string;
  description?: string;
};

interface ActionsModalTabContentProps {
  side: Side;
  reserve: ParsedReserve;
  action: Action;
  actionPastTense: string;
  getMaxValue: () => BigNumber;
  getNewCalculations: (value: string) => {
    newBorrowLimitUsd: BigNumber | null;
    newBorrowUtilization: BigNumber | null;
  };
  getSubmitButtonNoValueState?: () => SubmitButtonState | undefined;
  getSubmitButtonState: (value: string) => SubmitButtonState | undefined;
  getSubmitWarningMessages?: () => string[];
  submit: ActionSignature;
}

export default function ActionsModalTabContent({
  side,
  reserve,
  action,
  actionPastTense,
  getMaxValue,
  getNewCalculations,
  getSubmitButtonNoValueState,
  getSubmitButtonState,
  getSubmitWarningMessages,
  submit,
}: ActionsModalTabContentProps) {
  const { address } = useWalletContext();
  const { refreshData, explorer, obligation, ...restAppContext } =
    useAppContext();
  const data = restAppContext.data as AppData;
  const { setIsFirstDepositDialogOpen } = useDashboardContext();
  const { isMoreParametersOpen, setIsMoreParametersOpen } =
    useActionsModalContext();

  const { md } = useBreakpoint();
  const isTouchscreen = useIsTouchscreen();

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
  const balance =
    data.coinBalancesMap[reserve.coinType]?.balance ?? new BigNumber(0);

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

  const { newBorrowLimitUsd, newBorrowUtilization } = getNewCalculations(value);

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

    if (getSubmitButtonState(value) !== undefined)
      return getSubmitButtonState(value) as SubmitButtonState;

    return {
      title: `${capitalize(action)} ${formatToken(new BigNumber(value), {
        dp: reserve.mintDecimals,
        trimTrailingZeros: true,
      })} ${reserve.symbol}`,
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

        // TODO: Remove workaround for FUD
        if (useMaxAmount && !isFud(reserve.coinType))
          submitAmount = maxU64.toString();
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
        if (useMaxAmount) submitAmount = maxU64.toString();
        break;
      }
      case Action.REPAY: {
        if (useMaxAmount)
          submitAmount = balance
            .minus(isSui(reserve.coinType) ? SUI_GAS_MIN : 0)
            .times(10 ** reserve.mintDecimals)
            .toString();

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
        reserve.coinType,
        reserve.mintDecimals,
        [Action.DEPOSIT, Action.REPAY].includes(action) ? -1 : 1,
      );
      const balanceChangeFormatted = formatToken(
        balanceChange !== undefined ? balanceChange : new BigNumber(value),
        { dp: reserve.mintDecimals, trimTrailingZeros: true },
      );

      toast.success(
        `${capitalize(actionPastTense)} ${balanceChangeFormatted} ${reserve.symbol}`,
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
      toast.error(`Failed to ${action.toLowerCase()}`, {
        description: (err as Error)?.message || "An unknown error occurred",
        duration: TX_TOAST_DURATION,
      });
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
      await refreshData();
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
              "flex flex-row items-center gap-2",
              [Action.DEPOSIT].includes(action) && "cursor-pointer",
            )}
            onClick={
              [Action.DEPOSIT].includes(action) ? useMaxValueWrapper : undefined
            }
          >
            <TLabelSans>Balance</TLabelSans>
            <Tooltip
              title={
                !isTouchscreen && balance.gt(0)
                  ? `${formatToken(balance, { dp: reserve.mintDecimals })} ${reserve.symbol}`
                  : undefined
              }
            >
              <TBody className="text-xs">
                {formatToken(balance, { exact: false })} {reserve.symbol}
              </TBody>
            </Tooltip>
          </div>

          <div className="flex flex-row items-center gap-2">
            <TLabelSans>
              {side === Side.DEPOSIT ? "Deposited" : "Borrowed"}
            </TLabelSans>
            <Tooltip
              title={
                !isTouchscreen && positionAmount.gt(0)
                  ? `${formatToken(positionAmount, { dp: reserve.mintDecimals })} ${reserve.symbol}`
                  : undefined
              }
            >
              <TBody className="text-xs">
                {formatToken(positionAmount, { exact: false })} {reserve.symbol}
              </TBody>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="-m-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 md:pb-6">
        <div
          className="flex flex-col gap-3"
          style={{ "--bg-color": "hsl(var(--popover))" } as CSSProperties}
        >
          <LabelWithValue
            label="Price"
            value={
              reserve.priceIdentifier !==
              COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP[reserve.coinType]
                ?.priceIdentifier
                ? "--"
                : formatPrice(reserve.price)
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
          <LabelWithValue
            label="Your borrow limit"
            value={
              !obligation
                ? "N/A"
                : newBorrowLimitUsd
                  ? `${formatUsd(obligation.minPriceBorrowLimitUsd)} → ${formatUsd(newBorrowLimitUsd)}`
                  : formatUsd(obligation.minPriceBorrowLimitUsd)
            }
            horizontal
          />
          <LabelWithValue
            label="Your utilization"
            value={
              !obligation
                ? "N/A"
                : newBorrowUtilization
                  ? `${formatPercent(obligation.weightedConservativeBorrowUtilizationPercent)} → ${formatPercent(newBorrowUtilization.times(100))}`
                  : formatPercent(
                      obligation.weightedConservativeBorrowUtilizationPercent,
                    )
            }
            horizontal
          />
          {action === Action.BORROW ? (
            <LabelWithValue
              label="Borrow fee"
              value={`${formatToken(borrowFee)} ${reserve.symbol}`}
              horizontal
            />
          ) : (
            // Placeholder so the UI doesn't move when switching tabs
            <div className="h-5 max-md:hidden" />
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
            <div key={warningMessage} className="rounded-md bg-warning/10 p-2">
              <TLabelSans className="text-warning">
                <span className="mr-2 font-medium">
                  <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                  Warning
                </span>
                {warningMessage}
              </TLabelSans>
            </div>
          ))}
      </div>
    </>
  );
}

// Note you cannot borrow other assets in this account when borrowing MEW.
