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
import * as DialogPrimitive from "@radix-ui/react-dialog";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { ChevronLeft, ChevronRight, Download, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import {
  LENDING_MARKET_ID,
  LST_DECIMALS,
  ParsedObligation,
  STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP,
  StrategyDeposit,
  StrategyWithdraw,
  strategyAdjustTx as _adjustTx,
  strategyDepositAdjustWithdrawTx as _depositAdjustWithdrawTx,
  strategyDepositAndLoopToExposureTx as _depositAndLoopToExposureTx,
  strategyWithdrawTx as _withdrawTx,
  addOrInsertStrategyDeposit,
  getReserveSafeDepositLimit,
} from "@suilend/sdk";
import {
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import {
  formatInteger,
  formatList,
  formatNumber,
  formatPercent,
  formatToken,
  formatUsd,
  getToken,
  isSui,
} from "@suilend/sui-fe";
import {
  shallowPushQuery,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Collapsible from "@/components/shared/Collapsible";
import Dialog from "@/components/shared/Dialog";
import FromToArrow from "@/components/shared/FromToArrow";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Spinner from "@/components/shared/Spinner";
import Tabs from "@/components/shared/Tabs";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import VaultDialogParametersPanel from "./VaultDialogParametersPanel";
import EarnHeader from "@/components/strategies/EarnHeader";
import VaultInput from "@/components/strategies/VaultInput";
import { Separator } from "@/components/ui/separator";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ParsedVault } from "@/fetchers/parseVault";
import { QueryParams } from "./LstStrategyDialog";
import { MAX_BALANCE_SUI_SUBTRACTED_AMOUNT, TX_TOAST_DURATION } from "@/lib/constants";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useVaultContext } from "@/contexts/VaultContext";
import TextLink from "../shared/TextLink";

export enum Tab {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
}

interface VaultDialogProps extends PropsWithChildren {
  vault: ParsedVault;
}

export default function VaultDialog({
  vault,
  children,
}: VaultDialogProps) {
  const { explorer } = useSettingsContext();
  const router = useRouter();
  const { allAppData } = useLoadedAppContext();
  const { depositIntoVault, withdrawFromVault } = useVaultContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const appDataMainMarket = allAppData.allLendingMarketData[vault.pricingLendingMarketId ?? LENDING_MARKET_ID];
  const queryParams = useMemo(
    () => ({
      [QueryParams.STRATEGY_NAME]: router.query[QueryParams.STRATEGY_NAME] as
        | string
        | undefined,
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    }),
    [router.query],
  );

  const { address } = useWalletContext();
  const { getBalance } = useLoadedUserContext();
  const [value, setValue] = useState<string>("");

  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,
  } = useLoadedLstStrategyContext();

  const MoreDetailsIcon = isMoreDetailsOpen ? ChevronLeft : ChevronRight;

  const { md } = useBreakpoint();

  // Open
  const isOpen = useMemo(
    () => (queryParams[QueryParams.STRATEGY_NAME] === vault?.metadata?.queryParam ),
    [queryParams, vault?.metadata?.queryParam],
  );

  const close = useCallback(() => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[QueryParams.STRATEGY_NAME];
    shallowPushQuery(router, restQuery);
  }, [router]);

  const coinBalanceForReserve = getBalance(vault.baseCoinType);
  // Obligation
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

  // Value - Max
  const getMaxCalculations = useCallback(
    () => {
      if (selectedTab === Tab.DEPOSIT) {

        const result = [
          {
            reason: `Insufficient ${vault.baseCoinMetadata?.symbol}`,
            isDisabled: true,
            value: coinBalanceForReserve,
          }
        ];
        if (isSui(vault.baseCoinType))
          result.push({
            reason: `${MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
            isDisabled: true,
            value: coinBalanceForReserve.minus(MAX_BALANCE_SUI_SUBTRACTED_AMOUNT),
          });
    
        return result;
      } else {
        const result = [
          {
            reason: "Withdraws cannot exceed deposits",
            isDisabled: true,
            value: vault.userSharesBalance,
          },
          {
            reason: `Insufficient liquidity to withdraw`,
            isDisabled: true,
            value: vault.tvl,
          },
        ];
    
        return result;
      }
    },
    [
      vault.userSharesBalance,
      vault.undeployedAmount,
      coinBalanceForReserve,
      isSui(vault.baseCoinType),
    ],
  );

  const deposit = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;
    setIsSubmitting(true);
    try {
    const res = await depositIntoVault({
        vault,
        amount: value,
      });

      const txUrl = explorer.buildTxUrl(res.digest);
      toast.success("Deposited into vault", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (error: any) {
      toast.error(`Failed to deposit into vault: ${error.message}`, {
        duration: TX_TOAST_DURATION,
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [vault, value, address, explorer]);

  const withdraw = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;
    setIsSubmitting(true);
    try {
      const res = await withdrawFromVault({
        vault,
        amount: value,
        useMaxAmount,
      });
      const txUrl = explorer.buildTxUrl(res.digest);
      toast.success("Withdrew from vault", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (error: any) {
      toast.error(`Failed to withdraw from vault: ${error.message}`, {
        duration: TX_TOAST_DURATION,
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  }, [vault, value, address, explorer, withdrawFromVault]);

  const [useMaxAmount, setUseMaxAmount] = useState<boolean>(false);

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
          Math.min(decimals.length, vault.baseCoinMetadata?.decimals ?? 0),
        );
        formattedValue = `${integersFormatted}.${decimalsFormatted}`;
      }

      setValue(formattedValue);
    },
    [vault.baseCoinMetadata?.decimals],
  );

  const onValueChange = (_value: string) => {
    if (useMaxAmount) setUseMaxAmount(false);
    formatAndSetValue(_value);
  };

  const getMaxAmount = useCallback(
    () => {
      const maxCalculations = getMaxCalculations();

        return BigNumber.max(
          new BigNumber(0),
          BigNumber.min(...maxCalculations.map((calc) => calc.value)),
        );
    },
    [getMaxCalculations],
  );

  const useMaxValueWrapper = () => {
    setUseMaxAmount(true);
    formatAndSetValue(
      getMaxAmount().toFixed(
        vault.baseCoinMetadata?.decimals ?? 0,
        BigNumber.ROUND_DOWN,
      ),
    );
  };

  useEffect(() => {
    // If user has specified intent to use max amount, we continue this intent
    // even if the max value updates
    if (useMaxAmount)
      formatAndSetValue(
        getMaxAmount().toFixed(
          vault.baseCoinMetadata?.decimals ?? 0,
          BigNumber.ROUND_DOWN,
        ),
      );
  }, [
    useMaxAmount,
    formatAndSetValue,
    getMaxAmount,
    vault.baseCoinMetadata?.decimals ?? 0,
  ]);

  // Stats - APR
  const aprPercent = vault.apr;

  const getSubmitButtonState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
        const maxCalculations = getMaxCalculations();

      for (const calc of maxCalculations) {
        if (new BigNumber(value).gt(calc.value))
          return { isDisabled: calc.isDisabled, title: calc.reason };
      }

      return undefined;
    };
  }

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
    }

    if (getSubmitButtonState())
      return getSubmitButtonState() as SubmitButtonState;

    return {
      title:
        selectedTab === Tab.DEPOSIT
          ? `Deposit ${formatToken(new BigNumber(value), {
              dp: vault.baseCoinMetadata?.decimals ?? 0,
              trimTrailingZeros: true,
            })} ${vault.baseCoinMetadata?.symbol}`
          : selectedTab === Tab.WITHDRAW
            ? `Withdraw ${formatToken(new BigNumber(value), {
                dp: vault.baseCoinMetadata?.decimals ?? 0,
                trimTrailingZeros: true,
              })} ${vault.baseCoinMetadata?.symbol}`
              : "--", // Should not happen
    };
  })();

  return (
    <Dialog
      rootProps={{
        open: isOpen,
        onOpenChange: (open) => {
          if (!open) close();
        },
      }}
      trigger={children}
      dialogContentProps={{ className: "md:inset-x-10" }}
      dialogContentInnerClassName="max-w-max"
      dialogContentInnerChildrenWrapperClassName="pt-4"
      contentInnerDecorator={
        // More parameters
        <div
          className="absolute -right-[calc(1px+40px)] top-1/2 -translate-y-1/2 rounded-r-md bg-popover max-md:hidden"
          style={{ writingMode: "vertical-rl" }}
        >
          <Button
            className="h-fit w-10 rounded-l-none rounded-r-md px-0 py-3"
            labelClassName="uppercase"
            endIcon={<MoreDetailsIcon className="h-4 w-4" />}
            variant="secondary"
            onClick={() => setIsMoreDetailsOpen((o) => !o)}
          >
            More details
          </Button>
        </div>
      }
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
        <div
          className="flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch"
        >
          <div className="flex h-full w-full max-w-[28rem] flex-col gap-4 md:h-auto md:w-[28rem]">
            {/* Amount */}
            {(selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) && (
              <div className="relative flex w-full flex-col">
                <div className="relative z-[2] w-full">
                  <VaultInput
                    ref={inputRef}
                    value={value}
                    onChange={onValueChange}
                    tab={selectedTab}
                    reserve={appDataMainMarket.reserveMap[vault.baseCoinType]}
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
                        coinBalanceForReserve.gt(0)
                          ? `${formatToken(coinBalanceForReserve, { dp: vault.baseCoinMetadata?.decimals ?? 0 })} ${vault.baseCoinMetadata?.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(coinBalanceForReserve, {
                          exact: false,
                        })}{" "}
                        {vault.baseCoinMetadata?.symbol}
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
                        !vault.userSharesBalance.isNaN() && vault.userSharesBalance.gt(0)
                          ? `${formatToken(
                              vault.userSharesBalance,
                              { dp: vault.baseCoinMetadata?.decimals ?? 0 },
                            )} ${vault.baseCoinMetadata?.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {vault.userSharesBalance.isNaN() ? "-" : formatToken(
                          vault.userSharesBalance,
                          { exact: false },
                        )}{" "}
                        {vault.baseCoinMetadata?.symbol}
                      </TBody>
                    </Tooltip>
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
                label="Vault TVL"
                value={
                  <>
                    {formatToken(vault.tvl)}
                    {" "}{vault.baseCoinMetadata?.symbol}
                  </>
                }
                horizontal
              />
                <LabelWithValue
                  label="APR"
                  value={
                    aprPercent.isNaN() ? "-" : formatPercent(aprPercent)
                  }
                  horizontal
                />

                <LabelWithValue
                  label="Utilization"
                  value={vault.utilization.isNaN() ? "-" : formatPercent(vault.utilization.times(100), { dp: 2 })}
                  horizontal
                />

                
              {!md && isMoreDetailsOpen && (
                <>
                  <Separator />
                  <VaultDialogParametersPanel
                    vault={vault}
                  />
                </>
              )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3">
              {!md && (
                <Collapsible
                  open={isMoreDetailsOpen}
                  onOpenChange={setIsMoreDetailsOpen}
                  title="More details"
                  hasSeparator
                />
              )}

              <div className="flex w-full flex-col gap-3">
                <Button
                  className="h-auto min-h-14 w-full rounded-md py-2"
                  labelClassName="text-wrap uppercase"
                  style={{ overflowWrap: "anywhere" }}
                  disabled={submitButtonState.isDisabled}
                  onClick={selectedTab === Tab.DEPOSIT ? deposit : withdraw}
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
              </div>
            </div>

            {/* Required to get the desired modal width on <md */}
            <div className="-mt-4 h-0 w-[28rem] max-w-full" />
          </div>

          {md && isMoreDetailsOpen && (
            <div className="flex h-[440px] w-[28rem] flex-col gap-4">
              <VaultDialogParametersPanel vault={vault} />
            </div>
          )}
        </div>
      </Tabs>
    </Dialog>
  );
}
