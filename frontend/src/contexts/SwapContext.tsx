import { useRouter } from "next/router";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  Token,
  getCoinMetadataMap,
  getHistoryPrice,
  getPrice,
  getToken,
  isCoinType,
} from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { SWAP_URL } from "@/lib/navigation";
import { PartnerIdMap, SdkMap, useAggSdks } from "@/lib/swap";

export const DEFAULT_TOKEN_IN_SYMBOL = "SUI";
const DEFAULT_TOKEN_IN_COINTYPE = NORMALIZED_SUI_COINTYPE;

export const DEFAULT_TOKEN_OUT_SYMBOL = "SEND";
const DEFAULT_TOKEN_OUT_COINTYPE = NORMALIZED_SEND_COINTYPE;

export const getSwapUrl = (
  inSymbol: string = DEFAULT_TOKEN_IN_SYMBOL,
  outSymbol: string = DEFAULT_TOKEN_OUT_SYMBOL,
) => `${SWAP_URL}/${inSymbol}-${outSymbol}`;

export enum TokenDirection {
  IN = "in",
  OUT = "out",
}

export const HISTORICAL_USD_PRICES_INTERVAL = "5m";
export const HISTORICAL_USD_PRICES_INTERVAL_S = 5 * 60;

type HistoricalUsdPriceData = {
  timestampS: number;
  priceUsd: number;
};

interface SwapContext {
  sdkMap: SdkMap;
  partnerIdMap: PartnerIdMap;

  tokenHistoricalUsdPricesMap: Record<string, HistoricalUsdPriceData[]>;
  fetchTokenHistoricalUsdPrices: (token: Token) => Promise<void>;
  tokenUsdPricesMap: Record<string, BigNumber>;
  fetchTokenUsdPrice: (token: Token) => Promise<void>;

  swapInAccount: boolean;
  setSwapInAccount: Dispatch<SetStateAction<boolean>>;

  tokens?: Token[];
  fetchTokensMetadata: (coinTypes: string[]) => Promise<void>;
  verifiedCoinTypes: string[];
  tokenIn?: Token;
  tokenOut?: Token;
  setTokenSymbol: (newTokenSymbol: string, direction: TokenDirection) => void;
  reverseTokenSymbols: () => void;
}

const defaultContextValue: SwapContext = {
  sdkMap: {} as SdkMap,
  partnerIdMap: {} as PartnerIdMap,

  tokenHistoricalUsdPricesMap: {},
  fetchTokenHistoricalUsdPrices: async () => {
    throw Error("SwapContextProvider not initialized");
  },
  tokenUsdPricesMap: {},
  fetchTokenUsdPrice: async () => {
    throw Error("SwapContextProvider not initialized");
  },

  swapInAccount: false,
  setSwapInAccount: () => {
    throw Error("SwapContextProvider not initialized");
  },

  tokens: undefined,
  fetchTokensMetadata: async () => {
    throw Error("SwapContextProvider not initialized");
  },
  verifiedCoinTypes: [],
  tokenIn: undefined,
  tokenOut: undefined,
  setTokenSymbol: () => {
    throw Error("SwapContextProvider not initialized");
  },
  reverseTokenSymbols: () => {
    throw Error("SwapContextProvider not initialized");
  },
};

const SwapContext = createContext<SwapContext>(defaultContextValue);

export const useSwapContext = () => useContext(SwapContext);

