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

import {
  QuoteResponse as _7kQuote,
  setSuiClient as set7kSdkSuiClient,
} from "@7kprotocol/sdk-ts/cjs";
import {
  RouterData as CetusQuote,
  AggregatorClient as CetusSdk,
  Env,
} from "@cetusprotocol/aggregator-sdk";
import { normalizeStructTag } from "@mysten/sui/utils";
import {
  RouterCompleteTradeRoute as AftermathQuote,
  Aftermath as AftermathSdk,
} from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import { useLocalStorage } from "usehooks-ts";

import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  getCoinMetadataMap,
  getHistoryPrice,
  getPrice,
  isCoinType,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { SWAP_URL } from "@/lib/navigation";
import { SwapToken } from "@/lib/types";

export enum QuoteProvider {
  AFTERMATH = "aftermath",
  CETUS = "cetus",
  _7K = "7k",
}
export const QUOTE_PROVIDER_NAME_MAP = {
  [QuoteProvider.AFTERMATH]: "Aftermath",
  [QuoteProvider.CETUS]: "Cetus",
  [QuoteProvider._7K]: "7K",
};

export type StandardizedRoutePath = {
  id: string;
  routeIndex: number;
  provider: string;
  in: {
    coinType: string;
    amount: BigNumber;
  };
  out: {
    coinType: string;
    amount: BigNumber;
  };
};
export type StandardizedPathWithToken = StandardizedRoutePath & {
  in: StandardizedRoutePath["in"] & {
    token: SwapToken;
  };
  out: StandardizedRoutePath["out"] & {
    token: SwapToken;
  };
};

export type StandardizedQuote = {
  id: string;
  in: {
    coinType: string;
    amount: BigNumber;
  };
  out: {
    coinType: string;
    amount: BigNumber;
  };
  routes: {
    percent: BigNumber;
    path: StandardizedRoutePath[];
  }[];
} & (
  | { provider: QuoteProvider.AFTERMATH; quote: AftermathQuote }
  | { provider: QuoteProvider.CETUS; quote: CetusQuote }
  | { provider: QuoteProvider._7K; quote: _7kQuote }
);

const DEFAULT_TOKEN_IN_SYMBOL = "SUI";
const DEFAULT_TOKEN_IN_COINTYPE = NORMALIZED_SUI_COINTYPE;

const DEFAULT_TOKEN_OUT_SYMBOL = "USDC";
const DEFAULT_TOKEN_OUT_COINTYPE = NORMALIZED_USDC_COINTYPE;

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
  aftermathSdk?: AftermathSdk;
  cetusSdk?: CetusSdk;

  tokenHistoricalUsdPricesMap: Record<string, HistoricalUsdPriceData[]>;
  fetchTokenHistoricalUsdPrices: (token: SwapToken) => Promise<void>;
  tokenUsdPricesMap: Record<string, BigNumber>;
  fetchTokenUsdPrice: (token: SwapToken) => Promise<void>;

  isUsingDeposits: boolean;
  setIsUsingDeposits: Dispatch<SetStateAction<boolean>>;

  tokens?: SwapToken[];
  fetchTokensMetadata: (coinTypes: string[]) => Promise<void>;
  verifiedCoinTypes: string[];
  tokenIn?: SwapToken;
  tokenOut?: SwapToken;
  setTokenSymbol: (newTokenSymbol: string, direction: TokenDirection) => void;
  reverseTokenSymbols: () => void;
}

