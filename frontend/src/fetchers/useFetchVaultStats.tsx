import useSWR from "swr";

import { DAY_S, Days } from "@/lib/events";
import { API_URL } from "@suilend/sui-fe";
import { ChartData } from "@/components/strategies/VaultLineChart";
import { LENDING_MARKET_METADATA_MAP } from "@/fetchers/useFetchAppData";

// Toggle to enable mock data for development/testing
const USE_MOCK_VAULT_STATS = true;

type ObligationAllocationResponse = {
  obligation_id: string;
  deposited_value_usd: string;
  borrowed_value_usd: string;
  net_value_usd: string;
};

type LendingMarketAllocationResponse = {
  deposited_value_usd: string;
  borrowed_value_usd: string;
  net_value_usd: string;
  obligations: ObligationAllocationResponse[];
};

type VaultStatsResponse = {
  vault_id: string;
  base_token_type: string;
  nav_per_share_usd: string;
  utilization_rate_bps: string;
  aum_usd: string;
  total_shares: string;
  lending_market_allocations: Record<string, LendingMarketAllocationResponse>;
  apr: string;
  timestamp: number;
};

export default function useFetchVault(vaultId?: string, days?: Days) {
  const fetcher = async (): Promise<ChartData[]> => {
    if (!vaultId) throw new Error("Missing vaultId");

    if (USE_MOCK_VAULT_STATS) {
      const periodDays = days ?? 7;

      // Choose a sample interval aligned to tick logic
      const sampleIntervalS =
        periodDays === 1
          ? 60 * 60 // 1h
          : periodDays === 7
          ? DAY_S // 1 day
          : periodDays === 30
          ? 5 * DAY_S // 5 days
          : 3 * DAY_S; // 3 days (for 90d)

      const lastTimestampS =
        Math.floor(Date.now() / 1000 / sampleIntervalS) * sampleIntervalS;
      const numSamples = Math.max(
        2,
        Math.floor((periodDays * DAY_S) / sampleIntervalS) + 1,
      );

      const visibleMarketIds = Object.keys(LENDING_MARKET_METADATA_MAP)
        .filter((id) => !LENDING_MARKET_METADATA_MAP[id]?.isHidden)
        .slice(0, 4);
      const marketIds =
        visibleMarketIds.length > 0
          ? visibleMarketIds
          : Object.keys(LENDING_MARKET_METADATA_MAP).slice(0, 4);

      const baseTvl = 1_500_000; // $1.5M
      const tvlAmplitude = 250_000; // +/- $250k
      const baseApr = 12.3; // percent
      const aprAmplitude = 2.5; // +/- 2.5%

      const result: ChartData[] = Array.from({ length: numSamples }).map(
        (_, idx) => {
          const k = idx; // oldest -> newest in construction below
          const timestampS = lastTimestampS - (numSamples - 1 - k) * sampleIntervalS;

          // TVL as a gentle sinusoid around base
          const tvlRaw =
            baseTvl +
            tvlAmplitude * Math.sin((2 * Math.PI * k) / Math.max(6, numSamples));
          const tvl = Math.max(0, Math.round(tvlRaw));

          // APR as a sinusoid around baseApr
          const apr = +(baseApr + aprAmplitude * Math.sin((2 * Math.PI * k) / 9)).toFixed(2);

          // Allocation weights (stable but varying by index)
          const weightsRaw = marketIds.map((_, j) =>
            1 + 0.25 * Math.sin((2 * Math.PI * (k + j)) / 7),
          );
          const weightsSum = weightsRaw.reduce((a, b) => a + b, 0);
          const weights = weightsRaw.map((w) => (w <= 0 ? 0.0001 : w) / weightsSum);

          const allocationEntries = Object.fromEntries(
            marketIds.map((id, j) => [id, +(tvl * weights[j]).toFixed(2)]),
          );

          return {
            timestampS,
            tvl,
            apr,
            ...allocationEntries,
          } as ChartData;
        },
      );

      return result;
    }

    const url = `${API_URL}/vaults/stats?${new URLSearchParams({
      vaultId: vaultId ?? "",
      days: days?.toString() ?? "",
    })}`;
    const res = await fetch(url);
     if (!res.ok) throw new Error("Failed to fetch vault stats");
    const json = (await res.json()) as VaultStatsResponse[];

    return json.map((item) => ({
      timestampS: item.timestamp,
      tvl: Number(item.aum_usd),
      apr: Number(item.apr),
      ...Object.fromEntries(
        Object.entries(item.lending_market_allocations).map(([key, value]) =>  [key, Number(value.net_value_usd)]),
      ),
    }));
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<ChartData[]>(
    vaultId
      ? ["vaultStats", vaultId, days?.toString() ?? ""]
      : null,
    fetcher,
  );

  return { data, isLoading, isValidating, error, mutate };
}
