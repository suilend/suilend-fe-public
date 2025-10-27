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
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";
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
  addOrInsertStrategyDeposit as addOrInsertDeposit,
  bisectionMethod,
  getReserveSafeDepositLimit,
  getRewardsMap,
  strategyMaxWithdrawTx,
} from "@suilend/sdk";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
  createStrategyOwnerCapIfNoneExists,
  sendStrategyOwnerCapToUser,
  strategyClaimRewardsAndSwapForCoinType,
  strategySwapSomeDepositsForCoinType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import {
  TX_TOAST_DURATION,
  formatInteger,
  formatList,
  formatNumber,
  formatPercent,
  formatToken,
  formatUsd,
  getBalanceChange,
  getToken,
  isSui,
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
import StrategyHeader from "@/components/strategies/StrategyHeader";
import StrategyInput from "@/components/strategies/StrategyInput";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedLstStrategyContext } from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";

const STRATEGY_MAX_BALANCE_SUI_SUBTRACTED_AMOUNT = 0.15;

export enum QueryParams {
  STRATEGY_NAME = "strategy",
  TAB = "action",
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
    }),
    [router.query],
  );

  const { explorer, suiClient } = useSettingsContext();
  const { address, dryRunTransaction, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { getBalance, allUserData, refresh } = useLoadedUserContext();
  const userDataMainMarket = allUserData[LENDING_MARKET_ID];

  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getBorrowReserve,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxBorrowedAmount,
    getStepMaxWithdrawnAmount,

    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getGlobalTvlAmountUsd,
    getUnclaimedRewardsAmount,
    getHistory,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
  } = useLoadedLstStrategyContext();
  const MoreDetailsIcon = isMoreDetailsOpen ? ChevronLeft : ChevronRight;

  const { md } = useBreakpoint();

  // send.ag
  const cetusSdk = useCetusSdk();

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
    () =>
      strategyInfo.depositLstCoinType !== undefined
        ? lstMap[strategyInfo.depositLstCoinType]
        : undefined,
    [lstMap, strategyInfo.depositLstCoinType],
  );

  // Reserves
  const depositReserves = useMemo(
    () => getDepositReserves(strategyType),
    [getDepositReserves, strategyType],
  );
  const borrowReserve = useMemo(
    () => getBorrowReserve(strategyType),
    [getBorrowReserve, strategyType],
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
  const strategyOwnerCap = userDataMainMarket.strategyOwnerCaps.find(
    (soc) => soc.strategyType === strategyType,
  );
  const obligation = userDataMainMarket.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Tabs
  const canAdjust = getHealthPercent(
    strategyType,
    obligation,
    !!obligation && hasPosition(obligation)
      ? getExposure(strategyType, obligation)
      : new BigNumber(1),
  ).eq(100);
  const depositAdjustWithdrawAdditionalDepositedAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);
    if (canAdjust) return new BigNumber(0);

    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    const depositedAmount = obligation.deposits.find(
      (d) => d.coinType === depositReserve.coinType,
    )!.depositedAmount;

    const targetDepositedAmount = bisectionMethod(
      depositedAmount.times(1), // left boundary: 1x original deposit
      depositedAmount.times(2), // right boundary: 2x original deposit
      (newDepositedAmount: BigNumber) => {
        const additionalDepositedAmount =
          newDepositedAmount.minus(depositedAmount);

        const newHealthPercent = getHealthPercent(
          strategyType,
          getSimulatedObligation(
            strategyType,
            addOrInsertDeposit(obligation.deposits, {
              coinType: depositReserve.coinType,
              depositedAmount: additionalDepositedAmount,
            }),
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
          ),
          undefined,
        );

        return newHealthPercent.eq(100);
      },
    );

    const additionalDepositedAmount = targetDepositedAmount
      .minus(depositedAmount)
      .decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_UP);
    console.log(
      "XXXX depositedAmount:",
      depositedAmount.toFixed(20),
      "targetDepositedAmount:",
      targetDepositedAmount.toFixed(20),
      "additionalDepositedAmount:",
      additionalDepositedAmount.toFixed(20),
    );

    return additionalDepositedAmount;
  }, [
    obligation,
    hasPosition,
    canAdjust,
    depositReserves.base,
    depositReserves.lst,
    getHealthPercent,
    strategyType,
    getSimulatedObligation,
  ]);

  const tabs = [
    { id: Tab.DEPOSIT, title: "Deposit" },
    { id: Tab.WITHDRAW, title: "Withdraw" },
    {
      id: Tab.ADJUST,
      title: "Adjust",
      tooltip:
        "Increase or decrease leverage without changing your Equity (deposited amount)",
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

  // Rewards
  const rewardsMap = getRewardsMap(
    obligation,
    userDataMainMarket.rewardMap,
    appDataMainMarket.coinMetadataMap,
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
        appDataMainMarket.rewardPriceMap,
        (depositReserves.lst ?? depositReserves.base)!, // Must have base if no LST
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
              (coinType) => appDataMainMarket.coinMetadataMap[coinType].symbol,
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
      console.error(err);
      showErrorToast(
        [
          "Failed to claim and redeposit",
          formatList(
            Object.keys(rewardsMap).map(
              (coinType) => appDataMainMarket.coinMetadataMap[coinType].symbol,
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
      strategyInfo.currencyCoinTypes.map((_currencyCoinType) => ({
        id: _currencyCoinType,
        name: appDataMainMarket.coinMetadataMap[_currencyCoinType].symbol,
      })),
    [strategyInfo.currencyCoinTypes, appDataMainMarket.coinMetadataMap],
  );
  const currencyReserve = useMemo(
    () => appDataMainMarket.reserveMap[currencyCoinType],
    [currencyCoinType, appDataMainMarket.reserveMap],
  );

  const currencyReserveBalance = useMemo(
    () => getBalance(currencyReserve.coinType),
    [getBalance, currencyReserve.coinType],
  );

  // Value
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  // Stats
  // Stats - Exposure
  const exposure = useMemo(
    () =>
      !!obligation && hasPosition(obligation)
        ? getExposure(strategyType, obligation)
        : new BigNumber(depositSliderValue),
    [obligation, hasPosition, getExposure, strategyType, depositSliderValue],
  );
  const depositAdjustWithdrawExposure = useMemo(
    () => maxExposure,
    [maxExposure],
  );
  const adjustExposure = useMemo(
    () => new BigNumber(adjustSliderValue),
    [adjustSliderValue],
  );

  // Value - Max
  const getMaxDepositCalculations = useCallback(
    (_currencyCoinType: string) => {
      const _currencyReserve = appDataMainMarket.reserveMap[_currencyCoinType];

      const simValue = new BigNumber(1);
      const simValueUsd = simValue.times(_currencyReserve.price);
      const { deposits, borrowedAmount } = simulateDepositAndLoopToExposure(
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
        lst?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
      } = {
        base:
          depositReserves.base !== undefined
            ? getReserveSafeDepositLimit(depositReserves.base)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? getReserveSafeDepositLimit(depositReserves.lst)
            : undefined,
      };

      // Calculate minimum available amount (100 MIST equivalent) and borrow fee
      const borrowMinAvailableAmount = new BigNumber(100).div(
        10 ** borrowReserve.token.decimals,
      );
      const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;

      // Factor
      const depositFactorMap: {
        base?: BigNumber;
        lst?: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? (
                deposits.find(
                  (d) => d.coinType === depositReserves.base!.coinType,
                )?.depositedAmount ?? new BigNumber(0)
              )
                .times(depositReserves.base.price)
                .div(simValueUsd)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? (
                deposits.find(
                  (d) => d.coinType === depositReserves.lst!.coinType,
                )?.depositedAmount ?? new BigNumber(0)
              )
                .times(depositReserves.lst.price)
                .div(simValueUsd)
            : undefined,
      };
      const borrowFactor = borrowedAmount
        .times(borrowReserve.price)
        .div(simValueUsd);

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
                reason: `Insufficient ${borrowReserve.token.symbol} liquidity to borrow`,
                isDisabled: true,
                value: new BigNumber(
                  borrowReserve.availableAmount
                    .minus(borrowMinAvailableAmount)
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              {
                reason: `Exceeds ${borrowReserve.token.symbol} borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  borrowReserve.config.borrowLimit
                    .minus(borrowReserve.borrowedAmount)
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              {
                reason: `Exceeds ${borrowReserve.token.symbol} USD borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  borrowReserve.config.borrowLimitUsd
                    .minus(
                      borrowReserve.borrowedAmount.times(borrowReserve.price),
                    )
                    .div(borrowReserve.price)
                    .div(1 + borrowFeePercent / 100),
                ).div(borrowFactor),
              },
              // "Borrows cannot exceed borrow limit" is not relevant here
              {
                reason: "Outflow rate limit surpassed",
                isDisabled: true,
                value: new BigNumber(
                  appDataMainMarket.lendingMarket.rateLimiter.remainingOutflow
                    .div(borrowReserve.maxPrice)
                    .div(borrowReserve.config.borrowWeightBps.div(10000))
                    .div(1 + borrowFeePercent / 100),
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
      appDataMainMarket.reserveMap,
      simulateDepositAndLoopToExposure,
      strategyType,
      exposure,
      borrowReserve.token.decimals,
      borrowReserve.config.borrowFeeBps,
      depositReserves,
      getBalance,
      borrowReserve.token.symbol,
      borrowReserve.availableAmount,
      borrowReserve.config.borrowLimit,
      borrowReserve.borrowedAmount,
      borrowReserve.config.borrowLimitUsd,
      borrowReserve.price,
      borrowReserve.maxPrice,
      borrowReserve.config.borrowWeightBps,
      appDataMainMarket.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );
  const getMaxWithdrawCalculations = useCallback(
    (_currencyCoinType: string) => {
      const _currencyReserve = appDataMainMarket.reserveMap[_currencyCoinType];

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
      const depositMinAvailableAmountMap: {
        base?: BigNumber;
        lst?: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? new BigNumber(100).div(10 ** depositReserves.base.token.decimals)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? new BigNumber(100).div(10 ** depositReserves.lst.token.decimals)
            : undefined,
      };

      // Factor
      const withdrawFactorMap: {
        base?: BigNumber;
        lst?: BigNumber;
      } = {
        base:
          depositReserves.base !== undefined
            ? (deposits
                .find((d) => d.coinType === depositReserves.base!.coinType)
                ?.depositedAmount.div(simValue) ?? new BigNumber(0))
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? (deposits
                .find((d) => d.coinType === depositReserves.lst!.coinType)
                ?.depositedAmount.div(simValue) ?? new BigNumber(0))
            : undefined,
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
                : (lst?.suiToLstExchangeRate ?? 1),
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
      appDataMainMarket.reserveMap,
      simulateDepositAndLoopToExposure,
      strategyType,
      exposure,
      depositReserves,
      getTvlAmount,
      obligation,
      lst?.suiToLstExchangeRate,
    ],
  );
  // TODO: getMaxAdjustUpCalculations, getMaxAdjustDownCalculations

  const getMaxAmount = useCallback(
    (_currencyCoinType?: string) => {
      const _currencyReserve =
        _currencyCoinType !== undefined
          ? appDataMainMarket.reserveMap[_currencyCoinType]
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
      appDataMainMarket.reserveMap,
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
      const newCurrencyReserve =
        appDataMainMarket.reserveMap[newCurrencyCoinType];

      setCurrencyCoinType(newCurrencyCoinType);

      if (value === "") return;
      formatAndSetValue(
        (useMaxAmount
          ? getMaxAmount(newCurrencyCoinType)
          : new BigNumber(value)
        ).toFixed(newCurrencyReserve.token.decimals, BigNumber.ROUND_DOWN),
      );
    },
    [
      appDataMainMarket.reserveMap,
      formatAndSetValue,
      useMaxAmount,
      getMaxAmount,
      value,
    ],
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
  const depositAdjustWithdrawHealthPercent = getHealthPercent(
    strategyType,
    undefined,
    depositAdjustWithdrawExposure,
  );
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
  const depositAdjustWithdrawLiquidationPrice = getLiquidationPrice(
    strategyType,
    undefined,
    depositAdjustWithdrawExposure,
  ); // Approximate liquidation price
  const adjustLiquidationPrice = getLiquidationPrice(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - APR
  const aprPercent = getAprPercent(strategyType, obligation, exposure);
  const depositAdjustWithdrawAprPercent = getAprPercent(
    strategyType,
    undefined,
    depositAdjustWithdrawExposure,
  ); // Approximate APR
  const adjustAprPercent = getAprPercent(
    strategyType,
    undefined,
    adjustExposure,
  );

  // Stats - Fees
  const depositFeesAmount = useMemo(() => {
    const deposits = obligation?.deposits ?? [];
    const borrowedAmount =
      (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

    let result = new BigNumber(0);

    const { borrowedAmount: newBorrowedAmount } =
      simulateDepositAndLoopToExposure(
        strategyType,
        deposits,
        borrowedAmount,
        {
          coinType: currencyReserve.coinType,
          depositedAmount: new BigNumber(value || 0),
        },
        exposure,
      );

    // Borrow fee
    const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;
    const borrowFeeAmount = new BigNumber(
      newBorrowedAmount.minus(borrowedAmount),
    ).times(
      new BigNumber(borrowFeePercent / 100).div(1 + borrowFeePercent / 100),
    );

    result = borrowFeeAmount.decimalPlaces(
      borrowReserve.token.decimals,
      BigNumber.ROUND_DOWN,
    );

    // Result
    const resultUsd = result.times(borrowReserve.price);
    const resultCurrency = resultUsd
      .div(currencyReserve.price)
      .decimalPlaces(currencyReserve.token.decimals, BigNumber.ROUND_DOWN);

    return resultCurrency;
  }, [
    obligation?.deposits,
    obligation?.borrows,
    simulateDepositAndLoopToExposure,
    strategyType,
    currencyReserve.coinType,
    value,
    exposure,
    borrowReserve.config.borrowFeeBps,
    borrowReserve.token.decimals,
    borrowReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  const withdrawFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);
    if (new BigNumber(value || 0).lte(0)) return new BigNumber(0);

    const deposits = obligation.deposits;
    const borrowedAmount =
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

    let result = new BigNumber(0);

    const withdraw: StrategyWithdraw = {
      coinType: currencyReserve.coinType,
      withdrawnAmount: new BigNumber(value),
    };

    // From withdrawTx:
    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    const withdrawnAmount = (
      depositReserve.coinType === depositReserves.base?.coinType
        ? withdraw.withdrawnAmount
        : isSui(withdraw.coinType)
          ? withdraw.withdrawnAmount
              .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
              .div(lst?.lstToSuiExchangeRate ?? 1)
          : withdraw.withdrawnAmount
    ).decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_DOWN);
    const withdrawnAmountUsd = withdrawnAmount
      .times(depositReserve.price)
      .times(
        depositReserve.coinType === depositReserves.base?.coinType
          ? 1
          : new BigNumber(lst?.lstToSuiExchangeRate ?? 1).times(
              1 - +(lst?.redeemFeePercent ?? 0) / 100,
            ),
      );

    const exposure = getExposure(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    );
    const tvlAmountUsd = getTvlAmount(
      strategyType,
      getSimulatedObligation(strategyType, deposits, borrowedAmount),
    ).times(defaultCurrencyReserve.price);
    const targetTvlAmountUsd = tvlAmountUsd.minus(withdrawnAmountUsd);
    const targetBorrowedAmount = targetTvlAmountUsd
      .times(exposure.minus(1))
      .div(borrowReserve.price)
      .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_DOWN);

    // --- End withdrawTx code ---

    const repaidAmount = borrowedAmount.minus(targetBorrowedAmount);

    // LST redeem fee
    if (depositReserves.lst !== undefined) {
      let lstRedeemFeeSui = repaidAmount
        .times(+(lst?.redeemFeePercent ?? 0) / 100)
        .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_UP);

      if (isSui(withdraw.coinType))
        lstRedeemFeeSui = lstRedeemFeeSui.plus(
          withdrawnAmount
            .times(+(lst?.redeemFeePercent ?? 0) / 100)
            .decimalPlaces(borrowReserve.token.decimals, BigNumber.ROUND_UP),
        );

      result = result.plus(lstRedeemFeeSui);
    }

    // Result
    const resultUsd = result.times(borrowReserve.price);
    const resultCurrency = resultUsd
      .div(currencyReserve.price)
      .decimalPlaces(currencyReserve.token.decimals, BigNumber.ROUND_DOWN);

    return resultCurrency;
  }, [
    obligation,
    hasPosition,
    value,
    currencyReserve.coinType,
    depositReserves.base,
    depositReserves.lst,
    lst?.redeemFeePercent,
    lst?.lstToSuiExchangeRate,
    getExposure,
    strategyType,
    getSimulatedObligation,
    getTvlAmount,
    defaultCurrencyReserve.price,
    borrowReserve.token.decimals,
    borrowReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  const depositAdjustWithdrawFeesAmount = useMemo(() => {
    const depositReserve = (depositReserves.base ?? depositReserves.lst)!; // Must have LST if no base

    const flashLoanObj = STRATEGY_TYPE_FLASH_LOAN_OBJ_MAP[strategyType];

    // Ignoring LST mint or redeem fees
    return depositAdjustWithdrawAdditionalDepositedAmount
      .times(flashLoanObj.feePercent / 100)
      .decimalPlaces(depositReserve.token.decimals, BigNumber.ROUND_UP);
  }, [
    depositReserves.base,
    depositReserves.lst,
    strategyType,
    depositAdjustWithdrawAdditionalDepositedAmount,
  ]);

  const adjustFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const deposits = obligation.deposits;
    const borrowedAmount =
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

    let result = new BigNumber(0);

    if (adjustExposure.gt(exposure)) {
      const { borrowedAmount: newBorrowedAmount } = simulateLoopToExposure(
        strategyType,
        deposits,
        borrowedAmount,
        undefined, // Don't pass targetBorrowedAmount
        adjustExposure, // Pass targetExposure
      );

      // Borrow fee
      const borrowFeePercent = borrowReserve.config.borrowFeeBps / 100;
      const borrowFeeAmount = new BigNumber(
        newBorrowedAmount.minus(borrowedAmount),
      ).times(
        new BigNumber(borrowFeePercent / 100).div(1 + borrowFeePercent / 100),
      );

      result = borrowFeeAmount.decimalPlaces(
        borrowReserve.token.decimals,
        BigNumber.ROUND_DOWN,
      );

      // Ignoring LST mint fees
    } else {
      result = new BigNumber(0); // No fees (ignoring LST redeem fees)
    }

    // Result
    const resultUsd = result.times(borrowReserve.price);
    const resultCurrency = resultUsd
      .div(currencyReserve.price)
      .decimalPlaces(currencyReserve.token.decimals, BigNumber.ROUND_DOWN);

    return resultCurrency;
  }, [
    obligation,
    hasPosition,
    adjustExposure,
    exposure,
    simulateLoopToExposure,
    strategyType,
    borrowReserve.config.borrowFeeBps,
    borrowReserve.token.decimals,
    borrowReserve.price,
    currencyReserve.price,
    currencyReserve.token.decimals,
  ]);

  // Submit
  const getSubmitButtonNoValueState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      if (!canAdjust)
        return {
          isDisabled: true,
          title: "Disabled until back at 100% health",
          description: "Please adjust your leverage",
        };
    }

    if (selectedTab === Tab.DEPOSIT) {
      // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
      const safeDepositLimitMap: {
        base?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
        lst?: { safeDepositLimit: BigNumber; safeDepositLimitUsd: BigNumber };
      } = {
        base:
          depositReserves.base !== undefined
            ? getReserveSafeDepositLimit(depositReserves.base)
            : undefined,
        lst:
          depositReserves.lst !== undefined
            ? getReserveSafeDepositLimit(depositReserves.lst)
            : undefined,
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
        if (borrowReserve.borrowedAmount.gte(borrowReserve.config.borrowLimit))
          return {
            isDisabled: true,
            title: `${borrowReserve.token.symbol} borrow limit reached`,
          };
        if (
          new BigNumber(
            borrowReserve.borrowedAmount.times(borrowReserve.price),
          ).gte(borrowReserve.config.borrowLimitUsd)
        )
          return {
            isDisabled: true,
            title: `${borrowReserve.token.symbol} USD borrow limit reached`,
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
    } else if (selectedTab === Tab.ADJUST && !canAdjust) {
      // N/A
    } else if (selectedTab === Tab.ADJUST && canAdjust) {
      // N/A
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
              ? `Adjust leverage to ${(!canAdjust
                  ? depositAdjustWithdrawExposure
                  : adjustExposure
                ).toFixed(1)}x`
              : "--", // Should not happen
    };
  })();

  const depositAndLoopToExposureTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string | undefined,
    _deposits: StrategyDeposit[],
    _borrowedAmount: BigNumber,
    deposit: StrategyDeposit,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> =>
    _depositAndLoopToExposureTx(
      appDataMainMarket.reserveMap,
      lstMap,
      strategyType,

      suiClient,
      appDataMainMarket.suilendClient,
      cetusSdk,
      CETUS_PARTNER_ID,

      _address,
      strategyOwnerCapId,
      obligationId,
      _deposits,
      _borrowedAmount,
      deposit,
      targetExposure,
      transaction,
      dryRunTransaction,
    );

  const withdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: StrategyDeposit[],
    _borrowedAmount: BigNumber,
    withdraw: StrategyWithdraw,
    transaction: Transaction,
    returnWithdrawnCoin?: boolean,
  ): Promise<{
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
    withdrawnCoin?: TransactionArgument;
  }> =>
    _withdrawTx(
      appDataMainMarket.reserveMap,
      lstMap,
      strategyType,

      suiClient,
      appDataMainMarket.suilendClient,
      cetusSdk,
      CETUS_PARTNER_ID,

      _address,
      strategyOwnerCapId,
      obligationId,
      _deposits,
      _borrowedAmount,
      withdraw,
      transaction,
      dryRunTransaction,
      returnWithdrawnCoin,
    );

  const maxWithdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: StrategyDeposit[],
    _borrowedAmount: BigNumber,
    withdrawCoinType: string,
    transaction: Transaction,
  ): Promise<{
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> =>
    strategyMaxWithdrawTx(
      appDataMainMarket.reserveMap,
      appDataMainMarket.rewardPriceMap,
      rewardsMap,
      lstMap,
      strategyType,

      suiClient,
      appDataMainMarket.suilendClient,
      cetusSdk,
      CETUS_PARTNER_ID,

      _address,
      strategyOwnerCapId,
      obligationId,
      _deposits,
      _borrowedAmount,
      withdrawCoinType,
      transaction,
      dryRunTransaction,
    );

  const depositAdjustWithdrawTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligationId: string,
    _deposits: StrategyDeposit[],
    _borrowedAmount: BigNumber,
    flashLoanBorrowedAmount: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> =>
    _depositAdjustWithdrawTx(
      appDataMainMarket.reserveMap,
      lstMap,
      strategyType,

      suiClient,
      appDataMainMarket.suilendClient,
      cetusSdk,
      CETUS_PARTNER_ID,

      _address,
      strategyOwnerCapId,
      obligationId,
      _deposits,
      _borrowedAmount,
      flashLoanBorrowedAmount,
      transaction,
      dryRunTransaction,
    );

  const adjustTx = async (
    _address: string,
    strategyOwnerCapId: TransactionObjectInput,
    obligation: ParsedObligation,
    _deposits: StrategyDeposit[],
    _borrowedAmount: BigNumber,
    targetExposure: BigNumber,
    transaction: Transaction,
  ): Promise<{
    deposits: StrategyDeposit[];
    borrowedAmount: BigNumber;
    transaction: Transaction;
  }> =>
    _adjustTx(
      appDataMainMarket.reserveMap,
      lstMap,
      strategyType,

      suiClient,
      appDataMainMarket.suilendClient,
      cetusSdk,
      CETUS_PARTNER_ID,

      _address,
      strategyOwnerCapId,
      obligation,
      _deposits,
      _borrowedAmount,
      targetExposure,
      transaction,
      dryRunTransaction,
    );

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (base, LST, SUI, and any other deposits/borrows) - required when borrowing or withdrawing
      await appDataMainMarket.suilendClient.refreshAll(
        transaction,
        undefined,
        Array.from(
          new Set([
            ...(strategyInfo.depositBaseCoinType !== undefined
              ? [strategyInfo.depositBaseCoinType]
              : []),
            ...(strategyInfo.depositLstCoinType !== undefined
              ? [strategyInfo.depositLstCoinType]
              : []),
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

          // Base
          if (depositReserves.base !== undefined) {
            const baseDeposit = obligation.deposits.find(
              (d) => d.coinType === depositReserves.base!.coinType,
            );

            // Base+LST
            if (depositReserves.lst !== undefined) {
              const lstDeposit = obligation.deposits.find(
                (d) => d.coinType === depositReserves.lst!.coinType,
              );

              // Base+LST: Base, LST, and 0+ non-base-LST deposits
              if (
                baseDeposit?.depositedAmount.gt(0) &&
                lstDeposit?.depositedAmount.gt(0)
              ) {
                const nonBaseNonLstDeposits = obligation.deposits.filter(
                  (d) =>
                    d.coinType !== depositReserves.base!.coinType &&
                    d.coinType !== depositReserves.lst!.coinType,
                );

                // Base+LST: Base, LST, and 1+ non-base-LST deposits
                if (
                  nonBaseNonLstDeposits.some((d) => d.depositedAmount.gt(0))
                ) {
                  // Swap non-base-LST deposits for LST
                  await strategySwapSomeDepositsForCoinType(
                    strategyType,
                    cetusSdk,
                    CETUS_PARTNER_ID,
                    obligation,
                    [
                      depositReserves.base.coinType,
                      depositReserves.lst.coinType,
                    ],
                    new BigNumber(100),
                    depositReserves.lst,
                    strategyOwnerCap.id,
                    txCopy,
                  );
                }

                // Base+LST: Base, LST, and 0 non-base-LST deposits
                else {
                  const borrowedAmount =
                    obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0); // Assume up to 1 borrow

                  // Base+LST: Base, LST, and 0 non-base-LST deposits, and SUI borrows
                  if (borrowedAmount.gt(0)) {
                    const borrowedAmountUsd = borrowedAmount.times(
                      borrowReserve.price,
                    );
                    const fullRepaymentAmount = (
                      borrowedAmountUsd.lt(0.02)
                        ? new BigNumber(0.02).div(borrowReserve.price) // $0.02 in borrow coinType (still well over E borrows, e.g. E SUI, or E wBTC)
                        : borrowedAmountUsd.lt(1)
                          ? borrowedAmount.times(1.1) // 10% buffer
                          : borrowedAmountUsd.lt(10)
                            ? borrowedAmount.times(1.01) // 1% buffer
                            : borrowedAmount.times(1.001)
                    ) // 0.1% buffer
                      .decimalPlaces(
                        borrowReserve.token.decimals,
                        BigNumber.ROUND_DOWN,
                      );

                    const lstWithdrawnAmount = fullRepaymentAmount
                      .div(1 - +(lst?.redeemFeePercent ?? 0) / 100) // Potential rounding issue (max 1 MIST)
                      .div(lst?.lstToSuiExchangeRate ?? 1)
                      .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);

                    const swapPercent = BigNumber.min(
                      new BigNumber(
                        lstDeposit.depositedAmount.minus(lstWithdrawnAmount),
                      )
                        .div(lstDeposit.depositedAmount)
                        .times(100),
                      3, // Max 3% of LST deposits swapped for base at a time
                    );

                    // console.log("XXXXXX", {
                    //   borrowedAmount: borrowedAmount.toFixed(20),
                    //   fullRepaymentAmount: fullRepaymentAmount.toFixed(20),
                    //   lstDepositedAmount: lstDeposit.depositedAmount.toFixed(20),
                    //   lstWithdrawnAmount: lstWithdrawnAmount.toFixed(20),
                    //   swapPercent: swapPercent.toFixed(20),
                    // });

                    // Swap percent is at least 0.5%
                    if (swapPercent.gte(0.5)) {
                      // Swap excess LST deposits for base
                      await strategySwapSomeDepositsForCoinType(
                        strategyType,
                        cetusSdk,
                        CETUS_PARTNER_ID,
                        obligation,
                        [depositReserves.base.coinType],
                        swapPercent,
                        depositReserves.base,
                        strategyOwnerCap.id,
                        txCopy,
                      );
                    }

                    // Swap percent is less than 0.5%
                    else {
                      // DO NOTHING
                    }
                  }

                  // Base+LST: Base, LST, and 0 non-base-LST deposits, and no SUI borrows
                  else {
                    // DO NOTHING
                  }
                }
              }

              // Base+LST: Base, and 0+ non-base-LST deposits
              else if (baseDeposit?.depositedAmount.gt(0)) {
                const nonBaseDeposits = obligation.deposits.filter(
                  (d) => d.coinType !== depositReserves.base!.coinType,
                );

                // Base+LST: Base, and 1+ non-base-LST deposits
                if (nonBaseDeposits.some((d) => d.depositedAmount.gt(0))) {
                  // Swap non-base deposits for base
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

                // Base+LST: Base, and 0 non-base-LST deposits
                else {
                  // DO NOTHING
                }
              }

              // Base+LST: LST, and 0+ non-base-LST deposits
              else if (lstDeposit?.depositedAmount.gt(0)) {
                // Swap non-base deposits for base
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

              // Base+LST: 0+ non-base-LST deposits
              else {
                // Swap non-base deposits for base
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

            // Base only
            else {
              const nonBaseDeposits = obligation.deposits.filter(
                (d) => d.coinType !== depositReserves.base!.coinType,
              );

              // Base only: 1+ non-base deposit(s)
              if (nonBaseDeposits.some((d) => d.depositedAmount.gt(0))) {
                // Swap non-base deposits for base
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

              // Base only: Base, 0 non-base deposits
              else if (baseDeposit?.depositedAmount.gt(0)) {
                // DO NOTHING
              }

              // Base only: No deposits
              else {
                // DO NOTHING
              }
            }
          }

          // LST only
          else {
            const lstDeposit = obligation.deposits.find(
              (d) => d.coinType === depositReserves.lst!.coinType,
            );
            const nonLstDeposits = obligation.deposits.filter(
              (d) => d.coinType !== depositReserves.lst!.coinType,
            );

            // LST only: 1+ non-LST deposit(s)
            if (nonLstDeposits.some((d) => d.depositedAmount.gt(0))) {
              // Swap non-LST deposits for LST
              await strategySwapSomeDepositsForCoinType(
                strategyType,
                cetusSdk,
                CETUS_PARTNER_ID,
                obligation,
                [depositReserves.lst!.coinType], // Must have LST if no base
                new BigNumber(100),
                depositReserves.lst!, // Must have LST if no base
                strategyOwnerCap.id,
                txCopy,
              );
            }

            // LST only: LST, 0 non-LST deposits
            else if (lstDeposit?.depositedAmount.gt(0)) {
              // DO NOTHING
            }

            // LST only: No deposits
            else {
              // DO NOTHING
            }
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
            (obligation?.borrows ?? [])[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
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
        if (lst) {
          lst.client.rebalance(
            transaction,
            lst.client.liquidStakingObject.weightHookId,
          );
        }

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
            `into the ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
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
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
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
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
              currencyReserve.coinType,
              transaction,
            );
        transaction = withdrawTransaction;

        // 4) Rebalance LST
        if (lst) {
          lst.client.rebalance(
            transaction,
            lst.client.liquidStakingObject.weightHookId,
          );
        }

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
            `from the ${strategyInfo.header.title} ${strategyInfo.header.type} strategy`,
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

        // 3) Deposit-adjust-withdraw or adjust
        if (!canAdjust) {
          // Deposit-adjust-withdraw
          const { transaction: depositAdjustWithdrawTransaction } =
            await depositAdjustWithdrawTx(
              address,
              strategyOwnerCap.id,
              obligation.id,
              obligation.deposits,
              obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
              depositAdjustWithdrawAdditionalDepositedAmount,
              transaction,
            );
          transaction = depositAdjustWithdrawTransaction;
        } else {
          // Adjust
          const { transaction: adjustTransaction } = await adjustTx(
            address,
            strategyOwnerCap.id,
            obligation,
            obligation.deposits,
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0), // Assume up to 1 borrow
            adjustExposure,
            transaction,
          );
          transaction = adjustTransaction;
        }

        // 4) Rebalance LST
        if (lst) {
          lst.client.rebalance(
            transaction,
            lst.client.liquidStakingObject.weightHookId,
          );
        }

        const res = await signExecuteAndWaitForTransaction(transaction);
        const txUrl = explorer.buildTxUrl(res.digest);

        toast.success(
          `Adjusted leverage to ${(!canAdjust
            ? depositAdjustWithdrawExposure
            : adjustExposure
          ).toFixed(1)}x`,
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
            ? "deposit into the"
            : selectedTab === Tab.WITHDRAW
              ? "withdraw from the"
              : selectedTab === Tab.ADJUST
                ? "adjust"
                : "--" // Should not happen
        } ${strategyInfo.header.title} ${strategyInfo.header.type} strategy${
          selectedTab === Tab.ADJUST ? " leverage" : ""
        }`,
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
        <div className="mb-4 flex w-full flex-col gap-4 sm:h-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <StrategyHeader strategyType={strategyType} />

          {hasClaimableRewards && (
            <div className="flex w-max flex-row-reverse items-center gap-3 sm:flex-row">
              <div className="flex flex-row-reverse items-center gap-2 sm:flex-row">
                <TLabel>
                  {formatUsd(
                    Object.entries(rewardsMap).reduce(
                      (acc, [coinType, { amount }]) => {
                        const price =
                          appDataMainMarket.rewardPriceMap[coinType] ??
                          new BigNumber(0);

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
                                appDataMainMarket.coinMetadataMap[coinType],
                              )}
                              size={16}
                            />
                            <TLabelSans className="text-foreground">
                              {formatToken(amount, {
                                dp: appDataMainMarket.coinMetadataMap[coinType]
                                  .decimals,
                              })}{" "}
                              {
                                appDataMainMarket.coinMetadataMap[coinType]
                                  .symbol
                              }
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
                        getToken(
                          coinType,
                          appDataMainMarket.coinMetadataMap[coinType],
                        ),
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
              ? [
                  StrategyType.USDC_sSUI_SUI_LOOPING,
                  StrategyType.AUSD_sSUI_SUI_LOOPING,
                  StrategyType.xBTC_sSUI_SUI_LOOPING,
                  StrategyType.suiUSDT_sSUI_SUI_LOOPING,
                ].includes(strategyType)
                ? "md:min-h-[calc(314px+20px+12px)]"
                : "md:min-h-[314px]"
              : [
                    StrategyType.USDC_sSUI_SUI_LOOPING,
                    StrategyType.AUSD_sSUI_SUI_LOOPING,
                    StrategyType.xBTC_sSUI_SUI_LOOPING,
                    StrategyType.suiUSDT_sSUI_SUI_LOOPING,
                  ].includes(strategyType)
                ? "md:min-h-[calc(374px+20px+12px)]"
                : "md:min-h-[374px]",
          )}
          style={{
            height: `calc(100dvh - ${0 /* Top */}px - ${1 /* Border-top */}px - ${16 /* Padding-top */}px - ${42 /* Tabs */}px - ${16 /* Tabs margin-bottom */}px - ${40 /* Header */}px - ${hasClaimableRewards ? 16 + 32 : 0 /* Claim rewards */}px - ${16 /* Header margin-bottom */}px - ${16 /* Padding-bottom */}px - ${1 /* Border-bottom */}px - ${0 /* Bottom */}px)`,
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
                                    : (lst?.suiToLstExchangeRate ?? 1),
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
                                : (lst?.suiToLstExchangeRate ?? 1),
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
              (selectedTab === Tab.ADJUST && canAdjust)) && (
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
                        `${exposure.toFixed(6)}x` !==
                          `${(!canAdjust ? depositAdjustWithdrawExposure : adjustExposure).toFixed(1)}x` && (
                          <>
                            <FromToArrow />
                            {(!canAdjust
                              ? depositAdjustWithdrawExposure
                              : adjustExposure
                            ).toFixed(1)}
                            x
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
                        formatPercent(aprPercent) !==
                          formatPercent(
                            !canAdjust
                              ? depositAdjustWithdrawAprPercent
                              : adjustAprPercent,
                          ) && (
                          <>
                            <FromToArrow />
                            {formatPercent(
                              !canAdjust
                                ? depositAdjustWithdrawAprPercent
                                : adjustAprPercent,
                            )}
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
                        formatNumber(healthPercent, { dp: 2 }) !==
                          formatNumber(
                            !canAdjust
                              ? depositAdjustWithdrawHealthPercent
                              : adjustHealthPercent,
                            { dp: !canAdjust ? 2 : 0 },
                          ) && (
                          <>
                            <FromToArrow />
                            {formatPercent(
                              !canAdjust
                                ? depositAdjustWithdrawHealthPercent
                                : adjustHealthPercent,
                              { dp: !canAdjust ? 2 : 0 },
                            )}
                          </>
                        )}
                    </>
                  }
                  horizontal
                />

                {[
                  StrategyType.USDC_sSUI_SUI_LOOPING,
                  StrategyType.AUSD_sSUI_SUI_LOOPING,
                  StrategyType.xBTC_sSUI_SUI_LOOPING,
                  StrategyType.suiUSDT_sSUI_SUI_LOOPING,
                ].includes(strategyType) && (
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
                          (liquidationPrice !== null
                            ? formatUsd(liquidationPrice)
                            : "--") !==
                            ((!canAdjust
                              ? depositAdjustWithdrawLiquidationPrice
                              : adjustLiquidationPrice) !== null
                              ? formatUsd(
                                  (!canAdjust
                                    ? depositAdjustWithdrawLiquidationPrice
                                    : adjustLiquidationPrice)!,
                                )
                              : "--") && (
                            <>
                              <FromToArrow />
                              {(!canAdjust
                                ? depositAdjustWithdrawLiquidationPrice
                                : adjustLiquidationPrice) !== null
                                ? formatUsd(
                                    (!canAdjust
                                      ? depositAdjustWithdrawLiquidationPrice
                                      : adjustLiquidationPrice)!,
                                  )
                                : "--"}
                            </>
                          )}
                      </>
                    }
                    horizontal
                  />
                )}

                {selectedTab === Tab.DEPOSIT ? (
                  <LabelWithValue
                    label="Deposit fee"
                    value={`${formatToken(
                      depositFeesAmount.times(
                        depositReserves.base !== undefined
                          ? 1
                          : isSui(currencyReserve.coinType)
                            ? 1
                            : (lst?.suiToLstExchangeRate ?? 1),
                      ),
                      {
                        dp: currencyReserve.token.decimals,
                        trimTrailingZeros: true,
                      },
                    )} ${currencyReserve.token.symbol}`}
                    horizontal
                  />
                ) : selectedTab === Tab.WITHDRAW ? (
                  <LabelWithValue
                    label={`Withdraw fee (${useMaxAmount ? "deducted" : "added"})`}
                    value={`${formatToken(
                      withdrawFeesAmount.times(
                        depositReserves.base !== undefined
                          ? 1
                          : isSui(currencyReserve.coinType)
                            ? 1
                            : (lst?.suiToLstExchangeRate ?? 1),
                      ),
                      {
                        dp: currencyReserve.token.decimals,
                        trimTrailingZeros: true,
                      },
                    )} ${currencyReserve.token.symbol}`}
                    horizontal
                  />
                ) : selectedTab === Tab.ADJUST && !canAdjust ? (
                  <LabelWithValue
                    label="Adjust fee"
                    value={`${formatToken(depositAdjustWithdrawFeesAmount, {
                      dp: (depositReserves.base ?? depositReserves.lst)!.token
                        .decimals,
                      trimTrailingZeros: true,
                    })} ${
                      (depositReserves.base ?? depositReserves.lst)!.token
                        .symbol
                    }`} // Shown as base or LST symbol (sSUI, USDC, AUSD, etc.)
                    horizontal
                  />
                ) : selectedTab === Tab.ADJUST && canAdjust ? (
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

              {!md && isMoreDetailsOpen && (
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
              </div>
            </div>

            {/* Required to get the desired modal width on <md */}
            <div className="-mt-4 h-0 w-[28rem] max-w-full" />
          </div>

          {md && isMoreDetailsOpen && (
            <div className="flex h-[440px] w-[28rem] flex-col gap-4">
              <LstStrategyDialogParametersPanel strategyType={strategyType} />
            </div>
          )}
        </div>
      </Tabs>
    </Dialog>
  );
}
