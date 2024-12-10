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
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
  NORMALIZED_SEND_POINTS_S2_COINTYPE,
} from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";

import { API_URL } from "@/lib/navigation";

export enum Tab {
  SEASON_1 = "1",
  SEASON_2 = "2",
}

export interface LeaderboardRowData {
  rank: number;
  address: string;
  pointsPerDay: BigNumber;
  totalPoints: BigNumber;
}

interface PointsContext {
  season: number;
  seasonMap: Record<number, { coinType: string; color: string }>;

  leaderboardRowsMap: Record<number, LeaderboardRowData[]> | undefined;
  updatedAtMap: Record<number, Date> | undefined;
  fetchLeaderboardRows: (season: number) => Promise<void>;

  rankMap: Record<number, number | null> | undefined;
}

const defaultContextValue: PointsContext = {
  season: -1,
  seasonMap: {},

  leaderboardRowsMap: undefined,
  updatedAtMap: undefined,
  fetchLeaderboardRows: async () => {
    throw Error("PointsContextProvider not initialized");
  },

  rankMap: undefined,
};

const PointsContext = createContext<PointsContext>(defaultContextValue);

export const usePointsContext = () => useContext(PointsContext);

export function PointsContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();

  // Season
  const season: PointsContext["season"] = useMemo(() => 1, []);
  const seasonMap: PointsContext["seasonMap"] = useMemo(
    () => ({
      1: {
        coinType: NORMALIZED_SEND_POINTS_S1_COINTYPE,
        color: "hsl(var(--primary))",
      },
      2: {
        coinType: NORMALIZED_SEND_POINTS_S2_COINTYPE,
        color: "#B697FF",
      },
    }),
    [],
  );

  // Obligations
  const [leaderboardRowsMap, setLeaderboardRowsMap] = useState<
    PointsContext["leaderboardRowsMap"]
  >(defaultContextValue["leaderboardRowsMap"]);
  const [updatedAtMap, setUpdatedAtMap] = useState<
    PointsContext["updatedAtMap"]
  >(defaultContextValue["updatedAtMap"]);

  const seasonsBeingFetchedRef = useRef<number[]>([]);
  const fetchLeaderboardRows = useCallback(async (season: number) => {
    if (seasonsBeingFetchedRef.current.includes(season)) return;
    seasonsBeingFetchedRef.current.push(season);

    try {
      const url = `${API_URL}/points/leaderboard?season=${season}`;
      const res = await fetch(url);
      const json = await res.json();

      setLeaderboardRowsMap((prev) => ({
        ...(prev ?? {}),
        [season]: json.rows.map((row: any) => ({
          rank: row.rank,
          address: row.address,
          pointsPerDay: new BigNumber(row.pointsPerDay),
          totalPoints: new BigNumber(row.totalPoints),
        })),
      }));
      setUpdatedAtMap((prev) => ({
        ...(prev ?? {}),
        [season]: new Date(json.updatedAt * 1000),
      }));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardRows(season);
  }, [fetchLeaderboardRows, season]);

  // Rank
  const [rankMap, setRankMap] = useState<PointsContext["rankMap"]>(
    defaultContextValue["rankMap"],
  );

  useEffect(() => {
    if (!address || leaderboardRowsMap === undefined) {
      setRankMap(undefined);
      return;
    }

    setRankMap(
      Object.entries(leaderboardRowsMap).reduce((acc, [key, value]) => {
        if (value === undefined) return acc;

        const row = value.find((row) => row.address === address);
        return row === undefined
          ? { ...acc, [key]: null }
          : { ...acc, [key]: row.rank };
      }, {}),
    );
  }, [address, leaderboardRowsMap]);

  // Context
  const contextValue: PointsContext = useMemo(
    () => ({
      season,
      seasonMap,

      leaderboardRowsMap,
      updatedAtMap,
      fetchLeaderboardRows,

      rankMap,
    }),
    [
      season,
      seasonMap,
      leaderboardRowsMap,
      updatedAtMap,
      fetchLeaderboardRows,
      rankMap,
    ],
  );

  return (
    <PointsContext.Provider value={contextValue}>
      {children}
    </PointsContext.Provider>
  );
}
