import { useRouter } from "next/router";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useAccounts,
  useConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSignTransaction,
  useSwitchAccount,
  useWallets,
} from "@mysten/dapp-kit";
import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import {
  WalletAccount,
  WalletIcon,
  WalletWithRequiredFeatures,
} from "@mysten/wallet-standard";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import { useLDClient } from "launchdarkly-react-client-sdk";
import { executeAuction } from "shio-sdk";
import { toast } from "sonner";

import { useSettingsContext } from "@/contexts/SettingsContext";
import { formatAddress } from "@/lib/format";
import { API_URL } from "@/lib/navigation";

export enum QueryParams {
  WALLET = "wallet",
}

export enum WalletType {
  EXTENSION = "extension",
  WEB = "web",
}

export type Wallet = {
  name: string;
  isInstalled?: boolean; // Only if type is extension
  iconUrl?: WalletIcon;
  type: WalletType;
  downloadUrls?: {
    iOS?: string;
    android?: string;
    browserExtension?: string;
  };
  raw?: WalletWithRequiredFeatures;
};

export const isInMsafeApp = () =>
  typeof window !== "undefined" &&
  (window.location.host.includes("m-safe.io") ||
    Array.from(window.location.ancestorOrigins).some((origin) =>
      origin.includes("m-safe.io"),
    ));

enum WalletName {
  SUI_WALLET = "Sui Wallet",
  NIGHTLY = "Nightly",
  SUIET = "Suiet",
  MSAFE_WALLET = "MSafe Wallet",
  STASHED = "Stashed",
}

export const DEFAULT_EXTENSION_WALLET_NAMES = [
  WalletName.SUI_WALLET,
  WalletName.NIGHTLY,
  WalletName.SUIET,
  WalletName.MSAFE_WALLET,
];
const WEB_WALLET_NAMES = [WalletName.STASHED];

