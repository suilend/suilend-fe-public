import useSWR from "swr";

export type Period = "1d" | "7d" | "30d" | "90d";

export type PricePoint = { timestamp: number; price: number };
export type BuybacksPoint = {
  timestamp: number;
  usdValue: number;
  sendAmount: number;
  transactionCount: number;
};
export type RevenuePoint = {
  timestamp: number;
  value: number;
  suilendRevenue: number;
  steammRevenue: number;
};

function parseTimestampSecondsToMs(ts: unknown): number | undefined {
  if (typeof ts !== "number") return undefined;
  // API appears to return seconds for charts; convert to ms for charts/UI
  return ts * 1000;
}

export function getPriceChart(period: Period) {
  const fetcher = async (): Promise<PricePoint[] | undefined> => {
    try {
      const url = `https://global.suilend.fi/buybacks/charts/price?${new URLSearchParams({ period })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Array<{ timestamp: number; price: string | number }> =
        await res.json();
      return json
        .map((p) => {
          const timestamp = parseTimestampSecondsToMs(p.timestamp);
          const price = typeof p.price === "string" ? Number(p.price) : p.price;
          if (
            timestamp === undefined ||
            typeof price !== "number" ||
            Number.isNaN(price)
          )
            return undefined;
          return { timestamp, price } as PricePoint;
        })
        .filter((x): x is PricePoint => Boolean(x));
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };
  const key = `buybacks-price-${period}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    PricePoint[] | undefined
  >(key, fetcher);
  return { data, isLoading, isValidating, mutate, error };
}

export function getBuybacksChart(period: Period) {
  const fetcher = async (): Promise<BuybacksPoint[] | undefined> => {
    try {
      const url = `https://global.suilend.fi/buybacks/charts/buybacks?${new URLSearchParams({ period })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Array<{
        timestamp: number;
        usdValue: string | number;
        sendAmount: string | number;
        transactionCount: number;
      }> = await res.json();
      return json
        .map((p) => {
          const timestamp = parseTimestampSecondsToMs(p.timestamp);
          const usdValue =
            typeof p.usdValue === "string" ? Number(p.usdValue) : p.usdValue;
          const sendAmount =
            typeof p.sendAmount === "string"
              ? Number(p.sendAmount)
              : p.sendAmount;
          const transactionCount =
            typeof p.transactionCount === "number"
              ? p.transactionCount
              : Number(p.transactionCount);
          if (
            timestamp === undefined ||
            typeof usdValue !== "number" ||
            typeof sendAmount !== "number" ||
            typeof transactionCount !== "number"
          )
            return undefined;
          return {
            timestamp,
            usdValue,
            sendAmount,
            transactionCount,
          } as BuybacksPoint;
        })
        .filter((x): x is BuybacksPoint => Boolean(x));
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };
  const key = `buybacks-buybacks-${period}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    BuybacksPoint[] | undefined
  >(key, fetcher);
  return { data, isLoading, isValidating, mutate, error };
}

export function getRevenueChart(period: Period) {
  const fetcher = async (): Promise<RevenuePoint[] | undefined> => {
    try {
      const url = `https://global.suilend.fi/buybacks/charts/revenue?${new URLSearchParams({ period })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Array<{
        timestamp: number;
        value: string | number;
        suilendRevenue: string | number;
        steammRevenue: string | number;
      }> = await res.json();
      return json
        .map((p) => {
          const timestamp = parseTimestampSecondsToMs(p.timestamp);
          const value = typeof p.value === "string" ? Number(p.value) : p.value;
          const suilendRevenue =
            typeof p.suilendRevenue === "string"
              ? Number(p.suilendRevenue)
              : p.suilendRevenue;
          const steammRevenue =
            typeof p.steammRevenue === "string"
              ? Number(p.steammRevenue)
              : p.steammRevenue;
          if (
            timestamp === undefined ||
            typeof value !== "number" ||
            typeof suilendRevenue !== "number" ||
            typeof steammRevenue !== "number"
          )
            return undefined;
          return {
            timestamp,
            value,
            suilendRevenue,
            steammRevenue,
          } as RevenuePoint;
        })
        .filter((x): x is RevenuePoint => Boolean(x));
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };
  const key = `buybacks-revenue-${period}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    RevenuePoint[] | undefined
  >(key, fetcher);
  return { data, isLoading, isValidating, mutate, error };
}
