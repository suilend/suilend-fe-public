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
import { useListWallets } from "@/lib/wallets";

export enum QueryParams {
  WALLET = "wallet",
}

interface WalletContext {
  isConnectWalletDropdownOpen: boolean;
  setIsConnectWalletDropdownOpen: Dispatch<SetStateAction<boolean>>;
  accounts: readonly WalletAccount[];
  account?: WalletAccount;
  selectAccount: (address: string, addressNameServiceName?: string) => void;
  address?: string;
  isImpersonatingAddress?: boolean;
  selectWallet: (name: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  signExecuteAndWaitForTransaction: (
    suiClient: SuiClient,
    transaction: Transaction,
    auction?: boolean,
  ) => Promise<SuiTransactionBlockResponse>;
}

const WalletContext = createContext<WalletContext>({
  isConnectWalletDropdownOpen: false,
  setIsConnectWalletDropdownOpen: () => {
    throw new Error("WalletContextProvider not initialized");
  },
  accounts: [],
  account: undefined,
  selectAccount: () => {
    throw new Error("WalletContextProvider not initialized");
  },
  address: undefined,
  isImpersonatingAddress: false,
  selectWallet: async () => {
    throw new Error("WalletContextProvider not initialized");
  },
  disconnectWallet: async () => {
    throw new Error("WalletContextProvider not initialized");
  },
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

  const {
    chain,
    adapter,
    connected,
    select: selectWallet,
    disconnect: disconnectWallet,
    getAccounts,
  } = useWallet();
  const { gasBudget } = useSettingsContext();

  // Impersonated address
  const impersonatedAddress = queryParams[QueryParams.WALLET];

  // Wallet connect dropdown
  const [isConnectWalletDropdownOpen, setIsConnectWalletDropdownOpen] =
    useState<boolean>(false);

  const { wallets } = useListWallets();
  const connectedWallet = wallets.find((w) => w.id === adapter?.name);

  // Account
  const [accounts, setAccounts] = useState<readonly WalletAccount[]>([]);
  const [accountAddress, setAccountAddress] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    setAccountAddress(
      window.localStorage.getItem("accountAddress") ?? undefined,
    );
  }, [connected]);

  useEffect(() => {
    if (connected) {
      const _accounts = getAccounts();
      setAccounts(_accounts);

      if (_accounts.length === 0) {
        // NO ACCOUNTS (should not happen) - set to undefined
        setAccountAddress(undefined);
        return;
      }

      if (accountAddress) {
        const account = _accounts.find((a) => a.address === accountAddress);
        if (account) {
          // ADDRESS SET + ACCOUNT FOUND - do nothing
          return;
        }

        // ADDRESS SET + NO ACCOUNT FOUND - set to first account's address
        setAccountAddress(_accounts[0].address);
      } else {
        // NO ADDRESS SET - set to first account's address
        setAccountAddress(_accounts[0].address);
      }
    } else {
      setAccounts([]);
    }
  }, [connected, getAccounts, accountAddress, setAccountAddress]);

  const account =
    accounts?.find((a) => a.address === accountAddress) ?? undefined;

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
    if (!account?.address || !connectedWallet) return;

    const walletName = connectedWallet.name;
    if (
      loggingWalletConnectEventRef.current?.address === account.address &&
      loggingWalletConnectEventRef.current?.walletName === walletName
    )
      return;

    const loggingWalletConnectEvent = { address: account?.address, walletName };
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
  }, [impersonatedAddress, account?.address, connectedWallet]);

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
      if (!account) throw new Error("Missing account");

      try {
        // BEGIN legacy code
        const signedTransaction = await adapter.signTransactionBlock({
          transactionBlock: transaction as any, // Expects TransactionBlock, not Transaction
          account,
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
        if (
          !["User canceled", "Rejected from user"].includes(
            (err as Error).message || "",
          )
        )
          Sentry.captureException(err);

        console.error(err);
        throw err;
      }
    },
    [gasBudget, impersonatedAddress, account, chain, adapter],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      isConnectWalletDropdownOpen,
      setIsConnectWalletDropdownOpen,
      accounts,
      account,
      selectAccount: (_address: string, addressNameServiceName?: string) => {
        const _account = accounts.find((a) => a.address === _address);
        if (!_account) return;

        setAccountAddress(_address);
        window.localStorage.setItem("accountAddress", _address);

        toast.info(
          `Switched to ${_account?.label ?? addressNameServiceName ?? formatAddress(_address)}`,
          {
            description: _account?.label
              ? (addressNameServiceName ?? formatAddress(_address))
              : undefined,
            descriptionClassName: "uppercase !font-mono",
          },
        );
      },
      address: impersonatedAddress ?? account?.address,
      isImpersonatingAddress: !!impersonatedAddress,
      selectWallet,
      disconnectWallet: async () => {
        await disconnectWallet();
        toast.info("Disconnected wallet");
      },
      signExecuteAndWaitForTransaction,
    }),
    [
      isConnectWalletDropdownOpen,
      accounts,
      account,
      setAccountAddress,
      impersonatedAddress,
      selectWallet,
      disconnectWallet,
      signExecuteAndWaitForTransaction,
    ],
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}
