import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { fetchDownsampledApiReserveAssetDataEvents } from "@suilend/sdk/api/events";
import {
  ParsedDownsampledApiReserveAssetDataEvent,
  parseDownsampledApiReserveAssetDataEvent,
} from "@suilend/sdk/parsers/apiReserveAssetDataEvent";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import { Days, RESERVE_EVENT_SAMPLE_INTERVAL_S_MAP } from "@/lib/events";

type ReserveAssetDataEventsMap = Record<
  string,
  Record<Days, ParsedDownsampledApiReserveAssetDataEvent[]>
>;

interface ReserveAssetDataEventsContext {
  reserveAssetDataEventsMap?: ReserveAssetDataEventsMap;
  fetchReserveAssetDataEvents: (
    reserve: ParsedReserve,
    days: Days,
  ) => Promise<void>;
}

const defaultContextValue: ReserveAssetDataEventsContext = {
  reserveAssetDataEventsMap: undefined,
  fetchReserveAssetDataEvents: async () => {
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
              : {}) as Record<
              Days,
              ParsedDownsampledApiReserveAssetDataEvent[]
            >),
            [days]: parsedEvents,
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
    }),
    [reserveAssetDataEventsMap, fetchReserveAssetDataEvents],
  );

  return (
    <ReserveAssetDataEventsContext.Provider value={contextValue}>
      {children}
    </ReserveAssetDataEventsContext.Provider>
  );
}
