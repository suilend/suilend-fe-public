import { RegisterWalletCallback, WalletType } from "@suiet/wallet-kit";

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

export type Wallet = {
  id: string;
  name: string;
  isInstalled: boolean;
  iconUrl?: string;
  type: WalletType;
  downloadUrls: {
    iOS?: string;
    android?: string;
    browserExtension?: string;
    registerWebWallet?: RegisterWalletCallback;
  };
};
