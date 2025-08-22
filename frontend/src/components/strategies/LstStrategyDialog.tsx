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

import { Transaction, TransactionObjectInput } from "@mysten/sui/transactions";
import { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { ChevronLeft, ChevronRight, Download, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { ParsedReserve, getRewardsMap } from "@suilend/sdk";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
  createStrategyOwnerCapIfNoneExists,
  sendStrategyOwnerCapToUser,
  strategyBorrow,
  strategyClaimRewardsAndSwap,
  strategyDeposit,
  strategySwapNonBaseNonLstDepositsForLst,
  strategyWithdraw,
} from "@suilend/sdk/lib/strategyOwnerCap";
import {
  MAX_U64,
  MS_PER_YEAR,
  NORMALIZED_SUI_COINTYPE,
  TX_TOAST_DURATION,
  formatInteger,
  formatList,
  formatPercent,
  formatToken,
  formatUsd,
  getAllCoins,
  getBalanceChange,
  getToken,
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
import Collapsible from "@/components/shared/Collapsible";
import Dialog from "@/components/shared/Dialog";
import FromToArrow from "@/components/shared/FromToArrow";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Spinner from "@/components/shared/Spinner";
import Tabs from "@/components/shared/Tabs";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import LstStrategyDialogParametersPanel from "@/components/strategies/LstStrategyDialogParametersPanel";
import LstStrategyHeader from "@/components/strategies/LstStrategyHeader";
import StrategyInput from "@/components/strategies/StrategyInput";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  Deposit,
  E,
  LST_DECIMALS,
  addOrInsertDeposit,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";

const STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT = 0.15;

const getReserveSafeDepositLimit = (reserve: ParsedReserve) => {
  // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
  const tenMinsDepositAprPercent = reserve.depositAprPercent
    .div(MS_PER_YEAR)
    .times(10 * 60 * 1000);
  const safeDepositLimit = reserve.config.depositLimit.minus(
    reserve.depositedAmount.times(tenMinsDepositAprPercent.div(100)),
  );
  const safeDepositLimitUsd = reserve.config.depositLimitUsd.minus(
    reserve.depositedAmount
      .times(reserve.maxPrice)
      .times(tenMinsDepositAprPercent.div(100)),
  );

  return { safeDepositLimit, safeDepositLimitUsd };
};

export enum QueryParams {
  STRATEGY_NAME = "strategy",
  TAB = "action",
  // PARAMETERS_PANEL_TAB = "parametersPanelTab",
}

export enum Tab {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
  ADJUST = "adjust",
}

interface LstStrategyDialogProps extends PropsWithChildren {
  strategyType: StrategyType;
}

export default function LstStrategyDialog({
  strategyType,
  children,
}: LstStrategyDialogProps) {
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
    isMoreParametersOpen,
    setIsMoreParametersOpen,

    hasPosition,

    suiReserve,
    suiBorrowFeePercent,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getDefaultCurrencyReserve,

    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getUnclaimedRewardsAmount,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedLstStrategyContext();
  const MoreParametersIcon = isMoreParametersOpen ? ChevronLeft : ChevronRight;

  const { md } = useBreakpoint();

  // send.ag
  const cetusSdk = useCetusSdk();

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

  // Strategy
  const strategyInfo = useMemo(
    () => STRATEGY_TYPE_INFO_MAP[strategyType],
    [strategyType],
  );

  const minExposure = useMemo(
    () => exposureMap[strategyType].min,
    [strategyType, exposureMap],
  );
  const maxExposure = useMemo(
    () => exposureMap[strategyType].max,
    [strategyType, exposureMap],
  );
  const defaultExposure = useMemo(
    () => exposureMap[strategyType].default,
    [strategyType, exposureMap],
  );

  // LST
  const lst = useMemo(
    () => lstMap[strategyInfo.depositLstCoinType],
    [lstMap, strategyInfo.depositLstCoinType],
  );

  // Reserves
  const depositReserves = useMemo(
    () => getDepositReserves(strategyType),
    [getDepositReserves, strategyType],
  );
  const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

  // Open
  const isOpen = useMemo(
    () => queryParams[QueryParams.STRATEGY_NAME] === strategyInfo.queryParam,
    [queryParams, strategyInfo.queryParam],
  );

  const close = useCallback(() => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[QueryParams.STRATEGY_NAME];
    shallowPushQuery(router, restQuery);
  }, [router]);

  //
  //
  //

  // Obligation
  const strategyOwnerCap = userData.strategyOwnerCaps.find(
    (soc) => soc.strategyType === strategyType,
  );
  const obligation = userData.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Rewards
  const rewardsMap = getRewardsMap(
    obligation,
    userData.rewardMap,
    appData.coinMetadataMap,
  );
  const hasClaimableRewards = Object.values(rewardsMap).some(({ amount }) =>
    amount.gt(0),
  );

  // Rewards - compound
  const [isCompoundingRewards, setIsCompoundingRewards] =
    useState<boolean>(false);

  const onCompoundRewardsClick = async () => {
    if (isCompoundingRewards) return;

    setIsCompoundingRewards(true);

    try {
      if (!address) throw Error("Wallet not connected");
      if (!strategyOwnerCap || !obligation)
        throw Error("StrategyOwnerCap or Obligation not found");

      const transaction = new Transaction();
      await strategyClaimRewardsAndSwap(
        address,
        cetusSdk,
        CETUS_PARTNER_ID,
        rewardsMap,
        depositReserves.lst,
        strategyOwnerCap.id,
        !!obligation && hasPosition(obligation) ? true : false, // isDepositing (true = deposit)
        transaction,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        [
          "Compounded",
          formatList(
            Object.keys(rewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
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
    } catch (err) {
      Sentry.captureException(err);
      console.error(err);
      showErrorToast(
        [
          "Failed to compound",
          formatList(
            Object.keys(rewardsMap).map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
        ]
          .filter(Boolean)
          .join(" "),
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsCompoundingRewards(false);
      refresh();
    }
  };

  // Slider
  const [depositSliderValue, setDepositSliderValue] = useState<string>(
    defaultExposure.toFixed(1),
  );

  const [adjustSliderValue, setAdjustSliderValue] = useState<string>(
    !!obligation && hasPosition(obligation)
      ? BigNumber.min(
          maxExposure,
          getExposure(strategyType, obligation),
        ).toFixed(1)
      : defaultExposure.toFixed(1),
  );

  // Currency coinType, reserve, and balance
  const [currencyCoinType, setCurrencyCoinType] = useState<string>(
    defaultCurrencyReserve.coinType,
  );

  const currencyReserveOptions = useMemo(
    () =>
      strategyInfo.currencyCoinTypes.map((currencyCoinType) => ({
        id: currencyCoinType,
        name: appData.coinMetadataMap[currencyCoinType].symbol,
      })),
    [strategyInfo.currencyCoinTypes, appData.coinMetadataMap],
  );
  const currencyReserve = useMemo(
    () => appData.reserveMap[currencyCoinType],
    [currencyCoinType, appData.reserveMap],
  );

  const currencyReserveBalance = useMemo(
    () => getBalance(currencyCoinType),
    [currencyCoinType, getBalance],
  );

  // Stats
  // Stats - Exposure
  const exposure = useMemo(
    () =>
      !!obligation && hasPosition(obligation)
        ? getExposure(strategyType, obligation)
        : new BigNumber(depositSliderValue),
    [obligation, hasPosition, getExposure, strategyType, depositSliderValue],
  );
  const adjustExposure = useMemo(
    () => new BigNumber(adjustSliderValue),
    [adjustSliderValue],
  );

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  const getMaxDepositCalculations = useCallback(
    (_coinType: string) => {
      const _reserve = appData.reserveMap[_coinType];

      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const { safeDepositLimit, safeDepositLimitUsd } =
        getReserveSafeDepositLimit(depositReserves.lst);

      // Calculate minimum available amount (100 MIST equivalent) and borrow fee
      const borrowMinAvailableAmount = new BigNumber(100).div(
        10 ** suiReserve.mintDecimals,
      );
      const borrowFee = suiReserve.config.borrowFeeBps / 10000;

      // Factor
      const depositFactor = (
        isSui(_reserve.coinType) ? lst.lstToSuiExchangeRate : new BigNumber(1)
      ).times(exposure); // More restrictive than necessary
      const borrowFactor = (
        isSui(_reserve.coinType) ? new BigNumber(1) : lst.suiToLstExchangeRate
      ).times(exposure.minus(1)); // More restrictive than necessary

      const result = [
        // Balance
        {
          reason: `Insufficient ${_reserve.token.symbol}`,
          isDisabled: true,
          value: getBalance(_reserve.coinType),
        },
        ...(isSui(_reserve.coinType)
          ? [
              {
                reason: `${STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
                isDisabled: true,
                value: getBalance(_reserve.coinType).minus(
                  STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
                ),
              },
            ]
          : []),

        // Deposit
        {
          reason: `Exceeds ${depositReserves.lst.token.symbol} deposit limit`,
          isDisabled: true,
          value: BigNumber.max(
            safeDepositLimit.minus(depositReserves.lst.depositedAmount),
            0,
          ).div(depositFactor),
        },
        {
          reason: `Exceeds ${depositReserves.lst.token.symbol} USD deposit limit`,
          isDisabled: true,
          value: BigNumber.max(
            safeDepositLimitUsd
              .minus(
                depositReserves.lst.depositedAmount.times(
                  depositReserves.lst.maxPrice,
                ),
              )
              .div(depositReserves.lst.maxPrice),
            0,
          ).div(depositFactor),
        },

        // Borrow
        ...(exposure.gt(1)
          ? [
              {
                reason: `Insufficient ${suiReserve.token.symbol} liquidity to borrow`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.availableAmount
                    .minus(borrowMinAvailableAmount)
                    .div(1 + borrowFee),
                ).div(borrowFactor),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimit
                    .minus(suiReserve.borrowedAmount)
                    .div(1 + borrowFee),
                ).div(borrowFactor),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} USD borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimitUsd
                    .minus(suiReserve.borrowedAmount.times(suiReserve.price))
                    .div(suiReserve.price)
                    .div(1 + borrowFee),
                ).div(borrowFactor),
              },
              // "Borrows cannot exceed borrow limit" is not relevant here
              {
                reason: "Outflow rate limit surpassed",
                isDisabled: true,
                value: new BigNumber(
                  appData.lendingMarket.rateLimiter.remainingOutflow
                    .div(suiReserve.maxPrice)
                    .div(suiReserve.config.borrowWeightBps.div(10000))
                    .div(1 + borrowFee),
                ).div(borrowFactor),
              },
              // "IKA max utilization limit" is not relevant here
            ]
          : []),
      ];
      console.log(
        "[getMaxDepositCalculations] result:",
        JSON.stringify(result, null, 2),
      );

      return result;
    },
    [
      appData.reserveMap,
      depositReserves.lst,
      suiReserve,
      lst.lstToSuiExchangeRate,
      exposure,
      lst.suiToLstExchangeRate,
      getBalance,
      appData.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );
  const getMaxWithdrawCalculations = useCallback(
    (_coinType: string) => {
      const _reserve = appData.reserveMap[_coinType];

      // Calculate minimum available amount (100 MIST equivalent)
      const depositMinAvailableAmount = new BigNumber(100).div(
        10 ** depositReserves.lst.mintDecimals,
      );

      // Factor
      const withdrawFactor = (
        isSui(_reserve.coinType) ? lst.lstToSuiExchangeRate : new BigNumber(1)
      ).times(exposure); // More restrictive than necessary
      const repayFactor = (
        isSui(_reserve.coinType) ? new BigNumber(1) : lst.suiToLstExchangeRate
      ).times(exposure.minus(1)); // More restrictive than necessary

      const result = [
        // Balance
        {
          reason: "Withdraws cannot exceed deposits",
          isDisabled: true,
          value: getTvlAmount(strategyType, obligation).times(
            isSui(_reserve.coinType) ? 1 : lst.suiToLstExchangeRate,
          ),
        },

        // Withdraw
        {
          reason: "Insufficient liquidity to withdraw",
          isDisabled: true,
          value: new BigNumber(
            depositReserves.lst.availableAmount.minus(
              depositMinAvailableAmount,
            ),
          ).div(withdrawFactor),
        },
        {
          reason: "Outflow rate limit surpassed",
          isDisabled: true,
          value: new BigNumber(
            appData.lendingMarket.rateLimiter.remainingOutflow.div(
              depositReserves.lst.maxPrice,
            ),
          ).div(withdrawFactor),
        },
        // "Withdraw is unhealthy" is not relevant here
      ];
      console.log(
        "[getMaxWithdrawCalculations] result:",
        JSON.stringify(result, null, 2),
      );

      return result;
    },
    [
      appData.reserveMap,
      depositReserves.lst,
      lst.lstToSuiExchangeRate,
      exposure,
      lst.suiToLstExchangeRate,
      getTvlAmount,
      strategyType,
      obligation,
      appData.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );
  const getMaxAdjustUpCalculations = useCallback(
    (targetExposure: BigNumber) => {
      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const { safeDepositLimit, safeDepositLimitUsd } =
        getReserveSafeDepositLimit(depositReserves.lst);

      // Calculate minimum available amount (100 MIST equivalent) and borrow fee
      const borrowMinAvailableAmount = new BigNumber(100).div(
        10 ** suiReserve.mintDecimals,
      );
      const borrowFee = suiReserve.config.borrowFeeBps / 10000;

      const result: {
        deposit: { reason: string; isDisabled: boolean; value: BigNumber }[];
        borrow: { reason: string; isDisabled: boolean; value: BigNumber }[];
      } = {
        // Deposit
        deposit: [
          {
            reason: `Exceeds ${depositReserves.lst.token.symbol} deposit limit`,
            isDisabled: true,
            value: BigNumber.max(
              safeDepositLimit.minus(depositReserves.lst.depositedAmount),
              0,
            ),
          },
          {
            reason: `Exceeds ${depositReserves.lst.token.symbol} USD deposit limit`,
            isDisabled: true,
            value: BigNumber.max(
              safeDepositLimitUsd
                .minus(
                  depositReserves.lst.depositedAmount.times(
                    depositReserves.lst.maxPrice,
                  ),
                )
                .div(depositReserves.lst.maxPrice),
              0,
            ),
          },
        ],

        // Borrow
        borrow: targetExposure.gt(1)
          ? [
              {
                reason: `Insufficient ${suiReserve.token.symbol} liquidity to borrow`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.availableAmount
                    .minus(borrowMinAvailableAmount)
                    .div(1 + borrowFee),
                ),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimit
                    .minus(suiReserve.borrowedAmount)
                    .div(1 + borrowFee),
                ),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} USD borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimitUsd
                    .minus(suiReserve.borrowedAmount.times(suiReserve.price))
                    .div(suiReserve.price)
                    .div(1 + borrowFee),
                ),
              },
              // "Borrows cannot exceed borrow limit" is not relevant here
              {
                reason: "Outflow rate limit surpassed",
                isDisabled: true,
                value: new BigNumber(
                  appData.lendingMarket.rateLimiter.remainingOutflow
                    .div(suiReserve.maxPrice)
                    .div(suiReserve.config.borrowWeightBps.div(10000))
                    .div(1 + borrowFee),
                ),
              },
              // "IKA max utilization limit" is not relevant here
            ]
          : [],
      };
      console.log(
        "[getMaxAdjustUpCalculations] result:",
        JSON.stringify(result, null, 2),
      );

      return result;
    },
    [
      depositReserves.lst,
      suiReserve,
      appData.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );
  const getMaxAdjustDownCalculations = useCallback(
    (targetExposure: BigNumber) => {
      // Calculate minimum available amount (100 MIST equivalent)
      const depositMinAvailableAmount = new BigNumber(100).div(
        10 ** depositReserves.lst.mintDecimals,
      );

      const result: {
        withdraw: { reason: string; isDisabled: boolean; value: BigNumber }[];
        repay: { reason: string; isDisabled: boolean; value: BigNumber }[];
      } = {
        // Withdraw
        withdraw: [
          {
            reason: "Insufficient liquidity to withdraw",
            isDisabled: true,
            value: new BigNumber(
              depositReserves.lst.availableAmount.minus(
                depositMinAvailableAmount,
              ),
            ),
          },
          {
            reason: "Outflow rate limit surpassed",
            isDisabled: true,
            value: new BigNumber(
              appData.lendingMarket.rateLimiter.remainingOutflow.div(
                depositReserves.lst.maxPrice,
              ),
            ),
          },
          // "Withdraw is unhealthy" is not relevant here
        ],
        repay: [],
      };
      console.log(
        "[getMaxAdjustDownCalculations] result:",
        JSON.stringify(result, null, 2),
      );

      return result;
    },
    [depositReserves.lst, appData.lendingMarket.rateLimiter.remainingOutflow],
  );

  const getMaxAmount = useCallback(
    (_coinType?: string) => {
      const _reserve =
        _coinType !== undefined
          ? appData.reserveMap[_coinType]
          : currencyReserve;

      if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
        const maxCalculations =
          selectedTab === Tab.DEPOSIT
            ? getMaxDepositCalculations(_reserve.coinType)
            : getMaxWithdrawCalculations(_reserve.coinType);

        return BigNumber.max(
          new BigNumber(0),
          BigNumber.min(...maxCalculations.map((calc) => calc.value)),
        );
      } else if (selectedTab === Tab.ADJUST) {
        return new BigNumber(0); // Not relevant here
      }

      return new BigNumber(0); // Should not happen
    },
    [
      appData.reserveMap,
      currencyReserve,
      selectedTab,
      getMaxDepositCalculations,
      getMaxWithdrawCalculations,
    ],
  );
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
          Math.min(decimals.length, currencyReserve.token.decimals),
        );
        formattedValue = `${integersFormatted}.${decimalsFormatted}`;
      }

      setValue(formattedValue);
    },
    [currencyReserve.token.decimals],
  );

  const onValueChange = (_value: string) => {
    if (useMaxAmount) setUseMaxAmount(false);
    formatAndSetValue(_value);
  };

  const useMaxValueWrapper = () => {
    setUseMaxAmount(true);
    formatAndSetValue(
      getMaxAmount().toFixed(
        currencyReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      ),
    );
  };

  const onCurrencyReserveChange = useCallback(
    (newCurrencyCoinType: string) => {
      const newReserve = appData.reserveMap[newCurrencyCoinType];

      setCurrencyCoinType(newCurrencyCoinType);

      if (value === "") return;
      formatAndSetValue(
        (useMaxAmount
          ? getMaxAmount(newCurrencyCoinType)
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
        getMaxAmount().toFixed(
          currencyReserve.token.decimals,
          BigNumber.ROUND_DOWN,
        ),
      );
  }, [
    useMaxAmount,
    formatAndSetValue,
    getMaxAmount,
    currencyReserve.token.decimals,
  ]);

  // Stats
  // Stats - TVL
  const tvlAmount = getTvlAmount(strategyType, obligation);

  // Stats - Health
  const healthPercent = getHealthPercent(strategyType, obligation, exposure);
  const adjustHealthPercent = getHealthPercent(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - APR
  const aprPercent = getAprPercent(strategyType, obligation, exposure);
  const adjustAprPercent = getAprPercent(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - Fees
  const depositFeesSuiAmount = useMemo(() => {
    const { suiBorrowedAmount } = simulateDepositAndLoopToExposure(
      strategyType,
      [],
      new BigNumber(0),
      { coinType: currencyReserve.coinType, amount: new BigNumber(value || 0) },
      exposure,
    );

    // TODO: Add LST mint fee (currently 0)
    const suiBorrowFeesAmount = suiBorrowedAmount.times(
      suiBorrowFeePercent.div(100),
    );

    return suiBorrowFeesAmount.decimalPlaces(
      SUI_DECIMALS,
      BigNumber.ROUND_DOWN,
    );
  }, [
    simulateDepositAndLoopToExposure,
    strategyType,
    currencyReserve.coinType,
    value,
    exposure,
    suiBorrowFeePercent,
  ]);

  const withdrawFeesSuiAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const unloopPercent = new BigNumber(
      new BigNumber(value || 0).times(
        isSui(reserve.coinType) ? 1 : lst.lstToSuiExchangeRate,
      ),
    )
      .div(getTvlSuiAmount(obligation))
      .times(100);
    const lstWithdrawnAmount = new BigNumber(
      getDepositedSuiAmount(obligation).times(lst.suiToLstExchangeRate),
    )
      .times(unloopPercent.div(100))
      .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

    // TODO: Add LST mint fee (currently 0)
    const lstRedeemFeesSuiAmount = getLstRedeemFee(
      lstReserve.coinType,
      lstWithdrawnAmount,
    );

    return lstRedeemFeesSuiAmount.decimalPlaces(
      SUI_DECIMALS,
      BigNumber.ROUND_DOWN,
    );
  }, [
    obligation,
    hasPosition,
    reserve.coinType,
    value,
    lst.lstToSuiExchangeRate,
    getTvlSuiAmount,
    getDepositedSuiAmount,
    lst.suiToLstExchangeRate,
    getLstRedeemFee,
    lstReserve.coinType,
  ]);
  const generalWithdrawFeesPercent = useMemo(() => {
    const { deposits, obligation } = simulateDeposit(
      strategyType,
      {
        coinType: strategyInfo.defaultOpenCloseCoinType,
        amount: new BigNumber(1), // Any number will do
      },
      exposure,
    );

    const unloopPercent = new BigNumber(100);
    const lstWithdrawnAmount = lstDepositedAmount.times(unloopPercent.div(100));

    // TODO: Add LST mint fee (currently 0)
    const lstRedeemFeesSuiAmount = getLstRedeemFee(
      lstReserve.coinType,
      lstWithdrawnAmount,
    );

    return lstRedeemFeesSuiAmount.div(getTvlSuiAmount(obligation)).times(100);
  }, [
    simulateDeposit,
    strategyType,
    exposure,
    getLstRedeemFee,
    lstReserve.coinType,
    getTvlSuiAmount,
  ]);

  const adjustFeesSuiAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const currentLstDepositedAmount = new BigNumber(
      getDepositedSuiAmount(obligation).times(lst.suiToLstExchangeRate),
    ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
    const currentSuiBorrowedAmount = getBorrowedSuiAmount(obligation);
    const targetExposure = adjustExposure;

    if (targetExposure.gt(exposure)) {
      const {
        lstDepositedAmount: newLstDepositedAmount,
        suiBorrowedAmount: newSuiBorrowedAmount,
      } = simulateLoopToExposure(
        strategyType,
        currentLstDepositedAmount,
        currentSuiBorrowedAmount,
        targetExposure,
      );
      const lstDepositedAmount = newLstDepositedAmount.minus(
        currentLstDepositedAmount,
      );
      const suiBorrowedAmount = newSuiBorrowedAmount.minus(
        currentSuiBorrowedAmount,
      );

      // TODO: Add LST mint fee (currently 0)
      const suiBorrowFeesAmount = new BigNumber(suiBorrowedAmount).times(
        suiBorrowFeePercent.div(100),
      );

      return suiBorrowFeesAmount.decimalPlaces(
        SUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    } else {
      const {
        lstDepositedAmount: newLstDepositedAmount,
        suiBorrowedAmount: newSuiBorrowedAmount,
      } = simulateUnloopToExposure(
        strategyType,
        currentLstDepositedAmount,
        currentSuiBorrowedAmount,
        targetExposure,
      );
      const lstWithdrawnAmount = currentLstDepositedAmount.minus(
        newLstDepositedAmount,
      );
      const suiRepaidAmount =
        currentSuiBorrowedAmount.minus(newSuiBorrowedAmount);

      // TODO: Add LST mint fee (currently 0)
      const lstRedeemFeesSuiAmount = getLstRedeemFee(
        lstReserve.coinType,
        lstWithdrawnAmount,
      );

      return lstRedeemFeesSuiAmount.decimalPlaces(
        SUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    }
  }, [
    obligation,
    hasPosition,
    getDepositedSuiAmount,
    lst.suiToLstExchangeRate,
    getBorrowedSuiAmount,
    adjustExposure,
    exposure,
    simulateLoopToExposure,
    strategyType,
    suiBorrowFeePercent,
    simulateUnloopToExposure,
    getLstRedeemFee,
    lstReserve.coinType,
  ]);

  // Submit
  const getSubmitButtonNoValueState = (): SubmitButtonState | undefined => {
    // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
    const { safeDepositLimit, safeDepositLimitUsd } =
      getReserveSafeDepositLimit(lstReserve);

    if (selectedTab === Tab.DEPOSIT) {
      // Deposit
      if (
        new BigNumber(safeDepositLimit.minus(lstReserve.depositedAmount)).lte(0)
      )
        return {
          isDisabled: true,
          title: `${lstReserve.token.symbol} deposit limit reached`,
        };
      if (
        new BigNumber(
          safeDepositLimitUsd
            .minus(lstReserve.depositedAmount.times(lstReserve.maxPrice))
            .div(lstReserve.maxPrice),
        ).lte(0)
      )
        return {
          isDisabled: true,
          title: `${lstReserve.token.symbol} USD deposit limit reached`,
        };
      // "Cannot deposit borrowed asset" is not relevant here
      // "Max ${MAX_DEPOSITS_PER_OBLIGATION} deposit positions" is not relevant here

      // Borrow
      if (exposure.gt(1)) {
        if (suiReserve.borrowedAmount.gte(suiReserve.config.borrowLimit))
          return {
            isDisabled: true,
            title: `${suiReserve.token.symbol} borrow limit reached`,
          };
        if (
          new BigNumber(suiReserve.borrowedAmount.times(suiReserve.price)).gte(
            suiReserve.config.borrowLimitUsd,
          )
        )
          return {
            isDisabled: true,
            title: `${suiReserve.token.symbol} USD borrow limit reached`,
          };
        // "Cannot borrow deposited asset" is not relevant here
        // "Max ${MAX_BORROWS_PER_OBLIGATION} borrow positions" is not relevant here

        // Isolated - not relevant here
      }
    } else if (selectedTab === Tab.WITHDRAW) {
      // N/A
    } else if (selectedTab === Tab.ADJUST) {
      if (!obligation || !hasPosition(obligation)) return undefined;

      const targetExposure = adjustExposure;
      if (targetExposure.gt(exposure)) {
        // Deposit
        if (
          new BigNumber(safeDepositLimit.minus(lstReserve.depositedAmount)).lte(
            0,
          )
        )
          return {
            isDisabled: true,
            title: `${lstReserve.token.symbol} deposit limit reached`,
          };
        if (
          new BigNumber(
            safeDepositLimitUsd
              .minus(lstReserve.depositedAmount.times(lstReserve.maxPrice))
              .div(lstReserve.maxPrice),
          ).lte(0)
        )
          return {
            isDisabled: true,
            title: `${lstReserve.token.symbol} USD deposit limit reached`,
          };
        // "Cannot deposit borrowed asset" is not relevant here
        // "Max ${MAX_DEPOSITS_PER_OBLIGATION} deposit positions" is not relevant here

        // Borrow
        if (suiReserve.borrowedAmount.gte(suiReserve.config.borrowLimit))
          return {
            isDisabled: true,
            title: `${suiReserve.token.symbol} borrow limit reached`,
          };
        if (
          new BigNumber(suiReserve.borrowedAmount.times(suiReserve.price)).gte(
            suiReserve.config.borrowLimitUsd,
          )
        )
          return {
            isDisabled: true,
            title: `${suiReserve.token.symbol} USD borrow limit reached`,
          };
        // "Cannot borrow deposited asset" is not relevant here
        // "Max ${MAX_BORROWS_PER_OBLIGATION} borrow positions" is not relevant here

        // Isolated - not relevant here
      } else {
        // N/A
      }
    }

    return undefined;
  };
  const getSubmitButtonState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      const maxCalculations =
        selectedTab === Tab.DEPOSIT
          ? getMaxDepositCalculations(currencyReserve.coinType)
          : getMaxWithdrawCalculations(currencyReserve.coinType);

      for (const calc of maxCalculations) {
        if (new BigNumber(value).gt(calc.value))
          return { isDisabled: calc.isDisabled, title: calc.reason };
      }
    } else if (selectedTab === Tab.ADJUST) {
      if (!obligation || !hasPosition(obligation)) return undefined;

      const currentLstDepositedAmount = new BigNumber(
        getDepositedSuiAmount(obligation).times(lst.suiToLstExchangeRate),
      ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const currentSuiBorrowedAmount = getBorrowedSuiAmount(obligation);
      const targetExposure = adjustExposure;

      if (targetExposure.gt(exposure)) {
        const {
          lstDepositedAmount: newLstDepositedAmount,
          suiBorrowedAmount: newSuiBorrowedAmount,
        } = simulateLoopToExposure(
          strategyType,
          currentLstDepositedAmount,
          currentSuiBorrowedAmount,
          targetExposure,
        );
        const lstDepositedAmount = newLstDepositedAmount.minus(
          currentLstDepositedAmount,
        );
        const suiBorrowedAmount = newSuiBorrowedAmount.minus(
          currentSuiBorrowedAmount,
        );

        const maxCalculations = getMaxAdjustUpCalculations(targetExposure);

        for (const calc of maxCalculations.deposit) {
          if (lstDepositedAmount.gt(calc.value))
            return { isDisabled: calc.isDisabled, title: calc.reason };
        }
        for (const calc of maxCalculations.borrow) {
          if (suiBorrowedAmount.gt(calc.value))
            return { isDisabled: calc.isDisabled, title: calc.reason };
        }
      } else {
        const {
          lstDepositedAmount: newLstDepositedAmount,
          suiBorrowedAmount: newSuiBorrowedAmount,
        } = simulateUnloopToExposure(
          strategyType,
          currentLstDepositedAmount,
          currentSuiBorrowedAmount,
          targetExposure,
        );
        const lstWithdrawnAmount = currentLstDepositedAmount.minus(
          newLstDepositedAmount,
        );
        const suiRepaidAmount =
          currentSuiBorrowedAmount.minus(newSuiBorrowedAmount);

        const maxCalculations = getMaxAdjustDownCalculations(targetExposure);

        for (const calc of maxCalculations.withdraw) {
          if (lstWithdrawnAmount.gt(calc.value))
            return { isDisabled: calc.isDisabled, title: calc.reason };
        }
        for (const calc of maxCalculations.repay) {
          if (suiRepaidAmount.gt(calc.value))
            return { isDisabled: calc.isDisabled, title: calc.reason };
        }
      }
    }

    return undefined;
  };

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting) return { isDisabled: true, isLoading: true };

    if (
      getSubmitButtonNoValueState !== undefined &&
      getSubmitButtonNoValueState() !== undefined
    )
      return getSubmitButtonNoValueState() as SubmitButtonState;

    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      if (value === "") return { isDisabled: true, title: "Enter an amount" };
      if (new BigNumber(value).lt(0))
        return { isDisabled: true, title: "Enter a +ve amount" };
      if (new BigNumber(value).eq(0))
        return { isDisabled: true, title: "Enter a non-zero amount" };

      if (healthPercent.lt(100)) {
        return {
          isDisabled: true,
          title: "Adjust leverage to 100% health",
        };
      }
    }

    if (getSubmitButtonState())
      return getSubmitButtonState() as SubmitButtonState;

    return {
      title:
        selectedTab === Tab.DEPOSIT
          ? `Deposit ${formatToken(new BigNumber(value), {
              dp: currencyReserve.token.decimals,
              trimTrailingZeros: true,
            })} ${currencyReserve.token.symbol}`
          : selectedTab === Tab.WITHDRAW
            ? `Withdraw ${formatToken(new BigNumber(value), {
                dp: currencyReserve.token.decimals,
                trimTrailingZeros: true,
              })} ${currencyReserve.token.symbol}`
            : selectedTab === Tab.ADJUST
              ? `Adjust to ${adjustExposure.toFixed(1)}x`
              : "--", // Should not happen
    };
  })();

  const loopToExposureTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    if (!address) throw Error("Wallet not connected");

    console.log(
      `[loopToExposure] args |`,
      JSON.stringify(
        {
          strategyOwnerCapId,
          deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            amount: d.amount.toFixed(20),
          })),
          suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
      );
      const pendingExposure = targetExposure.minus(exposure);
      console.log(
        `[loopToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              amount: d.amount.toFixed(20),
            })),
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
        strategyType,
        deposits,
        suiBorrowedAmount,
      )
        .times(0.98) // 2% buffer
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxLstDepositedAmount = new BigNumber(
        stepMaxSuiBorrowedAmount.minus(
          getLstMintFee(depositReserves.lst.coinType, stepMaxSuiBorrowedAmount),
        ),
      )
        .times(lst.suiToLstExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxExposure = getExposure(
        strategyType,
        getSimulatedObligation(
          strategyType,
          deposits.some((d) => d.coinType === depositReserves.lst.coinType)
            ? deposits.map((d) =>
                d.coinType === depositReserves.lst.coinType
                  ? { ...d, amount: d.amount.plus(stepMaxLstDepositedAmount) }
                  : d,
              )
            : [
                ...deposits,
                {
                  coinType: depositReserves.lst.coinType,
                  amount: stepMaxLstDepositedAmount,
                },
              ],
          suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
        ),
      ).minus(exposure);
      console.log(
        `[loopToExposure] ${i} max |`,
        JSON.stringify(
          {
            stepMaxSuiBorrowedAmount: stepMaxSuiBorrowedAmount.toFixed(20),
            stepMaxLstDepositedAmount: stepMaxLstDepositedAmount.toFixed(20),
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

      // 3) Stake borrowed SUI for LST
      const stepLstCoin = lst.client.mint(transaction, borrowedSuiCoin);

      // 4) Deposit LST
      const stepLstDepositedAmount = new BigNumber(
        stepSuiBorrowedAmount.minus(
          getLstMintFee(depositReserves.lst.coinType, stepSuiBorrowedAmount),
        ),
      )
        .times(lst.suiToLstExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxDeposit = stepLstDepositedAmount.eq(stepMaxLstDepositedAmount);
      console.log(
        `[loopToExposure] ${i} deposit |`,
        JSON.stringify(
          {
            stepLstDepositedAmount: stepLstDepositedAmount.toFixed(20),
            isMaxDeposit,
          },
          null,
          2,
        ),
      );

      strategyDeposit(
        stepLstCoin,
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        transaction,
      );
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        amount: stepLstDepositedAmount,
      });
    }

    return { deposits, suiBorrowedAmount, transaction };
  };

  const unloopToExposureTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    console.log(
      `[unloopToExposure] args |`,
      JSON.stringify(
        {
          strategyOwnerCapId,
          deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            amount: d.amount.toFixed(20),
          })),
          suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
      );
      const pendingExposure = exposure.minus(targetExposure);
      console.log(
        `[unloopToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              amount: d.amount.toFixed(20),
            })),
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
      let stepMaxLstWithdrawnAmount = getStepMaxWithdrawnAmount(
        strategyType,
        deposits,
        suiBorrowedAmount,
        depositReserves.lst.coinType,
      )
        .times(0.98) // 2% buffer
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      let stepMaxSuiRepaidAmount = new BigNumber(
        new BigNumber(
          stepMaxLstWithdrawnAmount.times(lst.lstToSuiExchangeRate),
        ).minus(
          getLstRedeemFee(
            depositReserves.lst.coinType,
            stepMaxLstWithdrawnAmount,
          ),
        ),
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      if (stepMaxSuiRepaidAmount.gt(suiBorrowedAmount)) {
        const ratio = stepMaxSuiRepaidAmount.div(suiBorrowedAmount);
        stepMaxLstWithdrawnAmount = stepMaxLstWithdrawnAmount.div(ratio);
        stepMaxSuiRepaidAmount = suiBorrowedAmount;
      }

      const stepMaxExposure = exposure.minus(
        getExposure(
          strategyType,
          getSimulatedObligation(
            strategyType,
            deposits.map((d) =>
              d.coinType === depositReserves.lst.coinType
                ? { ...d, amount: d.amount.minus(stepMaxLstWithdrawnAmount) }
                : d,
            ),
            suiBorrowedAmount.minus(stepMaxSuiRepaidAmount),
          ),
        ),
      );
      console.log(
        `[unloopToExposure] ${i} max |`,
        JSON.stringify(
          {
            stepMaxLstWithdrawnAmount: stepMaxLstWithdrawnAmount.toFixed(20),
            stepMaxSuiRepaidAmount: stepMaxSuiRepaidAmount.toFixed(20),
            stepMaxExposure: stepMaxExposure.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Withdraw LST
      const stepLstWithdrawnAmount = stepMaxLstWithdrawnAmount
        .times(BigNumber.min(1, pendingExposure.div(stepMaxExposure)))
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxWithdraw = stepLstWithdrawnAmount.eq(
        stepMaxLstWithdrawnAmount,
      );
      console.log(
        `[unloopToExposure] ${i} withdraw |`,
        JSON.stringify(
          {
            stepLstWithdrawnAmount: stepLstWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [withdrawnLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        BigInt(
          new BigNumber(
            stepLstWithdrawnAmount
              .times(10 ** LST_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(depositReserves.lst.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        amount: stepLstWithdrawnAmount.times(-1),
      });

      // 3) Unstake withdrawn LST for SUI
      const stepSuiCoin = lst.client.redeem(transaction, withdrawnLstCoin);

      // 4) Repay SUI
      const stepSuiRepaidAmount = new BigNumber(
        new BigNumber(
          stepLstWithdrawnAmount.times(lst.lstToSuiExchangeRate),
        ).minus(
          getLstRedeemFee(depositReserves.lst.coinType, stepLstWithdrawnAmount),
        ),
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
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

    return { deposits, suiBorrowedAmount, transaction };
  };

  const depositTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    deposit: Deposit,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    if (!address) throw Error("Wallet not connected");

    console.log(
      `[deposit] args |`,
      JSON.stringify(
        {
          strategyOwnerCapId,
          deposit: {
            coinType: deposit.coinType,
            amount: deposit.amount.toFixed(20),
          },
        },
        null,
        2,
      ),
    );

    let deposits = cloneDeep(_deposits);
    const suiBorrowedAmount = _suiBorrowedAmount;

    // 1) Deposit
    // 1.1) SUI
    if (isSui(deposit.coinType)) {
      const suiAmount = deposit.amount;
      const lstAmount = new BigNumber(
        suiAmount
          .minus(getLstMintFee(depositReserves.lst.coinType, suiAmount))
          .times(lst.suiToLstExchangeRate),
      ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

      // 1.1.1) Split coins
      const suiCoin = transaction.splitCoins(transaction.gas, [
        suiAmount
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      ]);

      // 1.1.2) Stake SUI for LST
      const lstCoin = lst.client.mint(transaction, suiCoin);

      // 1.1.3) Deposit LST (1x exposure)
      strategyDeposit(
        lstCoin,
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        transaction,
      );
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        amount: lstAmount,
      });
    } else if (deposit.coinType === depositReserves.lst.coinType) {
      // 1.2.1) Split coins
      const allCoinsLst = await getAllCoins(
        suiClient,
        address,
        depositReserves.lst.coinType,
      );
      const mergeCoinLst = mergeAllCoins(
        depositReserves.lst.coinType,
        transaction,
        allCoinsLst,
      );

      const lstCoin = transaction.splitCoins(
        transaction.object(mergeCoinLst.coinObjectId),
        [
          BigInt(
            deposit.amount
              .times(10 ** LST_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      );

      // 1.2.2) Deposit LST (1x exposure)
      strategyDeposit(
        lstCoin,
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        transaction,
      );
      deposits = addOrInsertDeposit(deposits, deposit);
    } else {
      const otherReserve = appData.reserveMap[deposit.coinType];

      // 1.3.1) Split coins
      const allCoinsOther = await getAllCoins(
        suiClient,
        address,
        otherReserve.coinType,
      );
      const mergeCoinOther = mergeAllCoins(
        otherReserve.coinType,
        transaction,
        allCoinsOther,
      );

      const otherCoin = transaction.splitCoins(
        transaction.object(mergeCoinOther.coinObjectId),
        [
          BigInt(
            deposit.amount
              .times(10 ** otherReserve.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      );

      // 1.3.2) Deposit other (1x exposure)
      strategyDeposit(
        otherCoin,
        otherReserve.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(otherReserve.coinType),
        transaction,
      );
      deposits = addOrInsertDeposit(deposits, deposit);
    }

    console.log(
      `[deposit] deposit |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            amount: d.amount.toFixed(20),
          })),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    return { deposits, suiBorrowedAmount, transaction };
  };

  const depositAndLoopToExposureTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    deposit: Deposit,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[depositAndLoopToExposure] args |`,
      JSON.stringify(
        {
          strategyOwnerCapId,
          deposit: {
            coinType: deposit.coinType,
            amount: deposit.amount.toFixed(20),
          },
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    const deposits = (obligation?.deposits ?? []).map((d) => ({
      coinType: d.coinType,
      amount: d.depositedAmount,
    }));
    const suiBorrowedAmount =
      (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow (SUI)

    // 1) Deposit
    const {
      deposits: newDeposits,
      suiBorrowedAmount: newSuiBorrowedAmount,
      transaction: newTransaction,
    } = await depositTx(
      strategyOwnerCapId,
      deposits,
      suiBorrowedAmount,
      deposit,
      transaction,
    );

    // 2) Loop to target exposure
    return loopToExposureTx(
      strategyOwnerCapId,
      newDeposits,
      newSuiBorrowedAmount,
      targetExposure,
      newTransaction,
    );
  };

  const withdrawTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    unloopPercent: BigNumber,
    coinType: string,
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    console.log(
      `[LstStrategyDialog] withdraw |`,
      JSON.stringify({ unloopPercent: unloopPercent.toFixed(20) }, null, 2),
    );

    // Prepare
    let lstDepositedAmount = new BigNumber(
      getDepositedSuiAmount(obligation).times(lst.suiToLstExchangeRate),
    ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
    let suiBorrowedAmount = getBorrowedSuiAmount(obligation);

    const targetLstDepositedAmount = lstDepositedAmount
      .times(new BigNumber(1).minus(unloopPercent.div(100)))
      .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
    const targetSuiBorrowedAmount = suiBorrowedAmount
      .times(new BigNumber(1).minus(unloopPercent.div(100)))
      .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[LstStrategyDialog] withdraw |`,
      JSON.stringify(
        {
          lstDepositedAmount: lstDepositedAmount.toFixed(20),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          targetLstDepositedAmount: targetLstDepositedAmount.toFixed(20),
          targetSuiBorrowedAmount: targetSuiBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      const pendingLstWithdrawAmount = lstDepositedAmount.minus(
        targetLstDepositedAmount,
      );
      const pendingSuiRepayAmount = suiBorrowedAmount.minus(
        targetSuiBorrowedAmount,
      );

      console.log(
        `[LstStrategyDialog] withdraw - ${i} start |`,
        JSON.stringify(
          {
            lstDepositedAmount: lstDepositedAmount.toFixed(20),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            pendingLstWithdrawAmount: pendingLstWithdrawAmount.toFixed(20),
            pendingSuiRepayAmount: pendingSuiRepayAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
      if (pendingLstWithdrawAmount.lte(E) && pendingSuiRepayAmount.lte(E))
        break;

      // 1.1) Max
      const stepMaxLstWithdrawnAmount = getStepMaxLstWithdrawnAmount(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      )
        .times(0.98) // 2% buffer
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxSuiRepaidAmount = new BigNumber(
        new BigNumber(
          stepMaxLstWithdrawnAmount.times(lst.lstToSuiExchangeRate),
        ).minus(
          getLstRedeemFee(lstReserve.coinType, stepMaxLstWithdrawnAmount),
        ),
      )
        .times(0.9999) // 0.01% buffer for exchange rate errors
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      console.log(
        `[LstStrategyDialog] withdraw - ${i} max |`,
        JSON.stringify(
          {
            stepMaxLstWithdrawnAmount: stepMaxLstWithdrawnAmount.toFixed(20),
            stepMaxSuiRepaidAmount: stepMaxSuiRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Withdraw LST
      const stepLstWithdrawnAmount = BigNumber.min(
        pendingLstWithdrawAmount,
        stepMaxLstWithdrawnAmount,
      );
      const isMaxWithdraw = stepLstWithdrawnAmount.eq(
        stepMaxLstWithdrawnAmount,
      );
      console.log(
        `[LstStrategyDialog] withdraw - ${i} withdraw |`,
        JSON.stringify(
          {
            stepMaxLstWithdrawnAmount: stepMaxLstWithdrawnAmount.toFixed(20),
            stepLstWithdrawnAmount: stepLstWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [withdrawnLstCoin] = strategyWithdraw(
        lstReserve.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(lstReserve.coinType),
        BigInt(
          new BigNumber(
            stepLstWithdrawnAmount
              .times(10 ** LST_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(lstReserve.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );
      lstDepositedAmount = lstDepositedAmount.minus(stepLstWithdrawnAmount);

      // 1.3) Unstake withdrawn LST for SUI
      const stepSuiCoin = lst.client.redeem(transaction, withdrawnLstCoin);

      // 1.4) Repay SUI
      const stepSuiRepaidAmount = BigNumber.min(
        pendingSuiRepayAmount,
        stepMaxSuiRepaidAmount,
      );
      const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);
      console.log(
        `[LstStrategyDialog] withdraw - ${i} repay |`,
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
      // 1.5) Stake SUI for LST
      const lstCoin = lst.client.mint(transaction, suiCoin);

      // 1.6) Transfer LST to user
      transaction.transferObjects([lstCoin], address);
    }

    return transaction;
  };

  const maxWithdrawTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    coinType: string,
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    console.log(
      `[maxWithdraw] args |`,
      JSON.stringify(
        {
          strategyOwnerCapId,
          coinType,
        },
        null,
        2,
      ),
    );

    // 1) Max withdraw
    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      console.log(`[maxWithdraw] ${i} start`);

      // 1.1) Max withdraw LST
      const [withdrawnLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        BigInt(MAX_U64.toString()),
        transaction,
      );

      // 1.2) Unstake withdrawn LST for SUI
      const stepSuiCoin = lst.client.redeem(transaction, withdrawnLstCoin);
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

    if (isSui(coinType)) {
      // 1.4) Transfer SUI to user
      transaction.transferObjects([suiCoin], address);
    } else {
      // 1.4) Stake SUI for LST
      const lstCoin = lst.client.mint(transaction, suiCoin);

      // 1.5) Transfer LST to user
      transaction.transferObjects([lstCoin], address);
    }

    // 2) Claim rewards, swap for SUI/LST, and send to user
    try {
      const txCopy = Transaction.from(transaction);
      strategyClaimRewardsAndSwap(
        address,
        cetusSdk,
        CETUS_PARTNER_ID,
        rewardsMap,
        currencyReserve,
        strategyOwnerCapId,
        false, // isDepositing (false = transfer to user)
        txCopy,
      );
      await dryRunTransaction(txCopy); // Throws error if claim+swap fails

      transaction = txCopy;
    } catch (err) {
      // Don't block user from withdrawing if claim+swap fails. Rewards can be claimed separately by the user.
      console.error(err);
    }

    return transaction;
  };

  const adjustTx = async (
    strategyOwnerCapId: TransactionObjectInput,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    console.log(
      `[adjust] args |`,
      JSON.stringify(
        {
          strategyOwnerCapId,
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    const deposits = (obligation?.deposits ?? []).map((d) => ({
      coinType: d.coinType,
      amount: d.depositedAmount,
    }));
    const suiBorrowedAmount =
      (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow (SUI)

    if (targetExposure.gt(exposure))
      return loopToExposureTx(
        strategyOwnerCapId,
        deposits,
        suiBorrowedAmount,
        targetExposure,
        transaction,
      );
    else
      return unloopToExposureTx(
        strategyOwnerCapId,
        deposits,
        suiBorrowedAmount,
        targetExposure,
        transaction,
      );
  };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (LST, SUI, and any other deposits/borrows) - required when borrowing or withdrawing
      await appData.suilendClient.refreshAll(
        transaction,
        undefined,
        Array.from(
          new Set([
            ...(strategyInfo.depositBaseCoinType
              ? [strategyInfo.depositBaseCoinType]
              : []),
            ...strategyInfo.depositLstCoinType,
            strategyInfo.borrowCoinType,
            ...(obligation?.deposits.map((deposit) => deposit.coinType) ?? []),
            ...(obligation?.borrows.map((borrow) => borrow.coinType) ?? []),
          ]),
        ),
      );

      // 2) Swap non-depositCoinTypes deposits, e.g. autoclaimed+deposited rewards (if any) for LST
      if (!!strategyOwnerCap && !!obligation)
        await strategySwapNonBaseNonLstDepositsForLst(
          strategyType,
          cetusSdk,
          CETUS_PARTNER_ID,
          obligation,
          depositReserves.lst,
          strategyOwnerCap.id,
          transaction,
        );

      if (selectedTab === Tab.DEPOSIT) {
        const { strategyOwnerCapId, didCreate } =
          createStrategyOwnerCapIfNoneExists(
            strategyType,
            strategyOwnerCap,
            transaction,
          );

        // 3) Deposit
        transaction = (
          await depositAndLoopToExposureTx(
            strategyOwnerCapId,
            {
              coinType: currencyReserve.coinType,
              amount: new BigNumber(value),
            },
            !!obligation && hasPosition(obligation)
              ? getExposure(strategyType, obligation)
              : new BigNumber(depositSliderValue),
            transaction,
          )
        ).transaction;

        // 4) Rebalance LST
        lst.client.rebalance(
          transaction,
          lst.client.liquidStakingObject.weightHookId,
        );

        if (didCreate)
          sendStrategyOwnerCapToUser(strategyOwnerCapId, address, transaction);

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeOut = getBalanceChange(
          res,
          address,
          currencyReserve.token,
          -1,
        );

        toast.success(
          [
            "Deposited",
            balanceChangeOut !== undefined
              ? formatToken(balanceChangeOut, {
                  dp: currencyReserve.token.decimals,
                  trimTrailingZeros: true,
                })
              : null,
            currencyReserve.token.symbol,
            `into ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
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
        if (!obligation || !hasPosition(obligation))
          setAdjustSliderValue(depositSliderValue);
      } else if (selectedTab === Tab.WITHDRAW) {
        if (!strategyOwnerCap || !obligation)
          throw Error("StrategyOwnerCap or Obligation not found");

        // 3) Withdraw
        const unloopPercent = new BigNumber(
          new BigNumber(value).times(
            isSui(currencyReserve.coinType) ? 1 : lst.lstToSuiExchangeRate,
          ),
        )
          .div(getTvlAmount(strategyType, obligation))
          .times(100);

        transaction = !useMaxAmount
          ? await withdrawTx(
              strategyOwnerCap.id,
              unloopPercent,
              currencyReserve.coinType,
              transaction,
            )
          : await maxWithdrawTx(
              strategyOwnerCap.id,
              currencyReserve.coinType,
              transaction,
            );

        // 4) Rebalance LST
        lst.client.rebalance(
          transaction,
          lst.client.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        const balanceChangeIn = getBalanceChange(
          res,
          address,
          currencyReserve.token,
        );

        toast.success(
          [
            "Withdrew",
            balanceChangeIn !== undefined
              ? formatToken(balanceChangeIn, {
                  dp: currencyReserve.token.decimals,
                  trimTrailingZeros: true,
                })
              : null,
            currencyReserve.token.symbol,
            `from ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
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

        // 3) Adjust
        transaction = (
          await adjustTx(
            strategyOwnerCap.id,
            new BigNumber(adjustSliderValue),
            transaction,
          )
        ).transaction;

        // 4) Rebalance LST
        lst.client.rebalance(
          transaction,
          lst.client.liquidStakingObject.weightHookId,
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
        } ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
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
            endIcon={<MoreParametersIcon className="h-4 w-4" />}
            variant="secondary"
            onClick={() => setIsMoreParametersOpen((o) => !o)}
          >
            Learn more
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
        <div className="mb-4 flex w-full flex-col gap-4 sm:h-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <LstStrategyHeader strategyType={strategyType} />

          {hasClaimableRewards && (
            <div className="flex w-max flex-row-reverse items-center gap-3 sm:flex-row">
              <div className="flex flex-row-reverse items-center gap-2 sm:flex-row">
                <TLabel>
                  {formatUsd(
                    Object.entries(rewardsMap).reduce(
                      (acc, [coinType, { amount }]) => {
                        const price =
                          appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                        return acc.plus(amount.times(price));
                      },
                      new BigNumber(0),
                    ),
                  )}
                </TLabel>
                <Tooltip
                  content={
                    <div className="flex flex-col gap-1">
                      {Object.entries(rewardsMap).map(
                        ([coinType, { amount }]) => (
                          <div
                            key={coinType}
                            className="flex flex-row items-center gap-2"
                          >
                            <TokenLogo
                              token={getToken(
                                coinType,
                                appData.coinMetadataMap[coinType],
                              )}
                              size={16}
                            />
                            <TLabelSans className="text-foreground">
                              {formatToken(amount, {
                                dp: appData.coinMetadataMap[coinType].decimals,
                              })}{" "}
                              {appData.coinMetadataMap[coinType].symbol}
                            </TLabelSans>
                          </div>
                        ),
                      )}
                    </div>
                  }
                >
                  <div className="w-max">
                    <TokenLogos
                      tokens={Object.keys(rewardsMap).map((coinType) =>
                        getToken(coinType, appData.coinMetadataMap[coinType]),
                      )}
                      size={16}
                    />
                  </div>
                </Tooltip>
              </div>

              <Button
                className="w-[134px]"
                labelClassName="uppercase"
                disabled={isCompoundingRewards}
                onClick={onCompoundRewardsClick}
              >
                {isCompoundingRewards ? (
                  <Spinner size="sm" />
                ) : (
                  <>Claim rewards</>
                )}
              </Button>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch",
            !!obligation && hasPosition(obligation)
              ? "md:min-h-[346px]"
              : "md:min-h-[406px]",
          )}
          style={{
            height: `calc(100dvh - ${8 /* Top */}px - ${1 /* Border-top */}px - ${16 /* Padding-top */}px - ${42 /* Tabs */}px - ${16 /* Tabs margin-bottom */}px - ${40 /* Header */}px - ${16 /* Header margin-bottom */}px - ${16 /* Padding-bottom */}px - ${1 /* Border-bottom */}px - ${8 /* Bottom */}px)`,
          }}
        >
          <div className="flex h-full w-full max-w-[28rem] flex-col gap-4 md:h-auto md:w-[28rem]">
            {/* Amount */}
            {(selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) && (
              <div className="relative flex w-full flex-col">
                <div className="relative z-[2] w-full">
                  <StrategyInput
                    ref={inputRef}
                    value={value}
                    onChange={onValueChange}
                    reserveOptions={currencyReserveOptions}
                    reserve={currencyReserve}
                    onReserveChange={onCurrencyReserveChange}
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
                        currencyReserveBalance.gt(0)
                          ? `${formatToken(currencyReserveBalance, { dp: currencyReserve.token.decimals })} ${currencyReserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(currencyReserveBalance, {
                          exact: false,
                        })}{" "}
                        {currencyReserve.token.symbol}
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
                        !!obligation && hasPosition(obligation)
                          ? `${formatToken(
                              tvlAmount.times(
                                isSui(defaultCurrencyReserve.coinType)
                                  ? isSui(currencyReserve.coinType)
                                    ? 1
                                    : lst.suiToLstExchangeRate
                                  : 1, // Assume currencyReserve.coinType is defaultCurrencyCoinType
                              ),
                              { dp: currencyReserve.token.decimals },
                            )} ${currencyReserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(
                          tvlAmount.times(
                            isSui(defaultCurrencyReserve.coinType)
                              ? isSui(currencyReserve.coinType)
                                ? 1
                                : lst.suiToLstExchangeRate
                              : 1, // Assume currencyReserve.coinType is defaultCurrencyCoinType
                          ),
                          { exact: false },
                        )}{" "}
                        {currencyReserve.token.symbol}
                      </TBody>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Exposure */}
            {((selectedTab === Tab.DEPOSIT &&
              (!obligation || !hasPosition(obligation))) ||
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
                      (!obligation || !hasPosition(obligation))
                    }
                  />
                </div>

                {/* Labels */}
                <div className="flex w-full flex-row items-center justify-between">
                  {/* Min */}
                  <div className="flex w-max flex-row justify-center">
                    <TBody>
                      {minExposure.toFixed(1, BigNumber.ROUND_DOWN)}x
                    </TBody>
                  </div>

                  {/* Max */}
                  <div className="flex w-max flex-row justify-center">
                    <TBody>
                      {maxExposure.toFixed(1, BigNumber.ROUND_DOWN)}x
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
                  <>
                    <LabelWithValue
                      label="Deposit fee"
                      value={`${formatToken(
                        depositFeesSuiAmount.times(
                          isSui(currencyReserve.coinType)
                            ? 1
                            : lst.suiToLstExchangeRate,
                        ),
                        {
                          dp: currencyReserve.token.decimals,
                          trimTrailingZeros: true,
                        },
                      )} ${currencyReserve.token.symbol}`}
                      horizontal
                    />

                    <LabelWithValue
                      label="Withdraw fee"
                      value={formatPercent(generalWithdrawFeesPercent)}
                      horizontal
                    />
                  </>
                ) : selectedTab === Tab.WITHDRAW ? (
                  <LabelWithValue
                    label="Withdraw fee"
                    value={`${formatToken(
                      withdrawFeesSuiAmount.times(
                        isSui(currencyReserve.coinType)
                          ? 1
                          : lst.suiToLstExchangeRate,
                      ),
                      {
                        dp: currencyReserve.token.decimals,
                        trimTrailingZeros: true,
                      },
                    )} ${currencyReserve.token.symbol}`}
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

              {!md && isMoreParametersOpen && (
                <>
                  <Separator />
                  <LstStrategyDialogParametersPanel
                    strategyType={strategyType}
                  />
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
                </Button>
              </div>
            </div>

            {/* Required to get the desired modal width on <md */}
            <div className="-mt-4 h-0 w-[28rem] max-w-full" />
          </div>

          {md && isMoreParametersOpen && (
            <div className="flex h-[440px] w-[28rem] flex-col gap-4">
              <LstStrategyDialogParametersPanel strategyType={strategyType} />
            </div>
          )}
        </div>
      </Tabs>
    </Dialog>
  );
}
