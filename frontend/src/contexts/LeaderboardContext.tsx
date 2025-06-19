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

import BigNumber from "bignumber.js";

import {
  API_URL,
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
  NORMALIZED_SEND_POINTS_S2_COINTYPE,
} from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

export const POINTS_SEASON_MAP: Record<
  number,
  { coinType: string; color: string }
> = {
  1: {
    coinType: NORMALIZED_SEND_POINTS_S1_COINTYPE,
    color: "hsl(var(--primary))",
  },
  2: {
    coinType: NORMALIZED_SEND_POINTS_S2_COINTYPE,
    color: "#C6ADFF",
  },
};

export enum Tab {
  POINTS_S1 = "points-s1",
  POINTS_S2 = "points-s2",
  TVL = "tvl",
}
export const TAB_POINTS_SEASON_MAP: Record<Tab, number> = {
  [Tab.POINTS_S1]: 1,
  [Tab.POINTS_S2]: 2,
  [Tab.TVL]: -1,
};

export interface PointsLeaderboardRowData {
  rank: number;
  address: string;
  totalPoints: BigNumber;
}

export interface TvlLeaderboardRowData {
  rank: number;
  address: string;
  tvlUsd: BigNumber;
}

interface LeaderboardContext {
  points: {
    leaderboardRowsMap: Record<number, PointsLeaderboardRowData[]> | undefined;
    updatedAtMap: Record<number, Date> | undefined;
    addressRowMap: Record<number, PointsLeaderboardRowData> | undefined;
    fetchLeaderboardRows: (season: number) => Promise<void>;
  };
  tvl: {
    leaderboardRows: TvlLeaderboardRowData[] | undefined;
    updatedAt: Date | undefined;
    addressRow: TvlLeaderboardRowData | undefined;
    fetchLeaderboardRows: () => Promise<void>;
  };
}

const defaultContextValue: LeaderboardContext = {
  points: {
    leaderboardRowsMap: undefined,
    updatedAtMap: undefined,
    addressRowMap: undefined,
    fetchLeaderboardRows: async () => {
      throw Error("LeaderboardContextProvider not initialized");
    },
  },
  tvl: {
    leaderboardRows: undefined,
    updatedAt: undefined,
    addressRow: undefined,
    fetchLeaderboardRows: async () => {
      throw Error("LeaderboardContextProvider not initialized");
    },
  },
};

const LeaderboardContext =
  createContext<LeaderboardContext>(defaultContextValue);

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export function LeaderboardContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();

  // Data
  const [pointsLeaderboardRowsMap, setPointsLeaderboardRowsMap] = useState<
    LeaderboardContext["points"]["leaderboardRowsMap"]
  >(defaultContextValue["points"]["leaderboardRowsMap"]);
  const [pointsUpdatedAtMap, setPointsUpdatedAtMap] = useState<
    LeaderboardContext["points"]["updatedAtMap"]
  >(defaultContextValue["points"]["updatedAtMap"]);

  const [tvlLeaderboardRows, setTvlLeaderboardRows] = useState<
    LeaderboardContext["tvl"]["leaderboardRows"]
  >(defaultContextValue["tvl"]["leaderboardRows"]);
  const [tvlUpdatedAt, setTvlUpdatedAt] = useState<
    LeaderboardContext["tvl"]["updatedAt"]
  >(defaultContextValue["tvl"]["updatedAt"]);

  // Data - fetch
  const dataBeingFetchedRef = useRef<(number | "tvl")[]>([]);

  const fetchPointsLeaderboardRows = useCallback(async (season: number) => {
    if (dataBeingFetchedRef.current.includes(season)) return;
    dataBeingFetchedRef.current.push(season);

    try {
      const url = `${API_URL}/points/leaderboard?season=${season}`;
      const res = await fetch(url);
      const json = await res.json();

      setPointsLeaderboardRowsMap((prev) => ({
        ...(prev ?? {}),
        [season]: json.rows.map((row: any) => ({
          rank: row.rank,
          address: row.address,
          totalPoints: new BigNumber(row.totalPoints),
        })),
      }));
      setPointsUpdatedAtMap((prev) => ({
        ...(prev ?? {}),
        [season]: new Date(json.updatedAt * 1000),
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTvlLeaderboardRows = useCallback(async () => {
    if (dataBeingFetchedRef.current.includes("tvl")) return;
    dataBeingFetchedRef.current.push("tvl");

    try {
      const url = `${API_URL}/tvl/leaderboard`;
      const res = await fetch(url);
      const json = await res.json();

      setTvlLeaderboardRows(
        json.rows.map((row: any) => ({
          rank: row.rank,
          address: row.address,
          tvlUsd: new BigNumber(row.tvlUsd),
        })),
      );
      setTvlUpdatedAt(new Date(json.updatedAt * 1000));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTvlLeaderboardRows();
  }, [fetchTvlLeaderboardRows]);

  // Address row
  const [pointsAddressRowMap, setPointsAddressRowMap] = useState<
    LeaderboardContext["points"]["addressRowMap"]
  >(defaultContextValue["points"]["addressRowMap"]);

  const [tvlAddressRow, setTvlAddressRow] = useState<
    LeaderboardContext["tvl"]["addressRow"]
  >(defaultContextValue["tvl"]["addressRow"]);

  useEffect(() => {
    if (!address || pointsLeaderboardRowsMap === undefined) {
      setPointsAddressRowMap(undefined);
    } else {
      setPointsAddressRowMap(
        Object.entries(pointsLeaderboardRowsMap).reduce((acc, [key, value]) => {
          if (value === undefined) return acc;

          const row = value.find((row) => row.address === address);
          return {
            ...acc,
            [key]: row ?? {
              rank: -1,
              address,
              totalPoints: new BigNumber(-1),
            },
          };
        }, {}),
      );
    }

    if (!address || tvlLeaderboardRows === undefined) {
      setTvlAddressRow(undefined);
    } else {
      setTvlAddressRow(
        tvlLeaderboardRows.find((row) => row.address === address) ?? {
          rank: -1,
          address,
          tvlUsd: new BigNumber(-1),
        },
      );
    }
  }, [address, pointsLeaderboardRowsMap, tvlLeaderboardRows]);

  // Context
  const contextValue: LeaderboardContext = useMemo(
    () => ({
      points: {
        leaderboardRowsMap: pointsLeaderboardRowsMap,
        updatedAtMap: pointsUpdatedAtMap,
        addressRowMap: pointsAddressRowMap,
        fetchLeaderboardRows: fetchPointsLeaderboardRows,
      },
      tvl: {
        leaderboardRows: tvlLeaderboardRows,
        updatedAt: tvlUpdatedAt,
        addressRow: tvlAddressRow,
        fetchLeaderboardRows: fetchTvlLeaderboardRows,
      },
    }),
    [
      pointsLeaderboardRowsMap,
      pointsUpdatedAtMap,
      pointsAddressRowMap,
      fetchPointsLeaderboardRows,
      tvlLeaderboardRows,
      tvlUpdatedAt,
      tvlAddressRow,
      fetchTvlLeaderboardRows,
    ],
  );

  return (
    <LeaderboardContext.Provider value={contextValue}>
      {children}
    </LeaderboardContext.Provider>
  );
}
