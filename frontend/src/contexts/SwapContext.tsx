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

import { CoinMetadata } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { useLocalStorage } from "usehooks-ts";

import { LENDING_MARKET_ID } from "@suilend/sdk";
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
import { TokenDirection } from "@/lib/swap";
import { PartnerIdMap, SdkMap, useAggSdks } from "@/lib/swap";

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
  cetusVerifiedCoinTypes: string[];
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
  cetusVerifiedCoinTypes: [],
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
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { rawBalancesMap, balancesCoinMetadataMap, obligationMap } =
    useLoadedUserContext();
  const obligationMainMarket = obligationMap[LENDING_MARKET_ID];

  // send.ag
  const { sdkMap, partnerIdMap } = useAggSdks();

  // Swap URL
  const [DEFAULT_TOKEN_IN, setDefaultTokenIn] = useLocalStorage<{
    hasReserve: boolean;
    symbol: string;
    coinType: string;
  }>("swap_defaultTokenIn", {
    hasReserve: true,
    symbol: "SUI",
    coinType: NORMALIZED_SUI_COINTYPE,
  });
  const [DEFAULT_TOKEN_OUT, setDefaultTokenOut] = useLocalStorage<{
    hasReserve: boolean;
    symbol: string;
    coinType: string;
  }>("swap_defaultTokenOut", {
    hasReserve: true,
    symbol: "SEND",
    coinType: NORMALIZED_SEND_COINTYPE,
  });

  const getSwapUrl = useCallback(
    (inSymbol?: string, outSymbol?: string) =>
      `${SWAP_URL}/${
        inSymbol ??
        (DEFAULT_TOKEN_IN.hasReserve
          ? DEFAULT_TOKEN_IN.symbol
          : DEFAULT_TOKEN_IN.coinType)
      }-${
        outSymbol ??
        (DEFAULT_TOKEN_OUT.hasReserve
          ? DEFAULT_TOKEN_OUT.symbol
          : DEFAULT_TOKEN_OUT.coinType)
      }`,
    [
      DEFAULT_TOKEN_IN.hasReserve,
      DEFAULT_TOKEN_IN.symbol,
      DEFAULT_TOKEN_IN.coinType,
      DEFAULT_TOKEN_OUT.hasReserve,
      DEFAULT_TOKEN_OUT.symbol,
      DEFAULT_TOKEN_OUT.coinType,
    ],
  );

  // USD prices - Historical
  const [tokenHistoricalUsdPricesMap, setTokenHistoricalUsdPricesMap] =
    useState<Record<string, HistoricalUsdPriceData[]>>({});

  const fetchTokenHistoricalUsdPrices = useCallback(async (token: Token) => {
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
        const existingCoinMetadata: Record<string, CoinMetadata> = {
          ...Object.values(allAppData.allLendingMarketData).reduce(
            (acc, appData) => ({
              ...acc,
              ...appData.coinMetadataMap,
            }),
            {} as Record<string, CoinMetadata>,
          ),
          ...(balancesCoinMetadataMap ?? {}),
        };

        const coinTypesMissingMetadata = filteredCoinTypes.filter(
          (coinType) => !Object.keys(existingCoinMetadata).includes(coinType),
        );
        const coinMetadataMap = await getCoinMetadataMap(
          coinTypesMissingMetadata,
        );

        const mergedCoinMetadataMap = {
          ...existingCoinMetadata,
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
    [tokens, allAppData.allLendingMarketData, balancesCoinMetadataMap],
  );

  // Tokens - Verified coinTypes
  const [verifiedCoinTypes, setVerifiedCoinTypes] = useState<string[]>([]);
  const [cetusVerifiedCoinTypes, setCetusVerifiedCoinTypes] = useState<
    string[]
  >([]);

  const isFetchingCetusVerifiedCoinTypesRef = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      if (isFetchingCetusVerifiedCoinTypesRef.current) return;

      isFetchingCetusVerifiedCoinTypesRef.current = true;
      try {
        const res = await fetch(
          "https://api-sui.cetus.zone/v3/sui/clmm/verified_coins_info",
        );
        const json = await res.json();
        console.log(json);

        const _cetusVerifiedCoinTypes = json.data.list
          .map((coin: any) => coin.coinType)
          .map(normalizeStructTag);
        const _verifiedCoinTypes = [
          ..._cetusVerifiedCoinTypes,
          "0x8556539cf20b8640738d919ce3fe9d79b982f7d14a0861b650ff24b3cbd80e73::strat::STRAT",
        ].map(normalizeStructTag);

        setVerifiedCoinTypes(_verifiedCoinTypes);
        setCetusVerifiedCoinTypes(_cetusVerifiedCoinTypes);

        fetchTokensMetadata(_verifiedCoinTypes);
      } catch (err) {}
    })();
  }, [fetchTokensMetadata]);

  // Tokens - Reserves
  useEffect(() => {
    const coinTypes: string[] = [];
    for (const appData of Object.values(allAppData.allLendingMarketData))
      coinTypes.push(
        ...appData.lendingMarket.reserves.map((reserve) => reserve.coinType),
      );

    fetchTokensMetadata(coinTypes);
  }, [allAppData.allLendingMarketData, fetchTokensMetadata]);

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
      if (
        !obligationMainMarket?.deposits ||
        obligationMainMarket.deposits.length === 0
      ) {
        setSwapInAccount(false);
        return [tokenIn, tokenOut];
      }

      const isTokenInValid = !!obligationMainMarket.deposits.find(
        (d) => d.coinType === tokenIn.coinType,
      );
      const isTokenOutValid = !!appDataMainMarket.lendingMarket.reserves.find(
        (r) => r.coinType === tokenOut.coinType,
      );
      if (isTokenInValid && isTokenOutValid) return [tokenIn, tokenOut];

      const newTokenIn = isTokenInValid
        ? tokenIn
        : tokens?.find(
            (t) => t.coinType === obligationMainMarket.deposits[0].coinType,
          );
      let newTokenOut = isTokenOutValid
        ? tokenOut
        : tokens?.find((t) => t.coinType === DEFAULT_TOKEN_OUT.coinType);

      if (newTokenIn?.coinType === newTokenOut?.coinType) {
        newTokenOut = tokens?.find(
          (t) => t.coinType === DEFAULT_TOKEN_IN.coinType,
        );
        if (newTokenIn?.coinType === newTokenOut?.coinType)
          newTokenOut = tokens?.find(
            (t) => t.coinType === DEFAULT_TOKEN_OUT.coinType,
          );
      }

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
        {
          pathname: getSwapUrl(newTokenIn.symbol, newTokenOut.symbol),
          query: router.query.wallet
            ? { wallet: router.query.wallet }
            : undefined,
        },
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
    obligationMainMarket?.deposits,
    setSwapInAccount,
    appDataMainMarket.lendingMarket.reserves,
    DEFAULT_TOKEN_IN.coinType,
    DEFAULT_TOKEN_OUT.coinType,
    tokenHistoricalUsdPricesMap,
    fetchTokenHistoricalUsdPrices,
    tokenUsdPricesMap,
    fetchTokenUsdPrice,
    router,
    getSwapUrl,
  ]);

  useEffect(() => {
    if (
      slug === undefined ||
      slug[0].split("-").length !== 2 ||
      slug[0].split("-")[0] === slug[0].split("-")[1]
    )
      router.replace(
        {
          pathname: getSwapUrl(),
          query: router.query.wallet
            ? { wallet: router.query.wallet }
            : undefined,
        },
        undefined,
        { shallow: true },
      );
  }, [slug, router, getSwapUrl]);

  const setTokenSymbol = useCallback(
    (newTokenSymbol: string, direction: TokenDirection) => {
      if (!tokenInSymbol || !tokenOutSymbol) return;

      router.push(
        {
          pathname: getSwapUrl(
            direction === TokenDirection.IN ? newTokenSymbol : tokenInSymbol,
            direction === TokenDirection.IN ? tokenOutSymbol : newTokenSymbol,
          ),
          query: router.query.wallet
            ? { wallet: router.query.wallet }
            : undefined,
        },
        undefined,
        { shallow: true },
      );
    },
    [tokenInSymbol, tokenOutSymbol, router, getSwapUrl],
  );

  // Tokens - Reverse
  const reverseTokenSymbols = useCallback(() => {
    if (!tokenInSymbol || !tokenOutSymbol) return;

    router.push(
      {
        pathname: getSwapUrl(tokenOutSymbol, tokenInSymbol),
        query: router.query.wallet
          ? { wallet: router.query.wallet }
          : undefined,
      },
      undefined,
      { shallow: true },
    );
  }, [tokenInSymbol, tokenOutSymbol, router, getSwapUrl]);

  // Tokens - defaults
  useEffect(() => {
    if (!tokenIn) return;
    setDefaultTokenIn({
      hasReserve: !!appDataMainMarket.reserveMap[tokenIn.coinType],
      symbol: tokenIn.symbol,
      coinType: tokenIn.coinType,
    });
  }, [tokenIn, setDefaultTokenIn, appDataMainMarket.reserveMap]);

  useEffect(() => {
    if (!tokenOut) return;
    setDefaultTokenOut({
      hasReserve: !!appDataMainMarket.reserveMap[tokenOut.coinType],
      symbol: tokenOut.symbol,
      coinType: tokenOut.coinType,
    });
  }, [tokenOut, setDefaultTokenOut, appDataMainMarket.reserveMap]);

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
      cetusVerifiedCoinTypes,
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
      cetusVerifiedCoinTypes,
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
