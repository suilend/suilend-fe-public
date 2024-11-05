export type Token = {
  coinType: string;
  symbol: string;
  iconUrl?: string | null;
};

export type SwapToken = {
  coinType: string;
  decimals: number;
  symbol: string;
  name: string;
  iconUrl?: string | null;
};
