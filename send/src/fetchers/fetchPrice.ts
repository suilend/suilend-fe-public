import useSWR from "swr";

import { SUI_COINTYPE, isSui } from "@/lib/constants";

export const getPrice = (coinType: string) => {
  const fetcher = async () => {
    try {
      const url = `https://global.suilend.fi/proxy/price?${new URLSearchParams({
        address: isSui(coinType) ? SUI_COINTYPE : coinType,
      })}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.data.value === undefined) return undefined;
      return +json.data.value;
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