const WALLET_LOGO_MAP: Record<string, WalletIcon> = {
  [WalletName.SUI_WALLET]:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCAyOCAyOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgZmlsbD0iIzRDQTNGRiIvPgogICAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xOC44MzI3IDEyLjM0MTNWMTIuMzQyMkMxOS42NDgyIDEzLjM2NTMgMjAuMTM2IDE0LjY2MTMgMjAuMTM2IDE2LjA3MDVDMjAuMTM2IDE3LjQ3OTggMTkuNjMzNyAxOC44MTQzIDE4Ljc5NTcgMTkuODQ0M0wxOC43MjM1IDE5LjkzM0wxOC43MDQ1IDE5LjgyMDNDMTguNjg4MiAxOS43MjQ1IDE4LjY2OSAxOS42Mjc1IDE4LjY0NyAxOS41M0MxOC4yMjc3IDE3LjY4NzUgMTYuODYxMiAxNi4xMDc1IDE0LjYxMjUgMTQuODI4MkMxMy4wOTQgMTMuOTY2OCAxMi4yMjQ3IDEyLjkyOTIgMTEuOTk2NSAxMS43NTA4QzExLjg0OSAxMC45ODg1IDExLjk1ODcgMTAuMjIzIDEyLjE3MDUgOS41NjcyNUMxMi4zODIyIDguOTExNzUgMTIuNjk3MiA4LjM2MjUgMTIuOTY0NyA4LjAzMkwxMy44Mzk1IDYuOTYyMjVDMTMuOTkzIDYuNzc0NzUgMTQuMjggNi43NzQ3NSAxNC40MzM1IDYuOTYyMjVMMTguODMzIDEyLjM0MTVMMTguODMyNyAxMi4zNDEzWk0yMC4yMTY1IDExLjI3MjVWMTEuMjcyTDE0LjM1MyA0LjEwMjc1QzE0LjI0MSAzLjk2NTc1IDE0LjAzMTUgMy45NjU3NSAxMy45MTk1IDQuMTAyNzVMOC4wNTYgMTEuMjcyM1YxMS4yNzI4TDguMDM3IDExLjI5NjVDNi45NTgyNSAxMi42MzUzIDYuMzEyNSAxNC4zMzY4IDYuMzEyNSAxNi4xODlDNi4zMTI1IDIwLjUwMjggOS44MTUyNSAyNCAxNC4xMzYzIDI0QzE4LjQ1NzIgMjQgMjEuOTYgMjAuNTAyOCAyMS45NiAxNi4xODlDMjEuOTYgMTQuMzM2OCAyMS4zMTQyIDEyLjYzNTMgMjAuMjM1MiAxMS4yOTYzTDIwLjIxNiAxMS4yNzI1SDIwLjIxNjVaTTkuNDU5MjUgMTIuMzE4TDkuOTgzNzUgMTEuNjc2NUw5Ljk5OTUgMTEuNzk1QzEwLjAxMiAxMS44ODg3IDEwLjAyNzIgMTEuOTgzIDEwLjA0NTIgMTIuMDc3OEMxMC4zODQ1IDEzLjg1ODIgMTEuNTk2NyAxNS4zNDI4IDEzLjYyMzUgMTYuNDkyNUMxNS4zODUyIDE3LjQ5NSAxNi40MTEgMTguNjQ4IDE2LjcwNjUgMTkuOTEyNUMxNi44Mjk4IDIwLjQ0MDMgMTYuODUxNyAyMC45NTk1IDE2Ljc5ODUgMjEuNDEzNUwxNi43OTUyIDIxLjQ0MTVMMTYuNzY5NyAyMS40NTRDMTUuOTc0NyAyMS44NDI1IDE1LjA4MDcgMjIuMDYwNSAxNC4xMzYgMjIuMDYwNUMxMC44MjI1IDIyLjA2MDUgOC4xMzYyNSAxOS4zNzg4IDguMTM2MjUgMTYuMDcwNUM4LjEzNjI1IDE0LjY1MDMgOC42MzE1IDEzLjM0NSA5LjQ1OSAxMi4zMTgzTDkuNDU5MjUgMTIuMzE4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==",
  [WalletName.NIGHTLY]:
    "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyOC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iV2Fyc3R3YV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgdmlld0JveD0iMCAwIDg1MS41IDg1MS41IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA4NTEuNSA4NTEuNTsiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPHN0eWxlIHR5cGU9InRleHQvY3NzIj4NCgkuc3Qwe2ZpbGw6IzYwNjdGOTt9DQoJLnN0MXtmaWxsOiNGN0Y3Rjc7fQ0KPC9zdHlsZT4NCjxnPg0KCTxnIGlkPSJXYXJzdHdhXzJfMDAwMDAwMTQ2MDk2NTQyNTMxODA5NDY0NjAwMDAwMDg2NDc4NTIwMDIxMTY5MTg2ODhfIj4NCgkJPHBhdGggY2xhc3M9InN0MCIgZD0iTTEyNCwwaDYwMy42YzY4LjUsMCwxMjQsNTUuNSwxMjQsMTI0djYwMy42YzAsNjguNS01NS41LDEyNC0xMjQsMTI0SDEyNGMtNjguNSwwLTEyNC01NS41LTEyNC0xMjRWMTI0DQoJCQlDMCw1NS41LDU1LjUsMCwxMjQsMHoiLz4NCgk8L2c+DQoJPGcgaWQ9IldhcnN0d2FfMyI+DQoJCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik02MjMuNSwxNzAuM2MtMzcuNCw1Mi4yLTg0LjIsODguNC0xMzkuNSwxMTIuNmMtMTkuMi01LjMtMzguOS04LTU4LjMtNy44Yy0xOS40LTAuMi0zOS4xLDIuNi01OC4zLDcuOA0KCQkJYy01NS4zLTI0LjMtMTAyLjEtNjAuMy0xMzkuNS0xMTIuNmMtMTEuMywyOC40LTU0LjgsMTI2LjQtMi42LDI2My40YzAsMC0xNi43LDcxLjUsMTQsMTMyLjljMCwwLDQ0LjQtMjAuMSw3OS43LDguMg0KCQkJYzM2LjksMjkuOSwyNS4xLDU4LjcsNTEuMSw4My41YzIyLjQsMjIuOSw1NS43LDIyLjksNTUuNywyMi45czMzLjMsMCw1NS43LTIyLjhjMjYtMjQuNywxNC4zLTUzLjUsNTEuMS04My41DQoJCQljMzUuMi0yOC4zLDc5LjctOC4yLDc5LjctOC4yYzMwLjYtNjEuNCwxNC0xMzIuOSwxNC0xMzIuOUM2NzguMywyOTYuNyw2MzQuOSwxOTguNyw2MjMuNSwxNzAuM3ogTTI1My4xLDQxNC44DQoJCQljLTI4LjQtNTguMy0zNi4yLTEzOC4zLTE4LjMtMjAxLjVjMjMuNyw2MCw1NS45LDg2LjksOTQuMiwxMTUuM0MzMTIuOCwzNjIuMywyODIuMywzOTQuMSwyNTMuMSw0MTQuOHogTTMzNC44LDUxNy41DQoJCQljLTIyLjQtOS45LTI3LjEtMjkuNC0yNy4xLTI5LjRjMzAuNS0xOS4yLDc1LjQtNC41LDc2LjgsNDAuOUMzNjAuOSw1MTQuNywzNTMsNTI1LjQsMzM0LjgsNTE3LjV6IE00MjUuNyw2NzguNw0KCQkJYy0xNiwwLTI5LTExLjUtMjktMjUuNnMxMy0yNS42LDI5LTI1LjZzMjksMTEuNSwyOSwyNS42QzQ1NC43LDY2Ny4zLDQ0MS43LDY3OC43LDQyNS43LDY3OC43eiBNNTE2LjcsNTE3LjUNCgkJCWMtMTguMiw4LTI2LTIuOC00OS43LDExLjVjMS41LTQ1LjQsNDYuMi02MC4xLDc2LjgtNDAuOUM1NDMuOCw0ODgsNTM5LDUwNy42LDUxNi43LDUxNy41eiBNNTk4LjMsNDE0LjgNCgkJCWMtMjkuMS0yMC43LTU5LjctNTIuNC03Ni04Ni4yYzM4LjMtMjguNCw3MC42LTU1LjQsOTQuMi0xMTUuM0M2MzQuNiwyNzYuNSw2MjYuOCwzNTYuNiw1OTguMyw0MTQuOHoiLz4NCgk8L2c+DQo8L2c+DQo8L3N2Zz4NCg==",
  [WalletName.SUIET]:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMjQiIGZpbGw9InVybCgjcGFpbnQwX3JhZGlhbF8zMDVfMTI1MTYpIi8+PHBhdGggZD0iTTUxLjUgNDMuNmMtMy45IDAtNy42LTMuOS05LjUtNi40LTEuOSAyLjUtNS42IDYuNC05LjUgNi40LTQgMC03LjctMy45LTkuNS02LjQtMS44IDIuNS01LjUgNi40LTkuNSA2LjQtLjggMC0xLjUtLjYtMS41LTEuNSAwLS44LjctMS41IDEuNS0xLjUgMy4yIDAgNy4xLTUuMSA4LjItNi45LjMtLjQuOC0uNyAxLjMtLjdzMSAuMiAxLjMuN2MxLjEgMS44IDUgNi45IDguMiA2LjkgMy4xIDAgNy4xLTUuMSA4LjItNi45LjMtLjQuOC0uNyAxLjMtLjdzMSAuMiAxLjIuN2MxLjEgMS44IDUgNi45IDguMiA2LjkuOSAwIDEuNi43IDEuNiAxLjUgMCAuOS0uNiAxLjUtMS41IDEuNXoiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNNTEuNSA1Mi4zYy0zLjkgMC03LjYtMy45LTkuNS02LjQtMS45IDIuNS01LjYgNi40LTkuNSA2LjQtNCAwLTcuNy0zLjktOS41LTYuNC0xLjggMi41LTUuNSA2LjQtOS41IDYuNC0uOCAwLTEuNS0uNi0xLjUtMS41IDAtLjguNy0xLjUgMS41LTEuNSAzLjIgMCA3LjEtNS4xIDguMi02LjkuMy0uNC44LS43IDEuMy0uN3MxIC4zIDEuMy43YzEuMSAxLjggNSA2LjkgOC4yIDYuOSAzLjEgMCA3LjEtNS4xIDguMi02LjkuMy0uNC44LS43IDEuMy0uN3MxIC4zIDEuMi43YzEuMSAxLjggNSA2LjkgOC4yIDYuOS45IDAgMS42LjcgMS42IDEuNSAwIC45LS42IDEuNS0xLjUgMS41ek0xNC42IDM2LjdjLS44IDAtMS40LS41LTEuNi0xLjNsLS4zLTMuNmMwLTEwLjkgOC45LTE5LjggMTkuOC0xOS44IDExIDAgMTkuOCA4LjkgMTkuOCAxOS44bC0uMyAzLjZjLS4xLjgtLjkgMS40LTEuNyAxLjItLjktLjEtMS41LS45LTEuMy0xLjhsLjMtM2MwLTkuMi03LjUtMTYuOC0xNi44LTE2LjgtOS4yIDAtMTYuNyA3LjUtMTYuNyAxNi44bC4yIDMuMWMuMi44LS4zIDEuNi0xLjEgMS44aC0uM3oiIGZpbGw9IiNmZmYiLz48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9InBhaW50MF9yYWRpYWxfMzA1XzEyNTE2IiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDUyLjc1ODAzIDUxLjM1OCAtNTEuNDM5NDcgNTIuODQxNzIgMCA3LjQwNykiPjxzdG9wIHN0b3AtY29sb3I9IiMwMDU4REQiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM2N0M4RkYiLz48L3JhZGlhbEdyYWRpZW50PjwvZGVmcz48L3N2Zz4=",
};

