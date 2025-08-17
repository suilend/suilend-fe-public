import useSWR from "swr";

import { SUI_COINTYPE, isSui } from "@/lib/constants";

async function fetchPrice(coinType: string) {
  const url = `https://global.suilend.fi/proxy/price?${new URLSearchParams({
    address: isSui(coinType) ? SUI_COINTYPE : coinType,
  })}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.data.value === undefined) return undefined;
  return +json.data.value;
}

export const getPrice = (coinType: string) => {
  const fetcher = async () => {
    try {
      return await fetchPrice(coinType);
    } catch (err) {
      console.error(err);
      return undefined;
    }
  };

  const key = `price-${coinType}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    number | undefined
  >(key, fetcher);

  return {
    data,
    isLoading,
    isValidating,
    mutate,
    error,
  };
};

export const getPrices = (coinTypes: string[]) => {
  const fetcher = async () => {
    const prices = await Promise.all(coinTypes.map(fetchPrice));
    return Object.fromEntries(
      coinTypes.map((coinType, index) => [coinType, prices[index]]),
    );
  };

  const key = `prices-${coinTypes.join(",")}`;
  const { data, isLoading, isValidating, error, mutate } = useSWR<
    Record<string, number | undefined>
  >(key, fetcher);

  return { data, isLoading, isValidating, error, mutate };
};
