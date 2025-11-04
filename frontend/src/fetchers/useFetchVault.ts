import useSWR from "swr";

import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ParsedVault, parseVault } from "@/fetchers/parseVault";

export default function useFetchVault(vaultId?: string) {
  const { suiClient } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();
  const { allUserData } = useLoadedUserContext();
  const { address } = useWalletContext();

  const fetcher = async (): Promise<ParsedVault> => {
    if (!vaultId) throw new Error("Missing vaultId");
    return await parseVault(
      suiClient,
      vaultId,
      allAppData,
      allUserData,
      address,
    );
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<ParsedVault>(
    vaultId
      ? [
          "vault",
          vaultId,
          address,
          allUserData.length,
          allAppData.allLendingMarketData.length,
        ]
      : null,
    fetcher,
  );

  return { data, isLoading, isValidating, error, mutate };
}
