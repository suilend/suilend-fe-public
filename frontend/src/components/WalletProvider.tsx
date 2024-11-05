import { PropsWithChildren, useEffect, useRef } from "react";

import { MSafeWallet } from "@msafe/sui-wallet";
import {
  WalletProvider as MystenWalletProvider,
  SuiClientProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import { registerWallet } from "@mysten/wallet-standard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DEFAULT_EXTENSION_WALLET_NAMES } from "@/contexts/WalletContext";
import { RPCS } from "@/lib/constants";

export default function WalletProvider({ children }: PropsWithChildren) {
  const { networkConfig } = createNetworkConfig({
    mainnet: { url: RPCS[0].url },
  });
  const queryClient = new QueryClient();

  // MSafe Wallet
  const didRegisterMsafeWalletRef = useRef<boolean>(false);
  useEffect(() => {
    if (didRegisterMsafeWalletRef.current) return;

    registerWallet(new MSafeWallet("Suilend", RPCS[0].url, "mainnet"));
    didRegisterMsafeWalletRef.current = true;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <MystenWalletProvider
          preferredWallets={DEFAULT_EXTENSION_WALLET_NAMES}
          autoConnect
          stashedWallet={{ name: "Suilend" }}
        >
          {children}
        </MystenWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
