import { Token as FrontendToken } from "@suilend/frontend-sui";

export type Token = {
  coinType: string;
  symbol: string;
  iconUrl?: string | null;
};

export type SwapToken = FrontendToken;

export type SubmitButtonState = {
  isLoading?: boolean;
  isDisabled?: boolean;
  title?: string;
  description?: string;
};
