import useSWR from "swr";

export type Metrics = {
  currentPrice?: number;
  marketCapNotFdv?: number;
  marketCap?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  revenue?: number;
  treasury?: number;
  totalBuybacks?: number;
  swapBuybacks?: number;
  dcaBuybacks?: number;
  totalSendBought?: number;
  swapSendBought?: number;
  dcaSendBought?: number;
  timestamp?: number;
};

export function getMetrics() {
  const fetcher = async (): Promise<Metrics | undefined> => {
    try {
      const url = `https://global.suilend.fi/send/metrics`;
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
      const swapBuybacks = toNum(json.swapBuybacks);
      const dcaBuybacks = toNum(json.dcaBuybacks);
      const totalSendBought = toNum(json.totalSendBought);
      const swapSendBought = toNum(json.swapSendBought);
      const dcaSendBought = toNum(json.dcaSendBought);
      const timestamp = toNum(json.timestamp);
      const marketCapNotFdv = toNum(json.marketCapNotFdv);
      const circulatingSupply = toNum(json.circulatingSupply);
      const totalSupply = toNum(json.totalSupply);

      return {
        currentPrice,
        marketCap,
        revenue,
        treasury,
        totalBuybacks,
        swapBuybacks,
        dcaBuybacks,
        totalSendBought,
        swapSendBought,
        dcaSendBought,
        timestamp,
        marketCapNotFdv,
        circulatingSupply,
        totalSupply,
      };
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
