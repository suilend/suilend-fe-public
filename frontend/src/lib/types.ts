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

export type SubmitButtonState = {
  isLoading?: boolean;
  isDisabled?: boolean;
  title?: string;
  description?: string;
};
