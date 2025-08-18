import useSWR from "swr";

export type Period = "1d" | "7d" | "30d" | "90d" | "all" | "1y";

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
  springsuiRevenue: number;
};

// --- Test mode helpers (1y fake data) ---
function isTestMode1Y(): boolean {
  // Prefer runtime toggle via localStorage to avoid env churn
  try {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem("SEND_TEST_CHARTS_1Y");
      if (v != null) return v === "true" || v === "1";
    }
  } catch {}
  // Fallback to NEXT_PUBLIC env if provided
  try {
    // eslint-disable-next-line no-process-env
    return process.env.NEXT_PUBLIC_SEND_TEST_CHARTS_1Y === "true";
  } catch {
    return false;
  }
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function generatePastYearDailyBuybacks(): BuybacksPoint[] {
  const day = 24 * 60 * 60 * 1000;
  const today = startOfUtcDay(Date.now());
  const out: BuybacksPoint[] = [];
  for (let i = 364; i >= 0; i -= 1) {
    const ts = today - i * day;
    // Randomized but reasonable magnitudes
    const usdValue = Math.max(0, Math.round((Math.random() ** 2) * 200_000));
    const sendAmount = Math.max(0, Math.round((Math.random() ** 2) * 350_000));
    const transactionCount = Math.floor(Math.random() * 300);
    out.push({ timestamp: ts, usdValue, sendAmount, transactionCount });
  }
  return out;
}

function generatePastYearDailyRevenue(): RevenuePoint[] {
  const day = 24 * 60 * 60 * 1000;
  const today = startOfUtcDay(Date.now());
  const out: RevenuePoint[] = [];
  for (let i = 364; i >= 0; i -= 1) {
    const ts = today - i * day;
    const suilendRevenue = Math.max(0, Math.round((Math.random() ** 2) * 800_000));
    const steammRevenue = Math.max(0, Math.round((Math.random() ** 2) * 250_000));
    const springsuiRevenue = Math.max(0, Math.round((Math.random() ** 2) * 150_000));
    const value = suilendRevenue + steammRevenue + springsuiRevenue;
    out.push({ timestamp: ts, value, suilendRevenue, steammRevenue, springsuiRevenue });
  }
  return out;
}

function parseTimestampSecondsToMs(ts: unknown): number | undefined {
  if (typeof ts !== "number") return undefined;
  // API appears to return seconds for charts; convert to ms for charts/UI
  return ts * 1000;
}

export function getPriceChart(period: Period) {
  const fetcher = async (): Promise<PricePoint[] | undefined> => {
    try {
      const url = `https://global.suilend.fi/send/charts/price?${new URLSearchParams({ period })}`;
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
          return { timestamp: timestamp, price } as PricePoint;
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
      if (period === "1y" && isTestMode1Y()) {
        return generatePastYearDailyBuybacks();
      }
      const url = `https://global.suilend.fi/send/charts/send?${new URLSearchParams({ period })}`;
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
      if (period === "1y" && isTestMode1Y()) {
        return generatePastYearDailyRevenue();
      }
      const url = `https://global.suilend.fi/send/charts/revenue?${new URLSearchParams({ period })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Array<{
        timestamp: number;
        value: string | number;
        suilendRevenue: string | number;
        steammRevenue: string | number;
        springsuiRevenue: string | number;
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
          const springsuiRevenue =
            typeof p.springsuiRevenue === "string"
              ? Number(p.springsuiRevenue)
              : p.springsuiRevenue;

          return {
            timestamp,
            value,
            suilendRevenue,
            steammRevenue,
            springsuiRevenue,
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
