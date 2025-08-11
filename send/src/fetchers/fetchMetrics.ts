import useSWR from "swr";

export type Metrics = {
  currentPrice: number;
  marketCap: number;
  revenue: number;
  treasury: number;
  totalBuybacks: number;
};

export function getMetrics() {
  const fetcher = async (): Promise<Metrics | undefined> => {
    try {
      const url = `https://global.suilend.fi/buybacks/metrics`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const toNum = (v: unknown) =>
        typeof v === "string"
          ? Number(v)
          : typeof v === "number"
            ? v
            : undefined;
      const currentPrice = toNum(json.currentPrice);
      const marketCap = toNum(json.marketCap);
      const revenue = toNum(json.revenue);
      const treasury = toNum(json.treasury);
      const totalBuybacks = toNum(json.totalBuybacks);

      if (
        currentPrice === undefined ||
        marketCap === undefined ||
        revenue === undefined ||
        treasury === undefined ||
        totalBuybacks === undefined
      ) {
        return undefined;
      }

      return { currentPrice, marketCap, revenue, treasury, totalBuybacks };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  const key = `buybacks-metrics`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    Metrics | undefined
  >(key, fetcher);

  return { data, isLoading, isValidating, mutate, error };
}
