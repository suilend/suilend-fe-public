import { useEffect, useMemo, useRef, useState } from "react";

import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import ConnectedWalletDropdownMenu from "@/components/layout/ConnectedWalletDropdownMenu";
import ConnectWalletDropdownMenu from "@/components/layout/ConnectWalletDropdownMenu";

export default function ConnectWalletButton() {
  const { suiClient } = useSettingsContext();
  const { isImpersonating, wallet, accounts, address } = useWalletContext();

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

  const isConnected = !!address && (!isImpersonating ? !!wallet : true);

  return isConnected ? (
    <ConnectedWalletDropdownMenu
      addressNameServiceNameMap={addressNameServiceNameMap}
    />
  ) : (
    <ConnectWalletDropdownMenu />
  );
}
