import useSWR from "swr";

export enum DCAVenue {
  Cetus = "cetus",
  Aftermath = "aftermath",
}

export type DCA = {
  createdAt: number;
  frequency: string;
  inCoinType: string;
  outCoinType: string;
  inCoinStartingAmount: string;
  inCoinCurrentAmount: string;
  outCoinCurrentAmount: string;
  inCoinPerCycle: string;
  status: "cancelled" | "ongoing" | "completed" | "unknown";
  venue: DCAVenue;
  wallet: string;
  minOutCoinPerCycle: string | null;
  maxOutCoinPerCycle: string | null;
  objectId: string;
};

export const getDcas = () => {
  const fetcher = async (): Promise<DCA[]> => {
    try {
      const res = await fetch("https://global.suilend.fi/send/dcas");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error fetching DCAs:", error);
      throw error;
    }
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<DCA[]>(
    "dcas",
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    },
  );

  return {
    data: data ?? [],
    isLoading,
    isValidating,
    mutate,
    error,
  };
};
