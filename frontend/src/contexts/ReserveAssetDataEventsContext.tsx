import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import BigNumber from "bignumber.js";

import { fetchDownsampledApiReserveAssetDataEvents } from "@suilend/sdk/api/events";
import {
  ParsedDownsampledApiReserveAssetDataEvent,
  parseDownsampledApiReserveAssetDataEvent,
} from "@suilend/sdk/parsers/apiReserveAssetDataEvent";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { API_URL } from "@suilend/sui-fe";

import { DAY_S, Days, RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP } from "@/lib/events";

type ReserveAssetDataEventsMap = Record<
  string,
  Record<Days, ParsedDownsampledApiReserveAssetDataEvent[]>
>;
type LstExchangeRateMap = Record<
  string,
  Record<Days, { timestampS: number; value: BigNumber }[]>
>;

interface ReserveAssetDataEventsContext {
  reserveAssetDataEventsMap?: ReserveAssetDataEventsMap;
  fetchReserveAssetDataEvents: (
    reserve: ParsedReserve,
    days: Days,
  ) => Promise<void>;

  lstExchangeRateMap?: LstExchangeRateMap;
  fetchLstExchangeRates: (coinType: string, days: Days) => Promise<void>;
}

const defaultContextValue: ReserveAssetDataEventsContext = {
  reserveAssetDataEventsMap: undefined,
  fetchReserveAssetDataEvents: async () => {
    throw Error("ReserveAssetDataEventsContextProvider not initialized");
  },

  lstExchangeRateMap: undefined,
  fetchLstExchangeRates: async () => {
    throw Error("ReserveAssetDataEventsContextProvider not initialized");
  },
};

const ReserveAssetDataEventsContext =
  createContext<ReserveAssetDataEventsContext>(defaultContextValue);

export const useReserveAssetDataEventsContext = () =>
  useContext(ReserveAssetDataEventsContext);

export function ReserveAssetDataEventsContextProvider({
  children,
}: PropsWithChildren) {
  // Reserve asset data events
  const [reserveAssetDataEventsMap, setReserveAssetDataEventsMap] = useState<
    ReserveAssetDataEventsContext["reserveAssetDataEventsMap"]
  >(defaultContextValue.reserveAssetDataEventsMap);

  const fetchReserveAssetDataEvents = useCallback(
    async (reserve: ParsedReserve, days: Days) => {
      try {
        const sampleIntervalS = RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP[days];

        const events = await fetchDownsampledApiReserveAssetDataEvents(
          reserve.id,
          days,
          sampleIntervalS,
        );
        const parsedEvents = events.map((event) =>
          parseDownsampledApiReserveAssetDataEvent(event, reserve),
        );

        setReserveAssetDataEventsMap((_eventsMap) => ({
          ..._eventsMap,
          [reserve.id]: {
            ...((_eventsMap !== undefined && _eventsMap[reserve.id]
              ? _eventsMap[reserve.id]
              : {}) as ReserveAssetDataEventsMap["reserve.id"]),
            [days]: parsedEvents,
          },
        }));
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  // LST exchange rates
  const [lstExchangeRateMap, setLstExchangeRateMap] = useState<
    ReserveAssetDataEventsContext["lstExchangeRateMap"]
  >(defaultContextValue.lstExchangeRateMap);

  const fetchLstExchangeRates = useCallback(
    async (coinType: string, days: Days) => {
      try {
        const sampleIntervalS = DAY_S;

        const daysS = (days + 2) * DAY_S;
        const n = daysS / sampleIntervalS;

        const lastTimestampS =
          Date.now() / 1000 - ((Date.now() / 1000) % sampleIntervalS);
        const timestampsS = Array.from({ length: n })
          .map((_, index) => lastTimestampS - index * sampleIntervalS)
          .reverse(); // Oldest to newest

        const res = await fetch(
          `${API_URL}/springsui/historical-rates?coinType=${coinType}&timestamps=${timestampsS.join(",")}`,
        );
        const json: { timestamp: number; value: string }[] = await res.json();
        if ((json as any)?.statusCode === 500)
          throw new Error(
            `Failed to fetch historical LST to SUI exchange rates for ${coinType}`,
          );

        setLstExchangeRateMap((_lstExchangeRateMap) => ({
          ..._lstExchangeRateMap,
          [coinType]: {
            ...((_lstExchangeRateMap !== undefined &&
            _lstExchangeRateMap[coinType]
              ? _lstExchangeRateMap[coinType]
              : {}) as LstExchangeRateMap["coinType"]),
            [days]: json
              .map(({ timestamp, value }) => ({
                timestampS: timestamp,
                value: new BigNumber(value),
              }))
              .sort((a, b) => a.timestampS - b.timestampS), // Oldest to newest
          },
        }));
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  // Context
  const contextValue: ReserveAssetDataEventsContext = useMemo(
    () => ({
      reserveAssetDataEventsMap,
      fetchReserveAssetDataEvents,

      lstExchangeRateMap,
      fetchLstExchangeRates,
    }),
    [
      reserveAssetDataEventsMap,
      fetchReserveAssetDataEvents,
      lstExchangeRateMap,
      fetchLstExchangeRates,
    ],
  );

  return (
    <ReserveAssetDataEventsContext.Provider value={contextValue}>
      {children}
    </ReserveAssetDataEventsContext.Provider>
  );
}