const WALLET_DOWNLOAD_URLS_MAP: Record<
  string,
  Record<"iOS" | "android" | "browserExtension", string | undefined>
> = {
  [WalletName.SUI_WALLET]: {
    iOS: "https://apps.apple.com/us/app/sui-wallet-mobile/id6476572140",
    android:
      "https://play.google.com/store/apps/details?id=com.mystenlabs.suiwallet",
    browserExtension:
      "https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil",
  },
  [WalletName.NIGHTLY]: {
    iOS: "https://apps.apple.com/pl/app/nightly-multichain-wallet/id6444768157",
    android: "https://play.google.com/store/apps/details?id=com.nightlymobile",
    browserExtension:
      "https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa",
  },
  [WalletName.SUIET]: {
    iOS: undefined,
    android: undefined,
    browserExtension:
      "https://chromewebstore.google.com/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd",
  },
};

interface WalletContext {
  isImpersonating?: boolean;
  isConnectWalletDropdownOpen: boolean;
  setIsConnectWalletDropdownOpen: Dispatch<SetStateAction<boolean>>;

  wallets: Wallet[];
  wallet?: Wallet;
  connectWallet: (wallet: Wallet) => void;
  disconnectWallet: () => void;

  accounts: readonly WalletAccount[];
  account?: WalletAccount;
  switchAccount: (
    account: WalletAccount,
    addressNameServiceName?: string,
  ) => void;

