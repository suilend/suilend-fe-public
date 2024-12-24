import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import * as Sentry from "@sentry/nextjs";
import { Aftermath } from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import {
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  RotateCw,
} from "lucide-react";
import { ReactFlowProvider } from "reactflow";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import { v4 as uuidv4 } from "uuid";

import {
  NORMALIZED_SUI_COINTYPE,
  SUI_COINTYPE,
  SUI_GAS_MIN,
  createObligationIfNoneExists,
  getBalanceChange,
  getFilteredRewards,
  getHistoryPrice,
  getPrice,
  getStakingYieldAprPercent,
  getTotalAprPercent,
  isSui,
  sendObligationToUser,
} from "@suilend/frontend-sui";
import track from "@suilend/frontend-sui/lib/track";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import { Action, Side } from "@suilend/sdk/types";

import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import RoutingDialog from "@/components/swap/RoutingDialog";
import SwapInput from "@/components/swap/SwapInput";
import SwapSlippagePopover, {
  SLIPPAGE_PERCENT_DP,
} from "@/components/swap/SwapSlippagePopover";
import TokenRatiosChart from "@/components/swap/TokenRatiosChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  StandardizedQuote,
  StandardizedQuoteType,
  SwapContextProvider,
  TokenDirection,
  useSwapContext,
} from "@/contexts/SwapContext";
import {
  getSubmitButtonNoValueState,
  getSubmitButtonState,
} from "@/lib/actions";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { formatInteger, formatPercent, formatToken } from "@/lib/format";
import { SwapToken } from "@/lib/types";
import { cn } from "@/lib/utils";

type SubmitButtonState = {
  isLoading?: boolean;
  isDisabled?: boolean;
  title?: string;
};

const PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD = 1;
const PRICE_DIFFERENCE_PERCENT_DESTRUCTIVE_THRESHOLD = 10;

const HISTORICAL_USD_PRICES_INTERVAL = "5m";
const HISTORICAL_USD_PRICES_INTERVAL_S = 5 * 60;

type HistoricalUsdPriceData = {
  timestampS: number;
  priceUsd: number;
};

