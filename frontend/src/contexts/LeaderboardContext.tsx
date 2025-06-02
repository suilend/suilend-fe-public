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

import { API_URL } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

export interface LeaderboardRowData {
  rank: number;
  address: string;
  tvlUsd: BigNumber;
}

interface LeaderboardContext {
  leaderboardRows: LeaderboardRowData[] | undefined;
  updatedAt: Date | undefined;
  addressRow: LeaderboardRowData | undefined;
  fetchLeaderboardRows: () => Promise<void>;
}

const defaultContextValue: LeaderboardContext = {
  leaderboardRows: undefined,
  updatedAt: undefined,
  addressRow: undefined,
  fetchLeaderboardRows: async () => {
    throw Error("LeaderboardContextProvider not initialized");
  },
};

const LeaderboardContext =
  createContext<LeaderboardContext>(defaultContextValue);

export const useLeaderboardContext = () => useContext(LeaderboardContext);

export function LeaderboardContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();

  // Obligations
  const [leaderboardRows, setLeaderboardRows] = useState<
    LeaderboardContext["leaderboardRows"]
  >(defaultContextValue["leaderboardRows"]);
  const [updatedAt, setUpdatedAt] = useState<LeaderboardContext["updatedAt"]>(
    defaultContextValue["updatedAt"],
  );

  const isFetchingLeaderboardRowsRef = useRef<boolean>(false);
  const fetchLeaderboardRows = useCallback(async () => {
    if (isFetchingLeaderboardRowsRef.current) return;
    isFetchingLeaderboardRowsRef.current = true;

    try {
      const url = `${API_URL}/tvl/leaderboard`;
      const res = await fetch(url);
      const json = await res.json();

      setLeaderboardRows(
        json.rows.map((row: any) => ({
          rank: row.rank,
          address: row.address,
          tvlUsd: new BigNumber(row.tvlUsd),
        })),
      );
      setUpdatedAt(new Date(json.updatedAt * 1000));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardRows();
  }, [fetchLeaderboardRows]);

  // Address row
  const [addressRow, setAddressRow] = useState<
    LeaderboardContext["addressRow"]
  >(defaultContextValue["addressRow"]);

  useEffect(() => {
    if (!address || leaderboardRows === undefined) {
      setAddressRow(undefined);
      return;
    }

    setAddressRow(
      leaderboardRows.find((row) => row.address === address) ?? {
        rank: -1,
        address,
        tvlUsd: new BigNumber(-1),
      },
    );
  }, [address, leaderboardRows]);

  // Context
  const contextValue: LeaderboardContext = useMemo(
    () => ({
      leaderboardRows,
      updatedAt,
      addressRow,
      fetchLeaderboardRows,
    }),
    [leaderboardRows, updatedAt, addressRow, fetchLeaderboardRows],
  );

  return (
    <LeaderboardContext.Provider value={contextValue}>
      {children}
    </LeaderboardContext.Provider>
  );
}