  address?: string;
  signExecuteAndWaitForTransaction: (
    suiClient: SuiClient,
    transaction: Transaction,
    auction?: boolean,
  ) => Promise<SuiTransactionBlockResponse>;
}

const WalletContext = createContext<WalletContext>({
  isImpersonating: false,
  isConnectWalletDropdownOpen: false,
  setIsConnectWalletDropdownOpen: () => {
    throw new Error("WalletContextProvider not initialized");
  },

  wallets: [],
  wallet: undefined,
  connectWallet: () => {
    throw new Error("WalletContextProvider not initialized");
  },
  disconnectWallet: () => {
    throw new Error("WalletContextProvider not initialized");
  },

  accounts: [],
  account: undefined,
  switchAccount: () => {
    throw new Error("WalletContextProvider not initialized");
  },

  address: undefined,
  signExecuteAndWaitForTransaction: async () => {
    throw new Error("WalletContextProvider not initialized");
  },
});

export const useWalletContext = () => useContext(WalletContext);

export function WalletContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryParams = {
    [QueryParams.WALLET]: router.query[QueryParams.WALLET] as
      | string
      | undefined,
  };

  // Impersonated address
  const impersonatedAddress = queryParams[QueryParams.WALLET];

  // Wallets
  const wallets__installed = useWallets();
  const getInstalledWallet = useCallback(
    (name: string) => wallets__installed.find((w) => w.name === name),
    [wallets__installed],
  );

  const wallets__extension_default: Wallet[] = useMemo(() => {
    if (isInMsafeApp())
      return [
        {
          name: WalletName.MSAFE_WALLET,
          iconUrl: getInstalledWallet(WalletName.MSAFE_WALLET)?.icon,
          type: WalletType.EXTENSION,
        },
      ];

    return [
      {
        name: WalletName.SUI_WALLET,
        iconUrl:
          getInstalledWallet(WalletName.SUI_WALLET)?.icon ??
          WALLET_LOGO_MAP[WalletName.SUI_WALLET],
        type: WalletType.EXTENSION,
        downloadUrls: WALLET_DOWNLOAD_URLS_MAP[WalletName.SUI_WALLET],
      },
      {
        name: WalletName.NIGHTLY,
        iconUrl:
          getInstalledWallet(WalletName.NIGHTLY)?.icon ??
          WALLET_LOGO_MAP[WalletName.NIGHTLY],
        type: WalletType.EXTENSION,
        downloadUrls: WALLET_DOWNLOAD_URLS_MAP[WalletName.NIGHTLY],
      },
      {
        name: WalletName.SUIET,
        iconUrl:
          getInstalledWallet(WalletName.SUIET)?.icon ??
          WALLET_LOGO_MAP[WalletName.SUIET],
        type: WalletType.EXTENSION,
        downloadUrls: WALLET_DOWNLOAD_URLS_MAP[WalletName.SUIET],
      },
    ];
  }, [getInstalledWallet]);

  const wallets__extension_installed_default: Wallet[] = useMemo(
    () =>
      wallets__extension_default
        .filter((w) => !!getInstalledWallet(w.name))
        .map((w) => ({
          ...w,
          isInstalled: true,
          raw: getInstalledWallet(w.name),
        })),
    [wallets__extension_default, getInstalledWallet],
  );

  const wallets__extension_installed_notDefault: Wallet[] = useMemo(() => {
    if (isInMsafeApp()) return [];

    return wallets__installed
      .filter(
        (w) => !DEFAULT_EXTENSION_WALLET_NAMES.includes(w.name as WalletName),
      )
      .filter((w) => !WEB_WALLET_NAMES.includes(w.name as WalletName))
      .map((w) => ({
        name: w.name,
        isInstalled: true,
        iconUrl: w.icon,
        type: WalletType.EXTENSION,
        raw: w,
      }));
  }, [wallets__installed]);

  const wallets__extension_notInstalled_default: Wallet[] = useMemo(
    () =>
      wallets__extension_default
        .filter((w) => !getInstalledWallet(w.name))
        .map((w) => ({ ...w, isInstalled: false })),
    [wallets__extension_default, getInstalledWallet],
  );

  const wallets__web: Wallet[] = useMemo(() => {
    if (isInMsafeApp()) return [];

    return [
      {
        name: WalletName.STASHED,
        iconUrl: getInstalledWallet(WalletName.STASHED)?.icon,
        type: WalletType.WEB,
        raw: getInstalledWallet(WalletName.STASHED),
      },
    ];
  }, [getInstalledWallet]);

  const wallets = useMemo(
    () => [
      ...wallets__extension_installed_default,
      ...wallets__extension_installed_notDefault,
      ...wallets__extension_notInstalled_default,
      ...wallets__web,
    ],
    [
      wallets__extension_installed_default,
      wallets__extension_installed_notDefault,
      wallets__extension_notInstalled_default,
      wallets__web,
    ],
  );

  // Wallet
  const [isConnectWalletDropdownOpen, setIsConnectWalletDropdownOpen] =
    useState<boolean>(false);

  const { currentWallet: rawWallet } = useCurrentWallet();
  const wallet = useMemo(
    () =>
      rawWallet ? wallets.find((w) => w.name === rawWallet.name) : undefined,
    [rawWallet, wallets],
  );

  const { mutate: connectWallet } = useConnectWallet();
  const connectWalletWrapper = useCallback(
    (_wallet: Wallet) => {
      try {
        if (!_wallet.raw) throw new Error("Missing wallet");

        connectWallet({ wallet: _wallet.raw });
        toast.info(`Connected ${_wallet.name}`);

        // setIsConnectWalletDropdownOpen(false);
      } catch (err) {
        toast.error(`Failed to connect ${_wallet.name}`, {
          description: (err as Error)?.message || "An unknown error occurred",
        });
        console.error(err);
      }
    },
    [connectWallet],
  );

  const { mutate: disconnectWallet } = useDisconnectWallet();
  const disconnectWalletWrapper = useCallback(() => {
    disconnectWallet();
    toast.info("Disconnected wallet");
  }, [disconnectWallet]);

  // Accounts
  const accounts = useAccounts();
  const account = useCurrentAccount() ?? undefined;
  const { mutate: switchAccount } = useSwitchAccount();

  const switchAccountWrapper = useCallback(
    (_account: WalletAccount, addressNameServiceName?: string) => {
      switchAccount({ account: _account });
      toast.info(
        `Switched to ${_account?.label ?? addressNameServiceName ?? formatAddress(_account.address)}`,
        {
          description: _account?.label
            ? (addressNameServiceName ?? formatAddress(_account.address))
            : undefined,
          descriptionClassName: "uppercase !font-mono",
        },
      );
    },
    [switchAccount],
  );

  // Sentry
  useEffect(() => {
    if (impersonatedAddress) return;
    Sentry.setUser({ id: account?.address });
  }, [impersonatedAddress, account?.address]);

  // Wallet connect event
  const loggingWalletConnectEventRef = useRef<
    { address: string; walletName: string } | undefined
  >(undefined);
  useEffect(() => {
    if (impersonatedAddress) return;
    if (!account?.address || !wallet) return;

    const walletName = wallet.name;
    if (
      loggingWalletConnectEventRef.current?.address === account.address &&
      loggingWalletConnectEventRef.current?.walletName === walletName
    )
      return;

    const loggingWalletConnectEvent = {
      address: account?.address,
      walletName,
    };
    loggingWalletConnectEventRef.current = loggingWalletConnectEvent;

    (async () => {
      try {
        const url = `${API_URL}/events/logs/wallet-connect`;
        await fetch(url, {
          method: "POST",
          body: JSON.stringify(loggingWalletConnectEvent),
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [impersonatedAddress, account?.address, wallet]);

  // LaunchDarkly
  const ldClient = useLDClient();
  const ldKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ldClient) return;

    const key = impersonatedAddress ?? account?.address;
    if (ldKeyRef.current === key) return;

    (async () => {
      await ldClient.identify(!key ? { anonymous: true } : { key });
      ldKeyRef.current = key;
    })();
  }, [ldClient, impersonatedAddress, account?.address]);

  // Tx
  const { gasBudget } = useSettingsContext();
  const { mutateAsync: signTransaction } = useSignTransaction();

  // Note: Do NOT import and use this function directly. Instead, use signExecuteAndWaitForTransaction from AppContext.
  const signExecuteAndWaitForTransaction = useCallback(
    async (
      suiClient: SuiClient,
      transaction: Transaction,
      auction?: boolean,
    ) => {
      if (gasBudget !== "")
        transaction.setGasBudget(
          +new BigNumber(gasBudget)
            .times(10 ** SUI_DECIMALS)
            .integerValue(BigNumber.ROUND_DOWN),
        );

      const _address = impersonatedAddress ?? account?.address;
      if (_address) {
        (async () => {
          try {
            const simResult = await suiClient.devInspectTransactionBlock({
              sender: _address,
              transactionBlock: transaction,
            });
            console.log(simResult);

            if (simResult.error) {
              throw simResult.error;
            }
          } catch (err) {
            Sentry.captureException(err, {
              extra: { simulation: true },
            });
            console.error(err);
            // throw err; - Do not rethrow error
          }
        })(); // Do not await
      }

      try {
        // Sign
        const signedTransaction = await signTransaction({
          transaction,
          chain: "sui:mainnet",
        });

        // Shio auction (only for swaps)
        if (auction) {
          try {
            await executeAuction(
              signedTransaction.bytes,
              signedTransaction.signature,
            );
          } catch (err) {}
        }

        // Execute
        const res1 = await suiClient.executeTransactionBlock({
          transactionBlock: signedTransaction.bytes,
          signature: signedTransaction.signature,
        });

        // Wait
        const res2 = await suiClient.waitForTransaction({
          digest: res1.digest,
          options: {
            showEffects: true,
            showBalanceChanges: true,
          },
        });
        if (
          res2.effects?.status !== undefined &&
          res2.effects.status.status === "failure"
        )
          throw new Error(res2.effects.status.error ?? "Transaction failed");

        return res2;
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }
    },
    [gasBudget, impersonatedAddress, account?.address, signTransaction],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      isImpersonating: !!impersonatedAddress,
      isConnectWalletDropdownOpen,
      setIsConnectWalletDropdownOpen,

      wallets,
      wallet,
      connectWallet: connectWalletWrapper,
      disconnectWallet: disconnectWalletWrapper,

      accounts,
      account,
      switchAccount: switchAccountWrapper,

      address: impersonatedAddress ?? account?.address,
      signExecuteAndWaitForTransaction,
    }),
    [
      impersonatedAddress,
      isConnectWalletDropdownOpen,
      wallets,
      wallet,
      connectWalletWrapper,
      disconnectWalletWrapper,
      accounts,
      account,
      switchAccountWrapper,
      signExecuteAndWaitForTransaction,
    ],
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}
