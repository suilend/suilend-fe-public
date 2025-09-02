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

import {
  Transaction,
  TransactionObjectArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import BN from "bn.js";
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
  strategyClaimRewardsAndSwapForCoinType,
  strategyDeposit,
  strategySwapSomeDepositsForCoinType,
  strategyWithdraw,
} from "@suilend/sdk/lib/strategyOwnerCap";
import {
  MAX_U64,
  MS_PER_YEAR,
  NORMALIZED_SUI_COINTYPE,
  TX_TOAST_DURATION,
  formatInteger,
  formatList,
  formatNumber,
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
  Withdraw,
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

    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getUnclaimedRewardsAmount,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
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
      tooltip:
        "Increase or decrease leverage without changing your position size (deposited amount)",
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
      await strategyClaimRewardsAndSwapForCoinType(
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
          "Claimed and redeposited",
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
          "Failed to claim and redeposit",
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
    (_currencyCoinType: string) => {
      const _currencyReserve = appData.reserveMap[_currencyCoinType];

      const simValue = new BigNumber(1);
      const { deposits, suiBorrowedAmount } = simulateDepositAndLoopToExposure(
        strategyType,
        [],
        new BigNumber(0),
        {
          coinType: _currencyReserve.coinType,
          depositedAmount: simValue,
        },
        exposure,
      );

      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const safeDepositLimitMap: {
        base?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
        lst: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
      } = {
        base:
          depositReserves.base !== undefined
            ? getReserveSafeDepositLimit(depositReserves.base)
            : undefined,
        lst: getReserveSafeDepositLimit(depositReserves.lst),
      };

      // Calculate minimum available amount (100 MIST equivalent) and borrow fee
      const suiBorrowMinAvailableAmount = new BigNumber(100).div(
        10 ** suiReserve.token.decimals,
      );
      const suiBorrowFeePercent = new BigNumber(
        suiReserve.config.borrowFeeBps,
      ).div(100);

      // Factor
      const depositFactorMap: {
        base?: BigNumber;
        lst: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? deposits
                .find((d) => d.coinType === depositReserves.base!.coinType)!
                .depositedAmount.div(simValue)
            : undefined,
        lst:
          deposits
            .find((d) => d.coinType === depositReserves.lst.coinType)
            ?.depositedAmount.div(simValue) ?? new BigNumber(0), // No LST deposits if depositReserves.base !== undefined AND exposure.eq(1)
      };
      const suiBorrowFactor = suiBorrowedAmount.div(simValue);

      const result = [
        // Balance
        {
          reason: `Insufficient ${_currencyReserve.token.symbol}`,
          isDisabled: true,
          value: getBalance(_currencyReserve.coinType),
        },
        ...(isSui(_currencyReserve.coinType)
          ? [
              {
                reason: `${STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
                isDisabled: true,
                value: getBalance(_currencyReserve.coinType).minus(
                  STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
                ),
              },
            ]
          : []),

        // Deposit
        ...(["base", "lst"]
          .flatMap((_key) => {
            const key = _key as "base" | "lst";
            const reserve = depositReserves[key];

            if (!reserve) return undefined;
            if (
              depositReserves.base !== undefined &&
              exposure.eq(1) &&
              key === "lst"
            )
              return undefined;

            return [
              {
                reason: `Exceeds ${reserve.token.symbol} deposit limit`,
                isDisabled: true,
                value: BigNumber.max(
                  safeDepositLimitMap[key]!.safeDepositLimit.minus(
                    reserve.depositedAmount,
                  ),
                  0,
                ).div(depositFactorMap[key]!),
              },
              {
                reason: `Exceeds ${reserve.token.symbol} USD deposit limit`,
                isDisabled: true,
                value: BigNumber.max(
                  safeDepositLimitMap[key]!.safeDepositLimitUsd.minus(
                    reserve.depositedAmount.times(reserve.maxPrice),
                  ).div(reserve.maxPrice),
                  0,
                ).div(depositFactorMap[key]!),
              },
            ];
          })
          .filter(Boolean) as {
          reason: string;
          isDisabled: boolean;
          value: BigNumber;
        }[]),

        // Borrow
        ...(exposure.gt(1)
          ? [
              {
                reason: `Insufficient ${suiReserve.token.symbol} liquidity to borrow`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.availableAmount
                    .minus(suiBorrowMinAvailableAmount)
                    .div(new BigNumber(1).plus(suiBorrowFeePercent.div(100))),
                ).div(suiBorrowFactor),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimit
                    .minus(suiReserve.borrowedAmount)
                    .div(new BigNumber(1).plus(suiBorrowFeePercent.div(100))),
                ).div(suiBorrowFactor),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} USD borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimitUsd
                    .minus(suiReserve.borrowedAmount.times(suiReserve.price))
                    .div(suiReserve.price)
                    .div(new BigNumber(1).plus(suiBorrowFeePercent.div(100))),
                ).div(suiBorrowFactor),
              },
              // "Borrows cannot exceed borrow limit" is not relevant here
              {
                reason: "Outflow rate limit surpassed",
                isDisabled: true,
                value: new BigNumber(
                  appData.lendingMarket.rateLimiter.remainingOutflow
                    .div(suiReserve.maxPrice)
                    .div(suiReserve.config.borrowWeightBps.div(10000))
                    .div(new BigNumber(1).plus(suiBorrowFeePercent.div(100))),
                ).div(suiBorrowFactor),
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
      simulateDepositAndLoopToExposure,
      strategyType,
      exposure,
      suiReserve.token.decimals,
      suiReserve.config.borrowFeeBps,
      depositReserves,
      getBalance,
      suiReserve.token.symbol,
      suiReserve.availableAmount,
      suiReserve.config.borrowLimit,
      suiReserve.borrowedAmount,
      suiReserve.config.borrowLimitUsd,
      suiReserve.price,
      suiReserve.maxPrice,
      suiReserve.config.borrowWeightBps,
      appData.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );
  const getMaxWithdrawCalculations = useCallback(
    (_currencyCoinType: string) => {
      const _currencyReserve = appData.reserveMap[_currencyCoinType];

      const simValue = new BigNumber(1);
      const { deposits } = simulateDepositAndLoopToExposure(
        strategyType,
        [],
        new BigNumber(0),
        {
          coinType: _currencyReserve.coinType,
          depositedAmount: simValue,
        },
        exposure,
      );

      // Calculate minimum available amount (100 MIST equivalent)
      const depositMinAvailableAmountMap = {
        base:
          depositReserves.base !== undefined
            ? new BigNumber(100).div(10 ** depositReserves.base.token.decimals)
            : undefined,
        lst: new BigNumber(100).div(10 ** depositReserves.lst.token.decimals),
      };

      // Factor
      const withdrawFactorMap: {
        base?: BigNumber;
        lst: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? deposits
                .find((d) => d.coinType === depositReserves.base!.coinType)!
                .depositedAmount.div(simValue)
            : undefined,
        lst:
          deposits
            .find((d) => d.coinType === depositReserves.lst.coinType)
            ?.depositedAmount.div(simValue) ?? new BigNumber(0), // No LST deposits if depositReserves.base !== undefined AND exposure.eq(1)
      };

      const result = [
        // Balance
        {
          reason: "Withdraws cannot exceed deposits",
          isDisabled: true,
          value: getTvlAmount(strategyType, obligation).times(
            depositReserves.base !== undefined
              ? 1
              : isSui(_currencyReserve.coinType)
                ? 1
                : lst.suiToLstExchangeRate,
          ),
        },

        // Withdraw
        ...(["base", "lst"]
          .flatMap((_key) => {
            const key = _key as "base" | "lst";
            const reserve = depositReserves[key];

            if (!reserve) return undefined;
            if (
              depositReserves.base !== undefined &&
              exposure.eq(1) &&
              key === "lst"
            )
              return undefined;

            return [
              {
                reason: `Insufficient ${reserve.token.symbol} liquidity to withdraw`,
                isDisabled: true,
                value: new BigNumber(
                  reserve.availableAmount.minus(
                    depositMinAvailableAmountMap[key]!,
                  ),
                ).div(withdrawFactorMap[key]!),
              },
            ];
          })
          .filter(Boolean) as {
          reason: string;
          isDisabled: boolean;
          value: BigNumber;
        }[]),
        // TODO: "Outflow rate limit surpassed"
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
      simulateDepositAndLoopToExposure,
      strategyType,
      exposure,
      depositReserves,
      getTvlAmount,
      obligation,
      lst.suiToLstExchangeRate,
    ],
  );
  // TODO: getMaxAdjustUpCalculations, getMaxAdjustDownCalculations

  const getMaxAmount = useCallback(
    (_currencyCoinType?: string) => {
      const _currencyReserve =
        _currencyCoinType !== undefined
          ? appData.reserveMap[_currencyCoinType]
          : currencyReserve;

      if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
        const maxCalculations =
          selectedTab === Tab.DEPOSIT
            ? getMaxDepositCalculations(_currencyReserve.coinType)
            : getMaxWithdrawCalculations(_currencyReserve.coinType);

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
      const newCurrencyReserve = appData.reserveMap[newCurrencyCoinType];

      setCurrencyCoinType(newCurrencyCoinType);

      if (value === "") return;
      formatAndSetValue(
        (useMaxAmount
          ? getMaxAmount(newCurrencyCoinType)
          : new BigNumber(value)
        ).toFixed(newCurrencyReserve.token.decimals, BigNumber.ROUND_DOWN),
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
  const tvlAmount = getTvlAmount(strategyType, obligation, true);

  // Stats - Health
  const healthPercent = getHealthPercent(strategyType, obligation, exposure);
  const adjustHealthPercent = getHealthPercent(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - Liquidation price
  const liquidationPrice = getLiquidationPrice(
    strategyType,
    obligation,
    exposure,
  );
  const adjustLiquidationPrice = getLiquidationPrice(
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
  const depositFeesAmount = useMemo(() => {
    const deposits = obligation?.deposits ?? [];
    const suiBorrowedAmount =
      (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow (SUI)

    let resultSui = new BigNumber(0);

    const { suiBorrowedAmount: newSuiBorrowedAmount } =
      simulateDepositAndLoopToExposure(
        strategyType,
        deposits,
        suiBorrowedAmount,
        {
          coinType: currencyReserve.coinType,
          depositedAmount: new BigNumber(value || 0),
        },
        exposure,
      );

    const suiBorrowFeeSuiAmount = new BigNumber(
      newSuiBorrowedAmount.minus(suiBorrowedAmount),
    ).times(
      new BigNumber(suiBorrowFeePercent.div(100)).div(
        new BigNumber(1).plus(suiBorrowFeePercent.div(100)),
      ),
    );

    resultSui = suiBorrowFeeSuiAmount.decimalPlaces(
      SUI_DECIMALS,
      BigNumber.ROUND_DOWN,
    );

    const resultUsd = resultSui.times(suiReserve.price);
    const result = resultUsd.div(currencyReserve.price);

    return result.decimalPlaces(
      currencyReserve.token.decimals,
      BigNumber.ROUND_DOWN,
    );
  }, [
    obligation?.deposits,
    obligation?.borrows,
    simulateDepositAndLoopToExposure,
    strategyType,
    currencyReserve.coinType,
    value,
    exposure,
    suiBorrowFeePercent,
    suiReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  const withdrawFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    return new BigNumber(0); // No fees
  }, [obligation, hasPosition]);
  const generalWithdrawFeesPercent = useMemo(() => {
    return new BigNumber(0); // No fees
  }, []);

  const adjustFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const deposits = obligation.deposits;
    const suiBorrowedAmount =
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow (SUI)

    let resultSui = new BigNumber(0);

    const targetExposure = adjustExposure;
    if (targetExposure.gt(exposure)) {
      const { suiBorrowedAmount: newSuiBorrowedAmount } =
        simulateLoopToExposure(
          strategyType,
          deposits,
          suiBorrowedAmount,
          undefined, // Don't pass targetSuiBorrowedAmount
          targetExposure, // Pass targetExposure
        );

      const suiBorrowFeeSuiAmount = new BigNumber(
        newSuiBorrowedAmount.minus(suiBorrowedAmount),
      ).times(
        new BigNumber(suiBorrowFeePercent.div(100)).div(
          new BigNumber(1).plus(suiBorrowFeePercent.div(100)),
        ),
      );

      resultSui = suiBorrowFeeSuiAmount.decimalPlaces(
        SUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    } else {
      resultSui = new BigNumber(0); // No fees
    }

    const resultUsd = resultSui.times(suiReserve.price);
    const result = resultUsd.div(currencyReserve.price);

    return result.decimalPlaces(
      currencyReserve.token.decimals,
      BigNumber.ROUND_DOWN,
    );
  }, [
    obligation,
    hasPosition,
    adjustExposure,
    exposure,
    simulateLoopToExposure,
    strategyType,
    suiBorrowFeePercent,
    suiReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  // Submit
  const getSubmitButtonNoValueState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT) {
      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const safeDepositLimitMap: {
        base?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
        lst: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
      } = {
        base:
          depositReserves.base !== undefined
            ? getReserveSafeDepositLimit(depositReserves.base)
            : undefined,
        lst: getReserveSafeDepositLimit(depositReserves.lst),
      };

      // Deposit
      for (const _key of ["base", "lst"]) {
        const key = _key as "base" | "lst";
        const reserve = depositReserves[key];
        if (!reserve) continue;

        if (
          new BigNumber(
            safeDepositLimitMap[key]!.safeDepositLimit.minus(
              reserve.depositedAmount,
            ),
          ).lte(0)
        )
          return {
            isDisabled: true,
            title: `${reserve.token.symbol} deposit limit reached`,
          };
        if (
          new BigNumber(
            safeDepositLimitMap[key]!.safeDepositLimitUsd.minus(
              reserve.depositedAmount.times(reserve.maxPrice),
            ).div(reserve.maxPrice),
          ).lte(0)
        )
          return {
            isDisabled: true,
            title: `${reserve.token.symbol} USD deposit limit reached`,
          };
        // "Cannot deposit borrowed asset" is not relevant here
        // "Max ${MAX_DEPOSITS_PER_OBLIGATION} deposit positions" is not relevant here
      }

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
      // TODO
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
      // TODO
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
              ? `Adjust leverage to ${adjustExposure.toFixed(1)}x`
              : "--", // Should not happen
    };
  })();

  const loopToExposureTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    _targetSuiBorrowedAmount: BigNumber | undefined,
    _targetExposure: BigNumber | undefined, // Must be defined if _targetSuiBorrowedAmount is undefined
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[loopToExposure] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          _targetSuiBorrowedAmount: _targetSuiBorrowedAmount?.toFixed(20),
          _targetExposure: _targetExposure?.toFixed(20),
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetSuiBorrowedAmount =
      _targetSuiBorrowedAmount ??
      tvlAmountUsd
        .times(_targetExposure!.minus(1))
        .div(suiReserve.price)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[loopToExposure] processed_args |`,
      JSON.stringify({
        tvlAmountUsd: tvlAmountUsd.toFixed(20),
        targetSuiBorrowedAmount: targetSuiBorrowedAmount.toFixed(20),
      }),
    );

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
      );
      const pendingSuiBorrowedAmount =
        targetSuiBorrowedAmount.minus(suiBorrowedAmount);

      console.log(
        `[loopToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingSuiBorrowedAmount: pendingSuiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      if (pendingSuiBorrowedAmount.lte(E)) break;

      // 1) Borrow SUI
      // 1.1) Max
      const stepMaxSuiBorrowedAmount = getStepMaxSuiBorrowedAmount(
        strategyType,
        deposits,
        suiBorrowedAmount,
      )
        .times(0.95) // 5% buffer
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxLstDepositedAmount = new BigNumber(
        stepMaxSuiBorrowedAmount.minus(
          getLstMintFee(depositReserves.lst.coinType, stepMaxSuiBorrowedAmount),
        ),
      )
        .times(lst.suiToLstExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[loopToExposure] ${i} borrow_sui.max |`,
        JSON.stringify(
          {
            stepMaxSuiBorrowedAmount: stepMaxSuiBorrowedAmount.toFixed(20),
            stepMaxLstDepositedAmount: stepMaxLstDepositedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Borrow
      const stepSuiBorrowedAmount = BigNumber.min(
        pendingSuiBorrowedAmount,
        stepMaxSuiBorrowedAmount,
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxBorrow = stepSuiBorrowedAmount.eq(stepMaxSuiBorrowedAmount);

      console.log(
        `[loopToExposure] ${i} borrow_sui.borrow |`,
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

      // 1.3) Update state
      suiBorrowedAmount = suiBorrowedAmount.plus(stepSuiBorrowedAmount);

      console.log(
        `[loopToExposure] ${i} borrow_sui.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Deposit LST
      // 2.1) Stake SUI for LST
      const stepLstCoin = lst.client.mint(transaction, borrowedSuiCoin);

      // 2.2) Deposit
      const stepLstDepositedAmount = new BigNumber(
        stepSuiBorrowedAmount.minus(
          getLstMintFee(depositReserves.lst.coinType, stepSuiBorrowedAmount),
        ),
      )
        .times(lst.suiToLstExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxDeposit = stepLstDepositedAmount.eq(stepMaxLstDepositedAmount);

      console.log(
        `[loopToExposure] ${i} deposit_lst.deposit |`,
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

      // 2.3) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: stepLstDepositedAmount,
      });

      console.log(
        `[loopToExposure] ${i} deposit_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    return { deposits, suiBorrowedAmount, transaction };
  };

  const unloopToExposureTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    _targetSuiBorrowedAmount: BigNumber | undefined,
    _targetExposure: BigNumber | undefined, // Must be defined if _targetSuiBorrowedAmount is undefined
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[unloopToExposure] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          _targetSuiBorrowedAmount: _targetSuiBorrowedAmount?.toFixed(20),
          _targetExposure: _targetExposure?.toFixed(20),
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetSuiBorrowedAmount =
      _targetSuiBorrowedAmount ??
      tvlAmountUsd
        .times(_targetExposure!.minus(1))
        .div(suiReserve.price)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[unloopToExposure] processed_args |`,
      JSON.stringify({
        tvlAmountUsd: tvlAmountUsd.toFixed(20),
        targetSuiBorrowedAmount: targetSuiBorrowedAmount.toFixed(20),
      }),
    );

    if (suiBorrowedAmount.eq(targetSuiBorrowedAmount))
      return { deposits, suiBorrowedAmount, transaction };

    const fullyRepaySuiBorrowsUsingLst = async (
      swapRemainingLstForBase: boolean,
    ) => {
      // const _suiBorrowedAmount = suiBorrowedAmount;
      const suiFullRepaymentAmount = BigNumber.max(
        suiBorrowedAmount.plus(10 ** -3), // 0.001 SUI buffer
        suiBorrowedAmount.times(1.01), // 1% buffer
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] |`,
        JSON.stringify({
          swapRemainingLstForBase,
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          suiFullRepaymentAmount: suiFullRepaymentAmount.toFixed(20),
        }),
      );

      // 1) (MAX) Withdraw LST
      const lstWithdrawnAmount = suiFullRepaymentAmount
        .div(new BigNumber(1).minus(lst.redeemFeePercent.div(100))) // Potential rounding issue (max 1 MIST)
        .div(lst.lstToSuiExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const remainingLstWithdrawnAmount = swapRemainingLstForBase
        ? new BigNumber(
            deposits.find(
              (d) => d.coinType === depositReserves.lst.coinType,
            )!.depositedAmount,
          ).minus(lstWithdrawnAmount)
        : new BigNumber(0);

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] withdraw_lst |`,
        JSON.stringify({
          lstWithdrawnAmount: lstWithdrawnAmount.toFixed(20),
          remainingLstWithdrawnAmount: remainingLstWithdrawnAmount.toFixed(20),
        }),
      );

      // 1.1) (MAX) Withdraw
      const [withdrawnLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        BigInt(
          new BigNumber(
            lstWithdrawnAmount
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
      let remainingLstWithdrawnLstCoin;
      if (depositReserves.base !== undefined && swapRemainingLstForBase) {
        [remainingLstWithdrawnLstCoin] = strategyWithdraw(
          depositReserves.lst.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            depositReserves.lst.coinType,
          ),
          BigInt(MAX_U64.toString()),
          transaction,
        );
      }

      // 1.2) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: lstWithdrawnAmount.times(-1),
      });
      if (depositReserves.base !== undefined && swapRemainingLstForBase) {
        deposits = addOrInsertDeposit(deposits, {
          coinType: depositReserves.lst.coinType,
          depositedAmount: remainingLstWithdrawnAmount.times(-1), // Should be 0 after this
        });
      }

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Repay SUI
      // 2.1) Unstake LST for SUI
      const suiFullRepaymentCoin = lst.client.redeem(
        transaction,
        withdrawnLstCoin,
      );

      // 2.2) Repay
      const suiRepaidAmount = new BigNumber(
        new BigNumber(lstWithdrawnAmount.times(lst.lstToSuiExchangeRate)).minus(
          getLstRedeemFee(depositReserves.lst.coinType, lstWithdrawnAmount),
        ),
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] repay_sui.repay |`,
        JSON.stringify(
          {
            suiRepaidAmount: suiRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      appData.suilendClient.repay(
        obligationId,
        NORMALIZED_SUI_COINTYPE,
        suiFullRepaymentCoin,
        transaction,
      );
      transaction.transferObjects([suiFullRepaymentCoin], _address); // Transfer remaining SUI to user

      // 2.3) Update state
      suiBorrowedAmount = BigNumber.max(
        suiBorrowedAmount.minus(suiRepaidAmount),
        new BigNumber(0),
      );

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] repay_sui.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 3) Redeposit remaining SUI (not possible because suiFullRepaymentCoin is a mutable reference (?))

      // 4) Swap remaining LST for base
      if (
        depositReserves.base !== undefined &&
        swapRemainingLstForBase &&
        remainingLstWithdrawnLstCoin
      ) {
        // 4.1) Get routers
        const routers = await cetusSdk.findRouters({
          from: depositReserves.lst.coinType,
          target: depositReserves.base.coinType,
          amount: new BN(
            remainingLstWithdrawnAmount
              .times(10 ** depositReserves.lst.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
          byAmountIn: true,
        });
        if (!routers) throw new Error("No swap quote found");

        console.log(
          `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] swap_remaining_lst_for_base.get_routers`,
          { routers },
        );

        // 4.2) Swap
        let baseCoin: TransactionObjectArgument;
        try {
          baseCoin = await cetusSdk.fixableRouterSwapV3({
            router: routers,
            inputCoin: remainingLstWithdrawnLstCoin,
            slippage: 3 / 100,
            txb: transaction,
            partner: CETUS_PARTNER_ID,
          });
        } catch (err) {
          throw new Error("No swap quote found");
        }

        // 4.3) Deposit base
        strategyDeposit(
          baseCoin,
          depositReserves.base.coinType,
          strategyOwnerCapId,
          appData.suilendClient.findReserveArrayIndex(
            depositReserves.base.coinType,
          ),
          transaction,
        );

        // 4.4) Update state
        console.log("XXXX0101", routers.amountOut.toString());
        deposits = addOrInsertDeposit(deposits, {
          coinType: depositReserves.base.coinType,
          depositedAmount: new BigNumber(
            new BigNumber(routers.amountOut.toString()).div(
              10 ** depositReserves.base.token.decimals,
            ),
          ).times(-1),
        });

        console.log(
          `[unloopToExposure.fullyRepaySuiBorrowsUsingLst] swap_remaining_lst_for_base.update_state |`,
          JSON.stringify({
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          }),
        );
      }
    };
    const fullyRepaySuiBorrowsUsingBase = async () => {
      if (depositReserves.base === undefined) return;

      // const _suiBorrowedAmount = suiBorrowedAmount;
      const suiFullRepaymentAmount = BigNumber.max(
        suiBorrowedAmount.plus(10 ** -3), // 0.001 SUI buffer
        suiBorrowedAmount.times(1.01), // 1% buffer
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] |`,
        JSON.stringify({
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          suiFullRepaymentAmount: suiFullRepaymentAmount.toFixed(20),
        }),
      );

      // 1) MAX withdraw LST
      const maxLstWithdrawnAmount = deposits.find(
        (d) => d.coinType === depositReserves.lst.coinType,
      )!.depositedAmount;

      const suiRepaidAmount_maxLst = new BigNumber(
        new BigNumber(
          maxLstWithdrawnAmount.times(lst.lstToSuiExchangeRate),
        ).minus(
          getLstRedeemFee(depositReserves.lst.coinType, maxLstWithdrawnAmount),
        ),
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] max_withdraw_lst |`,
        JSON.stringify({
          maxLstWithdrawnAmount: maxLstWithdrawnAmount.toFixed(20),
          suiRepaidAmount_maxLst: suiRepaidAmount_maxLst.toFixed(20),
        }),
      );

      // 1.1) MAX withdraw
      const [withdrawnMaxLstCoin] = strategyWithdraw(
        depositReserves.lst.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.lst.coinType,
        ),
        BigInt(MAX_U64.toString()),
        transaction,
      );

      // 1.2) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: maxLstWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] max_withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.3) Unstake LST for SUI
      const suiCoin_maxLst = lst.client.redeem(
        transaction,
        withdrawnMaxLstCoin,
      );

      // 2) Withdraw base
      const baseWithdrawnAmount = new BigNumber(
        new BigNumber(
          suiFullRepaymentAmount.minus(suiRepaidAmount_maxLst),
        ).times(suiReserve.price),
      )
        .div(depositReserves.base.price)
        .times(1.01); // 1% buffer

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] withdraw_base |`,
        JSON.stringify(
          {
            baseWithdrawnAmount: baseWithdrawnAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2.1) Withdraw
      const [withdrawnBaseCoin] = strategyWithdraw(
        depositReserves.base.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(
          depositReserves.base.coinType,
        ),
        BigInt(
          new BigNumber(
            baseWithdrawnAmount
              .times(10 ** depositReserves.base.token.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          )
            .div(depositReserves.base.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP)
            .toString(),
        ),
        transaction,
      );

      // 2.2) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.base.coinType,
        depositedAmount: baseWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] withdraw_base.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 3) Swap base for SUI
      // 3.1) Get routers
      const routers = await cetusSdk.findRouters({
        from: depositReserves.base.coinType,
        target: NORMALIZED_SUI_COINTYPE,
        amount: new BN(
          baseWithdrawnAmount
            .times(10 ** depositReserves.base.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        ),
        byAmountIn: true,
      });
      if (!routers) throw new Error("No swap quote found");

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] swap_base_for_sui.get_routers`,
        { routers },
      );

      // 3.2) Swap
      let suiCoin_base: TransactionObjectArgument;
      try {
        suiCoin_base = await cetusSdk.fixableRouterSwapV3({
          router: routers,
          inputCoin: withdrawnBaseCoin,
          slippage: 1 / 100,
          txb: transaction,
          partner: CETUS_PARTNER_ID,
        });
      } catch (err) {
        throw new Error("No swap quote found");
      }

      // 4) Repay SUI
      transaction.mergeCoins(suiCoin_maxLst, [suiCoin_base]);
      const suiFullRepaymentCoin = suiCoin_maxLst;

      // 4.1) Repay
      const suiRepaidAmount = suiFullRepaymentAmount;

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] repay_sui.repay |`,
        JSON.stringify(
          {
            suiRepaidAmount: suiRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      appData.suilendClient.repay(
        obligationId,
        NORMALIZED_SUI_COINTYPE,
        suiFullRepaymentCoin,
        transaction,
      );
      transaction.transferObjects([suiFullRepaymentCoin], _address); // Transfer remaining SUI to user

      // 4.2) Update state
      suiBorrowedAmount = BigNumber.max(
        suiBorrowedAmount.minus(suiRepaidAmount),
        new BigNumber(0),
      );

      console.log(
        `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] repay_sui.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // // 5) Redeposit remaining SUI (not possible because coin is a mutable reference (?))
      // // 5.1) Get routers
      // const routers2 = await cetusSdk.findRouters({
      //   from: NORMALIZED_SUI_COINTYPE,
      //   target: depositReserves.base.coinType,
      //   amount: new BN(
      //     new BigNumber(suiFullRepaymentAmount.minus(_suiBorrowedAmount))
      //       .times(10 ** SUI_DECIMALS)
      //       .integerValue(BigNumber.ROUND_DOWN)
      //       .toString(),
      //   ),
      //   byAmountIn: true,
      // });
      // if (!routers2) throw new Error("No swap quote found");

      // console.log(
      //   `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] redeposit_remaining_sui.get_routers`,
      //   { routers: routers2 },
      // );

      // // 5.2) Swap
      // const baseCoin = await cetusSdk.fixableRouterSwapV3({
      //   router: routers2,
      //   inputCoin: suiFullRepaymentCoin,
      //   slippage: 1 / 100,
      //   txb: transaction,
      //   partner: CETUS_PARTNER_ID,
      // });

      // // 5.3) Deposit base
      // strategyDeposit(
      //   baseCoin,
      //   depositReserves.base.coinType,
      //   strategyOwnerCapId,
      //   appData.suilendClient.findReserveArrayIndex(
      //     depositReserves.base.coinType,
      //   ),
      //   transaction,
      // );

      // // 5.4) Update state
      // deposits = addOrInsertDeposit(deposits, {
      //   coinType: depositReserves.base.coinType,
      //   depositedAmount: new BigNumber(
      //     new BigNumber(routers2.amountOut.toString()).div(
      //       10 ** depositReserves.base.token.decimals,
      //     ),
      //   ),
      // });

      // console.log(
      //   `[unloopToExposure.fullyRepaySuiBorrowsUsingBase] redeposit_remaining_sui.update_state |`,
      //   JSON.stringify(
      //     {
      //       deposits: deposits.map((d) => ({
      //         coinType: d.coinType,
      //         depositedAmount: d.depositedAmount.toFixed(20),
      //       })),
      //       suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
      //     },
      //     null,
      //     2,
      //   ),
      // );
    };

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
      );
      const pendingSuiBorrowedAmount = suiBorrowedAmount.minus(
        targetSuiBorrowedAmount,
      );

      console.log(
        `[unloopToExposure] ${i} start |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
            exposure: exposure.toFixed(20),
            pendingSuiBorrowedAmount: pendingSuiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      if (targetSuiBorrowedAmount.eq(0)) {
        if (depositReserves.base !== undefined) {
          const lstDeposit = deposits.find(
            (d) => d.coinType === depositReserves.lst.coinType,
          );
          const lstDepositedAmount =
            lstDeposit?.depositedAmount ?? new BigNumber(0);

          // Ran out of LST
          if (lstDepositedAmount.lte(E)) {
            await fullyRepaySuiBorrowsUsingBase();
            break;
          }

          // SUI borrows almost fully repaid
          if (pendingSuiBorrowedAmount.lte(E)) {
            try {
              await fullyRepaySuiBorrowsUsingLst(true);
              break;
            } catch (err) {
              console.error(err);
            }

            await fullyRepaySuiBorrowsUsingBase();
            break;
          }
        } else {
          // SUI borrows almost fully repaid
          if (pendingSuiBorrowedAmount.lte(E)) {
            await fullyRepaySuiBorrowsUsingLst(false);
            break;
          }
        }
      } else {
        if (pendingSuiBorrowedAmount.lte(E)) break;
      }

      // 1) Withdraw LST
      // 1.1) Max
      const stepMaxLstWithdrawnAmount = getStepMaxWithdrawnAmount(
        strategyType,
        deposits,
        suiBorrowedAmount,
        depositReserves.lst.coinType,
      )
        .times(0.95) // 5% buffer
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxSuiRepaidAmount = new BigNumber(
        new BigNumber(
          stepMaxLstWithdrawnAmount.times(lst.lstToSuiExchangeRate),
        ).minus(
          getLstRedeemFee(
            depositReserves.lst.coinType,
            stepMaxLstWithdrawnAmount,
          ),
        ),
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

      console.log(
        `[unloopToExposure] ${i} withdraw_lst.max |`,
        JSON.stringify(
          {
            stepMaxLstWithdrawnAmount: stepMaxLstWithdrawnAmount.toFixed(20),
            stepMaxSuiRepaidAmount: stepMaxSuiRepaidAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 1.2) Withdraw
      const stepLstWithdrawnAmount = BigNumber.min(
        pendingSuiBorrowedAmount,
        stepMaxSuiRepaidAmount,
      )
        .times(new BigNumber(1).plus(lst.redeemFeePercent.div(100))) // Potential rounding issue (max 1 MIST)
        .div(lst.lstToSuiExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxWithdraw = stepLstWithdrawnAmount.eq(
        stepMaxLstWithdrawnAmount,
      );

      console.log(
        `[unloopToExposure] ${i} withdraw_lst.withdraw |`,
        JSON.stringify(
          {
            stepLstWithdrawnAmount: stepLstWithdrawnAmount.toFixed(20),
            isMaxWithdraw,
          },
          null,
          2,
        ),
      );

      const [stepWithdrawnLstCoin] = strategyWithdraw(
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

      // 1.3) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: stepLstWithdrawnAmount.times(-1),
      });

      console.log(
        `[unloopToExposure] ${i} withdraw_lst.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );

      // 2) Repay SUI
      // 2.1) Unstake LST for SUI
      const stepSuiCoin = lst.client.redeem(transaction, stepWithdrawnLstCoin);

      // 2.2) Repay
      const stepSuiRepaidAmount = new BigNumber(
        new BigNumber(
          stepLstWithdrawnAmount.times(lst.lstToSuiExchangeRate),
        ).minus(
          getLstRedeemFee(depositReserves.lst.coinType, stepLstWithdrawnAmount),
        ),
      ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxRepay = stepSuiRepaidAmount.eq(stepMaxSuiRepaidAmount);

      console.log(
        `[unloopToExposure] ${i} repay_sui.repay |`,
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
        obligationId,
        NORMALIZED_SUI_COINTYPE,
        stepSuiCoin,
        transaction,
      );
      transaction.transferObjects([stepSuiCoin], _address);

      // 2.3) Update state
      suiBorrowedAmount = suiBorrowedAmount.minus(stepSuiRepaidAmount);

      console.log(
        `[unloopToExposure] ${i} repay_sui.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    return { deposits, suiBorrowedAmount, transaction };
  };

  const depositTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    deposit: Deposit,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[deposit] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          deposit: {
            coinType: deposit.coinType,
            depositedAmount: deposit.depositedAmount.toFixed(20),
          },
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    const suiBorrowedAmount = _suiBorrowedAmount;

    // 1) Deposit
    // 1.1) SUI
    if (isSui(deposit.coinType)) {
      const suiAmount = deposit.depositedAmount;
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

      // 1.1.4) Update state
      deposits = addOrInsertDeposit(deposits, {
        coinType: depositReserves.lst.coinType,
        depositedAmount: lstAmount,
      });
    }

    // 1.2) LST
    else if (deposit.coinType === depositReserves.lst.coinType) {
      // 1.2.1) Split coins
      const allCoinsLst = await getAllCoins(
        suiClient,
        _address,
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
            deposit.depositedAmount
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

      // 1.2.3) Update state
      deposits = addOrInsertDeposit(deposits, deposit);

      // 1.3) Other
    } else {
      const otherReserve = appData.reserveMap[deposit.coinType];

      // 1.3.1) Split coins
      const allCoinsOther = await getAllCoins(
        suiClient,
        _address,
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
            deposit.depositedAmount
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

      // 1.3.3) Update state
      deposits = addOrInsertDeposit(deposits, deposit);
    }

    console.log(
      `[deposit] deposit |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
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
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
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
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          deposit: {
            coinType: deposit.coinType,
            depositedAmount: deposit.depositedAmount.toFixed(20),
          },
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    // 1) Deposit (1x exposure)
    // 1.1) Deposit
    const {
      deposits: newDeposits,
      suiBorrowedAmount: newSuiBorrowedAmount,
      transaction: newTransaction,
    } = await depositTx(
      _address,
      strategyOwnerCapId,
      obligationId,
      deposits,
      suiBorrowedAmount,
      deposit,
      transaction,
    );

    // 1.2) Update state
    deposits = newDeposits;
    suiBorrowedAmount = newSuiBorrowedAmount;
    transaction = newTransaction;

    if (targetExposure.gt(1)) {
      // 2) Loop to target exposure
      // 2.1) Loop
      const {
        deposits: newDeposits2,
        suiBorrowedAmount: newSuiBorrowedAmount2,
        transaction: newTransaction2,
      } = await loopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        suiBorrowedAmount,
        undefined, // Don't pass targetSuiBorrowedAmount
        targetExposure, // Pass targetExposure
        transaction,
      );

      // 2.2) Update state
      deposits = newDeposits2;
      suiBorrowedAmount = newSuiBorrowedAmount2;
      transaction = newTransaction2;
    }

    return { deposits, suiBorrowedAmount, transaction };
  };

  const withdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    withdraw: Withdraw,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[withdraw] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          withdraw: {
            coinType: withdraw.coinType,
            withdrawnAmount: withdraw.withdrawnAmount.toFixed(20),
          },
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    const depositReserve =
      depositReserves.base !== undefined
        ? depositReserves.base
        : depositReserves.lst;

    const depositWithdrawnAmount = (
      depositReserves.base !== undefined
        ? withdraw.withdrawnAmount
        : isSui(withdraw.coinType)
          ? withdraw.withdrawnAmount
              .div(new BigNumber(1).minus(lst.redeemFeePercent.div(100)))
              .div(lst.lstToSuiExchangeRate)
          : withdraw.withdrawnAmount
    ).decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_DOWN);
    const depositWithdrawnAmountUsd = depositWithdrawnAmount
      .times(depositReserve.price)
      .times(
        depositReserves.base !== undefined
          ? 1
          : lst.lstToSuiExchangeRate.times(
              new BigNumber(1).minus(lst.redeemFeePercent.div(100)),
            ),
      );

    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetTvlAmountUsd = tvlAmountUsd.minus(depositWithdrawnAmountUsd);
    const targetSuiBorrowedAmount = targetTvlAmountUsd
      .times(exposure.minus(1))
      .div(suiReserve.price)
      .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[withdraw] processed_args |`,
      JSON.stringify(
        {
          depositReserve_coinType: depositReserve.coinType,
          depositWithdrawnAmount: depositWithdrawnAmount.toFixed(20),
          depositWithdrawnAmountUsd: depositWithdrawnAmountUsd.toFixed(20),

          tvlAmountUsd: tvlAmountUsd.toFixed(20),
          targetTvlAmountUsd: targetTvlAmountUsd.toFixed(20),
          targetSuiBorrowedAmount: targetSuiBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 1) Unloop to targetSuiBorrowedAmount SUI borrows
    // 1.1) Unloop
    if (suiBorrowedAmount.gt(targetSuiBorrowedAmount)) {
      const {
        deposits: newDeposits,
        suiBorrowedAmount: newSuiBorrowedAmount,
        transaction: newTransaction,
      } = await unloopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        suiBorrowedAmount,
        targetSuiBorrowedAmount, // Pass targetSuiBorrowedAmount
        undefined, // Don't pass targetExposure
        transaction,
      );

      // 1.2) Update state
      deposits = newDeposits;
      suiBorrowedAmount = newSuiBorrowedAmount;
      transaction = newTransaction;

      console.log(
        `[withdraw] unloop.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    // 2) Withdraw base or LST
    // 2.1) Withdraw
    const [withdrawnCoin] = strategyWithdraw(
      depositReserve.coinType,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(depositReserve.coinType),
      BigInt(
        new BigNumber(
          depositWithdrawnAmount
            .times(10 ** depositReserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(),
        )
          .div(depositReserve.cTokenExchangeRate)
          .integerValue(BigNumber.ROUND_UP)
          .toString(),
      ),
      transaction,
    );

    // 2.2) Update state
    deposits = addOrInsertDeposit(deposits, {
      coinType: depositReserve.coinType,
      depositedAmount: depositWithdrawnAmount.times(-1),
    });

    const newExposure = getExposure(
      strategyType,
      getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
    );
    const newTvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, suiBorrowedAmount),
    ).times(defaultCurrencyReserve.price);

    console.log(
      `[withdraw] withdraw.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),

          originalExposure: exposure.toFixed(20),
          newExposure: newExposure.toFixed(20),

          originalTvlAmountUsd: tvlAmountUsd.toFixed(20),
          newTvlAmountUsd: newTvlAmountUsd.toFixed(20),
          targetTvlAmountUsd: targetTvlAmountUsd.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 3) Transfer coin to user
    if (depositReserves.base !== undefined) {
      // 3.1) Transfer base to user
      transaction.transferObjects([withdrawnCoin], _address);
    } else {
      if (isSui(withdraw.coinType)) {
        // 3.1) Unstake LST for SUI
        const suiWithdrawnCoin = lst.client.redeem(transaction, withdrawnCoin);

        // 3.2) Transfer SUI to user
        transaction.transferObjects([suiWithdrawnCoin], _address);
      } else {
        // 3.1) Transfer LST to user
        transaction.transferObjects([withdrawnCoin], _address);
      }
    }

    return { deposits, suiBorrowedAmount, transaction };
  };

  const maxWithdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    withdrawCoinType: string,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[maxWithdraw] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          withdrawCoinType,
        },
        null,
        2,
      ),
    );

    //

    let deposits = cloneDeep(_deposits);
    let suiBorrowedAmount = _suiBorrowedAmount;

    const depositReserve =
      depositReserves.base !== undefined
        ? depositReserves.base
        : depositReserves.lst;

    // 1) Unloop to 1x (base+LST: no LST and no borrows, LST: no borrows)
    if (suiBorrowedAmount.gt(0)) {
      // 1.1) Unloop
      const {
        deposits: newDeposits,
        suiBorrowedAmount: newSuiBorrowedAmount,
        transaction: newTransaction,
      } = await unloopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        suiBorrowedAmount,
        undefined, // Don't pass targetSuiBorrowedAmount
        new BigNumber(1), // Pass targetExposure
        transaction,
      );

      // 1.2) Update state
      deposits = newDeposits;
      suiBorrowedAmount = newSuiBorrowedAmount;
      transaction = newTransaction;

      console.log(
        `[maxWithdraw] unloop.update_state |`,
        JSON.stringify(
          {
            deposits: deposits.map((d) => ({
              coinType: d.coinType,
              depositedAmount: d.depositedAmount.toFixed(20),
            })),
            suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          },
          null,
          2,
        ),
      );
    }

    // 2) MAX withdraw base or LST
    const [withdrawnCoin] = strategyWithdraw(
      depositReserve.coinType,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(depositReserve.coinType),
      BigInt(MAX_U64.toString()),
      transaction,
    );

    // 2.2) Update state
    deposits = [];

    console.log(
      `[maxWithdraw] max_withdraw.update_state |`,
      JSON.stringify(
        {
          deposits: deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 3) Transfer coin to user
    if (depositReserves.base !== undefined) {
      // 3.1) Transfer base to user
      transaction.transferObjects([withdrawnCoin], _address);
    } else {
      if (isSui(withdrawCoinType)) {
        // 3.1) Unstake LST for SUI
        const suiWithdrawnCoin = lst.client.redeem(transaction, withdrawnCoin);

        // 3.2) Transfer SUI to user
        transaction.transferObjects([suiWithdrawnCoin], _address);
      } else {
        // 3.1) Transfer LST to user
        transaction.transferObjects([withdrawnCoin], _address);
      }
    }

    // 4) Claim rewards, swap for withdrawCoinType, and transfer to user
    if (hasClaimableRewards) {
      try {
        const txCopy = Transaction.from(transaction);
        await strategyClaimRewardsAndSwapForCoinType(
          _address,
          cetusSdk,
          CETUS_PARTNER_ID,
          rewardsMap,
          appData.reserveMap[withdrawCoinType],
          strategyOwnerCapId,
          false, // isDepositing (false = transfer to user)
          txCopy,
        );
        await dryRunTransaction(txCopy); // Throws error if fails

        transaction = txCopy;
      } catch (err) {
        // Don't block user if fails
        console.error(err);
      }
    }

    return { deposits, suiBorrowedAmount, transaction };
  };

  const adjustTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: Deposit[],
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: Deposit[];
    suiBorrowedAmount: BigNumber;
    transaction: Transaction;
  }> => {
    console.log(
      `[adjust] args |`,
      JSON.stringify(
        {
          _address,
          strategyOwnerCapId,
          obligationId,
          _deposits: _deposits.map((d) => ({
            coinType: d.coinType,
            depositedAmount: d.depositedAmount.toFixed(20),
          })),
          _suiBorrowedAmount: _suiBorrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    //

    const deposits = cloneDeep(_deposits);
    const suiBorrowedAmount = _suiBorrowedAmount;

    // 1) Loop or unloop to target exposure
    if (targetExposure.gt(exposure))
      return loopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        suiBorrowedAmount,
        undefined, // Don't pass targetSuiBorrowedAmount
        targetExposure, // Pass targetExposure
        transaction,
      );
    else if (targetExposure.lt(exposure))
      return unloopToExposureTx(
        _address,
        strategyOwnerCapId,
        obligationId,
        deposits,
        suiBorrowedAmount,
        undefined, // Don't pass targetSuiBorrowedAmount
        targetExposure, // Pass targetExposure
        transaction,
      );
    else return { deposits, suiBorrowedAmount, transaction };
  };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (base, LST, SUI, and any other deposits/borrows) - required when borrowing or withdrawing
      await appData.suilendClient.refreshAll(
        transaction,
        undefined,
        Array.from(
          new Set([
            ...(strategyInfo.depositBaseCoinType !== undefined
              ? [strategyInfo.depositBaseCoinType]
              : []),
            strategyInfo.depositLstCoinType,
            strategyInfo.borrowCoinType,
            ...(obligation?.deposits.map((deposit) => deposit.coinType) ?? []),
            ...(obligation?.borrows.map((borrow) => borrow.coinType) ?? []),
          ]),
        ),
      );

      // 2) Rebalance position if needed
      if (!!strategyOwnerCap && !!obligation) {
        try {
          const txCopy = Transaction.from(transaction);
          // Base+LST
          if (depositReserves.base !== undefined) {
            const baseDeposit = obligation.deposits.find(
              (d) => d.coinType === depositReserves.base!.coinType,
            );

            // Base+LST: Base deposits
            if (baseDeposit && baseDeposit.depositedAmount.gt(0)) {
              const hasNonBaseNonLstDeposits = obligation.deposits.some(
                (d) =>
                  d.coinType !== depositReserves.base!.coinType &&
                  d.coinType !== depositReserves.lst.coinType &&
                  d.depositedAmount.gt(0),
              );

              // Base+LST: Base and non-base/non-LST deposits
              if (hasNonBaseNonLstDeposits) {
                // Swap non-base/non-LST deposits (e.g. autoclaimed+deposited non-base/non-LST rewards) for LST
                await strategySwapSomeDepositsForCoinType(
                  strategyType,
                  cetusSdk,
                  CETUS_PARTNER_ID,
                  obligation,
                  [
                    depositReserves.base!.coinType,
                    depositReserves.lst.coinType,
                  ],
                  new BigNumber(100),
                  depositReserves.lst,
                  strategyOwnerCap.id,
                  txCopy,
                );
              }

              // Base+LST: Base and no non-base/non-LST deposits
              else {
                // Swap excess LST deposits for base (don't want to accumulate too many LST rewards)
                const lstDeposit = obligation.deposits.find(
                  (d) => d.coinType === depositReserves.lst.coinType,
                );
                const lstDepositedAmount =
                  lstDeposit?.depositedAmount ?? new BigNumber(0);

                const { deposits: simulatedDeposits } =
                  simulateDepositAndLoopToExposure(
                    strategyType,
                    [],
                    new BigNumber(0),
                    {
                      coinType: depositReserves.base!.coinType,
                      depositedAmount: baseDeposit.depositedAmount,
                    },
                    exposure,
                  );

                const simulatedLstDeposit = simulatedDeposits.find(
                  (d) => d.coinType === depositReserves.lst.coinType,
                );
                const simulatedLstDepositedAmount =
                  simulatedLstDeposit!.depositedAmount;

                const swapPercent = BigNumber.min(
                  new BigNumber(
                    lstDepositedAmount.minus(simulatedLstDepositedAmount),
                  )
                    .div(lstDepositedAmount)
                    .times(100),
                  3, // Max 3% of LST deposits swapped for base at a time
                );

                if (swapPercent.gt(1)) {
                  // Swap excess LST deposits for base
                  await strategySwapSomeDepositsForCoinType(
                    strategyType,
                    cetusSdk,
                    CETUS_PARTNER_ID,
                    obligation,
                    [depositReserves.base!.coinType],
                    swapPercent,
                    depositReserves.base,
                    strategyOwnerCap.id,
                    txCopy,
                  );
                } else {
                  // DO NOTHING
                }
              }
            }

            // Base+LST: Non-base deposits only
            else {
              // Swap non-base deposits (e.g. autoclaimed+deposited non-base rewards) for base
              await strategySwapSomeDepositsForCoinType(
                strategyType,
                cetusSdk,
                CETUS_PARTNER_ID,
                obligation,
                [depositReserves.base.coinType],
                new BigNumber(100),
                depositReserves.base,
                strategyOwnerCap.id,
                txCopy,
              );
            }
          }

          // LST
          else {
            // Swap non-LST deposits (e.g. autoclaimed+deposited non-LST rewards) for LST
            await strategySwapSomeDepositsForCoinType(
              strategyType,
              cetusSdk,
              CETUS_PARTNER_ID,
              obligation,
              [depositReserves.lst.coinType],
              new BigNumber(100),
              depositReserves.lst,
              strategyOwnerCap.id,
              txCopy,
            );
          }
          await dryRunTransaction(txCopy); // Throws error is fails

          transaction = txCopy;
        } catch (err) {
          // Don't block user if fails
        }
      }

      if (selectedTab === Tab.DEPOSIT) {
        const { strategyOwnerCapId, didCreate } =
          createStrategyOwnerCapIfNoneExists(
            strategyType,
            strategyOwnerCap,
            transaction,
          );

        // 3) Deposit
        const { transaction: depositTransaction } =
          await depositAndLoopToExposureTx(
            address,
            strategyOwnerCapId,
            obligation?.id,
            obligation?.deposits ?? [],
            (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow (SUI)
            {
              coinType: currencyReserve.coinType,
              depositedAmount: new BigNumber(value),
            },
            !!obligation && hasPosition(obligation)
              ? getExposure(strategyType, obligation)
              : new BigNumber(depositSliderValue),
            transaction,
          );
        transaction = depositTransaction;

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
        const { transaction: withdrawTransaction } = !useMaxAmount
          ? await withdrawTx(
              address,
              strategyOwnerCap.id,
              obligation.id,
              obligation.deposits,
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow (SUI)
              {
                coinType: currencyReserve.coinType,
                withdrawnAmount: new BigNumber(value),
              },
              transaction,
            )
          : await maxWithdrawTx(
              address,
              strategyOwnerCap.id,
              obligation.id,
              obligation.deposits,
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow (SUI)
              currencyReserve.coinType,
              transaction,
            );
        transaction = withdrawTransaction;

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
        const { transaction: adjustTransaction } = await adjustTx(
          address,
          strategyOwnerCap.id,
          obligation.id,
          obligation.deposits,
          obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow (SUI)
          new BigNumber(adjustSliderValue),
          transaction,
        );
        transaction = adjustTransaction;

        // 4) Rebalance LST
        lst.client.rebalance(
          transaction,
          lst.client.liquidStakingObject.weightHookId,
        );

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success(
          `Adjusted leverage to ${new BigNumber(adjustSliderValue).toFixed(1)}x`,
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
                ? "adjust leverage"
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
              ? strategyType === StrategyType.USDC_sSUI_SUI_LOOPING
                ? "md:min-h-[calc(346px+20px+12px)]"
                : "md:min-h-[346px]"
              : strategyType === StrategyType.USDC_sSUI_SUI_LOOPING
                ? "md:min-h-[calc(406px+20px+12px)]"
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
                                depositReserves.base !== undefined
                                  ? 1
                                  : isSui(currencyReserve.coinType)
                                    ? 1
                                    : lst.suiToLstExchangeRate,
                              ),
                              { dp: currencyReserve.token.decimals },
                            )} ${currencyReserve.token.symbol}`
                          : undefined
                      }
                    >
                      <TBody className="text-xs">
                        {formatToken(
                          tvlAmount.times(
                            depositReserves.base !== undefined
                              ? 1
                              : isSui(currencyReserve.coinType)
                                ? 1
                                : lst.suiToLstExchangeRate,
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
                        formatNumber(adjustHealthPercent, { dp: 0 }) !==
                          formatNumber(healthPercent, { dp: 2 }) && (
                          <>
                            <FromToArrow />
                            {formatPercent(adjustHealthPercent, { dp: 0 })}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />

                {strategyType === StrategyType.USDC_sSUI_SUI_LOOPING && (
                  <LabelWithValue
                    label="Liquidation price"
                    value={
                      <>
                        {liquidationPrice !== null ? (
                          <>
                            <span className="text-muted-foreground">
                              {"1 SUI ≈ "}
                            </span>
                            {formatUsd(liquidationPrice)}
                          </>
                        ) : (
                          "--"
                        )}
                        {selectedTab === Tab.ADJUST &&
                          (adjustLiquidationPrice !== null
                            ? formatUsd(adjustLiquidationPrice)
                            : "--") !==
                            (liquidationPrice !== null
                              ? formatUsd(liquidationPrice)
                              : "--") && (
                            <>
                              <FromToArrow />
                              {adjustLiquidationPrice !== null
                                ? formatUsd(adjustLiquidationPrice)
                                : "--"}
                            </>
                          )}
                      </>
                    }
                    horizontal
                  />
                )}

                {selectedTab === Tab.DEPOSIT ? (
                  <>
                    <LabelWithValue
                      label="Deposit fee"
                      value={`${formatToken(
                        depositFeesAmount.times(
                          depositReserves.base !== undefined
                            ? 1
                            : isSui(currencyReserve.coinType)
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
                      withdrawFeesAmount.times(
                        depositReserves.base !== undefined
                          ? 1
                          : isSui(currencyReserve.coinType)
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
                    value={`${formatToken(adjustFeesAmount, {
                      dp: defaultCurrencyReserve.token.decimals,
                      trimTrailingZeros: true,
                    })} ${defaultCurrencyReserve.token.symbol}`} // Shown as defaultCurrencyReserve symbol (SUI, USDC, etc.)
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
