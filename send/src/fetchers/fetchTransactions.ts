import useSWR from "swr";

export type Transaction = {
  digest: string;
  timestamp: number; // ms
  sendAmount: number;
  usdValue: number;
  price: number;
};

export type TransactionsResponse = {
  results: Transaction[];
  cursor?: string;
};

export function getTransactions(limit = 50, cursor?: string) {
  const fetcher = async (): Promise<TransactionsResponse | undefined> => {
    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (cursor) qs.set("cursor", cursor);
      const url = `https://global.suilend.fi/buybacks/transactions?${qs}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: {
        results: Array<{
          digest: string;
          timestamp: number;
          sendAmount: string | number;
          usdValue: string | number;
          price: string | number;
        }>;
        cursor?: string;
      } = await res.json();
      const results: Transaction[] = json.results
        .map((r) => {
          const tsMs =
            typeof r.timestamp === "number" ? r.timestamp * 1000 : undefined;
          const sendAmount =
            typeof r.sendAmount === "string"
              ? Number(r.sendAmount)
              : r.sendAmount;
          const usdValue =
            typeof r.usdValue === "string" ? Number(r.usdValue) : r.usdValue;
          const price = typeof r.price === "string" ? Number(r.price) : r.price;
          if (
            !r.digest ||
            tsMs === undefined ||
            typeof sendAmount !== "number" ||
            typeof usdValue !== "number" ||
            typeof price !== "number"
          ) {
            return undefined;
          }
          return {
            digest: r.digest,
            timestamp: tsMs,
            sendAmount,
            usdValue,
            price,
          } as Transaction;
        })
        .filter((x): x is Transaction => Boolean(x));
      return { results, cursor: json.cursor };
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  const key = `buybacks-transactions-${limit}-${cursor ?? "start"}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    TransactionsResponse | undefined
  >(key, fetcher);
  return { data, isLoading, isValidating, mutate, error };
}