function Page() {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const {
    suilendClient,
    data,
    getBalance,
    refresh,
    obligation,
    obligationOwnerCap,
  } = useLoadedAppContext();

  const { tokens, setTokenSymbol, reverseTokenSymbols, ...restSwapContext } =
    useSwapContext();
  const aftermathSdk = restSwapContext.aftermathSdk as Aftermath;
  const tokenIn = restSwapContext.tokenIn as SwapToken;
  const tokenOut = restSwapContext.tokenOut as SwapToken;

  // Balances
  const suiBalance = getBalance(NORMALIZED_SUI_COINTYPE);
  const tokenInBalance = getBalance(tokenIn.coinType);

  // Reserves
  const tokenInReserve = data.lendingMarket.reserves.find(
    (reserve) => reserve.coinType === tokenIn.coinType,
  );
  const tokenOutReserve = data.lendingMarket.reserves.find(
    (reserve) => reserve.coinType === tokenOut.coinType,
  );

  // Positions
  const tokenInDepositPosition = obligation?.deposits?.find(
    (d) => d.coinType === tokenIn.coinType,
  );
  const tokenOutDepositPosition = obligation?.deposits?.find(
    (d) => d.coinType === tokenOut.coinType,
  );

  const tokenInDepositPositionAmount =
    tokenInDepositPosition?.depositedAmount ?? new BigNumber(0);
  const tokenOutDepositPositionAmount =
    tokenOutDepositPosition?.depositedAmount ?? new BigNumber(0);

  // Deposit
  const tokenOutStakingYieldAprPercent = tokenOutReserve
    ? getStakingYieldAprPercent(
        Side.DEPOSIT,
        tokenOutReserve,
        data.lstAprPercentMap,
      )
    : undefined;
  const tokenOutReserveDepositAprPercent = tokenOutReserve
    ? getTotalAprPercent(
        Side.DEPOSIT,
        tokenOutReserve.depositAprPercent,
        getFilteredRewards(data.rewardMap[tokenOutReserve.coinType].deposit),
        tokenOutStakingYieldAprPercent,
      )
    : undefined;

  const hasTokenOutReserve =
    !!tokenOutReserve && tokenOutReserveDepositAprPercent !== undefined;

  // Max
  const tokenInMaxCalculations = (() => {
    const result = [
      {
        reason: `Insufficient ${tokenIn.symbol}`,
        isDisabled: true,
        value: tokenInBalance,
      },
    ];
    if (isSui(tokenIn.coinType))
      result.push({
        reason: `${SUI_GAS_MIN} SUI should be saved for gas`,
        isDisabled: true,
        value: tokenInBalance.minus(SUI_GAS_MIN),
      });

    return result;
  })();

  const tokenInMaxAmount = BigNumber.max(
    new BigNumber(0),
    BigNumber.min(
      ...Object.values(tokenInMaxCalculations).map((calc) => calc.value),
    ),
  ).toFixed(tokenIn.decimals, BigNumber.ROUND_DOWN);

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  // Quote
  const [quotesMap, setQuotesMap] = useState<
    Record<number, StandardizedQuote[] | undefined>
  >({});

  const quotes = (() => {
    const timestampsS = Object.entries(quotesMap)
      .filter(([, quotes]) => quotes !== undefined)
      .map(([timestampS]) => +timestampS);
    if (timestampsS.length === 0) return undefined;

    const maxTimestampS = Math.max(...timestampsS);
    const quotes = quotesMap[maxTimestampS];
    if (quotes === undefined) return undefined;

    const sortedQuotes = quotes
      .slice()
      .sort((a, b) => +b.amount_out.minus(a.amount_out));
    return sortedQuotes;
  })();
  const quote = quotes?.[0];

  const isFetchingQuote = (() => {
    const timestampsS = Object.keys(quotesMap).map((timestampS) => +timestampS);
    if (timestampsS.length === 0) return false;

    const maxTimestampS = Math.max(...timestampsS);
    const quotes = quotesMap[maxTimestampS];
    return quotes === undefined;
  })();

  const fetchQuote = useCallback(
    async (
      _tokenIn: SwapToken,
      _tokenOut: SwapToken,
      _value: string,
      _timestamp = new Date().getTime(),
    ) => {
      if (_tokenIn.coinType === _tokenOut.coinType) return;
      if (new BigNumber(_value || 0).lte(0)) return;

      setQuotesMap((o) => ({ ...o, [_timestamp]: undefined }));

      try {
        const params = {
          token_in: _tokenIn.coinType,
          token_out: _tokenOut.coinType,
          amount_in: BigInt(
            new BigNumber(_value)
              .times(10 ** _tokenIn.decimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          ),
        };

        // Fetch quotes in parallel
        // Aftermath
        (async () => {
          console.log("Swap - fetching Aftermath quote");

          try {
            const quote = await aftermathSdk
              .Router()
              .getCompleteTradeRouteGivenAmountIn({
                coinInType: params.token_in,
                coinOutType: params.token_out,
                coinInAmount: params.amount_in,
              });

            quote.coinIn.type = normalizeStructTag(quote.coinIn.type);
            quote.coinOut.type = normalizeStructTag(quote.coinOut.type);
            for (const route of quote.routes) {
              route.coinIn.type = normalizeStructTag(route.coinIn.type);
              route.coinOut.type = normalizeStructTag(route.coinOut.type);

              for (const path of route.paths) {
                path.coinIn.type = normalizeStructTag(path.coinIn.type);
                path.coinOut.type = normalizeStructTag(path.coinOut.type);
              }
            }

            const standardizedQuote = {
              id: uuidv4(),
              amount_in: new BigNumber(quote.coinIn.amount.toString()).div(
                10 ** _tokenIn.decimals,
              ),
              amount_out: new BigNumber(quote.coinOut.amount.toString()).div(
                10 ** _tokenOut.decimals,
              ),
              coin_type_in: quote.coinIn.type,
              coin_type_out: quote.coinOut.type,
              type: StandardizedQuoteType.AFTERMATH,
              quote,
            } as StandardizedQuote;

            setQuotesMap((o) => ({
              ...o,
              [_timestamp]: [...(o[_timestamp] ?? []), standardizedQuote],
            }));
            console.log(
              "Swap - set Aftermath quote",
              +standardizedQuote.amount_out,
            );
          } catch (err) {
            console.error(err);
          }
        })();
      } catch (err) {
        toast.error("Failed to get quote", {
          description:
            err instanceof AggregateError
              ? "No route found"
              : (err as Error)?.message || "An unknown error occurred",
        });
        console.error(err);

        setQuotesMap((o) => {
          delete o[_timestamp];
          return o;
        });
      }
    },
    [aftermathSdk],
  );

  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    refreshIntervalRef.current = setInterval(
      () => fetchQuote(tokenIn, tokenOut, value),
      30 * 1000,
    );

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchQuote, tokenIn, tokenOut, value]);

  const quoteAmountIn = quote
    ? BigNumber(quote.amount_in.toString())
    : undefined;
  const quoteAmountOut = quote
    ? BigNumber(quote.amount_out.toString())
    : undefined;

  // Value
  const formatAndSetValue = useCallback((_value: string, token: SwapToken) => {
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

    if (new BigNumber(_value || 0).gt(0)) fetchQuote(tokenIn, tokenOut, _value);
    else setQuotesMap({});
  };

  const useMaxValueWrapper = () => {
    formatAndSetValue(tokenInMaxAmount, tokenIn);

    if (new BigNumber(tokenInMaxAmount).gt(0))
      fetchQuote(tokenIn, tokenOut, tokenInMaxAmount);
    else setQuotesMap({});

    inputRef.current?.focus();
  };

  // USD prices - historical
  const [historicalUsdPricesMap, setHistoricalUsdPriceMap] = useState<
    Record<string, HistoricalUsdPriceData[]>
  >({});
  const tokenInHistoricalUsdPrices = useMemo(
    () => historicalUsdPricesMap[tokenIn.coinType],
    [historicalUsdPricesMap, tokenIn.coinType],
  );
  const tokenOutHistoricalUsdPrices = useMemo(
    () => historicalUsdPricesMap[tokenOut.coinType],
    [historicalUsdPricesMap, tokenOut.coinType],
  );

  const fetchTokenHistoricalUsdPrices = useCallback(
    async (token: SwapToken) => {
      console.log("fetchTokenHistoricalUsdPrices", token.symbol);

      try {
        const currentTimeS = Math.floor(new Date().getTime() / 1000);

        const result = await getHistoryPrice(
          token.coinType,
          HISTORICAL_USD_PRICES_INTERVAL,
          currentTimeS - 24 * 60 * 60,
          currentTimeS,
        );
        if (result === undefined) return;

        setHistoricalUsdPriceMap((o) => ({
          ...o,
          [token.coinType]: result,
        }));
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  const fetchedInitialTokenHistoricalUsdPricesRef = useRef<boolean>(false);
  useEffect(() => {
    if (fetchedInitialTokenHistoricalUsdPricesRef.current) return;

    fetchTokenHistoricalUsdPrices(tokenIn);
    fetchTokenHistoricalUsdPrices(tokenOut);
    fetchedInitialTokenHistoricalUsdPricesRef.current = true;
  }, [fetchTokenHistoricalUsdPrices, tokenIn, tokenOut]);

  // USD prices - current
  const [usdPricesMap, setUsdPriceMap] = useState<Record<string, BigNumber>>(
    {},
  );
  const tokenInUsdPrice = useMemo(
    () => usdPricesMap[tokenIn.coinType],
    [usdPricesMap, tokenIn.coinType],
  );
  const tokenOutUsdPrice = useMemo(
    () => usdPricesMap[tokenOut.coinType],
    [usdPricesMap, tokenOut.coinType],
  );

  const fetchTokenUsdPrice = useCallback(async (token: SwapToken) => {
    console.log("fetchTokenUsdPrice", token.symbol);

    try {
      const result = await getPrice(token.coinType);
      if (result === undefined) return;

      setUsdPriceMap((o) => ({
        ...o,
        [token.coinType]: BigNumber(result),
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchedInitialTokenUsdPricesRef = useRef<boolean>(false);
  useEffect(() => {
    if (fetchedInitialTokenUsdPricesRef.current) return;

    fetchTokenUsdPrice(tokenIn);
    fetchTokenUsdPrice(tokenOut);
    fetchedInitialTokenUsdPricesRef.current = true;
  }, [fetchTokenUsdPrice, tokenIn, tokenOut]);

  const tokenInUsdValue = useMemo(
    () =>
      quoteAmountIn !== undefined && tokenInUsdPrice !== undefined
        ? quoteAmountIn.times(tokenInUsdPrice)
        : undefined,
    [quoteAmountIn, tokenInUsdPrice],
  );
  const tokenOutUsdValue = useMemo(
    () =>
      quoteAmountOut !== undefined && tokenOutUsdPrice !== undefined
        ? quoteAmountOut.times(tokenOutUsdPrice)
        : undefined,
    [quoteAmountOut, tokenOutUsdPrice],
  );

  // Ratios
  const [isInverted, setIsInverted] = useState<boolean>(false);

  const currentTokenRatio = useMemo(
    () =>
      tokenInUsdPrice !== undefined && tokenOutUsdPrice !== undefined
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
      quoteAmountOut !== undefined && quoteAmountIn !== undefined
        ? (!isInverted ? quoteAmountOut : quoteAmountIn).div(
            !isInverted ? quoteAmountIn : quoteAmountOut,
          )
        : undefined,
    [quoteAmountOut, quoteAmountIn, isInverted],
  );

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

  // Reverse tokens
  const reverseTokens = () => {
    formatAndSetValue(value, tokenOut);
    setQuotesMap({});

    if (new BigNumber(value || 0).gt(0)) fetchQuote(tokenOut, tokenIn, value);

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

      const isReserve = !!data.lendingMarket.reserves.find(
        (r) => r.coinType === coinType,
      );
      setTokenSymbol(isReserve ? _token.symbol : _token.coinType, direction);

      fetchQuote(
        direction === TokenDirection.IN ? _token : tokenIn,
        direction === TokenDirection.IN ? tokenOut : _token,
        value,
      );
      if (historicalUsdPricesMap[_token.coinType] === undefined)
        fetchTokenHistoricalUsdPrices(_token);
    }

    inputRef.current?.focus();
  };

  // Swap
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [isSwappingAndDepositing, setIsSwappingAndDepositing] =
    useState<boolean>(false);

  const swapButtonState: SubmitButtonState = (() => {
    if (!address) return { isDisabled: true, title: "Connect wallet" };
    if (isSwapping) return { isDisabled: true, isLoading: true };

    if (value === "") return { isDisabled: true, title: "Enter an amount" };
    if (new BigNumber(value).lt(0))
      return { isDisabled: true, title: "Enter a +ve amount" };
    if (new BigNumber(value).eq(0))
      return { isDisabled: true, title: "Enter a non-zero amount" };

    if (suiBalance.lt(SUI_GAS_MIN))
      return {
        isDisabled: true,
        title: `${SUI_GAS_MIN} SUI should be saved for gas`,
      };

    for (const calc of tokenInMaxCalculations) {
      if (new BigNumber(value).gt(calc.value))
        return { isDisabled: calc.isDisabled, title: calc.reason };
    }

    return {
      title: `Swap ${formatToken(new BigNumber(value), {
        dp: tokenIn.decimals,
        trimTrailingZeros: true,
      })} ${tokenIn.symbol}`,
      isDisabled: !quote || isSwappingAndDepositing,
    };
  })();

  const swapAndDepositButtonDisabledTooltip = (() => {
    if (!hasTokenOutReserve || quoteAmountOut === undefined) return;

    const depositSubmitButtonNoValueState = getSubmitButtonNoValueState(
      Action.DEPOSIT,
      data.lendingMarket.reserves,
      tokenOutReserve,
      obligation,
    )();
    const depositSubmitButtonState = getSubmitButtonState(
      Action.DEPOSIT,
      tokenOutReserve,
      quoteAmountOut.plus(isSui(tokenOutReserve.coinType) ? SUI_GAS_MIN : 0),
      data,
      obligation,
    )(quoteAmountOut.toString());

    if (
      depositSubmitButtonNoValueState !== undefined &&
      depositSubmitButtonNoValueState.isDisabled
    )
      return [
        depositSubmitButtonNoValueState.title,
        depositSubmitButtonNoValueState.description,
      ]
        .filter(Boolean)
        .join(" - ");
    if (
      depositSubmitButtonState !== undefined &&
      depositSubmitButtonState.isDisabled
    )
      return depositSubmitButtonState.title;
  })();

  const swapAndDepositButtonState: SubmitButtonState = (() => {
    if (!hasTokenOutReserve)
      return { isDisabled: true, title: "Cannot deposit this token" };
    if (isSwappingAndDepositing) return { isDisabled: true, isLoading: true };

    return {
      title: `Swap and deposit for ${formatPercent(tokenOutReserveDepositAprPercent)}${tokenOutStakingYieldAprPercent ? "*" : ""} APR`,
      isDisabled:
        !!swapAndDepositButtonDisabledTooltip ||
        swapButtonState.isDisabled ||
        isSwapping,
    };
  })();

  const getTransactionForStandardizedQuote = async (
    address: string,
    _quote: StandardizedQuote,
    isDepositing: boolean,
  ): Promise<{
    transaction: Transaction;
    outputCoin?: TransactionObjectArgument;
  }> => {
    if (_quote.type === StandardizedQuoteType.AFTERMATH) {
      console.log("Swap - fetching transaction for Aftermath quote");

      if (isDepositing) {
        const { tx: transaction, coinOutId: outputCoin } = await aftermathSdk
          .Router()
          .addTransactionForCompleteTradeRoute({
            tx: new Transaction(),
            walletAddress: address,
            completeRoute: _quote.quote,
            slippage: +slippagePercent / 100,
          });

        return { transaction, outputCoin };
      } else {
        const transaction = await aftermathSdk
          .Router()
          .getTransactionForCompleteTradeRoute({
            walletAddress: address,
            completeRoute: _quote.quote,
            slippage: +slippagePercent / 100,
          });

        return { transaction };
      }
    } else throw new Error("Unknown quote type");
  };

  const swap = async (deposit?: boolean) => {
    if (!address) throw new Error("Wallet not connected");
    if (!quote) throw new Error("Quote not found");
    if (deposit && !hasTokenOutReserve)
      throw new Error("Cannot deposit this token");

    const isDepositing = !!(deposit && hasTokenOutReserve);

    let transaction: Transaction;
    try {
      const { transaction: transaction2, outputCoin } =
        await getTransactionForStandardizedQuote(address, quote, isDepositing);
      transaction = transaction2;
      transaction.setGasBudget(SUI_GAS_MIN * 10 ** SUI_DECIMALS);

      if (isDepositing) {
        if (!outputCoin) throw new Error("Missing coin to deposit");

        const { obligationOwnerCapId, didCreate } =
          createObligationIfNoneExists(
            suilendClient,
            transaction,
            obligationOwnerCap,
          );
        suilendClient.deposit(
          outputCoin,
          tokenOutReserve.coinType,
          obligationOwnerCapId,
          transaction,
        );
        if (didCreate)
          sendObligationToUser(obligationOwnerCapId, address, transaction);
      }
    } catch (err) {
      Sentry.captureException(err);
      console.error(err);
      throw err;
    }

    const res = await signExecuteAndWaitForTransaction(transaction, {
      auction: true,
    });
    return res;
  };

  const onSwapClick = async (deposit?: boolean) => {
    if (deposit) {
      if (swapAndDepositButtonState.isDisabled) return;
    } else {
      if (swapButtonState.isDisabled) return;
    }
    if (quoteAmountOut === undefined || isFetchingQuote) return;

    (deposit ? setIsSwappingAndDepositing : setIsSwapping)(true);

    try {
      const res = await swap(deposit);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChangeIn = getBalanceChange(
        res,
        address!,
        { ...tokenIn, description: "" },
        -1,
      );
      const balanceChangeInFormatted = formatToken(
        balanceChangeIn !== undefined ? balanceChangeIn : new BigNumber(value),
        { dp: tokenIn.decimals, trimTrailingZeros: true },
      );

      const balanceChangeOut = getBalanceChange(res, address!, {
        ...tokenOut,
        description: "",
      });
      const balanceChangeOutFormatted = formatToken(
        !deposit && balanceChangeOut !== undefined
          ? balanceChangeOut
          : quoteAmountOut, // When swapping+depositing, the out asset doesn't reach the wallet as it is immediately deposited
        { dp: tokenOut.decimals, trimTrailingZeros: true },
      );

      toast.success(
        `Swapped ${balanceChangeInFormatted} ${tokenIn.symbol} for ${balanceChangeOutFormatted} ${tokenOut.symbol}`,
        {
          description: deposit
            ? `Deposited ${balanceChangeOutFormatted} ${tokenOut.symbol}`
            : undefined,
          icon: <ArrowRightLeft className="h-5 w-5 text-success" />,
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
      formatAndSetValue("", tokenIn);

      const properties: Record<string, string | number> = {
        assetIn: tokenIn.symbol,
        assetOut: tokenOut.symbol,
        amountIn: value,
        amountOut: quoteAmountOut.toFixed(
          tokenOut.decimals,
          BigNumber.ROUND_DOWN,
        ),
        deposit: deposit ? "true" : "false",
      };
      if (tokenInUsdValue !== undefined)
        properties.amountInUsd = tokenInUsdValue.toFixed(
          2,
          BigNumber.ROUND_DOWN,
        );
      if (tokenOutUsdValue !== undefined)
        properties.amountOutUsd = tokenOutUsdValue.toFixed(
          2,
          BigNumber.ROUND_DOWN,
        );

      track("swap_success", properties);
    } catch (err) {
      toast.error(`Failed to ${deposit ? "swap and deposit" : "swap"}`, {
        description: (err as Error)?.message || "An unknown error occurred",
        duration: TX_TOAST_DURATION,
      });
    } finally {
      (deposit ? setIsSwappingAndDepositing : setIsSwapping)(false);
      inputRef.current?.focus();
      await refresh();
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
            <div className="flex flex-row items-center justify-between gap-2">
              <Button
                className="h-7 w-7 rounded-full bg-muted/15 px-0"
                tooltip="Refresh"
                icon={<RotateCw className="h-3 w-3" />}
                variant="ghost"
                onClick={() => fetchQuote(tokenIn, tokenOut, value)}
              >
                Refresh
              </Button>

              <SwapSlippagePopover
                slippagePercent={slippagePercent}
                onSlippagePercentChange={formatAndSetSlippagePercent}
              />
            </div>

            {/* In */}
            <div className="relative z-[1]">
              <div className="relative z-[2] w-full">
                <SwapInput
                  ref={inputRef}
                  title="Sell"
                  autoFocus
                  value={value}
                  onChange={onValueChange}
                  usdValue={tokenInUsdValue}
                  token={tokenIn}
                  onSelectToken={(t: SwapToken) =>
                    onTokenCoinTypeChange(t.coinType, TokenDirection.IN)
                  }
                  onBalanceClick={useMaxValueWrapper}
                />
              </div>

              {!!tokenInReserve && (
                <div className="relative z-[1] -mt-2 flex w-full flex-row flex-wrap justify-end gap-x-2 gap-y-1 rounded-b-md bg-primary/25 px-3 pb-2 pt-4">
                  <div className="flex flex-row items-center gap-2">
                    <TLabelSans>Deposited</TLabelSans>
                    <TBody className="text-xs">
                      {formatToken(tokenInDepositPositionAmount, {
                        exact: false,
                      })}{" "}
                      {tokenIn.symbol}
                    </TBody>
                  </div>
                </div>
              )}
            </div>

            {/* Reverse */}
            <div className="relative z-[2] -my-7 w-max self-center rounded-full bg-background">
              <Button
                className="rounded-full px-0"
                icon={<ArrowUpDown />}
                variant="secondary"
                size="icon"
                onClick={reverseTokens}
              >
                Reverse
              </Button>
            </div>

            {/* Out */}
            <div className="relative z-[1]">
              <div className="relative z-[2] w-full">
                <SwapInput
                  title="Buy"
                  value={
                    new BigNumber(value || 0).gt(0) &&
                    quoteAmountOut !== undefined
                      ? quoteAmountOut.toFixed(
                          tokenOut.decimals,
                          BigNumber.ROUND_DOWN,
                        )
                      : ""
                  }
                  isValueLoading={isFetchingQuote}
                  usdValue={tokenOutUsdValue}
                  token={tokenOut}
                  onSelectToken={(t: SwapToken) =>
                    onTokenCoinTypeChange(t.coinType, TokenDirection.OUT)
                  }
                />
              </div>

              {hasTokenOutReserve && (
                <div className="relative z-[1] -mt-2 flex w-full flex-row flex-wrap justify-end gap-x-2 gap-y-1 rounded-b-md bg-border px-3 pb-2 pt-4">
                  <div className="flex flex-row items-center gap-2">
                    <TLabelSans>Deposited</TLabelSans>
                    <TBody className="text-xs">
                      {formatToken(tokenOutDepositPositionAmount, {
                        exact: false,
                      })}{" "}
                      {tokenOut.symbol}
                    </TBody>
                  </div>
                </div>
              )}
            </div>

            {/* Parameters */}
            {new BigNumber(value || 0).gt(0) && (
              <div className="flex w-full flex-col gap-2">
                {/* Quote and routing */}
                <div className="flex w-full flex-row justify-between">
                  {/* Quote */}
                  {quoteRatio !== undefined ? (
                    <Button
                      className="h-4 gap-2 p-0 text-muted-foreground hover:bg-transparent"
                      labelClassName="text-xs"
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

                  {/* Routing */}
                  {quote ? (
                    <ReactFlowProvider>
                      <RoutingDialog quote={quote} />
                    </ReactFlowProvider>
                  ) : (
                    <Skeleton className="h-4 w-20" />
                  )}
                </div>

                {/* Price difference */}
                {priceDifferencePercent !== undefined &&
                  priceDifferencePercent.gte(
                    PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD,
                  ) && (
                    <div className="w-max">
                      <TLabelSans
                        className={cn(
                          cn(
                            "font-medium",
                            priceDifferencePercent.gte(
                              PRICE_DIFFERENCE_PERCENT_DESTRUCTIVE_THRESHOLD,
                            )
                              ? "text-destructive"
                              : "text-warning",
                          ),
                        )}
                      >
                        <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                        {formatPercent(
                          BigNumber.max(0, priceDifferencePercent),
                        )}{" "}
                        Price difference (Birdeye)
                      </TLabelSans>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex w-full flex-col gap-px">
            {/* Swap */}
            <Button
              className={cn(
                "h-auto min-h-14 w-full py-2",
                hasTokenOutReserve && "rounded-b-none",
              )}
              labelClassName="text-wrap uppercase"
              style={{ overflowWrap: "anywhere" }}
              disabled={swapButtonState.isDisabled}
              onClick={() => onSwapClick()}
            >
              {swapButtonState.isLoading ? (
                <Spinner size="md" />
              ) : (
                swapButtonState.title
              )}
            </Button>

            {/* Swap and deposit */}
            {hasTokenOutReserve && (
              <Tooltip title={swapAndDepositButtonDisabledTooltip}>
                <Button
                  className={cn(
                    "rounded-t-none",
                    swapAndDepositButtonState.isDisabled &&
                      "!cursor-default !bg-secondary opacity-50",
                  )}
                  labelClassName="uppercase text-xs"
                  variant="secondary"
                  onClick={
                    swapAndDepositButtonState.isDisabled
                      ? undefined
                      : () => onSwapClick(true)
                  }
                >
                  {swapAndDepositButtonState.isLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    swapAndDepositButtonState.title
                  )}
                </Button>
              </Tooltip>
            )}
          </div>

          {/* Tokens */}
          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="flex flex-col gap-1.5">
              <div
                className="group flex cursor-pointer flex-row items-center gap-2"
                onClick={() => setIsInverted((is) => !is)}
              >
                <TokenLogos
                  className="h-4 w-4"
                  tokens={
                    !isInverted ? [tokenIn, tokenOut] : [tokenOut, tokenIn]
                  }
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
              href={`https://birdeye.so/token/${isSui(tokenIn.coinType) ? SUI_COINTYPE : tokenIn.coinType}?chain=sui`}
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
          <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground"
            href="https://aftermath.finance/trade"
            noIcon
          >
            Aftermath
          </TextLink>
        </TLabelSans>
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
