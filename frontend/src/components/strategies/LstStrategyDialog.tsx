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

import * as Cetus from "@cetusprotocol/aggregator-sdk";
import { Transaction, TransactionObjectInput } from "@mysten/sui/transactions";
import { TransactionObjectArgument } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { cloneDeep } from "lodash";
import { ChevronLeft, ChevronRight, Download, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { ClaimRewardsReward, RewardSummary } from "@suilend/sdk";
import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
  createStrategyOwnerCapIfNoneExists,
  sendStrategyOwnerCapToUser,
  strategyBorrow,
  strategyClaimRewards,
  strategyDeposit,
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
  getAllCoins,
  getBalanceChange,
  getToken,
  isSendPoints,
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
import { TBody, TLabelSans } from "@/components/shared/Typography";
import LstStrategyDialogParametersPanel from "@/components/strategies/LstStrategyDialogParametersPanel";
import LstStrategyHeader from "@/components/strategies/LstStrategyHeader";
import StrategyInput from "@/components/strategies/StrategyInput";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  E,
  LST_DECIMALS,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
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

    getLstReserve,
    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxLstWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,

    getTvlSuiAmount,
    getHistoricalTvlSuiAmount,
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
  const lstReserve = useMemo(
    () => getLstReserve(strategyType),
    [getLstReserve, strategyType],
  );
  const lst = useMemo(
    () => lstMap[lstReserve.coinType],
    [lstMap, lstReserve.coinType],
  );

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
  const rewardsMap: Record<
    string,
    { amount: BigNumber; rewards: RewardSummary[] }
  > = {};
  if (obligation) {
    Object.values(userData.rewardMap).flatMap((rewards) =>
      [...rewards.deposit, ...rewards.borrow].forEach((r) => {
        if (isSendPoints(r.stats.rewardCoinType)) return;
        if (!r.obligationClaims[obligation.id]) return;
        if (r.obligationClaims[obligation.id].claimableAmount.eq(0)) return;

        const minAmount = 10 ** (-1 * r.stats.mintDecimals);
        if (r.obligationClaims[obligation.id].claimableAmount.lt(minAmount))
          return;

        if (!rewardsMap[r.stats.rewardCoinType])
          rewardsMap[r.stats.rewardCoinType] = {
            amount: new BigNumber(0),
            rewards: [],
          };
        rewardsMap[r.stats.rewardCoinType].amount = rewardsMap[
          r.stats.rewardCoinType
        ].amount.plus(r.obligationClaims[obligation.id].claimableAmount);
        rewardsMap[r.stats.rewardCoinType].rewards.push(r);
      }),
    );
  }

  const hasClaimableRewards = Object.values(rewardsMap).some(({ amount }) =>
    amount.gt(0),
  );

  // Rewards - compound
  const [isCompoundingRewards, setIsCompoundingRewards] =
    useState<boolean>(false);

  const compoundRewards = async (
    strategyOwnerCapId: TransactionObjectInput,
    transaction: Transaction,
    targetCoinType: string,
    deposit?: boolean,
  ) => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    const rewards: ClaimRewardsReward[] = Object.values(rewardsMap)
      .flatMap((r) => r.rewards)
      .map((r) => ({
        reserveArrayIndex: r.obligationClaims[obligation.id].reserveArrayIndex,
        rewardIndex: BigInt(r.stats.rewardIndex),
        rewardCoinType: r.stats.rewardCoinType,
        side: r.stats.side,
      }));

    // 1) Claim and merge coins
    const mergeCoinsMap: Record<string, TransactionObjectArgument[]> = {};
    for (const reward of rewards) {
      const [claimedCoin] = strategyClaimRewards(
        reward.rewardCoinType,
        strategyOwnerCapId,
        reward.reserveArrayIndex,
        reward.rewardIndex,
        reward.side,
        transaction,
      );

      if (mergeCoinsMap[reward.rewardCoinType] === undefined)
        mergeCoinsMap[reward.rewardCoinType] = [];
      mergeCoinsMap[reward.rewardCoinType].push(claimedCoin);
    }

    const mergedCoinsMap: Record<string, TransactionObjectArgument> = {};
    for (const [rewardCoinType, coins] of Object.entries(mergeCoinsMap)) {
      const mergedCoin = coins[0];
      if (coins.length > 1) transaction.mergeCoins(mergedCoin, coins.slice(1));

      mergedCoinsMap[rewardCoinType] = mergedCoin;
    }

    // 2) Prepare
    const nonSwappedCoinTypes = Object.keys(mergedCoinsMap).filter(
      (coinType) => coinType === targetCoinType,
    );
    const swappedCoinTypes = Object.keys(mergedCoinsMap).filter(
      (coinType) => coinType !== targetCoinType,
    );

    let resultCoin: TransactionObjectArgument | undefined = undefined;

    // 3.1) Non-swapped coins
    for (const [coinType, coin] of Object.entries(mergedCoinsMap).filter(
      ([coinType]) => nonSwappedCoinTypes.includes(coinType),
    )) {
      if (resultCoin) transaction.mergeCoins(resultCoin, [coin]);
      else resultCoin = coin;
    }

    // 3.2) Swapped coins
    // 3.2.1) Get routers
    const amountsAndSortedQuotesMap: Record<
      string,
      {
        coin: TransactionObjectArgument;
        routers: Cetus.RouterData;
      }
    > = Object.fromEntries(
      await Promise.all(
        Object.entries(mergedCoinsMap)
          .filter(([coinType]) => swappedCoinTypes.includes(coinType))
          .map(([coinType, coin]) =>
            (async () => {
              // Get amount
              const { amount } = rewardsMap[coinType]; // Use underestimate (rewards keep accruing)

              // Get routes
              const routers = await cetusSdk.findRouters({
                from: coinType,
                target: targetCoinType,
                amount: new BN(
                  amount
                    .times(10 ** appData.coinMetadataMap[coinType].decimals)
                    .integerValue(BigNumber.ROUND_DOWN)
                    .toString(),
                ), // Underestimate (rewards keep accruing)
                byAmountIn: true,
              });
              if (!routers) throw new Error("No swap quote found");
              console.log("[compoundRewards] routers", {
                coinType,
                routers,
              });

              return [coinType, { coin, routers }];
            })(),
          ),
      ),
    );
    console.log("[compoundRewards] amountsAndSortedQuotesMap", {
      amountsAndSortedQuotesMap,
    });

    // 3.2.2) Swap
    for (const [coinType, { coin: coinIn, routers }] of Object.entries(
      amountsAndSortedQuotesMap,
    )) {
      console.log("[compoundRewards] swapping coinType", coinType);
      const slippagePercent = 3;

      let coinOut: TransactionObjectArgument;
      try {
        coinOut = await cetusSdk.fixableRouterSwap({
          routers,
          inputCoin: coinIn,
          slippage: slippagePercent / 100,
          txb: transaction,
          partner: CETUS_PARTNER_ID,
        });
      } catch (err) {
        throw new Error("No swap quote found");
      }

      if (resultCoin) transaction.mergeCoins(resultCoin, [coinOut]);
      else resultCoin = coinOut;
    }

    // 4) Deposit/transfer
    if (!resultCoin) throw new Error("No coin to deposit or transfer");
    if (deposit) {
      strategyDeposit(
        resultCoin,
        targetCoinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(targetCoinType),
        transaction,
      );
    } else {
      transaction.transferObjects(
        [resultCoin],
        transaction.pure.address(address),
      );
    }
  };

  const onCompoundRewardsClick = async () => {
    if (isCompoundingRewards) return;

    setIsCompoundingRewards(true);

    try {
      if (!address) throw Error("Wallet not connected");
      if (!strategyOwnerCap || !obligation)
        throw Error("StrategyOwnerCap or Obligation not found");

      const transaction = new Transaction();
      await compoundRewards(
        strategyOwnerCap.id,
        transaction,
        lstReserve.coinType,
        true,
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
          getExposure(
            strategyType,
            obligation.deposits[0].depositedAmount,
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0),
          ),
        ).toFixed(1)
      : defaultExposure.toFixed(1),
  );

  // CoinType, reserve, and balance
  const [coinType, setCoinType] = useState<string>(NORMALIZED_SUI_COINTYPE);

  const reserveOptions = useMemo(
    () =>
      strategyInfo.coinTypes.map((coinType) => ({
        id: coinType,
        name: appData.coinMetadataMap[coinType].symbol,
      })),
    [strategyInfo.coinTypes, appData.coinMetadataMap],
  );
  const reserve = useMemo(
    () => appData.reserveMap[coinType],
    [coinType, appData.reserveMap],
  );

  const reserveBalance = useMemo(
    () => getBalance(coinType),
    [coinType, getBalance],
  );

  // Stats
  // Stats - Exposure
  const exposure = useMemo(
    () =>
      !!obligation && hasPosition(obligation)
        ? getExposure(
            strategyType,
            obligation.deposits[0].depositedAmount,
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0),
          )
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
      const tenMinsDepositAprPercent = lstReserve.depositAprPercent
        .div(MS_PER_YEAR)
        .times(10 * 60 * 1000);
      const safeDepositLimit = lstReserve.config.depositLimit.minus(
        lstReserve.depositedAmount.times(tenMinsDepositAprPercent.div(100)),
      );
      const safeDepositLimitUsd = lstReserve.config.depositLimitUsd.minus(
        lstReserve.depositedAmount
          .times(lstReserve.maxPrice)
          .times(tenMinsDepositAprPercent.div(100)),
      );

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
          reason: `Exceeds ${lstReserve.token.symbol} deposit limit`,
          isDisabled: true,
          value: BigNumber.max(
            safeDepositLimit.minus(lstReserve.depositedAmount),
            0,
          ).times(depositFactor),
        },
        {
          reason: `Exceeds ${lstReserve.token.symbol} USD deposit limit`,
          isDisabled: true,
          value: BigNumber.max(
            safeDepositLimitUsd
              .minus(lstReserve.depositedAmount.times(lstReserve.maxPrice))
              .div(lstReserve.maxPrice),
            0,
          ).times(depositFactor),
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
                ).times(borrowFactor),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimit
                    .minus(suiReserve.borrowedAmount)
                    .div(1 + borrowFee),
                ).times(borrowFactor),
              },
              {
                reason: `Exceeds ${suiReserve.token.symbol} USD borrow limit`,
                isDisabled: true,
                value: new BigNumber(
                  suiReserve.config.borrowLimitUsd
                    .minus(suiReserve.borrowedAmount.times(suiReserve.price))
                    .div(suiReserve.price)
                    .div(1 + borrowFee),
                ).times(borrowFactor),
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
                ).times(borrowFactor),
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
      lstReserve,
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
        10 ** lstReserve.mintDecimals,
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
          value: getTvlSuiAmount(strategyType, obligation).times(
            isSui(_reserve.coinType) ? 1 : lst.suiToLstExchangeRate,
          ),
        },

        // Withdraw
        {
          reason: "Insufficient liquidity to withdraw",
          isDisabled: true,
          value: new BigNumber(
            lstReserve.availableAmount.minus(depositMinAvailableAmount),
          ).times(withdrawFactor),
        },
        {
          reason: "Outflow rate limit surpassed",
          isDisabled: true,
          value: new BigNumber(
            appData.lendingMarket.rateLimiter.remainingOutflow.div(
              lstReserve.maxPrice,
            ),
          ).times(withdrawFactor),
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
      lstReserve,
      lst.lstToSuiExchangeRate,
      exposure,
      lst.suiToLstExchangeRate,
      getTvlSuiAmount,
      strategyType,
      obligation,
      appData.lendingMarket.rateLimiter.remainingOutflow,
    ],
  );

  const getMaxAmount = useCallback(
    (_coinType?: string) => {
      const _reserve =
        _coinType !== undefined ? appData.reserveMap[_coinType] : reserve;

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
      reserve,
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

  // Stats
  // Stats - TVL
  const tvlAmount = useMemo(
    () =>
      getTvlSuiAmount(strategyType, obligation)
        .times(isSui(reserve.coinType) ? 1 : lst.suiToLstExchangeRate)
        .decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN),
    [
      getTvlSuiAmount,
      strategyType,
      obligation,
      reserve.coinType,
      lst.suiToLstExchangeRate,
      reserve.token.decimals,
    ],
  );

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
  const depositFeesAmount = useMemo(() => {
    const { suiBorrowedAmount } = simulateDeposit(
      strategyType,
      isSui(reserve.coinType)
        ? { sui: new BigNumber(value || 0) }
        : { lst: new BigNumber(value || 0) },
      exposure,
    );

    // TODO: Add LST mint fee (currently 0)
    const suiBorrowFeesAmount = suiBorrowedAmount.times(
      suiBorrowFeePercent.div(100),
    );

    return (
      isSui(reserve.coinType)
        ? suiBorrowFeesAmount
        : suiBorrowFeesAmount.times(lst.suiToLstExchangeRate)
    ).decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN);
  }, [
    simulateDeposit,
    strategyType,
    reserve.coinType,
    value,
    exposure,
    suiBorrowFeePercent,
    lst.suiToLstExchangeRate,
    reserve.token.decimals,
  ]);

  const withdrawFeesAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const unloopPercent = new BigNumber(value || 0).div(tvlAmount).times(100);
    const withdrawnLstAmount = obligation.deposits[0].depositedAmount.times(
      unloopPercent.div(100),
    );

    // TODO: Add LST mint fee (currently 0)
    const lstRedeemFeesAmount = getLstRedeemFee(
      lstReserve.coinType,
      withdrawnLstAmount,
    );

    return (
      isSui(reserve.coinType)
        ? lstRedeemFeesAmount.times(lst.lstToSuiExchangeRate)
        : lstRedeemFeesAmount
    ).decimalPlaces(reserve.token.decimals, BigNumber.ROUND_DOWN);
  }, [
    obligation,
    hasPosition,
    value,
    tvlAmount,
    getLstRedeemFee,
    lstReserve.coinType,
    reserve.coinType,
    lst.lstToSuiExchangeRate,
    reserve.token.decimals,
  ]);
  const generalWithdrawFeesPercent = useMemo(() => {
    const { lstDepositedAmount, obligation } = simulateDeposit(
      strategyType,
      { sui: new BigNumber(10) },
      exposure,
    );
    const tvlSuiAmount = getTvlSuiAmount(strategyType, obligation);

    const unloopPercent = new BigNumber(100);
    const withdrawnLstAmount = lstDepositedAmount.times(unloopPercent.div(100));

    // TODO: Add LST mint fee (currently 0)
    const lstRedeemFeesAmount = getLstRedeemFee(
      lstReserve.coinType,
      withdrawnLstAmount,
    );

    return new BigNumber(lstRedeemFeesAmount.times(lst.lstToSuiExchangeRate))
      .div(tvlSuiAmount)
      .times(100);
  }, [
    simulateDeposit,
    strategyType,
    exposure,
    getTvlSuiAmount,
    getLstRedeemFee,
    lstReserve.coinType,
    lst.lstToSuiExchangeRate,
  ]);

  const adjustFeesSuiAmount = useMemo(() => {
    if (!obligation || !hasPosition(obligation)) return new BigNumber(0);

    const lstDepositedAmount = obligation.deposits[0].depositedAmount;
    const suiBorrowedAmount =
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0);
    const targetExposure = adjustExposure;

    if (targetExposure.gt(exposure)) {
      const { suiBorrowedAmount: _suiBorrowedAmount } = simulateLoopToExposure(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
        targetExposure,
      );

      // TODO: Add LST mint fee (currently 0)
      const suiBorrowFeesAmount = new BigNumber(
        _suiBorrowedAmount.minus(suiBorrowedAmount),
      ).times(suiBorrowFeePercent.div(100));

      return suiBorrowFeesAmount.decimalPlaces(
        SUI_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    } else {
      const { lstDepositedAmount: _lstDepositedAmount } =
        simulateUnloopToExposure(
          strategyType,
          lstDepositedAmount,
          suiBorrowedAmount,
          targetExposure,
        );

      // TODO: Add LST mint fee (currently 0)
      const lstRedeemFeesAmount = getLstRedeemFee(
        lstReserve.coinType,
        lstDepositedAmount.minus(_lstDepositedAmount),
      );

      return lstRedeemFeesAmount
        .times(lst.lstToSuiExchangeRate)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
    }
  }, [
    obligation,
    hasPosition,
    strategyType,
    adjustExposure,
    exposure,
    simulateLoopToExposure,
    suiBorrowFeePercent,
    simulateUnloopToExposure,
    getLstRedeemFee,
    lstReserve.coinType,
    lst.lstToSuiExchangeRate,
  ]);

  // Submit
  const getSubmitButtonNoValueState = (): SubmitButtonState | undefined => {
    // Get reserves
    const depositReserve = getLstReserve(strategyType);
    const borrowReserve = suiReserve;

    if (selectedTab === Tab.DEPOSIT) {
      // Deposit
      if (
        depositReserve.depositedAmount.gte(depositReserve.config.depositLimit)
      )
        return {
          isDisabled: true,
          title: `${depositReserve.token.symbol} deposit limit reached`,
        };
      if (
        new BigNumber(depositReserve.depositedAmountUsd).gte(
          depositReserve.config.depositLimitUsd,
        )
      )
        return {
          isDisabled: true,
          title: `${depositReserve.token.symbol} USD deposit limit reached`,
        };
      // "Cannot deposit borrowed asset" is not relevant here
      // "Max 5 deposit positions" is not relevant here

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
        // "Max 5 borrow positions" is not relevant here

        // Isolated - not relevant here
      }
    } else if (selectedTab === Tab.WITHDRAW) {
      // TODO
    } else if (selectedTab === Tab.ADJUST) {
      // TODO
    }

    return undefined;
  };
  const getSubmitButtonState = (): SubmitButtonState | undefined => {
    if (selectedTab === Tab.DEPOSIT || selectedTab === Tab.WITHDRAW) {
      const maxCalculations =
        selectedTab === Tab.DEPOSIT
          ? getMaxDepositCalculations(reserve.coinType)
          : getMaxWithdrawCalculations(reserve.coinType);

      for (const calc of maxCalculations) {
        if (new BigNumber(value).gt(calc.value))
          return { isDisabled: calc.isDisabled, title: calc.reason };
      }
    } else if (selectedTab === Tab.ADJUST) {
      return undefined; // TODO
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
    _lstDepositedAmount: BigNumber,
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ): Promise<{
    transaction: Transaction;
    lstDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
  }> => {
    if (!address) throw Error("Wallet not connected");

    let lstDepositedAmount = _lstDepositedAmount;
    let suiBorrowedAmount = _suiBorrowedAmount;

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      );
      const pendingExposure = targetExposure.minus(exposure);
      console.log(
        `[loopToExposure] ${i} start |`,
        JSON.stringify(
          {
            lstDepositedAmount: lstDepositedAmount.toFixed(20),
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
        lstDepositedAmount,
        suiBorrowedAmount,
      )
        .times(0.98) // 2% buffer
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxLstDepositedAmount = new BigNumber(
        stepMaxSuiBorrowedAmount.minus(
          getLstMintFee(lstReserve.coinType, stepMaxSuiBorrowedAmount),
        ),
      )
        .times(lst.suiToLstExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxExposure = getExposure(
        strategyType,
        lstDepositedAmount.plus(stepMaxLstDepositedAmount),
        suiBorrowedAmount.plus(stepMaxSuiBorrowedAmount),
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
          getLstMintFee(lstReserve.coinType, stepSuiBorrowedAmount),
        ),
      )
        .times(lst.suiToLstExchangeRate)
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const isMaxDeposit = stepLstDepositedAmount.eq(stepMaxLstDepositedAmount);
      console.log(
        `[LstStrategyDialog] deposit - ${i} deposit |`,
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
        lstReserve.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(lstReserve.coinType),
        transaction,
      );
      lstDepositedAmount = lstDepositedAmount.plus(stepLstDepositedAmount);
    }

    return { transaction, lstDepositedAmount, suiBorrowedAmount };
  };

  const unloopToExposure = async (
    strategyOwnerCapId: TransactionObjectInput,
    transaction: Transaction,
    _lstDepositedAmount: BigNumber,
    _suiBorrowedAmount: BigNumber,
    targetExposure: BigNumber,
  ): Promise<{
    transaction: Transaction;
    lstDepositedAmount: BigNumber;
    suiBorrowedAmount: BigNumber;
  }> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    let lstDepositedAmount = _lstDepositedAmount;
    let suiBorrowedAmount = _suiBorrowedAmount;

    for (let i = 0; i < 30; i++) {
      const exposure = getExposure(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      );
      const pendingExposure = exposure.minus(targetExposure);
      console.log(
        `[unloopToExposure] ${i} start |`,
        JSON.stringify(
          {
            lstDepositedAmount: lstDepositedAmount.toFixed(20),
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
      const stepMaxLstWithdrawnAmount = getStepMaxLstWithdrawnAmount(
        strategyType,
        lstDepositedAmount,
        suiBorrowedAmount,
      )
        .times(0.98) // 2% buffer
        .decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxSuiRepaidAmount = new BigNumber(
        stepMaxLstWithdrawnAmount.minus(
          getLstRedeemFee(lstReserve.coinType, stepMaxLstWithdrawnAmount),
        ),
      )
        .times(lst.lstToSuiExchangeRate)
        .decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);
      const stepMaxExposure = getExposure(
        strategyType,
        lstDepositedAmount.plus(stepMaxLstWithdrawnAmount),
        suiBorrowedAmount.plus(stepMaxSuiRepaidAmount),
      ).minus(exposure);
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
        lstReserve.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(lstReserve.coinType),
        BigInt(
          BigNumber.min(
            new BigNumber(
              stepLstWithdrawnAmount
                .times(10 ** LST_DECIMALS)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(lstReserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP),
            obligation.deposits[0].depositedCtokenAmount,
          ).toString(),
        ),
        transaction,
      );
      lstDepositedAmount = lstDepositedAmount.minus(stepLstWithdrawnAmount);

      // 3) Unstake withdrawn LST for SUI
      const stepSuiCoin = lst.client.redeem(transaction, withdrawnLstCoin);

      // 4) Repay SUI
      const stepSuiRepaidAmount = new BigNumber(
        stepLstWithdrawnAmount.minus(
          getLstRedeemFee(lstReserve.coinType, stepLstWithdrawnAmount),
        ),
      )
        .times(lst.lstToSuiExchangeRate)
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

    return { transaction, lstDepositedAmount, suiBorrowedAmount };
  };

  const deposit = async (
    strategyOwnerCapId: TransactionObjectInput,
    transaction: Transaction,
    amount: BigNumber,
    coinType: string,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");

    const lstAmount = (
      isSui(coinType)
        ? amount
            .minus(getLstMintFee(lstReserve.coinType, amount))
            .times(lst.suiToLstExchangeRate)
        : amount
    ).decimalPlaces(LST_DECIMALS, BigNumber.ROUND_DOWN);
    console.log(
      `[LstStrategyDialog] deposit |`,
      JSON.stringify(
        {
          amount: amount.toFixed(20),
          coinType,
          lstAmount: lstAmount.toFixed(20),
        },
        null,
        2,
      ),
    );

    // Prepare
    let lstDepositedAmount =
      !!obligation && hasPosition(obligation)
        ? obligation.deposits[0].depositedAmount.decimalPlaces(
            LST_DECIMALS,
            BigNumber.ROUND_DOWN,
          )
        : new BigNumber(0);
    const suiBorrowedAmount =
      !!obligation && hasPosition(obligation)
        ? (
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0)
          ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN)
        : new BigNumber(0);
    const targetExposure =
      !!obligation && hasPosition(obligation)
        ? getExposure(
            strategyType,
            obligation.deposits[0].depositedAmount,
            obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0),
          )
        : new BigNumber(depositSliderValue);

    console.log(
      `[LstStrategyDialog] deposit |`,
      JSON.stringify(
        {
          lstDepositedAmount: lstDepositedAmount.toFixed(20),
          suiBorrowedAmount: suiBorrowedAmount.toFixed(20),
          targetExposure: targetExposure.toFixed(20),
        },
        null,
        2,
      ),
    );

    // 1) Stake SUI for LST OR split LST coins
    let lstCoinToDeposit;
    if (isSui(coinType)) {
      const suiCoinToStake = transaction.splitCoins(transaction.gas, [
        amount
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_DOWN)
          .toString(),
      ]);
      lstCoinToDeposit = lst.client.mint(transaction, suiCoinToStake);
    } else {
      const allCoinsLst = await getAllCoins(
        suiClient,
        address,
        lstReserve.coinType,
      );
      const mergeCoinLst = mergeAllCoins(
        lstReserve.coinType,
        transaction,
        allCoinsLst,
      );

      lstCoinToDeposit = transaction.splitCoins(
        transaction.object(mergeCoinLst.coinObjectId),
        [
          BigInt(
            lstAmount
              .times(10 ** LST_DECIMALS)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        ],
      );
    }

    // 2) Deposit LST (1x exposure)
    strategyDeposit(
      lstCoinToDeposit,
      lstReserve.coinType,
      strategyOwnerCapId,
      appData.suilendClient.findReserveArrayIndex(lstReserve.coinType),
      transaction,
    );
    lstDepositedAmount = lstDepositedAmount.plus(lstAmount);

    // 3) Loop to target exposure
    transaction = (
      await loopToExposure(
        strategyOwnerCapId,
        transaction,
        lstDepositedAmount,
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
      `[LstStrategyDialog] withdraw |`,
      JSON.stringify({ unloopPercent: unloopPercent.toFixed(20) }, null, 2),
    );

    // Prepare
    let lstDepositedAmount =
      obligation.deposits[0].depositedAmount.decimalPlaces(
        LST_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    let suiBorrowedAmount = (
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0)
    ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

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
        stepMaxLstWithdrawnAmount.minus(
          getLstRedeemFee(lstReserve.coinType, stepMaxLstWithdrawnAmount),
        ),
      )
        .times(lst.lstToSuiExchangeRate)
        .minus(10 ** (-1 * SUI_DECIMALS)) // Subtract 1 MIST
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
          BigNumber.min(
            new BigNumber(
              stepLstWithdrawnAmount
                .times(10 ** LST_DECIMALS)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(lstReserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP),
            obligation.deposits[0].depositedCtokenAmount,
          ).toString(),
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

  const maxWithdraw = async (
    strategyOwnerCapId: TransactionObjectInput,
    coinType: string,
    transaction: Transaction,
  ): Promise<Transaction> => {
    if (!address) throw Error("Wallet not connected");
    if (!obligation) throw Error("Obligation not found");

    // 1) Compound rewards
    const transactionCopy = Transaction.from(transaction);
    try {
      await compoundRewards(
        strategyOwnerCapId,
        transactionCopy,
        lstReserve.coinType,
        true,
      );
      await dryRunTransaction(transactionCopy);
      transaction = transactionCopy;
    } catch (err) {
      console.error(err);
    }

    // 2) Max withdraw
    let suiCoin: TransactionObjectArgument | undefined = undefined;
    for (let i = 0; i < 30; i++) {
      console.log(`[LstStrategyDialog] maxWithdraw - ${i} start`);

      // 2.1) Max withdraw LST
      const [withdrawnLstCoin] = strategyWithdraw(
        lstReserve.coinType,
        strategyOwnerCapId,
        appData.suilendClient.findReserveArrayIndex(lstReserve.coinType),
        BigInt(MAX_U64.toString()),
        transaction,
      );

      // 2.2) Unstake withdrawn LST for SUI
      const stepSuiCoin = lst.client.redeem(transaction, withdrawnLstCoin);
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
      // 2.4) Stake SUI for LST
      const lstCoin = lst.client.mint(transaction, suiCoin);

      // 2.5) Transfer LST to user
      transaction.transferObjects([lstCoin], address);
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
    const lstDepositedAmount =
      obligation.deposits[0].depositedAmount.decimalPlaces(
        LST_DECIMALS,
        BigNumber.ROUND_DOWN,
      );
    const suiBorrowedAmount = (
      obligation.borrows[0]?.borrowedAmount ?? new BigNumber(0)
    ).decimalPlaces(SUI_DECIMALS, BigNumber.ROUND_DOWN);

    console.log(
      `[LstStrategyDialog] adjust |`,
      JSON.stringify(
        {
          lstDepositedAmount: lstDepositedAmount.toFixed(20),
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
          lstDepositedAmount,
          suiBorrowedAmount,
          targetExposure,
        )
      ).transaction;
    else
      return (
        await unloopToExposure(
          strategyOwnerCapId,
          transaction,
          lstDepositedAmount,
          suiBorrowedAmount,
          targetExposure,
        )
      ).transaction;
  };

  const onSubmitClick = async () => {
    if (!address) throw Error("Wallet not connected");
    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    try {
      let transaction = new Transaction();

      // 1) Refresh pyth oracles (LST and SUI) - required when borrowing or withdrawing
      await appData.suilendClient.refreshAll(transaction, undefined, [
        lstReserve.coinType,
        NORMALIZED_SUI_COINTYPE,
      ]);

      if (selectedTab === Tab.DEPOSIT) {
        const { strategyOwnerCapId, didCreate } =
          createStrategyOwnerCapIfNoneExists(
            strategyType,
            strategyOwnerCap,
            transaction,
          );

        // 2) Deposit
        transaction = await deposit(
          strategyOwnerCapId,
          transaction,
          new BigNumber(value),
          reserve.coinType,
        );

        // 3) Rebalance LST
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
            `into ${strategyInfo.title} ${strategyInfo.type} strategy`,
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

        // 3) Rebalance LST
        lst.client.rebalance(
          transaction,
          lst.client.liquidStakingObject.weightHookId,
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
            `from ${strategyInfo.title} ${strategyInfo.type} strategy`,
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

        // 3) Rebalance LST
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
        } ${strategyInfo.title} ${strategyInfo.type} strategy`,
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
        <div className="mb-4 flex h-10 w-full flex-row items-center justify-between">
          <LstStrategyHeader strategyType={strategyType} />

          {hasClaimableRewards && (
            <div className="flex h-10 flex-row items-center gap-4 rounded-sm border px-2">
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

              <Button
                className="w-[92px] md:w-[159px]"
                labelClassName="uppercase"
                variant="secondary"
                size="sm"
                disabled={isCompoundingRewards}
                onClick={onCompoundRewardsClick}
              >
                {isCompoundingRewards ? (
                  <Spinner size="sm" />
                ) : md ? (
                  "Compound rewards"
                ) : (
                  "Compound"
                )}
              </Button>
            </div>
          )}
        </div>

        <div
          className="flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch"
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
                  <>
                    <LabelWithValue
                      label="Deposit fee"
                      value={`${formatToken(depositFeesAmount, {
                        dp: reserve.token.decimals,
                        trimTrailingZeros: true,
                      })} ${reserve.token.symbol}`}
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
