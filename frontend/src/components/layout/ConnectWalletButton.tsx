import { useEffect, useMemo, useRef, useState } from "react";

import { ConnectModal, useWallet } from "@suiet/wallet-kit";

import ConnectedWalletDropdownMenu from "@/components/layout/ConnectedWalletDropdownMenu";
import ConnectWalletDropdownMenu from "@/components/layout/ConnectWalletDropdownMenu";
import { useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { useListWallets } from "@/lib/wallets";

export default function ConnectWalletButton() {
  const { adapter } = useWallet();
  const { accounts, address, isImpersonatingAddress } = useWalletContext();
  const { suiClient } = useAppContext();

  // Connect modal
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

  // Wallet details
  const wallets = useListWallets();
  const connectedWallet = wallets.find((w) => w.id === adapter?.name);

  // Sui Name Service lookup
  const [addressNameServiceNameMap, setAddressNameServiceNameMap] = useState<
    Record<string, string | undefined>
  >({});

  const addressesBeingLookedUpRef = useRef<string[]>([]);
  const addressesToLookUp = useMemo(
    () =>
      Array.from(
        new Set(
          [address, ...accounts.map((_account) => _account.address)].filter(
            Boolean,
          ) as string[],
        ),
      ).filter(
        (_address) =>
          !Object.keys(addressNameServiceNameMap).includes(_address) &&
          !addressesBeingLookedUpRef.current.includes(_address),
      ),
    [address, accounts, addressNameServiceNameMap],
  );

  useEffect(() => {
    (async () => {
      if (addressesToLookUp.length === 0) return;

      try {
        addressesBeingLookedUpRef.current.push(...addressesToLookUp);

        const result = await Promise.all(
          addressesToLookUp.map((_address) =>
            suiClient.resolveNameServiceNames({ address: _address }),
          ),
        );

        setAddressNameServiceNameMap((o) =>
          result.reduce(
            (acc, addressResult, index) => ({
              ...acc,
              [addressesToLookUp[index]]: addressResult.data?.[0],
            }),
            o,
          ),
        );
      } catch (err) {
        setAddressNameServiceNameMap((o) =>
          addressesToLookUp.reduce(
            (acc, _address) => ({ ...acc, [_address]: undefined }),
            o,
          ),
        );
      }
    })();
  }, [addressesToLookUp, suiClient]);

  const isConnected =
    address &&
    (!isImpersonatingAddress ? connectedWallet : true) &&
    Object.keys(addressNameServiceNameMap).includes(address);

  return (
    <>
      <ConnectModal
        open={isConnectModalOpen}
        onConnectSuccess={() => setIsConnectModalOpen(false)}
        onOpenChange={setIsConnectModalOpen}
      />

      {isConnected ? (
        <ConnectedWalletDropdownMenu
          connectedWallet={connectedWallet}
          addressNameServiceNameMap={addressNameServiceNameMap}
        />
      ) : (
        <ConnectWalletDropdownMenu />
      )}
    </>
  );
}
