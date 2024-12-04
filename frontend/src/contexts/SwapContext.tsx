import { useRouter } from "next/router";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import {
  Aftermath,
  RouterCompleteTradeRoute as AftermathRouterCompleteTradeRoute,
} from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";

import { getCoinMetadataMap, isCoinType } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { SWAP_URL } from "@/lib/navigation";
import { SwapToken } from "@/lib/types";

export enum StandardizedQuoteType {
  AFTERMATH = "aftermath",
}
export type StandardizedQuote = {
  id: string;
  amount_in: BigNumber;
  amount_out: BigNumber;
  coin_type_in: string;
  coin_type_out: string;
} & {
  type: StandardizedQuoteType.AFTERMATH;
  quote: AftermathRouterCompleteTradeRoute;
};

const DEFAULT_TOKEN_IN_SYMBOL = "SUI";
const DEFAULT_TOKEN_OUT_SYMBOL = "USDC";

export const getSwapUrl = (
  inSymbol: string = DEFAULT_TOKEN_IN_SYMBOL,
  outSymbol: string = DEFAULT_TOKEN_OUT_SYMBOL,
) => `${SWAP_URL}/${inSymbol}-${outSymbol}`;

export enum TokenDirection {
  IN = "in",
  OUT = "out",
}

interface SwapContext {
  aftermathSdk?: Aftermath;
  tokens?: SwapToken[];
  fetchTokensMetadata: (coinTypes: string[]) => Promise<void>;
  tokenIn?: SwapToken;
  tokenOut?: SwapToken;
  setTokenSymbol: (newTokenSymbol: string, direction: TokenDirection) => void;
  reverseTokenSymbols: () => void;
}

const defaultContextValue: SwapContext = {
  aftermathSdk: undefined,
  tokens: undefined,
  fetchTokensMetadata: async () => {
    throw Error("SwapContextProvider not initialized");
  },
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
  const { data, balancesCoinMetadataMap } = useLoadedAppContext();

  // Aftermath SDK
  const aftermathSdk = useMemo(() => {
    const afSdk = new Aftermath("MAINNET");
    afSdk.init();
    return afSdk;
  }, []);

  // Tokens
  const [tokens, setTokens] = useState<SwapToken[] | undefined>(undefined);

  const isFetchingAftermathTokensRef = useRef<boolean>(false);
  useEffect(() => {
    (async () => {
      if (isFetchingAftermathTokensRef.current) return;

      isFetchingAftermathTokensRef.current = true;
      try {
        const verifiedCoinTypes = (
          await aftermathSdk.Coin().getVerifiedCoins()
        ).map(normalizeStructTag);

        const coinTypesMissingMetadata = verifiedCoinTypes.filter(
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

        const result = verifiedCoinTypes
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
    })();
  }, [aftermathSdk, data.coinMetadataMap, balancesCoinMetadataMap, suiClient]);

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

  // Reserves
  useEffect(() => {
    fetchTokensMetadata(
      data.lendingMarket.reserves.map((reserve) => reserve.coinType),
    );
  }, [fetchTokensMetadata, data.lendingMarket.reserves]);

  // Selected tokens
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

  const tokenIn = useMemo(
    () =>
      tokens?.find(
        (t) => t.symbol === tokenInSymbol || t.coinType === tokenInSymbol,
      ),
    [tokens, tokenInSymbol],
  );
  const tokenOut = useMemo(
    () =>
      tokens?.find(
        (t) => t.symbol === tokenOutSymbol || t.coinType === tokenOutSymbol,
      ),
    [tokens, tokenOutSymbol],
  );

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
      tokens,
      fetchTokensMetadata,
      tokenIn,
      tokenOut,
      setTokenSymbol,
      reverseTokenSymbols,
    }),
    [
      aftermathSdk,
      tokens,
      fetchTokensMetadata,
      tokenIn,
      tokenOut,
      setTokenSymbol,
      reverseTokenSymbols,
    ],
  );

  return (
    <SwapContext.Provider value={contextValue}>
      {aftermathSdk && tokenIn && tokenOut ? children : <FullPageSpinner />}
    </SwapContext.Provider>
  );
}
