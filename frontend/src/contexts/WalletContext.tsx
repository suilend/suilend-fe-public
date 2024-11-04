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

import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import { IdentifierString, WalletAccount } from "@mysten/wallet-standard";
import * as Sentry from "@sentry/nextjs";
import { useWallet } from "@suiet/wallet-kit";
import BigNumber from "bignumber.js";
import { useLDClient } from "launchdarkly-react-client-sdk";
import { executeAuction } from "shio-sdk";
import { toast } from "sonner";

import { useSettingsContext } from "@/contexts/SettingsContext";
import { formatAddress } from "@/lib/format";
import { API_URL } from "@/lib/navigation";
import { Wallet } from "@/lib/types";
import { useListWallets } from "@/lib/wallets";

export enum QueryParams {
  WALLET = "wallet",
}

interface WalletContext {
  isImpersonating?: boolean;
  isConnectWalletDropdownOpen: boolean;
  setIsConnectWalletDropdownOpen: Dispatch<SetStateAction<boolean>>;

  wallet: Wallet | undefined;
  connectWallet: (wallet: Wallet) => Promise<void>;
  disconnectWallet: () => Promise<void>;

  walletAccounts: readonly WalletAccount[];
  walletAccount?: WalletAccount;
  selectWalletAccount: (
    accountAddress: string,
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

  wallet: undefined,
  connectWallet: async () => {
    throw new Error("WalletContextProvider not initialized");
  },
  disconnectWallet: async () => {
    throw new Error("WalletContextProvider not initialized");
  },

  walletAccounts: [],
  walletAccount: undefined,
  selectWalletAccount: () => {
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

  // Wallet
  const [isConnectWalletDropdownOpen, setIsConnectWalletDropdownOpen] =
    useState<boolean>(false);

  const {
    chain,
    adapter,
    connected: isWalletConnected,
    select: connectWallet,
    disconnect: disconnectWallet,
    getAccounts: getWalletAccounts,
  } = useWallet();
  const { gasBudget } = useSettingsContext();

  const wallets = useListWallets();
  const wallet = useMemo(
    () => wallets.find((w) => w.name === adapter?.name),
    [wallets, adapter],
  );

  const connectWalletWrapper = useCallback(
    async (_wallet: Wallet) => {
      try {
        await connectWallet(_wallet.name);
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

  const disconnectWalletWrapper = useCallback(async () => {
    await disconnectWallet();
    toast.info("Disconnected wallet");
  }, [disconnectWallet]);

  // Wallet account
  const [walletAccounts, setWalletAccounts] = useState<
    WalletContext["walletAccounts"]
  >([]);
  const [walletAccountAddress, setWalletAccountAddress] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    setWalletAccountAddress(
      window.localStorage.getItem("accountAddress") ?? undefined,
    );
  }, [isWalletConnected]);

  useEffect(() => {
    if (!isWalletConnected) {
      setWalletAccounts([]);
      return;
    }

    const _walletAccounts = getWalletAccounts();
    setWalletAccounts(_walletAccounts);

    if (_walletAccounts.length === 0) {
      // NO ACCOUNTS (should not happen) - set to undefined
      setWalletAccountAddress(undefined);
      return;
    }

    if (!walletAccountAddress) {
      // NO ADDRESS SET - set to first account's address
      setWalletAccountAddress(_walletAccounts[0].address);
    } else {
      const _walletAccount = _walletAccounts.find(
        (a) => a.address === walletAccountAddress,
      );
      if (_walletAccount) {
        // ADDRESS SET + ACCOUNT FOUND - do nothing
        return;
      }

      // ADDRESS SET + NO ACCOUNT FOUND - set to first account's address
      setWalletAccountAddress(_walletAccounts[0].address);
    }
  }, [
    isWalletConnected,
    getWalletAccounts,
    setWalletAccountAddress,
    walletAccountAddress,
  ]);

  const walletAccount = useMemo(
    () =>
      walletAccounts?.find((wa) => wa.address === walletAccountAddress) ??
      undefined,
    [walletAccounts, walletAccountAddress],
  );

  const selectWalletAccount = useCallback(
    (_accountAddress: string, addressNameServiceName?: string) => {
      const _walletAccount = walletAccounts.find(
        (a) => a.address === _accountAddress,
      );
      if (!_walletAccount) return;

      setWalletAccountAddress(_accountAddress);
      window.localStorage.setItem("accountAddress", _accountAddress);

      toast.info(
        `Switched to ${_walletAccount?.label ?? addressNameServiceName ?? formatAddress(_walletAccount.address)}`,
        {
          description: _walletAccount?.label
            ? (addressNameServiceName ?? formatAddress(_walletAccount.address))
            : undefined,
          descriptionClassName: "uppercase !font-mono",
        },
      );
    },
    [walletAccounts],
  );

  // Sentry
  useEffect(() => {
    if (impersonatedAddress) return;
    Sentry.setUser({ id: walletAccount?.address });
  }, [impersonatedAddress, walletAccount?.address]);

  // Wallet connect event
  const loggingWalletConnectEventRef = useRef<
    { address: string; walletName: string } | undefined
  >(undefined);
  useEffect(() => {
    if (impersonatedAddress) return;
    if (!walletAccount?.address || !wallet) return;

    const walletName = wallet.name;
    if (
      loggingWalletConnectEventRef.current?.address === walletAccount.address &&
      loggingWalletConnectEventRef.current?.walletName === walletName
    )
      return;

    const loggingWalletConnectEvent = {
      address: walletAccount?.address,
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
  }, [impersonatedAddress, walletAccount?.address, wallet]);

  // LaunchDarkly
  const ldClient = useLDClient();
  const ldKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ldClient) return;

    const key = impersonatedAddress ?? walletAccount?.address;
    if (ldKeyRef.current === key) return;

    (async () => {
      await ldClient.identify(!key ? { anonymous: true } : { key });
      ldKeyRef.current = key;
    })();
  }, [ldClient, impersonatedAddress, walletAccount?.address]);

  // Tx
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

      const _address = impersonatedAddress ?? walletAccount?.address;
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

      if (!chain) throw new Error("Missing chain");
      if (!adapter) throw new Error("Missing adapter");
      if (!walletAccount) throw new Error("Missing account");

      try {
        // BEGIN legacy code
        const signedTransaction = await adapter.signTransactionBlock({
          transactionBlock: transaction as any, // Expects TransactionBlock, not Transaction
          account: walletAccount,
          chain: chain.id as IdentifierString,
        });

        // Shio auction
        if (auction) {
          try {
            await executeAuction(
              signedTransaction.transactionBlockBytes,
              signedTransaction.signature,
            );
          } catch (err) {}
        }

        const res1 = await suiClient.executeTransactionBlock({
          transactionBlock: signedTransaction.transactionBlockBytes,
          signature: signedTransaction.signature,
        });
        // END legacy code

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
    [gasBudget, impersonatedAddress, walletAccount, chain, adapter],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      isImpersonating: !!impersonatedAddress,
      isConnectWalletDropdownOpen,
      setIsConnectWalletDropdownOpen,

      wallet,
      connectWallet: connectWalletWrapper,
      disconnectWallet: disconnectWalletWrapper,

      walletAccounts,
      walletAccount,
      selectWalletAccount,

      address: impersonatedAddress ?? walletAccount?.address,
      signExecuteAndWaitForTransaction,
    }),
    [
      impersonatedAddress,
      isConnectWalletDropdownOpen,
      wallet,
      connectWalletWrapper,
      disconnectWalletWrapper,
      walletAccounts,
      walletAccount,
      selectWalletAccount,
      signExecuteAndWaitForTransaction,
    ],
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}
