import Head from "next/head";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AggregatorClient as CetusSdk } from "@cetusprotocol/aggregator-sdk";
import { AggregatorQuoter as FlowXAggregatorQuoter } from "@flowx-finance/sdk";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import { Aftermath as AftermathSdk } from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCw,
} from "lucide-react";
import { ReactFlowProvider } from "reactflow";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";

import {
  LENDING_MARKET_ID,
  QUOTE_PROVIDER_NAME_MAP,
  QuoteProvider,
  StandardizedQuote,
  WAD,
  createObligationIfNoneExists,
  getAggQuotes,
  getSwapTransaction,
  sendObligationToUser,
} from "@suilend/sdk";
import { Action } from "@suilend/sdk/lib/types";
import {
  MAX_U64,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  TX_TOAST_DURATION,
  Token,
  formatInteger,
  formatPercent,
  formatToken,
  formatUsd,
  getBalanceChange,
  isSui,
} from "@suilend/sui-fe";
import mixpanelTrack from "@suilend/sui-fe/lib/track";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import Switch from "@/components/shared/Switch";
import TextLink from "@/components/shared/TextLink";
import TokenLogos from "@/components/shared/TokenLogos";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import YourUtilizationLabel from "@/components/shared/YourUtilizationLabel";
import BulkSwapCard from "@/components/swap/BulkSwapCard";
import RoutingDialog from "@/components/swap/RoutingDialog";
import SwapInput from "@/components/swap/SwapInput";
import SwapSlippagePopover, {
  SLIPPAGE_PERCENT_DP,
} from "@/components/swap/SwapSlippagePopover";
import TokenRatiosChart from "@/components/swap/TokenRatiosChart";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  HISTORICAL_USD_PRICES_INTERVAL_S,
  SwapContextProvider,
  useSwapContext,
} from "@/contexts/SwapContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import {
  getMaxValue,
  getNewBorrowUtilizationCalculations,
  getSubmitButtonNoValueState,
  getSubmitButtonState,
  getSubmitWarningMessages,
} from "@/lib/actions";
import {
  MAX_BALANCE_SUI_SUBTRACTED_AMOUNT,
  MAX_DEPOSITS_PER_OBLIGATION,
} from "@/lib/constants";
import safaryTrack from "@/lib/safary";
import { TokenDirection } from "@/lib/swap";
import { SubmitButtonState } from "@/lib/types";
import { cn } from "@/lib/utils";

const getCtokenExchangeRate = (eventData: any) =>
  new BigNumber(eventData.ctoken_supply).eq(0)
    ? new BigNumber(1)
    : new BigNumber(eventData.supply_amount.value)
        .div(WAD)
        .div(eventData.ctoken_supply);

const PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD = 2;
const PRICE_DIFFERENCE_PERCENT_CRITICAL_THRESHOLD = 20;
const PRICE_DIFFERENCE_PERCENT_CHECKBOX_THRESHOLD = 5;

