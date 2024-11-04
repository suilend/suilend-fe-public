import { PropsWithChildren, useEffect, useState } from "react";

import { MSafeWallet } from "@msafe/sui-wallet";
import { registerWallet } from "@mysten/wallet-standard";
import {
  AllDefaultWallets,
  IDefaultWallet,
  WalletProvider as SuietWalletProvider,
  WalletType,
  defineStashedWallet,
  defineWallet,
} from "@suiet/wallet-kit";

import { RPCS } from "@/lib/constants";

export default function WalletProvider({ children }: PropsWithChildren) {
  // MSafe Wallet
  // const [msafeWallet, setMsafeWallet] = useState<IDefaultWallet | undefined>(
  //   undefined,
  // );
  // useEffect(() => {
  //   const msafeWalletInstance = new MSafeWallet(
  //     "suilend",
  //     RPCS[0].url, // TODO: Use selected RPC
  //     "mainnet",
  //   );

  //   const _msafeWallet = defineWallet({
  //     name: msafeWalletInstance.name,
  //     label: msafeWalletInstance.name,
  //     type: WalletType.WEB,
  //     iconUrl: msafeWalletInstance.icon,
  //     downloadUrl: {
  //       registerWebWallet: () => () => registerWallet(msafeWalletInstance),
  //     },
  //   });
  //   setMsafeWallet(_msafeWallet);
  // }, []);

  return (
    <SuietWalletProvider
      defaultWallets={[
        ...AllDefaultWallets,
        defineStashedWallet({
          appName: "Suilend",
        }),
        // ...(msafeWallet ? [msafeWallet] : []),
      ]}
    >
      {children}
    </SuietWalletProvider>
  );
}