export function SwapContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const slug = router.query.slug as string[] | undefined;

  const { suiClient } = useSettingsContext();
  const { appData, filteredReserves } = useLoadedAppContext();
  const { rawBalancesMap, balancesCoinMetadataMap, obligation } =
    useLoadedUserContext();

  // send.ag
  const { sdkMap, partnerIdMap } = useAggSdks();

  // USD prices - Historical
  const [tokenHistoricalUsdPricesMap, setTokenHistoricalUsdPricesMap] =
    useState<Record<string, HistoricalUsdPriceData[]>>({});

  const fetchTokenHistoricalUsdPrices = useCallback(async (token: Token) => {
    console.log("fetchTokenHistoricalUsdPrices", token.symbol);

    try {
      // round to the nearest 100 second interval
      const currentTimeS = Math.floor(new Date().getTime() / (1000 * 100)) * 100;

      const result = await getHistoryPrice(
        token.coinType,
        HISTORICAL_USD_PRICES_INTERVAL,
        currentTimeS - 24 * 60 * 60,
        currentTimeS,
      );
      if (result === undefined) return;

      setTokenHistoricalUsdPricesMap((o) => ({
        ...o,
        [token.coinType]: result,
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  // USD prices - Current
  const [tokenUsdPricesMap, setTokenUsdPriceMap] = useState<
    Record<string, BigNumber>
  >({});

  const fetchTokenUsdPrice = useCallback(async (token: Token) => {
    console.log("fetchTokenUsdPrice", token.symbol);

    try {
      const result = await getPrice(token.coinType);
      if (result === undefined || isNaN(result)) return;

      setTokenUsdPriceMap((o) => ({
        ...o,
        [token.coinType]: BigNumber(result),
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Swap in account
  const [swapInAccount, setSwapInAccount] = useState<boolean>(
    router.query.swapInAccount === "true",
  );

  // Tokens
  const [tokens, setTokens] = useState<Token[] | undefined>(undefined);

  const fetchingTokensMetadataRef = useRef<string[]>([]);
  const fetchTokensMetadata = useCallback(
    async (coinTypes: string[]) => {
      const filteredCoinTypes = Array.from(
        new Set(
          coinTypes
            .map(normalizeStructTag)
            .filter(
              (coinType) =>
                !fetchingTokensMetadataRef.current.includes(coinType) &&
                !(tokens || []).find((t) => t.coinType === coinType),
            ),
        ),
      );
      if (filteredCoinTypes.length === 0) return;

      fetchingTokensMetadataRef.current.push(...filteredCoinTypes);

      try {
        const coinTypesMissingMetadata = filteredCoinTypes.filter(
          (coinType) =>
            !Object.keys({
              ...appData.coinMetadataMap,
              ...(balancesCoinMetadataMap ?? {}),
            }).includes(coinType),
        );
        const coinMetadataMap = await getCoinMetadataMap(
          coinTypesMissingMetadata,
        );

        const mergedCoinMetadataMap = {
          ...appData.coinMetadataMap,
          ...(balancesCoinMetadataMap ?? {}),
          ...coinMetadataMap,
        };

        const result = filteredCoinTypes
          .filter((coinType) => !!mergedCoinMetadataMap[coinType])
          .map((coinType) =>
            getToken(coinType, mergedCoinMetadataMap[coinType]),
          );

        setTokens((prev) => [
          ...(prev ?? []),
          ...result.filter(
            (token) => !(prev ?? []).find((t) => t.coinType === token.coinType),
          ),
        ]);
      } catch (err) {
        console.error(err);
      }
    },
    [tokens, appData.coinMetadataMap, balancesCoinMetadataMap],
  );

  // Tokens - Verified coinTypes
  const [verifiedCoinTypes, setVerifiedCoinTypes] = useState<string[]>([]);

  const isFetchingVerifiedCoinTypesRef = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      if (isFetchingVerifiedCoinTypesRef.current) return;

      isFetchingVerifiedCoinTypesRef.current = true;
      try {
        const coinTypes = (
          await sdkMap.aftermath.Coin().getVerifiedCoins()
        ).map(normalizeStructTag);

        setVerifiedCoinTypes(coinTypes);

        fetchTokensMetadata(coinTypes);
      } catch (err) {}
    })();
  }, [sdkMap.aftermath, fetchTokensMetadata]);

  // Tokens - Reserves
  useEffect(() => {
    fetchTokensMetadata(
      appData.lendingMarket.reserves.map((reserve) => reserve.coinType),
    );
  }, [fetchTokensMetadata, appData.lendingMarket.reserves]);

  // Tokens - Balances
  useEffect(() => {
    fetchTokensMetadata(Object.keys(rawBalancesMap ?? {}));
  }, [rawBalancesMap, fetchTokensMetadata]);

  // Tokens - Selected tokens
  const [tokenInSymbol, tokenOutSymbol] =
    slug !== undefined ? slug[0].split("-") : [undefined, undefined];

  useEffect(() => {
    const selectedCoinTypes = [
      tokenInSymbol !== undefined && isCoinType(tokenInSymbol)
        ? normalizeStructTag(tokenInSymbol)
        : undefined,
      tokenOutSymbol !== undefined && isCoinType(tokenOutSymbol)
        ? normalizeStructTag(tokenOutSymbol)
        : undefined,
    ].filter(Boolean) as string[];

    fetchTokensMetadata(selectedCoinTypes);
  }, [suiClient, tokenInSymbol, tokenOutSymbol, fetchTokensMetadata]);

  const [tokenIn, tokenOut] = useMemo(() => {
    const tokenIn = tokens?.find(
      (t) => t.symbol === tokenInSymbol || t.coinType === tokenInSymbol,
    );
    const tokenOut = tokens?.find(
      (t) => t.symbol === tokenOutSymbol || t.coinType === tokenOutSymbol,
    );

    if (!swapInAccount) return [tokenIn, tokenOut];
    else {
      if (!tokenIn || !tokenOut) return [undefined, undefined];
      if (!obligation?.deposits || obligation.deposits.length === 0) {
        setSwapInAccount(false);
        return [tokenIn, tokenOut];
      }

      const isTokenInValid = !!obligation.deposits.find(
        (d) => d.coinType === tokenIn.coinType,
      );
      const isTokenOutValid = !!filteredReserves.find(
        (r) => r.coinType === tokenOut.coinType,
      );
      if (isTokenInValid && isTokenOutValid) return [tokenIn, tokenOut];

      const newTokenIn = isTokenInValid
        ? tokenIn
        : tokens?.find((t) => t.coinType === obligation.deposits[0].coinType);
      let newTokenOut = isTokenOutValid
        ? tokenOut
        : tokens?.find((t) => t.coinType === DEFAULT_TOKEN_OUT_COINTYPE);

      if (newTokenIn?.coinType === newTokenOut?.coinType)
        newTokenOut = tokens?.find(
          (t) => t.coinType === DEFAULT_TOKEN_IN_COINTYPE,
        );

      if (!newTokenIn || !newTokenOut) return [undefined, undefined];

      if (tokenHistoricalUsdPricesMap[newTokenIn.coinType] === undefined)
        fetchTokenHistoricalUsdPrices(newTokenIn);
      if (tokenUsdPricesMap[newTokenIn.coinType] === undefined)
        fetchTokenUsdPrice(newTokenIn);

      if (tokenHistoricalUsdPricesMap[newTokenOut.coinType] === undefined)
        fetchTokenHistoricalUsdPrices(newTokenOut);
      if (tokenUsdPricesMap[newTokenOut.coinType] === undefined)
        fetchTokenUsdPrice(newTokenOut);

      router.replace(
        { pathname: getSwapUrl(newTokenIn.symbol, newTokenOut.symbol) },
        undefined,
        { shallow: true },
      );

      return [newTokenIn, newTokenOut];
    }
  }, [
    tokens,
    tokenInSymbol,
    tokenOutSymbol,
    swapInAccount,
    obligation?.deposits,
    setSwapInAccount,
    filteredReserves,
    tokenHistoricalUsdPricesMap,
    fetchTokenHistoricalUsdPrices,
    tokenUsdPricesMap,
    fetchTokenUsdPrice,
    router,
  ]);

  useEffect(() => {
    if (
      slug === undefined ||
      slug[0].split("-").length !== 2 ||
      slug[0].split("-")[0] === slug[0].split("-")[1]
    )
      router.replace({ pathname: getSwapUrl() }, undefined, { shallow: true });
  }, [slug, router]);

  const setTokenSymbol = useCallback(
    (newTokenSymbol: string, direction: TokenDirection) => {
      if (!tokenInSymbol || !tokenOutSymbol) return;

      router.push(
        {
          pathname: getSwapUrl(
            direction === TokenDirection.IN ? newTokenSymbol : tokenInSymbol,
            direction === TokenDirection.IN ? tokenOutSymbol : newTokenSymbol,
          ),
        },
        undefined,
        { shallow: true },
      );
    },
    [tokenInSymbol, tokenOutSymbol, router],
  );

  // Tokens - Reverse
  const reverseTokenSymbols = useCallback(() => {
    if (!tokenInSymbol || !tokenOutSymbol) return;

    router.push(
      { pathname: getSwapUrl(tokenOutSymbol, tokenInSymbol) },
      undefined,
      { shallow: true },
    );
  }, [tokenInSymbol, tokenOutSymbol, router]);

  // Context
  const contextValue: SwapContext = useMemo(
    () => ({
      sdkMap,
      partnerIdMap,

      tokenHistoricalUsdPricesMap,
      fetchTokenHistoricalUsdPrices,
      tokenUsdPricesMap,
      fetchTokenUsdPrice,

      swapInAccount,
      setSwapInAccount,

      tokens,
      fetchTokensMetadata,
      verifiedCoinTypes,
      tokenIn,
      tokenOut,
      setTokenSymbol,
      reverseTokenSymbols,
    }),
    [
      sdkMap,
      partnerIdMap,
      tokenHistoricalUsdPricesMap,
      fetchTokenHistoricalUsdPrices,
      tokenUsdPricesMap,
      fetchTokenUsdPrice,
      swapInAccount,
      setSwapInAccount,
      tokens,
      fetchTokensMetadata,
      verifiedCoinTypes,
      tokenIn,
      tokenOut,
      setTokenSymbol,
      reverseTokenSymbols,
    ],
  );

  return (
    <SwapContext.Provider value={contextValue}>
      {tokenIn && tokenOut ? children : <FullPageSpinner />}
    </SwapContext.Provider>
  );
}
