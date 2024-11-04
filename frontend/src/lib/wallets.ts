import { WalletType, useWallet } from "@suiet/wallet-kit";
import { merge } from "lodash";

import { Wallet } from "@/lib/types";

const PRIORITY_WALLET_NAMES = ["Sui Wallet", "Nightly", "Suiet"];

const walletKitOverrides = {
  "Sui Wallet": {
    downloadUrls: {
      iOS: "https://apps.apple.com/us/app/sui-wallet-mobile/id6476572140",
      android:
        "https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet",
      browserExtension:
        "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil",
    },
  },
  Nightly: {
    downloadUrls: {
      iOS: "https://apps.apple.com/pl/app/nightly-multichain-wallet/id6444768157",
      android:
        "https://play.google.com/store/apps/details?id=com.nightlymobile",
      browserExtension:
        "https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa",
    },
  },
  Suiet: {
    downloadUrls: {
      browserExtension:
        "https://chromewebstore.google.com/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd",
    },
  },
};

export const useListWallets = () => {
  const { configuredWallets, allAvailableWallets } = useWallet();

  const filteredConfiguredWallets = configuredWallets.filter((wallet) =>
    PRIORITY_WALLET_NAMES.find((wName) => wName === wallet.name),
  );
  const filteredAvailableWallets = allAvailableWallets.filter(
    (wallet) => !filteredConfiguredWallets.find((w) => w.name === wallet.name),
  );

  const allWallets = [
    ...filteredConfiguredWallets,
    ...filteredAvailableWallets,
  ].map(
    (w) =>
      merge(
        {
          id: w.name,
          name: w.name,
          isInstalled: (w.type !== WalletType.WEB && w.installed) ?? false,
          iconUrl: w.iconUrl,
          type: w.type,
          downloadUrls: w.downloadUrl,
        },
        walletKitOverrides[w.name as keyof typeof walletKitOverrides] ?? {},
      ) as Wallet,
  );

  // Sort
  const sortWallets = (wallets: Wallet[]) =>
    wallets.slice().sort((wA, wB) => {
      const wA_priorityIndex = PRIORITY_WALLET_NAMES.findIndex(
        (wName) => wName === wA.name,
      );
      const wB_priorityIndex = PRIORITY_WALLET_NAMES.findIndex(
        (wName) => wName === wB.name,
      );

      if (wA_priorityIndex > -1 && wB_priorityIndex > -1)
        return wA_priorityIndex - wB_priorityIndex;
      else if (wA_priorityIndex === -1 && wB_priorityIndex === -1) return 0;
      else return wA_priorityIndex > -1 ? -1 : 1;
    });

  const installedWallets = sortWallets(
    allWallets.filter((wallet) => wallet.isInstalled),
  );
  const notInstalledWallets = sortWallets(
    allWallets.filter(
      (wallet) => !wallet.isInstalled || wallet.type === WalletType.WEB,
    ),
  );

  return [...installedWallets, ...notInstalledWallets];
};