const defaultContextValue: SwapContext = {
  aftermathSdk: undefined,
  cetusSdk: undefined,

  tokenHistoricalUsdPricesMap: {},
  fetchTokenHistoricalUsdPrices: async () => {
    throw Error("SwapContextProvider not initialized");
  },
  tokenUsdPricesMap: {},
  fetchTokenUsdPrice: async () => {
    throw Error("SwapContextProvider not initialized");
  },

  isUsingDeposits: false,
  setIsUsingDeposits: () => {
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
  const { address } = useWalletContext();
  const {
    data,
    rawBalancesMap,
    balancesCoinMetadataMap,
    obligation,
    filteredReserves,
  } = useLoadedAppContext();

  // SDKs - Aftermath
  const aftermathSdk = useMemo(() => {
    const sdk = new AftermathSdk("MAINNET");
    sdk.init();
    return sdk;
  }, []);

  // SDKs - Cetus
  const cetusSdk = useMemo(() => {
    const sdk = new CetusSdk(
      "https://api-sui.cetus.zone/router_v2/find_routes",
      address,
      suiClient,
      Env.Mainnet,
    );
    return sdk;
  }, [address, suiClient]);

  // SDKs - 7K
  useEffect(() => {
    set7kSdkSuiClient(suiClient);
  }, [suiClient]);

  // USD prices - Historical
  const [tokenHistoricalUsdPricesMap, setTokenHistoricalUsdPricesMap] =
    useState<Record<string, HistoricalUsdPriceData[]>>({});

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

        setTokenHistoricalUsdPricesMap((o) => ({
          ...o,
          [token.coinType]: result,
        }));
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  // USD prices - Current
  const [tokenUsdPricesMap, setTokenUsdPriceMap] = useState<
    Record<string, BigNumber>
  >({});

  const fetchTokenUsdPrice = useCallback(async (token: SwapToken) => {
    console.log("fetchTokenUsdPrice", token.symbol);

    try {
      const result = await getPrice(token.coinType);
      if (result === undefined) return;

      setTokenUsdPriceMap((o) => ({
        ...o,
        [token.coinType]: BigNumber(result),
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Use deposits
  const [isUsingDeposits, setIsUsingDeposits] = useLocalStorage<boolean>(
    "swap_isUsingDeposits",
    false,
  );

  // Tokens
  const [tokens, setTokens] = useState<SwapToken[] | undefined>(undefined);

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
              ...data.coinMetadataMap,
              ...(balancesCoinMetadataMap ?? {}),
            }).includes(coinType),
        );
        const coinMetadataMap = await getCoinMetadataMap(
          suiClient,
          coinTypesMissingMetadata,
        );
        const mergedCoinMetadataMap = {
          ...data.coinMetadataMap,
          ...(balancesCoinMetadataMap ?? {}),
          ...coinMetadataMap,
        };

        const result = filteredCoinTypes
          .filter((coinType) => !!mergedCoinMetadataMap[coinType])
          .map((coinType) => {
            const metadata = mergedCoinMetadataMap[coinType];

            return {
              coinType,
              decimals: metadata.decimals,
              symbol: metadata.symbol,
              name: metadata.name,
              iconUrl: metadata.iconUrl,
            };
          });

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
    [tokens, data.coinMetadataMap, balancesCoinMetadataMap, suiClient],
  );

  // Tokens - Verified coinTypes
  const [verifiedCoinTypes, setVerifiedCoinTypes] = useState<string[]>([]);

  const isFetchingVerifiedCoinTypesRef = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      if (isFetchingVerifiedCoinTypesRef.current) return;

      isFetchingVerifiedCoinTypesRef.current = true;
      try {
        const res = await fetch(
          "https://api-sui.cetus.zone/v2/sui/coins_info?is_verified_coin=true",
        );
        const json = await res.json();
        const coinTypes =
          json.msg === "OK"
            ? json.data.list.map((coin: any) =>
                normalizeStructTag(coin.coin_type),
              )
            : [];

        setVerifiedCoinTypes(coinTypes);

        fetchTokensMetadata(coinTypes);
      } catch (err) {}
    })();
  }, [fetchTokensMetadata]);

  // Tokens - Reserves
  useEffect(() => {
    fetchTokensMetadata(
      data.lendingMarket.reserves.map((reserve) => reserve.coinType),
    );
  }, [fetchTokensMetadata, data.lendingMarket.reserves]);

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

    if (!isUsingDeposits) return [tokenIn, tokenOut];
    else {
      if (!tokenIn || !tokenOut) return [undefined, undefined];
      if (!obligation?.deposits || obligation.deposits.length === 0) {
        setIsUsingDeposits(false);
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
    isUsingDeposits,
    obligation?.deposits,
    setIsUsingDeposits,
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
      aftermathSdk,
      cetusSdk,

      tokenHistoricalUsdPricesMap,
      fetchTokenHistoricalUsdPrices,
      tokenUsdPricesMap,
      fetchTokenUsdPrice,

      isUsingDeposits,
      setIsUsingDeposits,

      tokens,
      fetchTokensMetadata,
      verifiedCoinTypes,
      tokenIn,
      tokenOut,
      setTokenSymbol,
      reverseTokenSymbols,
    }),
    [
      aftermathSdk,
      cetusSdk,
      tokenHistoricalUsdPricesMap,
      fetchTokenHistoricalUsdPrices,
      tokenUsdPricesMap,
      fetchTokenUsdPrice,
      isUsingDeposits,
      setIsUsingDeposits,
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
      {aftermathSdk && cetusSdk && tokenIn && tokenOut ? (
        children
      ) : (
        <FullPageSpinner />
      )}
    </SwapContext.Provider>
  );
}