function Page() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData, openLedgerHashDialog, closeLedgerHashDialog } =
    useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { getBalance, refresh, obligationMap, obligationOwnerCapMap } =
    useLoadedUserContext();
  const obligationMainMarket = obligationMap[LENDING_MARKET_ID];
  const obligationOwnerCapMainMarket = obligationOwnerCapMap[LENDING_MARKET_ID];

  const {
    sdkMap,
    partnerIdMap,
    tokenHistoricalUsdPricesMap,
    fetchTokenHistoricalUsdPrices,
    tokenUsdPricesMap,
    fetchTokenUsdPrice,
    swapInAccount,
    setSwapInAccount,
    tokens,
    setTokenSymbol,
    reverseTokenSymbols,
    ...restSwapContext
  } = useSwapContext();
  const tokenIn = restSwapContext.tokenIn as Token;
  const tokenOut = restSwapContext.tokenOut as Token;

  // send.ag
  const activeProviders = useMemo(
    () => [QuoteProvider.CETUS, QuoteProvider._7K, QuoteProvider.FLOWX],
    [],
  );

  // Balances
  const tokenInBalance = getBalance(tokenIn.coinType);

  // Reserves
  const tokenInReserve = appDataMainMarket.lendingMarket.reserves.find(
    (reserve) => reserve.coinType === tokenIn.coinType,
  );
  const tokenOutReserve = appDataMainMarket.lendingMarket.reserves.find(
    (reserve) => reserve.coinType === tokenOut.coinType,
  );

  // Positions
  // In
  const tokenInDepositPosition = obligationMainMarket?.deposits?.find(
    (d) => d.coinType === tokenIn.coinType,
  );
  const tokenInDepositPositionAmount = useMemo(
    () => tokenInDepositPosition?.depositedAmount ?? new BigNumber(0),
    [tokenInDepositPosition],
  );

  // Out
  const tokenOutDepositPosition = obligationMainMarket?.deposits?.find(
    (d) => d.coinType === tokenOut.coinType,
  );

  const tokenOutBorrowPosition = obligationMainMarket?.borrows?.find(
    (b) => b.coinType === tokenOut.coinType,
  );
  const tokenOutBorrowPositionAmount = useMemo(
    () => tokenOutBorrowPosition?.borrowedAmount ?? new BigNumber(0),
    [tokenOutBorrowPosition],
  );

  // Max/percent
  const tokenInMaxCalculations = (() => {
    const result = [
      {
        reason: `Insufficient ${tokenIn.symbol}`,
        isDisabled: true,
        value: swapInAccount
          ? getMaxValue(
              Action.WITHDRAW,
              tokenInReserve!,
              tokenInDepositPositionAmount,
              appDataMainMarket,
              obligationMainMarket,
            )()
          : tokenInBalance,
      },
    ];
    if (isSui(tokenIn.coinType) && !swapInAccount)
      result.push({
        reason: `${MAX_BALANCE_SUI_SUBTRACTED_AMOUNT} SUI should be saved for gas`,
        isDisabled: true,
        value: tokenInBalance.minus(MAX_BALANCE_SUI_SUBTRACTED_AMOUNT),
      });

    return result;
  })();

  const getTokenInPercentAmount = (percent: number) =>
    BigNumber.max(
      new BigNumber(0),
      BigNumber.min(
        ...Object.values(tokenInMaxCalculations).map((calc) => calc.value),
      ),
    )
      .times(percent / 100)
      .toFixed(tokenIn.decimals, BigNumber.ROUND_DOWN);

  // Slippage
  const [slippagePercent, setSlippagePercent] = useLocalStorage<string>(
    "swapSlippage",
    "1.0",
  );

  const formatAndSetSlippagePercent = useCallback(
    (_value: string) => {
      let formattedValue;
      if (new BigNumber(_value || 0).lt(0)) formattedValue = "0";
      else if (new BigNumber(_value).gt(100)) formattedValue = "100";
      else if (!_value.includes(".")) formattedValue = _value;
      else {
        const [integers, decimals] = _value.split(".");
        const integersFormatted = formatInteger(
          integers !== "" ? parseInt(integers) : 0,
          false,
        );
        const decimalsFormatted = decimals.slice(
          0,
          Math.min(decimals.length, SLIPPAGE_PERCENT_DP),
        );
        formattedValue = `${integersFormatted}.${decimalsFormatted}`;
      }

      setSlippagePercent(formattedValue);
    },
    [setSlippagePercent],
  );

  // State
  const [isSubmitting_swap, setIsSubmitting_swap] = useState<boolean>(false);
  const [isSubmitting_swapAndDeposit, setIsSubmitting_swapAndDeposit] =
    useState<boolean>(false);
  const [isSubmitting_swapInAccount, setIsSubmitting_swapInAccount] =
    useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  // Quote
  const [quotesMap, setQuotesMap] = useState<
    Record<number, (StandardizedQuote | null)[]>
  >({});

  const quotes = useMemo(() => {
    const timestampsS = Object.entries(quotesMap)
      .filter(([, value]) => value.length > 0)
      .map(([timestampS]) => +timestampS);
    if (timestampsS.length === 0) return undefined;

    const maxTimestampS = Math.max(...timestampsS);
    if (quotesMap[maxTimestampS].filter(Boolean).length === 0) return undefined;

    const sortedQuotes = (
      quotesMap[maxTimestampS].filter(Boolean) as StandardizedQuote[]
    )
      .slice()
      .sort((a, b) => +b.out.amount.minus(a.out.amount));
    return sortedQuotes;
  }, [quotesMap]);

  const [overrideQuoteId, setOverrideQuoteId] = useState<string | undefined>(
    undefined,
  );
  const quote =
    quotes?.find((q) => q.id === overrideQuoteId) ??
    quotes?.find(
      (q) =>
        q.in.coinType === tokenIn.coinType &&
        q.out.coinType === tokenOut.coinType,
    ); // Best quote by amount out

  const isFetchingQuotes = useMemo(() => {
    const timestampsS = Object.keys(quotesMap).map((timestampS) => +timestampS);
    if (timestampsS.length === 0) return false;

    const maxTimestampS = Math.max(...timestampsS);
    return quotesMap[maxTimestampS].filter(Boolean).length < 1; // < numActiveProviders;
  }, [quotesMap]);

  const fetchQuotes = useCallback(
    async (
      _sdkMap: {
        [QuoteProvider.AFTERMATH]: AftermathSdk;
        [QuoteProvider.CETUS]: CetusSdk;
        [QuoteProvider.FLOWX]: FlowXAggregatorQuoter;
      },
      _activeProviders: QuoteProvider[],
      _tokenIn: Token,
      _tokenOut: Token,
      _value: string,
    ) => {
      if (_tokenIn.coinType === _tokenOut.coinType) return;
      if (new BigNumber(_value || 0).lte(0)) return;

      const amountIn = new BigNumber(_value)
        .times(10 ** _tokenIn.decimals)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString();

      const timestamp = new Date().getTime();
      setQuotesMap((o) => ({ ...(o ?? {}), [timestamp]: [] }));

      await getAggQuotes(
        _sdkMap,
        _activeProviders,
        (quote) => {
          setQuotesMap((o) => ({
            ...(o ?? {}),
            [timestamp]: [...((o ?? {})[timestamp] ?? []), quote],
          }));
        },
        _tokenIn,
        _tokenOut,
        amountIn,
      );
    },
    [],
  );

  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);

    if (
      isSubmitting_swap ||
      isSubmitting_swapAndDeposit ||
      isSubmitting_swapInAccount
    )
      return;
    refreshIntervalRef.current = setInterval(
      () => fetchQuotes(sdkMap, activeProviders, tokenIn, tokenOut, value),
      60 * 1000,
    );

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [
    isSubmitting_swap,
    isSubmitting_swapAndDeposit,
    isSubmitting_swapInAccount,
    fetchQuotes,
    sdkMap,
    activeProviders,
    tokenIn,
    tokenOut,
    value,
  ]);

  // Value
  const formatAndSetValue = useCallback((_value: string, token: Token) => {
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
        Math.min(decimals.length, token.decimals),
      );
      formattedValue = `${integersFormatted}.${decimalsFormatted}`;
    }

    setValue(formattedValue);
  }, []);

  const onValueChange = (_value: string) => {
    formatAndSetValue(_value, tokenIn);

    if (new BigNumber(_value || 0).gt(0))
      fetchQuotes(sdkMap, activeProviders, tokenIn, tokenOut, _value);
    else setQuotesMap({});
  };

  const usePercentValueWrapper = (percent: number) => {
    const tokenInPercentAmount = getTokenInPercentAmount(percent);
    formatAndSetValue(tokenInPercentAmount, tokenIn);

    if (new BigNumber(tokenInPercentAmount).gt(0))
      fetchQuotes(
        sdkMap,
        activeProviders,
        tokenIn,
        tokenOut,
        tokenInPercentAmount,
      );
    else setQuotesMap({});

    inputRef.current?.focus();
  };

  // Swap in account
  const prevSwapInAccountRef = useRef<boolean>(swapInAccount);
  useEffect(() => {
    if (prevSwapInAccountRef.current === swapInAccount) return;
    prevSwapInAccountRef.current = swapInAccount;

    fetchQuotes(sdkMap, activeProviders, tokenIn, tokenOut, value);
  }, [
    swapInAccount,
    fetchQuotes,
    sdkMap,
    activeProviders,
    tokenIn,
    tokenOut,
    value,
  ]);

  // Swap in account - utilization
  const newObligation_deposit = useMemo(() => {
    if (!(obligationMainMarket && tokenInReserve && tokenOutReserve && quote))
      return undefined;

    const withdrawObligation = {
      ...obligationMainMarket,
      ...(getNewBorrowUtilizationCalculations(
        Action.WITHDRAW,
        tokenInReserve,
        obligationMainMarket,
      )(quote.in.amount) ?? {}),
    };
    const depositObligation = {
      ...withdrawObligation,
      ...(getNewBorrowUtilizationCalculations(
        Action.DEPOSIT,
        tokenOutReserve,
        withdrawObligation,
      )(quote.out.amount) ?? {}),
    };

    return depositObligation;
  }, [obligationMainMarket, tokenInReserve, tokenOutReserve, quote]);

  const newObligation_repay = useMemo(() => {
    if (!(obligationMainMarket && tokenInReserve && tokenOutReserve && quote))
      return undefined;

    const withdrawObligation = {
      ...obligationMainMarket,
      ...(getNewBorrowUtilizationCalculations(
        Action.WITHDRAW,
        tokenInReserve,
        obligationMainMarket,
      )(quote.in.amount) ?? {}),
    };
    const repayObligation = {
      ...withdrawObligation,
      ...(getNewBorrowUtilizationCalculations(
        Action.REPAY,
        tokenOutReserve,
        withdrawObligation,
      )(BigNumber.min(quote.out.amount, tokenOutBorrowPositionAmount)) ?? {}),
    };

    return repayObligation;
  }, [
    obligationMainMarket,
    tokenInReserve,
    tokenOutReserve,
    quote,
    tokenOutBorrowPositionAmount,
  ]);

  // USD prices - historical
  const tokenInHistoricalUsdPrices = useMemo(
    () => tokenHistoricalUsdPricesMap[tokenIn.coinType],
    [tokenHistoricalUsdPricesMap, tokenIn.coinType],
  );
  const tokenOutHistoricalUsdPrices = useMemo(
    () => tokenHistoricalUsdPricesMap[tokenOut.coinType],
    [tokenHistoricalUsdPricesMap, tokenOut.coinType],
  );

  const fetchedInitialTokenHistoricalUsdPricesRef = useRef<boolean>(false);
  useEffect(() => {
    if (fetchedInitialTokenHistoricalUsdPricesRef.current) return;

    fetchTokenHistoricalUsdPrices(tokenIn);
    fetchTokenHistoricalUsdPrices(tokenOut);
    fetchedInitialTokenHistoricalUsdPricesRef.current = true;
  }, [fetchTokenHistoricalUsdPrices, tokenIn, tokenOut]);

  // USD prices - current
  const tokenInUsdPrice = useMemo(
    () => tokenUsdPricesMap[tokenIn.coinType],
    [tokenUsdPricesMap, tokenIn.coinType],
  );
  const tokenOutUsdPrice = useMemo(
    () => tokenUsdPricesMap[tokenOut.coinType],
    [tokenUsdPricesMap, tokenOut.coinType],
  );

  const fetchedInitialTokenUsdPricesRef = useRef<boolean>(false);
  useEffect(() => {
    if (fetchedInitialTokenUsdPricesRef.current) return;

    fetchTokenUsdPrice(tokenIn);
    fetchTokenUsdPrice(tokenOut);
    fetchedInitialTokenUsdPricesRef.current = true;
  }, [fetchTokenUsdPrice, tokenIn, tokenOut]);

  const tokenInUsdValue = useMemo(
    () =>
      quote !== undefined && tokenInUsdPrice !== undefined
        ? quote.in.amount.times(tokenInUsdPrice)
        : undefined,
    [quote, tokenInUsdPrice],
  );
  const tokenOutUsdValue = useMemo(
    () =>
      quote !== undefined && tokenOutUsdPrice !== undefined
        ? quote.out.amount.times(tokenOutUsdPrice)
        : undefined,
    [quote, tokenOutUsdPrice],
  );

  // Ratios
  const [isInverted, setIsInverted] = useState<boolean>(true);
  const currentTokenRatio = useMemo(
    () =>
      tokenInUsdPrice !== undefined &&
      tokenOutUsdPrice !== undefined &&
      !tokenInUsdPrice.eq(0) &&
      !tokenOutUsdPrice.eq(0)
        ? new BigNumber(!isInverted ? tokenInUsdPrice : tokenOutUsdPrice).div(
            !isInverted ? tokenOutUsdPrice : tokenInUsdPrice,
          )
        : undefined,
    [tokenInUsdPrice, tokenOutUsdPrice, isInverted],
  );
  const currentTokenRatioDp = useMemo(
    () =>
      currentTokenRatio !== undefined
        ? Math.max(0, -Math.floor(Math.log10(+currentTokenRatio)) - 1) + 4
        : undefined,
    [currentTokenRatio],
  );

  const historicalTokenRatios = useMemo(() => {
    if (
      tokenInHistoricalUsdPrices === undefined ||
      tokenOutHistoricalUsdPrices === undefined
    )
      return undefined;

    const minTimestampS = Math.max(
      Math.min(...tokenInHistoricalUsdPrices.map((item) => item.timestampS)),
      Math.min(...tokenOutHistoricalUsdPrices.map((item) => item.timestampS)),
    );
    const maxTimestampS = Math.min(
      Math.max(...tokenInHistoricalUsdPrices.map((item) => item.timestampS)),
      Math.max(...tokenOutHistoricalUsdPrices.map((item) => item.timestampS)),
    );

    const timestampsS: number[] = [minTimestampS];
    while (timestampsS[timestampsS.length - 1] < maxTimestampS) {
      timestampsS.push(
        timestampsS[timestampsS.length - 1] + HISTORICAL_USD_PRICES_INTERVAL_S,
      );
    }

    const result = timestampsS.map((timestampS) => ({
      timestampS,
      ratio: +new BigNumber(
        (!isInverted
          ? tokenInHistoricalUsdPrices
          : tokenOutHistoricalUsdPrices
        ).find((item) => item.timestampS === timestampS)?.priceUsd ?? 0,
      ).div(
        (!isInverted
          ? tokenOutHistoricalUsdPrices
          : tokenInHistoricalUsdPrices
        ).find((item) => item.timestampS === timestampS)?.priceUsd ?? 1,
      ),
    }));
    if (currentTokenRatio)
      result.push({
        timestampS: Math.floor(Date.now() / 1000),
        ratio: +currentTokenRatio,
      });

    return result;
  }, [
    tokenInHistoricalUsdPrices,
    tokenOutHistoricalUsdPrices,
    isInverted,
    currentTokenRatio,
  ]);

  const tokenRatio24hAgo = useMemo(
    () =>
      historicalTokenRatios !== undefined
        ? historicalTokenRatios[0].ratio
        : undefined,
    [historicalTokenRatios],
  );
  const tokenRatio24hChangePercent = useMemo(
    () =>
      currentTokenRatio !== undefined && tokenRatio24hAgo !== undefined
        ? new BigNumber(currentTokenRatio.minus(tokenRatio24hAgo))
            .div(tokenRatio24hAgo)
            .times(100)
        : undefined,
    [currentTokenRatio, tokenRatio24hAgo],
  );

  // Ratios - quote
  const quoteRatio = useMemo(
    () =>
      quote !== undefined
        ? (!isInverted ? quote.out.amount : quote.in.amount).div(
            !isInverted ? quote.in.amount : quote.out.amount,
          )
        : undefined,
    [quote, isInverted],
  );

  // Quote selection
  const [isQuotesListCollapsed, setIsQuotesListCollapsed] =
    useState<boolean>(true);
  const toggleIsQuotesListCollapsed = () => setIsQuotesListCollapsed((o) => !o);

  // Price difference
  const priceDifferencePercent = useMemo(
    () =>
      quoteRatio !== undefined && currentTokenRatio !== undefined
        ? BigNumber.max(
            0,
            (!isInverted
              ? currentTokenRatio.minus(quoteRatio).div(currentTokenRatio)
              : quoteRatio.minus(currentTokenRatio).div(quoteRatio)
            ).times(100),
          )
        : undefined,
    [quoteRatio, currentTokenRatio, isInverted],
  );
  const PriceDifferenceIcon = priceDifferencePercent?.gte(
    PRICE_DIFFERENCE_PERCENT_CRITICAL_THRESHOLD,
  )
    ? AlertCircle
    : priceDifferencePercent?.gte(PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD)
      ? AlertTriangle
      : Info;

  const [isPriceDifferenceAware, setIsPriceDifferenceAware] =
    useState<boolean>(false);

  // Reverse tokens
  const reverseTokens = () => {
    formatAndSetValue(value, tokenOut);
    setQuotesMap({});

    if (new BigNumber(value || 0).gt(0))
      fetchQuotes(sdkMap, activeProviders, tokenOut, tokenIn, value);

    reverseTokenSymbols();

    inputRef.current?.focus();
  };

  // Select token
  const onTokenCoinTypeChange = (
    coinType: string,
    direction: TokenDirection,
  ) => {
    const _token = tokens?.find((t) => t.coinType === coinType);
    if (!_token) return;

    if (
      _token.coinType ===
      (direction === TokenDirection.IN ? tokenOut : tokenIn).coinType
    )
      reverseTokens();
    else {
      setQuotesMap({});

      const hasReserve = !!appDataMainMarket.reserveMap[coinType];
      setTokenSymbol(hasReserve ? _token.symbol : _token.coinType, direction);

      fetchQuotes(
        sdkMap,
        activeProviders,
        direction === TokenDirection.IN ? _token : tokenIn,
        direction === TokenDirection.IN ? tokenOut : _token,
        value,
      );
      if (tokenHistoricalUsdPricesMap[_token.coinType] === undefined)
        fetchTokenHistoricalUsdPrices(_token);
      if (tokenUsdPricesMap[_token.coinType] === undefined)
        fetchTokenUsdPrice(_token);
    }

    inputRef.current?.focus();
  };

  // Swap
  const buttonState_swap: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting_swap) return { isDisabled: true, isLoading: true };

    if (value === "") return { isDisabled: true, title: "Enter an amount" };
    if (new BigNumber(value).lt(0))
      return { isDisabled: true, title: "Enter a +ve amount" };
    if (new BigNumber(value).eq(0))
      return { isDisabled: true, title: "Enter a non-zero amount" };

    for (const calc of tokenInMaxCalculations) {
      if (new BigNumber(value).gt(calc.value))
        return { isDisabled: calc.isDisabled, title: calc.reason };
    }

    return {
      title: `Swap ${tokenIn.symbol} for ${tokenOut.symbol}`,
      isDisabled:
        !quote ||
        isFetchingQuotes ||
        isSubmitting_swapAndDeposit ||
        (priceDifferencePercent?.gt(
          PRICE_DIFFERENCE_PERCENT_CHECKBOX_THRESHOLD,
        ) &&
          !isPriceDifferenceAware),
    };
  })();

  // Swap and deposit/repay
  const action_swapAndDeposit = tokenOutBorrowPositionAmount.eq(0)
    ? Action.DEPOSIT
    : Action.REPAY;

  const buttonState_swapAndDeposit: SubmitButtonState = (() => {
    if (!tokenOutReserve)
      return {
        isDisabled: true,
        title: `Cannot ${action_swapAndDeposit} this token`,
      };

    if (!address)
      return {
        isDisabled: true,
        title: `Swap ${tokenIn.symbol} for ${tokenOut.symbol} and ${
          action_swapAndDeposit
        }`,
      };
    if (isSubmitting_swapAndDeposit)
      return { isDisabled: true, isLoading: true };

    const buttonNoValueState = getSubmitButtonNoValueState(
      action_swapAndDeposit,
      appDataMainMarket.lendingMarket.reserves,
      tokenOutReserve,
      obligationMainMarket,
    )();
    if (buttonNoValueState !== undefined) return buttonNoValueState;

    const buttonState = getSubmitButtonState(
      action_swapAndDeposit,
      tokenOutReserve,
      MAX_U64,
      appDataMainMarket,
      obligationMainMarket,
    )(
      BigNumber.min(
        quote?.out.amount ?? new BigNumber(0),
        action_swapAndDeposit === Action.DEPOSIT
          ? 0
          : tokenOutBorrowPositionAmount,
      ),
    );
    if (buttonState !== undefined) return buttonState;

    return {
      title: `Swap ${tokenIn.symbol} for ${tokenOut.symbol} and ${action_swapAndDeposit}`,
      isDisabled: buttonState_swap.isDisabled,
    };
  })();

  const warningMessages_swapAndDeposit = tokenOutReserve
    ? getSubmitWarningMessages(
        action_swapAndDeposit,
        appDataMainMarket.lendingMarket.reserves,
        tokenOutReserve,
        appDataMainMarket,
        obligationMainMarket,
      )()
    : undefined;

  // Swap in account
  const action_swapInAccount = tokenOutBorrowPositionAmount.eq(0)
    ? Action.DEPOSIT
    : Action.REPAY;

  const buttonState_swapInAccount: SubmitButtonState = (() => {
    if (!tokenOutReserve)
      return {
        isDisabled: true,
        title: `Cannot ${action_swapInAccount} this token`,
      };

    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSubmitting_swapInAccount)
      return { isDisabled: true, isLoading: true };

    const buttonNoValueState = getSubmitButtonNoValueState(
      action_swapInAccount,
      appDataMainMarket.lendingMarket.reserves,
      tokenOutReserve,
      obligationMainMarket,
    )();
    if (buttonNoValueState !== undefined) return buttonNoValueState;

    if (value === "") return { isDisabled: true, title: "Enter an amount" };
    if (new BigNumber(value).lt(0))
      return { isDisabled: true, title: "Enter a +ve amount" };
    if (new BigNumber(value).eq(0))
      return { isDisabled: true, title: "Enter a non-zero amount" };

    for (const calc of tokenInMaxCalculations) {
      if (new BigNumber(value).gt(calc.value))
        return { isDisabled: calc.isDisabled, title: calc.reason };
    }

    const buttonState = getSubmitButtonState(
      action_swapInAccount,
      tokenOutReserve,
      MAX_U64,
      appDataMainMarket,
      obligationMainMarket,
    )(
      BigNumber.min(
        quote?.out.amount ?? new BigNumber(0),
        action_swapInAccount === Action.DEPOSIT
          ? 0
          : tokenOutBorrowPositionAmount,
      ),
    );
    if (buttonState !== undefined) return buttonState;

    return {
      title: `Swap ${tokenIn.symbol} for ${tokenOut.symbol} and ${action_swapInAccount}`,
      isDisabled: !quote || isFetchingQuotes,
    };
  })();

  const warningMessages_swapInAccount = tokenOutReserve
    ? getSubmitWarningMessages(
        action_swapInAccount,
        appDataMainMarket.lendingMarket.reserves,
        tokenOutReserve,
        appDataMainMarket,
        obligationMainMarket,
      )()
    : undefined;

  // Submit
  // If `coinIn` is `undefined`, `transaction` is an empty transaction
  const getTransactionForStandardizedQuote = async (
    transaction: Transaction,
    coinIn: TransactionObjectArgument | undefined,
  ): Promise<{
    transaction: Transaction;
    coinOut?: TransactionObjectArgument;
  }> => {
    if (!address) throw new Error("Wallet not connected");
    if (!quote) throw new Error("No quote found");

    return getSwapTransaction(
      suiClient,
      address,
      quote,
      +slippagePercent,
      sdkMap,
      partnerIdMap,
      transaction,
      coinIn,
    );
  };

  const swap = async (isSwapAndDeposit?: boolean) => {
    if (!address) throw new Error("Wallet not connected");
    if (!quote) throw new Error("No quote found");

    const submitAmount = quote.in.amount
      .times(10 ** tokenIn.decimals)
      .integerValue(BigNumber.ROUND_DOWN)
      .toString();

    let transaction = new Transaction();

    let coinIn: TransactionObjectArgument | undefined;
    if (swapInAccount) {
      if (!obligationMainMarket || !obligationOwnerCapMainMarket)
        throw new Error("Obligation or ObligationOwnerCap not found");
      if (!tokenInReserve || !tokenInDepositPosition)
        throw new Error("Cannot withdraw this token");

      const withdrawAmount = BigNumber.min(
        new BigNumber(submitAmount)
          .div(tokenInReserve.cTokenExchangeRate)
          .integerValue(BigNumber.ROUND_UP),
        tokenInDepositPosition.depositedCtokenAmount,
      ).toString();

      // TODO: Support MAX
      const [_coinIn] = await appDataMainMarket.suilendClient.withdraw(
        obligationOwnerCapMainMarket.id,
        obligationMainMarket.id,
        tokenIn.coinType,
        withdrawAmount,
        transaction,
      );

      const coinToSwap = transaction.splitCoins(_coinIn, [submitAmount]);
      transaction.transferObjects([_coinIn], address);

      coinIn = coinToSwap;
    }

    const { transaction: _transaction, coinOut } =
      await getTransactionForStandardizedQuote(transaction, coinIn);
    if (!coinOut) throw new Error("Missing coin to deposit/transfer to user");

    transaction = _transaction;

    if (swapInAccount) {
      if (action_swapInAccount === Action.DEPOSIT) {
        // DEPOSIT out token
        if (!tokenOutReserve) throw new Error("Cannot deposit this token");

        const { obligationOwnerCapId, didCreate } =
          createObligationIfNoneExists(
            appDataMainMarket.suilendClient,
            transaction,
            obligationOwnerCapMainMarket,
          );
        appDataMainMarket.suilendClient.deposit(
          coinOut!, // Checked above
          tokenOutReserve.coinType,
          obligationOwnerCapId,
          transaction,
        );
        if (didCreate)
          sendObligationToUser(obligationOwnerCapId, address, transaction);
      } else {
        // REPAY out token
        if (!tokenOutReserve) throw new Error("Cannot repay this token");
        if (!obligationMainMarket) throw new Error("Obligation not found");

        appDataMainMarket.suilendClient.repay(
          obligationMainMarket.id,
          tokenOutReserve.coinType,
          coinOut!, // Checked above
          transaction,
        );

        const repaidAmount = BigNumber.min(
          quote.out.amount,
          tokenOutBorrowPositionAmount,
        );
        const depositedAmount = quote.out.amount.minus(repaidAmount);

        if (depositedAmount.gt(0)) {
          if (
            obligationMainMarket.deposits.length < MAX_DEPOSITS_PER_OBLIGATION
          ) {
            appDataMainMarket.suilendClient.deposit(
              coinOut!, // Checked above
              tokenOutReserve.coinType,
              obligationOwnerCapMainMarket!.id,
              transaction,
            ); // Deposit remainder
          } else {
            transaction.transferObjects(
              [coinOut!], // Checked above
              transaction.pure.address(address),
            ); // Transfer remainder to user
          }
        } else {
          transaction.transferObjects(
            [coinOut!], // Checked above
            transaction.pure.address(address),
          ); // Transfer empty coin to user
        }
      }
    } else {
      if (isSwapAndDeposit) {
        if (action_swapInAccount === Action.DEPOSIT) {
          // DEPOSIT out token
          if (!tokenOutReserve) throw new Error("Cannot deposit this token");

          const { obligationOwnerCapId, didCreate } =
            createObligationIfNoneExists(
              appDataMainMarket.suilendClient,
              transaction,
              obligationOwnerCapMainMarket,
            );
          appDataMainMarket.suilendClient.deposit(
            coinOut!, // Checked above
            tokenOutReserve.coinType,
            obligationOwnerCapId,
            transaction,
          );
          if (didCreate)
            sendObligationToUser(obligationOwnerCapId, address, transaction);
        } else {
          // REPAY out token
          if (!tokenOutReserve) throw new Error("Cannot repay this token");
          if (!obligationMainMarket) throw new Error("Obligation not found");

          appDataMainMarket.suilendClient.repay(
            obligationMainMarket.id,
            tokenOutReserve.coinType,
            coinOut!, // Checked above
            transaction,
          );

          const repaidAmount = BigNumber.min(
            quote.out.amount,
            tokenOutBorrowPositionAmount,
          );
          const depositedAmount = quote.out.amount.minus(repaidAmount);

          if (depositedAmount.gt(0)) {
            if (
              obligationMainMarket.deposits.length < MAX_DEPOSITS_PER_OBLIGATION
            ) {
              appDataMainMarket.suilendClient.deposit(
                coinOut!, // Checked above
                tokenOutReserve.coinType,
                obligationOwnerCapMainMarket!.id,
                transaction,
              ); // Deposit remainder
            } else {
              transaction.transferObjects(
                [coinOut!], // Checked above
                transaction.pure.address(address),
              ); // Transfer remainder to user
            }
          } else {
            transaction.transferObjects(
              [coinOut!], // Checked above
              transaction.pure.address(address),
            ); // Transfer empty coin to user
          }
        }
      } else {
        // TRANSFER out token
        transaction.transferObjects(
          [coinOut!], // Checked above
          transaction.pure.address(address),
        );
      }
    }

    const res = await signExecuteAndWaitForTransaction(
      transaction,
      { auction: true },
      (tx: Transaction) => openLedgerHashDialog(tx),
    );
    return res;
  };

  const onSwapClick = async (isSwapAndDeposit?: boolean) => {
    if (!address) throw new Error("Wallet not connected");
    if (!quote) throw new Error("No quote found");

    if (swapInAccount) {
      if (buttonState_swapInAccount.isDisabled) return;
      setIsSubmitting_swapInAccount(true);
    } else {
      if (isSwapAndDeposit) {
        if (buttonState_swapAndDeposit.isDisabled) return;
        setIsSubmitting_swapAndDeposit(true);
      } else {
        if (buttonState_swap.isDisabled) return;
        setIsSubmitting_swap(true);
      }
    }

    try {
      const res = await swap(isSwapAndDeposit);
      const txUrl = explorer.buildTxUrl(res.digest);

      if (swapInAccount) {
        const withdrawnAmountIn = (() => {
          const withdrawEvent = res.events?.find(
            (event) =>
              event.type ===
                "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::WithdrawEvent" &&
              normalizeStructTag((event.parsedJson as any).coin_type.name) ===
                tokenIn.coinType,
          );
          const reserveAssetDataEvent = res.events?.find(
            (event) =>
              event.type ===
                "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::reserve::ReserveAssetDataEvent" &&
              normalizeStructTag((event.parsedJson as any).coin_type.name) ===
                tokenIn.coinType,
          );
          if (!withdrawEvent || !reserveAssetDataEvent) return undefined;

          return new BigNumber((withdrawEvent.parsedJson as any).ctoken_amount)
            .times(
              getCtokenExchangeRate(reserveAssetDataEvent.parsedJson as any),
            )
            .div(10 ** tokenIn.decimals);
        })();
        const depositedAmountOut = (() => {
          const mintEvent = res.events?.find(
            (event) =>
              event.type ===
                "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::MintEvent" &&
              normalizeStructTag((event.parsedJson as any).coin_type.name) ===
                tokenOut.coinType,
          );
          if (!mintEvent) return undefined;

          return new BigNumber(
            (mintEvent.parsedJson as any).liquidity_amount,
          ).div(10 ** tokenOut.decimals);
        })();

        if (action_swapInAccount === Action.DEPOSIT) {
          toast.success(
            [
              "Swapped",
              withdrawnAmountIn !== undefined
                ? formatToken(withdrawnAmountIn, {
                    dp: tokenIn.decimals,
                    trimTrailingZeros: true,
                  })
                : null,
              tokenIn.symbol,
              "for",
              tokenOut.symbol,
            ]
              .filter(Boolean)
              .join(" "),
            {
              description: [
                "Deposited",
                depositedAmountOut !== undefined
                  ? formatToken(depositedAmountOut, {
                      dp: tokenOut.decimals,
                      trimTrailingZeros: true,
                    })
                  : null,
                tokenOut.symbol,
              ]
                .filter(Boolean)
                .join(" "),
              icon: <ArrowRightLeft className="h-5 w-5 text-success" />,
              action: (
                <TextLink className="block" href={txUrl}>
                  View tx on {explorer.name}
                </TextLink>
              ),
              duration: TX_TOAST_DURATION,
            },
          );
        } else {
          const repaidAmountOut = (() => {
            const repayEvent = res.events?.find(
              (event) =>
                event.type ===
                  "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::RepayEvent" &&
                normalizeStructTag((event.parsedJson as any).coin_type.name) ===
                  tokenOut.coinType,
            );
            if (!repayEvent) return undefined;

            return new BigNumber(
              (repayEvent.parsedJson as any).liquidity_amount,
            ).div(10 ** tokenOut.decimals);
          })();

          toast.success(
            [
              "Swapped",
              withdrawnAmountIn !== undefined
                ? formatToken(withdrawnAmountIn, {
                    dp: tokenIn.decimals,
                    trimTrailingZeros: true,
                  })
                : null,
              tokenIn.symbol,
              "for",
              tokenOut.symbol,
            ]
              .filter(Boolean)
              .join(" "),
            {
              description: [
                [
                  "Repaid",
                  repaidAmountOut !== undefined
                    ? formatToken(repaidAmountOut, {
                        dp: tokenOut.decimals,
                        trimTrailingZeros: true,
                      })
                    : null,
                  tokenOut.symbol,
                ]
                  .filter(Boolean)
                  .join(" "),
                depositedAmountOut !== undefined && depositedAmountOut.gt(0)
                  ? [
                      "deposited",
                      depositedAmountOut !== undefined
                        ? formatToken(depositedAmountOut, {
                            dp: tokenOut.decimals,
                            trimTrailingZeros: true,
                          })
                        : null,
                      tokenOut.symbol,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : null,
              ]
                .filter(Boolean)
                .join(", "),
              icon: <ArrowRightLeft className="h-5 w-5 text-success" />,
              action: (
                <TextLink className="block" href={txUrl}>
                  View tx on {explorer.name}
                </TextLink>
              ),
              duration: TX_TOAST_DURATION,
            },
          );
        }
      } else {
        if (isSwapAndDeposit) {
          const balanceChangeIn = getBalanceChange(res, address, tokenIn, -1);
          const depositedAmountOut = (() => {
            const mintEvent = res.events?.find(
              (event) =>
                event.type ===
                  "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::MintEvent" &&
                normalizeStructTag((event.parsedJson as any).coin_type.name) ===
                  tokenOut.coinType,
            );
            if (!mintEvent) return undefined;

            return new BigNumber(
              (mintEvent.parsedJson as any).liquidity_amount,
            ).div(10 ** tokenOut.decimals);
          })();

          if (action_swapAndDeposit === Action.DEPOSIT) {
            toast.success(
              [
                "Swapped",
                balanceChangeIn !== undefined
                  ? formatToken(balanceChangeIn, {
                      dp: tokenIn.decimals,
                      trimTrailingZeros: true,
                    })
                  : null,
                tokenIn.symbol,
                "for",
                tokenOut.symbol,
              ]
                .filter(Boolean)
                .join(" "),
              {
                description: [
                  "Deposited",
                  depositedAmountOut !== undefined
                    ? formatToken(depositedAmountOut, {
                        dp: tokenOut.decimals,
                        trimTrailingZeros: true,
                      })
                    : null,
                  tokenOut.symbol,
                ]
                  .filter(Boolean)
                  .join(" "),
                icon: <ArrowRightLeft className="h-5 w-5 text-success" />,
                action: (
                  <TextLink className="block" href={txUrl}>
                    View tx on {explorer.name}
                  </TextLink>
                ),
                duration: TX_TOAST_DURATION,
              },
            );
          } else {
            const repaidAmountOut = (() => {
              const repayEvent = res.events?.find(
                (event) =>
                  event.type ===
                    "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::RepayEvent" &&
                  normalizeStructTag(
                    (event.parsedJson as any).coin_type.name,
                  ) === tokenOut.coinType,
              );
              if (!repayEvent) return undefined;

              return new BigNumber(
                (repayEvent.parsedJson as any).liquidity_amount,
              ).div(10 ** tokenOut.decimals);
            })();

            toast.success(
              [
                "Swapped",
                balanceChangeIn !== undefined
                  ? formatToken(balanceChangeIn, {
                      dp: tokenIn.decimals,
                      trimTrailingZeros: true,
                    })
                  : null,
                tokenIn.symbol,
                "for",
                tokenOut.symbol,
              ]
                .filter(Boolean)
                .join(" "),
              {
                description: [
                  [
                    "Repaid",
                    repaidAmountOut !== undefined
                      ? formatToken(repaidAmountOut, {
                          dp: tokenOut.decimals,
                          trimTrailingZeros: true,
                        })
                      : null,
                    tokenOut.symbol,
                  ]
                    .filter(Boolean)
                    .join(" "),
                  depositedAmountOut !== undefined && depositedAmountOut.gt(0)
                    ? [
                        "deposited",
                        depositedAmountOut !== undefined
                          ? formatToken(depositedAmountOut, {
                              dp: tokenOut.decimals,
                              trimTrailingZeros: true,
                            })
                          : null,
                        tokenOut.symbol,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : null,
                ]
                  .filter(Boolean)
                  .join(", "),
                icon: <ArrowRightLeft className="h-5 w-5 text-success" />,
                action: (
                  <TextLink className="block" href={txUrl}>
                    View tx on {explorer.name}
                  </TextLink>
                ),
                duration: TX_TOAST_DURATION,
              },
            );
          }
        } else {
          const balanceChangeIn = getBalanceChange(res, address, tokenIn, -1);
          const balanceChangeOut = getBalanceChange(res, address, tokenOut);

          toast.success(
            [
              "Swapped",
              balanceChangeIn !== undefined
                ? formatToken(balanceChangeIn, {
                    dp: tokenIn.decimals,
                    trimTrailingZeros: true,
                  })
                : null,
              tokenIn.symbol,
              "for",
              balanceChangeOut !== undefined
                ? formatToken(balanceChangeOut, {
                    dp: tokenOut.decimals,
                    trimTrailingZeros: true,
                  })
                : null,
              tokenOut.symbol,
            ]
              .filter(Boolean)
              .join(" "),
            {
              icon: <ArrowRightLeft className="h-5 w-5 text-success" />,
              action: (
                <TextLink className="block" href={txUrl}>
                  View tx on {explorer.name}
                </TextLink>
              ),
              duration: TX_TOAST_DURATION,
            },
          );
        }
      }

      formatAndSetValue("", tokenIn);
      setQuotesMap({});
      setIsPriceDifferenceAware(false);

      const mixpanelProperties: Record<string, string | number> = {
        walletAddress: address,
        agg: QUOTE_PROVIDER_NAME_MAP[quote.provider],
        assetIn: tokenIn.symbol,
        assetOut: tokenOut.symbol,
        amountIn: quote.in.amount.toFixed(
          tokenIn.decimals,
          BigNumber.ROUND_DOWN,
        ),
        amountOut: quote.out.amount.toFixed(
          tokenOut.decimals,
          BigNumber.ROUND_DOWN,
        ),
        deposit:
          (swapInAccount && action_swapInAccount === Action.DEPOSIT) ||
          (isSwapAndDeposit && action_swapAndDeposit === Action.DEPOSIT)
            ? "true"
            : "false",
      };
      if (tokenInUsdValue !== undefined)
        mixpanelProperties.amountInUsd = tokenInUsdValue.toFixed(
          2,
          BigNumber.ROUND_DOWN,
        );
      if (tokenOutUsdValue !== undefined)
        mixpanelProperties.amountOutUsd = tokenOutUsdValue.toFixed(
          2,
          BigNumber.ROUND_DOWN,
        );
      mixpanelTrack("swap_success", mixpanelProperties);

      const safaryParameters: Record<string, string | number> = {
        walletAddress: address,
        fromAmount: +quote.in.amount.decimalPlaces(
          tokenIn.decimals,
          BigNumber.ROUND_DOWN,
        ),
        fromCurrency: tokenIn.symbol,
        // fromAmountUsd: 0,
        toAmount: +quote.out.amount.decimalPlaces(
          tokenOut.decimals,
          BigNumber.ROUND_DOWN,
        ),
        toCurrency: tokenOut.symbol,
        // toAmountUsd: 0,
        customStr1Label: "agg",
        customStr1Value: QUOTE_PROVIDER_NAME_MAP[quote.provider],
        customStr2Label: "fromCoinType",
        customStr2Value: tokenIn.coinType,
        customStr3Label: "toCoinType",
        customStr3Value: tokenOut.coinType,
        customStr4Label: "isDepositing",
        customStr4Value:
          (swapInAccount && action_swapInAccount === Action.DEPOSIT) ||
          (isSwapAndDeposit && action_swapAndDeposit === Action.DEPOSIT)
            ? "true"
            : "false",
      };
      if (tokenInUsdValue !== undefined)
        safaryParameters.fromAmountUsd = +tokenInUsdValue.decimalPlaces(
          2,
          BigNumber.ROUND_DOWN,
        );
      if (tokenOutUsdValue !== undefined)
        safaryParameters.toAmountUsd = +tokenOutUsdValue.decimalPlaces(
          2,
          BigNumber.ROUND_DOWN,
        );
      safaryTrack(
        "swap", // The event type must be "swap" per https://safary-1.gitbook.io/safary-doc-2.0/connect-data/setup-events#swap-event
        "swap_swap",
        safaryParameters,
      );
    } catch (err) {
      if (swapInAccount) {
        showErrorToast(
          `Failed to swap and ${action_swapInAccount}`,
          err as Error,
          undefined,
          true,
        );
      } else {
        if (isSwapAndDeposit) {
          showErrorToast(
            `Failed to swap and ${action_swapAndDeposit}`,
            err as Error,
            undefined,
            true,
          );
        } else {
          showErrorToast("Failed to swap", err as Error, undefined, true);
        }
      }
    } finally {
      if (swapInAccount) {
        setIsSubmitting_swapInAccount(false);
      } else {
        if (isSwapAndDeposit) {
          setIsSubmitting_swapAndDeposit(false);
        } else {
          setIsSubmitting_swap(false);
        }
      }
      inputRef.current?.focus();
      refresh();

      closeLedgerHashDialog();
    }
  };

  return (
    <>
      <Head>
        <title>Suilend | Swap</title>
      </Head>

      <div className="flex w-full max-w-[28rem] flex-col items-center gap-8">
        <div className="flex w-full flex-col gap-6">
          <div className="relative flex w-full flex-col gap-4">
            {/* Settings */}
            <div className="flex flex-row items-center justify-between gap-4">
              {/* Left */}
              <Button
                className="h-7 w-7 rounded-full bg-muted/15 px-0"
                tooltip="Refresh"
                icon={<RotateCw className="h-3 w-3" />}
                variant="ghost"
                onClick={() =>
                  fetchQuotes(sdkMap, activeProviders, tokenIn, tokenOut, value)
                }
              >
                Refresh
              </Button>

              {/* Right */}
              <div className="flex flex-row items-center gap-4">
                <Switch
                  id="swapInAccount"
                  label="Swap in account"
                  horizontal
                  isChecked={swapInAccount}
                  onToggle={setSwapInAccount}
                  isDisabled={
                    (obligationMainMarket?.deposits ?? []).length === 0
                  }
                />

                <SwapSlippagePopover
                  slippagePercent={slippagePercent}
                  onSlippagePercentChange={formatAndSetSlippagePercent}
                />
              </div>
            </div>

            {/* In */}
            <div className="relative z-[1]">
              <SwapInput
                ref={inputRef}
                title="Sell"
                autoFocus
                value={value}
                onChange={onValueChange}
                usdValue={tokenInUsdValue}
                direction={TokenDirection.IN}
                token={tokenIn}
                onSelectToken={(t: Token) =>
                  onTokenCoinTypeChange(t.coinType, TokenDirection.IN)
                }
                disabledCoinTypes={
                  swapInAccount && !tokenInDepositPosition
                    ? [tokenOut.coinType]
                    : undefined
                }
                onPercentClick={usePercentValueWrapper}
              />
            </div>

            {/* Reverse */}
            <div className="relative z-[2] -my-7 w-max self-center rounded-full bg-background">
              <Button
                className="rounded-full px-0"
                icon={<ArrowUpDown />}
                variant="secondary"
                size="icon"
                onClick={reverseTokens}
                disabled={swapInAccount && !tokenOutDepositPosition}
              >
                Reverse
              </Button>
            </div>

            {/* Out */}
            <div className="relative z-[1]">
              <SwapInput
                title="Buy"
                value={
                  new BigNumber(value || 0).gt(0) && quote !== undefined
                    ? quote.out.amount.toFixed(
                        tokenOut.decimals,
                        BigNumber.ROUND_DOWN,
                      )
                    : ""
                }
                isValueLoading={isFetchingQuotes}
                usdValue={tokenOutUsdValue}
                direction={TokenDirection.OUT}
                token={tokenOut}
                onSelectToken={(t: Token) =>
                  onTokenCoinTypeChange(t.coinType, TokenDirection.OUT)
                }
                disabledCoinTypes={
                  swapInAccount && !tokenOutDepositPosition
                    ? [tokenIn.coinType]
                    : undefined
                }
              />
            </div>

            {/* Parameters */}
            {new BigNumber(value || 0).gt(0) && (
              <div className="flex w-full flex-col gap-2">
                {/* Quote and routing */}
                <div className="flex w-full flex-row justify-between">
                  {/* Quote */}
                  {quoteRatio !== undefined ? (
                    <Button
                      className="h-4 p-0 text-muted-foreground hover:bg-transparent"
                      labelClassName="text-xs font-sans"
                      endIcon={<ArrowRightLeft />}
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsInverted((is) => !is)}
                    >
                      {"1 "}
                      {(!isInverted ? tokenIn : tokenOut).symbol}{" "}
                      <span className="font-sans">≈</span>{" "}
                      {formatToken(quoteRatio, {
                        dp: (!isInverted ? tokenOut : tokenIn).decimals,
                      })}{" "}
                      {(!isInverted ? tokenOut : tokenIn).symbol}
                    </Button>
                  ) : (
                    <Skeleton className="h-4 w-40" />
                  )}

                  {/* Provider */}
                  {quote ? (
                    <Button
                      className="h-4 p-0 text-muted-foreground hover:bg-transparent"
                      labelClassName="font-sans text-xs"
                      endIcon={
                        isQuotesListCollapsed ? <ChevronDown /> : <ChevronUp />
                      }
                      variant="ghost"
                      size="sm"
                      onClick={toggleIsQuotesListCollapsed}
                    >
                      Details
                    </Button>
                  ) : (
                    <Skeleton className="h-4 w-12" />
                  )}
                </div>

                {/* Quotes list */}
                {!isQuotesListCollapsed && (
                  <div className="flex w-full flex-col gap-2">
                    {activeProviders.map((provider) => {
                      const _quote = (quotes ?? []).find(
                        (q) => q.provider === provider,
                      );

                      const bestQuote = (quotes ?? [])
                        .slice()
                        .sort((a, b) => +b.out.amount - +a.out.amount)[0];

                      return (
                        <Fragment key={provider}>
                          {_quote === undefined ? (
                            <Skeleton className="h-[54px] w-full rounded-sm bg-muted/10" />
                          ) : (
                            <button
                              key={_quote.id}
                              className={cn(
                                "group flex w-full flex-col items-start gap-1 rounded-sm border px-3 py-2 transition-colors disabled:pointer-events-none",
                                _quote.id === quote?.id
                                  ? "border-transparent !bg-muted/15 transition-colors"
                                  : "hover:border-transparent hover:bg-muted/10",
                              )}
                              onClick={() => setOverrideQuoteId(_quote.id)}
                              disabled={isNaN(+_quote.out.amount)}
                            >
                              <div className="flex w-full flex-row items-center justify-between">
                                <TLabelSans
                                  className={cn(
                                    !isNaN(+_quote.out.amount) &&
                                      "text-foreground",
                                  )}
                                >
                                  {isNaN(+_quote.out.amount) ? (
                                    `No ${QUOTE_PROVIDER_NAME_MAP[_quote.provider]} quote found`
                                  ) : (
                                    <>
                                      {formatToken(_quote.out.amount, {
                                        dp: tokenOut.decimals,
                                      })}{" "}
                                      {tokenOut.symbol}
                                    </>
                                  )}
                                </TLabelSans>

                                {!isNaN(+_quote.out.amount) && (
                                  <TLabelSans
                                    className={cn(
                                      "uppercase",
                                      _quote.id === bestQuote.id
                                        ? "text-success"
                                        : "text-destructive",
                                    )}
                                  >
                                    {_quote.id === bestQuote.id
                                      ? "Best"
                                      : formatPercent(
                                          new BigNumber(
                                            _quote.out.amount
                                              .div(bestQuote.out.amount)
                                              .minus(1),
                                          ).times(100),
                                        )}
                                  </TLabelSans>
                                )}
                              </div>

                              <div className="flex h-4 w-full flex-row items-center justify-between">
                                {!isNaN(+_quote.out.amount) && (
                                  <TLabelSans>
                                    {formatUsd(
                                      _quote.out.amount.times(tokenOutUsdPrice),
                                    )}
                                  </TLabelSans>
                                )}

                                {/* Routing */}
                                {!isNaN(+_quote.out.amount) && (
                                  <ReactFlowProvider>
                                    <RoutingDialog quote={_quote} />
                                  </ReactFlowProvider>
                                )}
                              </div>
                            </button>
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Price difference */}
                {priceDifferencePercent !== undefined ? (
                  <div className="w-max">
                    <TLabelSans
                      className={cn(
                        priceDifferencePercent.gte(
                          PRICE_DIFFERENCE_PERCENT_CRITICAL_THRESHOLD,
                        )
                          ? "text-destructive"
                          : priceDifferencePercent.gte(
                                PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD,
                              )
                            ? "text-warning"
                            : "text-foreground",
                        priceDifferencePercent.gte(
                          PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD,
                        ) && "font-medium",
                      )}
                    >
                      <PriceDifferenceIcon className="mb-0.5 mr-1 inline h-3 w-3" />
                      {formatPercent(BigNumber.max(0, priceDifferencePercent))}{" "}
                      Price difference (Noodles)
                    </TLabelSans>
                  </div>
                ) : (
                  <Skeleton className="h-4 w-48" />
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          {swapInAccount ? (
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full flex-col gap-px">
                {/* Swap in account */}
                <Button
                  className="h-auto min-h-14 w-full"
                  labelClassName="text-wrap uppercase"
                  size="lg"
                  disabled={buttonState_swapInAccount.isDisabled}
                  onClick={() => onSwapClick()}
                >
                  {buttonState_swapInAccount.isLoading ? (
                    <Spinner size="md" />
                  ) : (
                    buttonState_swapInAccount.title
                  )}
                  {buttonState_swapInAccount.description && (
                    <span className="mt-0.5 block font-sans text-xs normal-case">
                      {buttonState_swapInAccount.description}
                    </span>
                  )}
                </Button>

                <div className="flex h-8 w-full flex-row items-center">
                  <YourUtilizationLabel
                    obligation={obligationMainMarket}
                    newObligation={
                      action_swapInAccount === Action.DEPOSIT
                        ? newObligation_deposit
                        : newObligation_repay
                    }
                    noUtilizationBar
                  />
                </div>
              </div>

              {(warningMessages_swapInAccount ?? []).map((warningMessage) => (
                <TLabelSans
                  key={warningMessage}
                  className="text-[10px] text-warning"
                >
                  <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                  {warningMessage}
                </TLabelSans>
              ))}
            </div>
          ) : (
            <div className="flex w-full flex-col gap-2">
              {priceDifferencePercent?.gt(
                PRICE_DIFFERENCE_PERCENT_CHECKBOX_THRESHOLD,
              ) && (
                <button
                  className="mb-1 flex flex-row items-center gap-2"
                  onClick={() => setIsPriceDifferenceAware((is) => !is)}
                >
                  <Checkbox checked={isPriceDifferenceAware} />
                  <TLabelSans className="font-medium text-foreground">
                    {"I acknowledge and wish to proceed with this rate."}
                  </TLabelSans>
                </button>
              )}

              <div className="flex w-full flex-col gap-px">
                {/* Swap */}
                <Button
                  className={cn(
                    "h-auto min-h-14 w-full",
                    tokenOutReserve && "rounded-b-none",
                  )}
                  labelClassName="text-wrap uppercase"
                  size="lg"
                  disabled={buttonState_swap.isDisabled}
                  onClick={() => onSwapClick(false)}
                >
                  {buttonState_swap.isLoading ? (
                    <Spinner size="md" />
                  ) : (
                    buttonState_swap.title
                  )}
                  {buttonState_swap.description && (
                    <span className="mt-0.5 block font-sans text-xs normal-case">
                      {buttonState_swap.description}
                    </span>
                  )}
                </Button>

                {/* Swap and deposit */}
                {tokenOutReserve && (
                  <div className="flex h-max w-full flex-col">
                    <Button
                      className="h-auto min-h-8 w-full rounded-b-md rounded-t-none py-1"
                      labelClassName="uppercase text-wrap text-xs"
                      variant="secondary"
                      disabled={buttonState_swapAndDeposit.isDisabled}
                      onClick={() => onSwapClick(true)}
                    >
                      {buttonState_swapAndDeposit.isLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        buttonState_swapAndDeposit.title
                      )}
                      {buttonState_swapAndDeposit.description && (
                        <span className="block font-sans text-xs normal-case">
                          {buttonState_swapAndDeposit.description}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {tokenOutReserve &&
                (warningMessages_swapAndDeposit ?? []).map((warningMessage) => (
                  <TLabelSans
                    key={warningMessage}
                    className="text-[10px] text-warning"
                  >
                    <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                    {warningMessage}
                  </TLabelSans>
                ))}
            </div>
          )}

          {/* Tokens */}
          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1.5">
              <div
                className="group flex cursor-pointer flex-row items-center gap-2"
                onClick={() => setIsInverted((is) => !is)}
              >
                <TokenLogos
                  tokens={
                    !isInverted ? [tokenIn, tokenOut] : [tokenOut, tokenIn]
                  }
                  size={16}
                />

                <TBody>
                  {(!isInverted ? tokenIn : tokenOut).symbol}
                  <span className="font-sans">/</span>
                  {(!isInverted ? tokenOut : tokenIn).symbol}
                </TBody>

                <ArrowRightLeft className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>

              {currentTokenRatio !== undefined &&
              currentTokenRatioDp !== undefined &&
              tokenRatio24hChangePercent !== undefined ? (
                <TBody className="text-xs">
                  {formatToken(currentTokenRatio, {
                    dp: currentTokenRatioDp,
                    exact: true,
                  })}{" "}
                  <span
                    className={cn(
                      tokenRatio24hChangePercent.gt(0) && "text-success",
                      tokenRatio24hChangePercent.eq(0) &&
                        "text-muted-foreground",
                      tokenRatio24hChangePercent.lt(0) && "text-destructive",
                    )}
                  >
                    {tokenRatio24hChangePercent.gt(0) && "+"}
                    {tokenRatio24hChangePercent.lt(0) && "-"}
                    {formatPercent(tokenRatio24hChangePercent.abs())}
                  </span>
                </TBody>
              ) : (
                <Skeleton className="h-4 w-40" />
              )}
            </div>

            <Link
              className="block flex min-w-32 max-w-56 flex-1 cursor-pointer"
              target="_blank"
              href={`https://noodles.fi/coins/${tokenOut.coinType}`}
            >
              <div className="pointer-events-none h-6 w-full pl-6">
                {historicalTokenRatios !== undefined && (
                  <TokenRatiosChart data={historicalTokenRatios} />
                )}
              </div>
            </Link>
          </div>
        </div>

        <TLabelSans className="opacity-50">
          {"Powered by "}
          {/* <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground"
            href="https://aftermath.finance/trade"
            noIcon
          >
            Aftermath
          </TextLink>
          {", "} */}
          <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
            href="https://app.cetus.zone"
            noIcon
          >
            Cetus
          </TextLink>
          {", "}
          <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
            href="https://7k.ag"
            noIcon
          >
            7K
          </TextLink>
          {", and "}
          <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
            href="https://flowx.finance/swap"
            noIcon
          >
            FlowX
          </TextLink>
        </TLabelSans>

        {/* TEMP: hidden */}
        {false &&
          (tokenOut.coinType === NORMALIZED_SUI_COINTYPE ||
            tokenOut.coinType === NORMALIZED_USDC_COINTYPE) && (
            <BulkSwapCard tokenOut={tokenOut} />
          )}
      </div>
    </>
  );
}

export default function Swap() {
  return (
    <SwapContextProvider>
      <Page />
    </SwapContextProvider>
  );
}
