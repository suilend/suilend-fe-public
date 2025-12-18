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
  useState,
} from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import { UTCTimestamp } from "lightweight-charts";

import { LENDING_MARKET_ID, ParsedReserve } from "@suilend/sdk";
import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  Token,
  getToken,
} from "@suilend/sui-fe";

import { useLoadedAppContext } from "@/contexts/AppContext";

const PYTH_BENCHMARKS_API = "https://benchmarks.pyth.network";

// Resolution options for the chart
export type Resolution = "1" | "5" | "15" | "60" | "240" | "1D";

export const getResolutionForDuration = (durationS: number): Resolution => {
  const hours = durationS / 3600;
  const days = hours / 24;

  if (hours < 2) return "1"; // < 2 hours → 1m
  if (hours < 6) return "5"; // < 6 hours → 5m
  if (hours < 24) return "15"; // < 24 hours → 15m
  if (days < 4) return "60"; // < 4 days → 1H
  if (days < 14) return "240"; // < 14 days → 4H
  return "1D"; // >= 14 days → 1D
};

export type TimeRange = {
  fromS: number;
  toS: number;
};

export type ResolutionOption = {
  label: string;
  value: Resolution;
  seconds: number;
};
export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { label: "1m", value: "1", seconds: 60 },
  { label: "5m", value: "5", seconds: 5 * 60 },
  { label: "15m", value: "15", seconds: 15 * 60 },
  { label: "1H", value: "60", seconds: 60 * 60 },
  { label: "4H", value: "240", seconds: 4 * 60 * 60 },
  { label: "1D", value: "1D", seconds: 24 * 60 * 60 },
];

type PythHistoryResponse = {
  s: string; // status
  t: number[]; // timestamps
  o: number[]; // open
  h: number[]; // high
  l: number[]; // low
  c: number[]; // close
};
const fetchPythHistory = async (
  pythSymbol: string,
  resolution: Resolution,
  fromS: number,
  toS: number,
): Promise<PythHistoryResponse | null> => {
  try {
    const url = `${PYTH_BENCHMARKS_API}/v1/shims/tradingview/history?${new URLSearchParams(
      {
        symbol: pythSymbol,
        resolution,
        from: fromS.toString(),
        to: toS.toString(),
      },
    )}`;
    const res = await fetch(url);
    const json = await res.json();

    return json;
  } catch (err) {
    console.error(err);
    return null;
  }
};

export type RatioDataPoint = {
  time: UTCTimestamp;
  value: number;
};

interface MarginContext {
  tokens: [Token, Token];
  reserves: [ParsedReserve, ParsedReserve];

  currentPrice: number | null;
  price24hAgo: number | null;

  // Chart
  resolution: Resolution;
  setResolution: Dispatch<SetStateAction<Resolution>>;
  timeRange: TimeRange;
  setTimeRange: Dispatch<SetStateAction<TimeRange>>;

  isLoading: boolean;
  error: string | null;

  ratioData: RatioDataPoint[];

  fetchData: () => Promise<void>;
}

const defaultContextValue: MarginContext = {
  reserves: [undefined, undefined] as unknown as [ParsedReserve, ParsedReserve],
  tokens: [undefined, undefined] as unknown as [Token, Token],

  currentPrice: null,
  price24hAgo: null,

  resolution: "15",
  setResolution: () => {
    throw Error("MarginContextProvider not initialized");
  },
  timeRange: (() => {
    const nowS = Math.round(Date.now() / 1000);
    return { fromS: nowS - 24 * 60 * 60, toS: nowS }; // 1 day ago to now
  })(),
  setTimeRange: () => {
    throw Error("MarginContextProvider not initialized");
  },

  isLoading: true,
  error: null,

  ratioData: [],

  fetchData: async () => {
    throw Error("MarginContextProvider not initialized");
  },
};

const MarginContext = createContext<MarginContext>(defaultContextValue);

export const useMarginContext = () => useContext(MarginContext);

