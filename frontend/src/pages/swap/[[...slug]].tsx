import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildTx as build7kTransaction,
  getQuote as get7kQuote,
} from "@7kprotocol/sdk-ts/cjs";
import { AggregatorClient as CetusSdk } from "@cetusprotocol/aggregator-sdk";
import {
  Transaction,
  TransactionObjectArgument,
  coinWithBalance,
} from "@mysten/sui/transactions";
import { SUI_DECIMALS, normalizeStructTag } from "@mysten/sui/utils";
import * as Sentry from "@sentry/nextjs";
import { Aftermath as AftermathSdk } from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";
import {
  AlertTriangle,
  ArrowRightLeft,
  ArrowUpDown,
  Download,
  Info,
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
  getBalanceChange,
  isSui,
} from "@suilend/frontend-sui";
import track from "@suilend/frontend-sui/lib/track";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import {
  WAD,
  createObligationIfNoneExists,
  maxU64,
  sendObligationToUser,
} from "@suilend/sdk";
import { Action } from "@suilend/sdk/lib/types";

import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import Switch from "@/components/shared/Switch";
import TextLink from "@/components/shared/TextLink";
import TokenLogos from "@/components/shared/TokenLogos";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import YourUtilizationLabel from "@/components/shared/YourUtilizationLabel";
import RoutingDialog from "@/components/swap/RoutingDialog";
import SwapInput from "@/components/swap/SwapInput";
import SwapSlippagePopover, {
  SLIPPAGE_PERCENT_DP,
} from "@/components/swap/SwapSlippagePopover";
import TokenRatiosChart from "@/components/swap/TokenRatiosChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  HISTORICAL_USD_PRICES_INTERVAL_S,
  QuoteProvider,
  StandardizedQuote,
  SwapContextProvider,
  TokenDirection,
  useSwapContext,
} from "@/contexts/SwapContext";
import { _7K_PARTNER_ADDRESS } from "@/lib/7k";
import {
  getMaxValue,
  getNewBorrowUtilizationCalculations,
  getSubmitButtonNoValueState,
  getSubmitButtonState,
  getSubmitWarningMessages,
} from "@/lib/actions";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { formatInteger, formatPercent, formatToken } from "@/lib/format";
import { SubmitButtonState, SwapToken } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD = 1;
const PRICE_DIFFERENCE_PERCENT_DESTRUCTIVE_THRESHOLD = 8;

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

  const {
    tokenHistoricalUsdPricesMap,
    fetchTokenHistoricalUsdPrices,
    tokenUsdPricesMap,
    fetchTokenUsdPrice,
    isUsingDeposits,
    setIsUsingDeposits,
    tokens,
    setTokenSymbol,
    reverseTokenSymbols,
    ...restSwapContext
  } = useSwapContext();
  const aftermathSdk = restSwapContext.aftermathSdk as AftermathSdk;
  const cetusSdk = restSwapContext.cetusSdk as CetusSdk;
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

  // Max
  const tokenInMaxCalculations = (() => {
    const result = [
      {
        reason: `Insufficient ${tokenIn.symbol}`,
        isDisabled: true,
        value: isUsingDeposits
          ? getMaxValue(
              Action.WITHDRAW,
              tokenInReserve!,
              tokenInDepositPositionAmount,
              data,
              obligation,
            )()
          : tokenInBalance,
      },
    ];
    if (isSui(tokenIn.coinType) && !isUsingDeposits)
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
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [isSwappingAndDepositing, setIsSwappingAndDepositing] =
    useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<string>("");

  // Quote
  const activeProvidersMap = useMemo(
    () => ({
      [QuoteProvider.AFTERMATH]: true, // W->W, W->D, D->D
      [QuoteProvider.CETUS]: true, // W->W, W->D, D->D
      [QuoteProvider._7K]: true, // W->W, W->D, D->D
    }),
    [],
  );
  const numActiveProviders = useMemo(
    () => Object.values(activeProvidersMap).filter(Boolean).length,
    [activeProvidersMap],
  );

  const [quotesMap, setQuotesMap] = useState<
    Record<number, StandardizedQuote[]>
  >({});

  const quotes = useMemo(() => {
    const timestampsS = Object.entries(quotesMap)
      .filter(([, value]) => value.length > 0)
      .map(([timestampS]) => +timestampS);
    if (timestampsS.length === 0) return undefined;

    const maxTimestampS = Math.max(...timestampsS);
    if (quotesMap[maxTimestampS].length === 0) return undefined;

    const sortedQuotes = quotesMap[maxTimestampS]
      .slice()
      .sort((a, b) => +b.out.amount.minus(a.out.amount));
    return sortedQuotes;
  }, [quotesMap]);

  const quote = quotes?.find(
    (q) =>
      q.in.coinType === tokenIn.coinType &&
      q.out.coinType === tokenOut.coinType,
  ); // Best quote by amount out
  const quoteAmountIn = useMemo(() => quote?.in.amount, [quote?.in.amount]);
  const quoteAmountOut = useMemo(() => quote?.out.amount, [quote?.out.amount]);

  const isFetchingQuotes = useMemo(() => {
    const timestampsS = Object.keys(quotesMap).map((timestampS) => +timestampS);
    if (timestampsS.length === 0) return false;

    const maxTimestampS = Math.max(...timestampsS);
    return quotesMap[maxTimestampS].length < numActiveProviders;
  }, [quotesMap, numActiveProviders]);

  const fetchQuotes = useCallback(
    async (
      _tokenIn: SwapToken,
      _tokenOut: SwapToken,
      _value: string,
      _timestamp = new Date().getTime(),
    ) => {
      if (_tokenIn.coinType === _tokenOut.coinType) return;
      if (new BigNumber(_value || 0).lte(0)) return;

      setQuotesMap((o) => ({ ...o, [_timestamp]: [] }));

      const amountIn = new BigNumber(_value)
        .times(10 ** _tokenIn.decimals)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString();

      // Fetch quotes in parallel
      // Aftermath
      if (activeProvidersMap[QuoteProvider.AFTERMATH]) {
        (async () => {
          console.log("Swap - fetching Aftermath quote");

          try {
            const quote = await aftermathSdk
              .Router()
              .getCompleteTradeRouteGivenAmountIn({
                coinInType: _tokenIn.coinType,
                coinOutType: _tokenOut.coinType,
                coinInAmount: BigInt(amountIn),
              });

            const standardizedQuote: StandardizedQuote = {
              id: uuidv4(),
              provider: QuoteProvider.AFTERMATH,
              in: {
                coinType: _tokenIn.coinType,
                amount: new BigNumber(quote.coinIn.amount.toString()).div(
                  10 ** _tokenIn.decimals,
                ),
              },
              out: {
                coinType: _tokenOut.coinType,
                amount: new BigNumber(quote.coinOut.amount.toString()).div(
                  10 ** _tokenOut.decimals,
                ),
              },
              routes: quote.routes.map((route, routeIndex) => ({
                percent: new BigNumber(route.portion.toString())
                  .div(WAD)
                  .times(100),
                path: route.paths.map((path) => ({
                  id: path.poolId,
                  routeIndex,
                  provider: path.protocolName,
                  in: {
                    coinType: normalizeStructTag(path.coinIn.type),
                    amount: new BigNumber(path.coinIn.amount.toString()).div(
                      10 ** _tokenIn.decimals,
                    ),
                  },
                  out: {
                    coinType: normalizeStructTag(path.coinOut.type),
                    amount: new BigNumber(path.coinOut.amount.toString()).div(
                      10 ** _tokenOut.decimals,
                    ),
                  },
                })),
              })),
              quote,
            };

            setQuotesMap((o) =>
              o[_timestamp] === undefined
                ? o
                : {
                    ...o,
                    [_timestamp]: [...o[_timestamp], standardizedQuote],
                  },
            );
            console.log(
              "Swap - set Aftermath quote",
              +standardizedQuote.out.amount,
            );
          } catch (err) {
            console.error(err);
          }
        })();
      }

      // Cetus
      if (activeProvidersMap[QuoteProvider.CETUS]) {
        (async () => {
          console.log("Swap - fetching Cetus quote");

          try {
            const quote = await cetusSdk.findRouters({
              from: _tokenIn.coinType,
              target: _tokenOut.coinType,
              amount: new BN(amountIn),
              byAmountIn: true,
            });
            if (!quote) return;

            const standardizedQuote: StandardizedQuote = {
              id: uuidv4(),
              provider: QuoteProvider.CETUS,
              in: {
                coinType: _tokenIn.coinType,
                amount: new BigNumber(quote.amountIn.toString()).div(
                  10 ** _tokenIn.decimals,
                ),
              },
              out: {
                coinType: _tokenOut.coinType,
                amount: new BigNumber(quote.amountOut.toString()).div(
                  10 ** _tokenOut.decimals,
                ),
              },
              routes: quote.routes.map((route, routeIndex) => ({
                percent: new BigNumber(route.amountIn.toString())
                  .div(quote.amountIn.toString())
                  .times(100),
                path: route.path.map((path) => ({
                  id: path.id,
                  routeIndex,
                  provider: path.provider,
                  in: {
                    coinType: normalizeStructTag(path.from),
                    amount: new BigNumber(path.amountIn.toString()).div(
                      10 ** _tokenIn.decimals,
                    ),
                  },
                  out: {
                    coinType: normalizeStructTag(path.target),
                    amount: new BigNumber(path.amountOut.toString()).div(
                      10 ** _tokenOut.decimals,
                    ),
                  },
                })),
              })),
              quote,
            };

            setQuotesMap((o) =>
              o[_timestamp] === undefined
                ? o
                : {
                    ...o,
                    [_timestamp]: [...o[_timestamp], standardizedQuote],
                  },
            );
            console.log(
              "Swap - set Cetus quote",
              +standardizedQuote.out.amount,
            );
          } catch (err) {
            console.error(err);
          }
        })();
      }

      // 7K
      if (activeProvidersMap[QuoteProvider._7K]) {
        (async () => {
          console.log("Swap - fetching 7K quote");

          try {
            const quote = await get7kQuote({
              tokenIn: _tokenIn.coinType,
              tokenOut: _tokenOut.coinType,
              amountIn,
            });

            const standardizedQuote: StandardizedQuote = {
              id: uuidv4(),
              provider: QuoteProvider._7K,
              in: {
                coinType: _tokenIn.coinType,
                amount: new BigNumber(quote.swapAmount),
              },
              out: {
                coinType: _tokenOut.coinType,
                amount: new BigNumber(quote.returnAmount),
              },
              routes: (quote.routes ?? []).map((route, routeIndex) => ({
                percent: new BigNumber(route.tokenInAmount)
                  .div(quote.swapAmount)
                  .times(100),
                path: route.hops.map((hop) => ({
                  id: hop.poolId,
                  routeIndex,
                  provider: hop.pool.type,
                  in: {
                    coinType: normalizeStructTag(hop.tokenIn),
                    amount: new BigNumber(hop.tokenInAmount),
                  },
                  out: {
                    coinType: normalizeStructTag(hop.tokenOut),
                    amount: new BigNumber(hop.tokenOutAmount),
                  },
                })),
              })),
              quote,
            };

            setQuotesMap((o) =>
              o[_timestamp] === undefined
                ? o
                : {
                    ...o,
                    [_timestamp]: [...o[_timestamp], standardizedQuote],
                  },
            );
            console.log("Swap - set 7K quote", +standardizedQuote.out.amount);
          } catch (err) {
            console.error(err);
          }
        })();
      }
    },
    [activeProvidersMap, aftermathSdk, cetusSdk],
  );

  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);

    if (isSwapping || isSwappingAndDepositing) return;
    refreshIntervalRef.current = setInterval(
      () => fetchQuotes(tokenIn, tokenOut, value),
      30 * 1000,
    );

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [
    isSwapping,
    isSwappingAndDepositing,
    fetchQuotes,
    tokenIn,
    tokenOut,
    value,
  ]);

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

    if (new BigNumber(_value || 0).gt(0))
      fetchQuotes(tokenIn, tokenOut, _value);
    else setQuotesMap({});
  };

  const useMaxValueWrapper = () => {
    formatAndSetValue(tokenInMaxAmount, tokenIn);

    if (new BigNumber(tokenInMaxAmount).gt(0))
      fetchQuotes(tokenIn, tokenOut, tokenInMaxAmount);
    else setQuotesMap({});

    inputRef.current?.focus();
  };

  // Use deposits - utilization
  const newObligation = (() => {
    if (!(obligation && tokenInReserve && tokenOutReserve && quote))
      return undefined;

    const withdrawObligation = {
      ...obligation,
      ...(getNewBorrowUtilizationCalculations(
        Action.WITHDRAW,
        tokenInReserve,
        obligation,
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
  })();

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
  const PriceDifferenceIcon = priceDifferencePercent?.gte(
    PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD,
  )
    ? AlertTriangle
    : Info;

  // Reverse tokens
  const reverseTokens = () => {
    formatAndSetValue(value, tokenOut);
    setQuotesMap({});

    if (new BigNumber(value || 0).gt(0)) fetchQuotes(tokenOut, tokenIn, value);

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

      fetchQuotes(
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
      title: `Swap ${tokenIn.symbol} for ${tokenOut.symbol}`,
      isDisabled: !quote || isFetchingQuotes || isSwappingAndDepositing,
    };
  })();

  // Swap and deposit
  const swapAndDepositButtonState: SubmitButtonState = (() => {
    if (!tokenOutReserve)
      return { isDisabled: true, title: "Cannot deposit this token" };

    if (isSwappingAndDepositing) return { isDisabled: true, isLoading: true };

    const swapAndDepositButtonNoValueState = getSubmitButtonNoValueState(
      Action.DEPOSIT,
      data.lendingMarket.reserves,
      tokenOutReserve,
      obligation,
    )();
    if (swapAndDepositButtonNoValueState !== undefined)
      return swapAndDepositButtonNoValueState;

    if (isUsingDeposits) {
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
    }

    const swapAndDepositButtonState = getSubmitButtonState(
      Action.DEPOSIT,
      tokenOutReserve,
      maxU64,
      data,
      obligation,
    )(quoteAmountOut ?? new BigNumber(0));
    if (swapAndDepositButtonState !== undefined)
      return swapAndDepositButtonState;

    return {
      title: `Swap ${tokenIn.symbol} for ${tokenOut.symbol} and deposit`,
      isDisabled: swapButtonState.isDisabled || isSwapping,
    };
  })();

  const swapAndDepositWarningMessages = tokenOutReserve
    ? getSubmitWarningMessages(
        Action.DEPOSIT,
        data.lendingMarket.reserves,
        tokenOutReserve,
        obligation,
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
    if (!quote) throw new Error("Quote not found");

    if (quote.provider === QuoteProvider.AFTERMATH) {
      console.log("Swap - fetching transaction for Aftermath quote");

      const { tx: transaction2, coinOutId: coinOut } = await aftermathSdk
        .Router()
        .addTransactionForCompleteTradeRoute({
          tx: transaction,
          walletAddress: address,
          completeRoute: quote.quote,
          slippage: +slippagePercent / 100,
          coinInId: coinIn,
        });

      return { transaction: transaction2, coinOut };
    } else if (quote.provider === QuoteProvider.CETUS) {
      console.log("Swap - fetching transaction for Cetus quote");

      if (!coinIn)
        coinIn = coinWithBalance({
          balance: BigInt(quote.quote.amountIn.toString()),
          type: quote.in.coinType,
          useGasCoin: isSui(quote.in.coinType),
        })(transaction);

      const coinOut = await cetusSdk.routerSwap({
        routers: quote.quote,
        inputCoin: coinIn,
        slippage: +slippagePercent / 100,
        txb: transaction,
        partner: CETUS_PARTNER_ID,
      });

      return { transaction, coinOut };
    } else if (quote.provider === QuoteProvider._7K) {
      const { tx: transaction2, coinOut } = await build7kTransaction({
        quoteResponse: quote.quote,
        accountAddress: address,
        slippage: +slippagePercent / 100,
        commission: {
          partner: _7K_PARTNER_ADDRESS,
          commissionBps: 0,
        },
        extendTx: {
          tx: transaction,
          coinIn,
        },
      });

      return { transaction: transaction2, coinOut };
    } else throw new Error("Unknown quote type");
  };

  const swap = async (isDepositing: boolean) => {
    if (!address) throw new Error("Wallet not connected");
    if (!quote) throw new Error("Quote not found");

    let submitAmount = quote.in.amount
      .times(10 ** tokenIn.decimals)
      .integerValue(BigNumber.ROUND_DOWN)
      .toString();

    let transaction = new Transaction();

    try {
      let coinIn: TransactionObjectArgument | undefined;
      if (isUsingDeposits) {
        if (!obligation || !obligationOwnerCap)
          throw new Error("Obligation or ObligationOwnerCap not found");
        if (!tokenInReserve || !tokenInDepositPosition)
          throw new Error("Cannot withdraw this token");

        submitAmount = BigNumber.min(
          new BigNumber(submitAmount)
            .div(tokenInReserve.cTokenExchangeRate)
            .integerValue(BigNumber.ROUND_UP),
          tokenInDepositPosition.depositedCtokenAmount,
        ).toString();

        // TODO: Support MAX
        const [_coinIn] = await suilendClient.withdraw(
          obligationOwnerCap.id,
          obligation.id,
          tokenIn.coinType,
          submitAmount,
          transaction,
        );
        coinIn = _coinIn;
      }

      const { transaction: _transaction, coinOut } =
        await getTransactionForStandardizedQuote(transaction, coinIn);
      if (!coinOut)
        throw new Error("Missing coin to transfer to deposit/transfer to user");

      transaction = _transaction;
      transaction.setGasBudget(SUI_GAS_MIN * 10 ** SUI_DECIMALS);

      if (isDepositing) {
        if (!tokenOutReserve) throw new Error("Cannot deposit this token");

        const { obligationOwnerCapId, didCreate } =
          createObligationIfNoneExists(
            suilendClient,
            transaction,
            obligationOwnerCap,
          );
        suilendClient.deposit(
          coinOut,
          tokenOutReserve.coinType,
          obligationOwnerCapId,
          transaction,
        );
        if (didCreate)
          sendObligationToUser(obligationOwnerCapId, address, transaction);
      } else
        transaction.transferObjects(
          [coinOut],
          transaction.pure.address(address),
        );
    } catch (err) {
      Sentry.captureException(err, { provider: quote.provider } as any);
      console.error(err);
      throw err;
    }

    const res = await signExecuteAndWaitForTransaction(transaction, {
      auction: true,
    });
    return res;
  };

  const onSwapClick = async (isDepositing: boolean) => {
    if (!address) throw new Error("Wallet not connected");
    if (!quote) throw new Error("Quote not found");

    if (isDepositing) {
      if (swapAndDepositButtonState.isDisabled) return;
    } else {
      if (swapButtonState.isDisabled) return;
    }

    (isDepositing ? setIsSwappingAndDepositing : setIsSwapping)(true);

    try {
      const res = await swap(isDepositing);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChangeIn = getBalanceChange(
        res,
        address,
        { ...tokenIn, description: "" },
        -1,
      );
      const balanceChangeInFormatted = formatToken(
        !isUsingDeposits && balanceChangeIn !== undefined
          ? balanceChangeIn
          : quote.in.amount, // When using deposits, the in asset is not in the wallet
        { dp: tokenIn.decimals, trimTrailingZeros: true },
      );

      const balanceChangeOut = getBalanceChange(res, address, {
        ...tokenOut,
        description: "",
      });
      const balanceChangeOutFormatted = formatToken(
        !isDepositing && balanceChangeOut !== undefined
          ? balanceChangeOut
          : quote.out.amount, // When swapping+depositing, the out asset doesn't reach the wallet as it is immediately deposited
        { dp: tokenOut.decimals, trimTrailingZeros: true },
      );

      toast.success(
        `Swapped ${balanceChangeInFormatted} ${tokenIn.symbol} for ${balanceChangeOutFormatted} ${tokenOut.symbol}`,
        {
          description: isDepositing
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
      setQuotesMap({});

      const properties: Record<string, string | number> = {
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
        deposit: isDepositing ? "true" : "false",
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
      toast.error(`Failed to ${isDepositing ? "swap and deposit" : "swap"}`, {
        description: (err as Error)?.message || "An unknown error occurred",
        duration: TX_TOAST_DURATION,
      });
    } finally {
      (isDepositing ? setIsSwappingAndDepositing : setIsSwapping)(false);
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
            <div className="flex flex-row items-center justify-between gap-4">
              {/* Left */}
              <Button
                className="h-7 w-7 rounded-full bg-muted/15 px-0"
                tooltip="Refresh"
                icon={<RotateCw className="h-3 w-3" />}
                variant="ghost"
                onClick={() => fetchQuotes(tokenIn, tokenOut, value)}
              >
                Refresh
              </Button>

              {/* Right */}
              <div className="flex flex-row items-center gap-4">
                {(obligation?.deposits ?? []).length > 0 && (
                  <Switch
                    id="isUsingDeposits"
                    label="Use deposits"
                    horizontal
                    isChecked={isUsingDeposits}
                    onToggle={setIsUsingDeposits}
                  />
                )}

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
                onSelectToken={(t: SwapToken) =>
                  onTokenCoinTypeChange(t.coinType, TokenDirection.IN)
                }
                onAmountClick={useMaxValueWrapper}
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
              >
                Reverse
              </Button>
            </div>

            {/* Out */}
            <div className="relative z-[1]">
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
                isValueLoading={isFetchingQuotes}
                usdValue={tokenOutUsdValue}
                direction={TokenDirection.OUT}
                token={tokenOut}
                onSelectToken={(t: SwapToken) =>
                  onTokenCoinTypeChange(t.coinType, TokenDirection.OUT)
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

                  {/* Routing */}
                  {quote ? (
                    <ReactFlowProvider>
                      <RoutingDialog quote={quote} />
                    </ReactFlowProvider>
                  ) : (
                    <Skeleton className="h-4 w-12" />
                  )}
                </div>

                {/* Price difference */}
                {priceDifferencePercent !== undefined ? (
                  <div className="w-max">
                    <TLabelSans
                      className={cn(
                        "text-foreground",
                        priceDifferencePercent.gte(
                          PRICE_DIFFERENCE_PERCENT_WARNING_THRESHOLD,
                        ) &&
                          cn(
                            "text-warning",
                            priceDifferencePercent.gte(
                              PRICE_DIFFERENCE_PERCENT_DESTRUCTIVE_THRESHOLD,
                            ) && "text-destructive",
                          ),
                      )}
                    >
                      <PriceDifferenceIcon className="mb-0.5 mr-1 inline h-3 w-3" />
                      {formatPercent(BigNumber.max(0, priceDifferencePercent))}{" "}
                      Price difference (Birdeye)
                    </TLabelSans>
                  </div>
                ) : (
                  <Skeleton className="h-4 w-48" />
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex w-full flex-col gap-px">
            {!isUsingDeposits ? (
              <>
                {/* Swap */}
                <Button
                  className={cn(
                    "h-auto min-h-14 w-full",
                    tokenOutReserve && "rounded-b-none",
                  )}
                  labelClassName="text-wrap uppercase"
                  size="lg"
                  disabled={swapButtonState.isDisabled}
                  onClick={() => onSwapClick(false)}
                >
                  {swapButtonState.isLoading ? (
                    <Spinner size="md" />
                  ) : (
                    swapButtonState.title
                  )}
                  {swapButtonState.description && (
                    <span className="mt-0.5 block font-sans text-xs normal-case">
                      {swapButtonState.description}
                    </span>
                  )}
                </Button>

                {/* Swap and deposit */}
                {tokenOutReserve && (
                  <div className="flex w-full flex-col gap-2">
                    <Button
                      className="h-auto min-h-8 w-full rounded-b-md rounded-t-none py-1"
                      labelClassName="uppercase text-wrap text-xs"
                      variant="secondary"
                      disabled={swapAndDepositButtonState.isDisabled}
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
                      {swapAndDepositButtonState.description && (
                        <span className="block font-sans text-xs normal-case">
                          {swapAndDepositButtonState.description}
                        </span>
                      )}
                    </Button>

                    {(swapAndDepositWarningMessages ?? []).map(
                      (warningMessage) => (
                        <TLabelSans
                          key={warningMessage}
                          className="text-[10px] text-warning"
                        >
                          <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                          {warningMessage}
                        </TLabelSans>
                      ),
                    )}
                  </div>
                )}
              </>
            ) : (
              // Swap and deposit
              <div className="flex w-full flex-col gap-2">
                <Button
                  className="h-auto min-h-14 w-full"
                  labelClassName="text-wrap uppercase"
                  size="lg"
                  disabled={swapAndDepositButtonState.isDisabled}
                  onClick={() => onSwapClick(true)}
                >
                  {swapAndDepositButtonState.isLoading ? (
                    <Spinner size="md" />
                  ) : (
                    swapAndDepositButtonState.title
                  )}
                  {swapAndDepositButtonState.description && (
                    <span className="mt-0.5 block font-sans text-xs normal-case">
                      {swapAndDepositButtonState.description}
                    </span>
                  )}
                </Button>

                {(swapAndDepositWarningMessages ?? []).map((warningMessage) => (
                  <TLabelSans
                    key={warningMessage}
                    className="text-[10px] text-warning"
                  >
                    <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                    {warningMessage}
                  </TLabelSans>
                ))}

                <YourUtilizationLabel
                  obligation={obligation}
                  newObligation={newObligation}
                  noUtilizationBar
                />
              </div>
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
          {", "}
          <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
            href="https://app.cetus.zone"
            noIcon
          >
            Cetus
          </TextLink>
          {", and "}
          <TextLink
            className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
            href="https://7k.ag"
            noIcon
          >
            7K
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