export function MarginContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const slug = router.query.slug as string[] | undefined;

  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  // Tokens
  const coinTypes: [string, string] = useMemo(() => {
    if (slug === undefined)
      return [NORMALIZED_SUI_COINTYPE, NORMALIZED_USDC_COINTYPE];

    const _coinTypes = slug[0].split("-");
    if (_coinTypes.length !== 2)
      return [NORMALIZED_SUI_COINTYPE, NORMALIZED_USDC_COINTYPE];

    return [
      normalizeStructTag(_coinTypes[0]),
      normalizeStructTag(_coinTypes[1]),
    ];
  }, [slug]);

  const tokens: [Token, Token] = useMemo(
    () => [
      getToken(coinTypes[0], appDataMainMarket.coinMetadataMap[coinTypes[0]]),
      getToken(coinTypes[1], appDataMainMarket.coinMetadataMap[coinTypes[1]]),
    ],
    [coinTypes, appDataMainMarket.coinMetadataMap],
  );

  // Reserves
  const reserves: [ParsedReserve, ParsedReserve] = useMemo(
    () => [
      appDataMainMarket.reserveMap[tokens[0].coinType],
      appDataMainMarket.reserveMap[tokens[1].coinType],
    ],
    [appDataMainMarket.reserveMap, tokens],
  );

  // Price identifiers (without 0x prefix)
  const priceIdentifiers: [string, string] = useMemo(
    () => [
      reserves[0].priceIdentifier.replace(/^0x/, ""),
      reserves[1].priceIdentifier.replace(/^0x/, ""),
    ],
    [reserves],
  );

  // Current price and 24h price change
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [price24hAgo, setPrice24hAgo] = useState<number | null>(null);

  const fetch24hChange = useCallback(async () => {
    console.log("xxx fetch24hChange");

    try {
      const pythSymbol1 =
        allAppData.pythPriceIdentifierSymbolMap[priceIdentifiers[0]];
      const pythSymbol2 =
        allAppData.pythPriceIdentifierSymbolMap[priceIdentifiers[1]];
      if (!pythSymbol1 || !pythSymbol2)
        throw new Error("Pyth price feeds not available");

      const nowS = Math.floor(Date.now() / 1000);
      const oneDayAgoS = nowS - 24 * 60 * 60;

      const [history1, history2] = await Promise.all([
        fetchPythHistory(pythSymbol1, "60", oneDayAgoS - 3600, nowS),
        fetchPythHistory(pythSymbol2, "60", oneDayAgoS - 3600, nowS),
      ]);
      if (!history1 || !history2) throw new Error("Failed to fetch price data");

      // Create a map of timestamps to prices for token2
      const token2PriceMap = new Map<number, number>();
      history2.t.forEach((timestamp, i) => {
        token2PriceMap.set(timestamp, history2.c[i]);
      });

      // Calculate ratio for each matching timestamp
      const data: RatioDataPoint[] = [];
      history1.t.forEach((timestamp, i) => {
        const price2 = token2PriceMap.get(timestamp);
        if (price2 && price2 !== 0) {
          const ratio = history1.c[i] / price2;
          data.push({
            time: timestamp as UTCTimestamp,
            value: ratio,
          });
        }
      });

      // Sort by timestamp
      const sortedData = data.slice().sort((a, b) => a.time - b.time);
      if (sortedData.length === 0) throw new Error("No price data");

      // Get current price (latest) and 24h ago price (closest to 24h ago)
      const currentPrice = sortedData[sortedData.length - 1].value;

      // Find the price closest to 24h ago
      let price24hAgo = sortedData[0].value;
      for (const ratio of sortedData) {
        if (ratio.time <= oneDayAgoS) {
          price24hAgo = ratio.value;
        } else {
          break;
        }
      }

      setCurrentPrice(currentPrice);
      setPrice24hAgo(price24hAgo);
    } catch (err) {
      console.error(err);
    }
  }, [allAppData.pythPriceIdentifierSymbolMap, priceIdentifiers]);

  useEffect(() => {
    fetch24hChange();
  }, [fetch24hChange]);

  // Chart
  const [resolution, setResolution] = useState<Resolution>("15");
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const nowS = Math.round(Date.now() / 1000);
    return { fromS: nowS - 24 * 60 * 60, toS: nowS }; // 1 day ago to now
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ratioData, setRatioData] = useState<RatioDataPoint[]>([]);

  // Fetch data for a specific time range
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const pythSymbol1 =
        allAppData.pythPriceIdentifierSymbolMap[priceIdentifiers[0]];
      const pythSymbol2 =
        allAppData.pythPriceIdentifierSymbolMap[priceIdentifiers[1]];
      if (!pythSymbol1 || !pythSymbol2)
        throw new Error("Pyth price feeds not available");

      const [history1, history2] = await Promise.all([
        fetchPythHistory(
          pythSymbol1,
          resolution,
          timeRange.fromS,
          timeRange.toS,
        ),
        fetchPythHistory(
          pythSymbol2,
          resolution,
          timeRange.fromS,
          timeRange.toS,
        ),
      ]);
      if (!history1 || !history2) throw new Error("Failed to fetch price data");

      // Get timezone offset in seconds (to convert UTC to local display time)
      const timezoneOffsetS = new Date().getTimezoneOffset() * 60;

      // Create a map of timestamps to prices for token2
      const token2PriceMap = new Map<number, number>();
      history2.t.forEach((timestamp, i) => {
        token2PriceMap.set(timestamp, history2.c[i]);
      });

      // Calculate ratio for each matching timestamp
      const data: RatioDataPoint[] = [];
      history1.t.forEach((timestamp, i) => {
        const price2 = token2PriceMap.get(timestamp);
        if (price2 && price2 !== 0) {
          const ratio = history1.c[i] / price2;
          data.push({
            time: (timestamp - timezoneOffsetS) as UTCTimestamp,
            value: ratio,
          });
        }
      });

      // Sort by timestamp
      const sortedData = data.slice().sort((a, b) => a.time - b.time);
      if (sortedData.length === 0) throw new Error("No price data");

      setIsLoading(false);
      setRatioData(sortedData);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setError("Failed to fetch price data");
    }
  }, [
    allAppData.pythPriceIdentifierSymbolMap,
    priceIdentifiers,
    resolution,
    timeRange.fromS,
    timeRange.toS,
  ]);

  // Initial fetch on mount and whenever priceIdentifiers, resolution, or timeRange change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Context value
  const contextValue: MarginContext = useMemo(
    () => ({
      reserves,
      tokens,

      currentPrice,
      price24hAgo,

      resolution,
      setResolution,
      timeRange,
      setTimeRange,

      isLoading,
      error,

      ratioData,

      fetchData,
    }),
    [
      reserves,
      tokens,
      currentPrice,
      price24hAgo,
      resolution,
      timeRange,
      isLoading,
      error,
      ratioData,
      fetchData,
    ],
  );

  return (
    <MarginContext.Provider value={contextValue}>
      {children}
    </MarginContext.Provider>
  );
}
