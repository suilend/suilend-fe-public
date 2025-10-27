import useSWR from "swr";

import { useSettingsContext } from "@suilend/sui-fe-next";

import { ParsedVault, parseVault } from "@/fetchers/parseVault";
import { LENDING_MARKET_ID } from "@suilend/sdk";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function useFetchVault(vaultId?: string, address?: string) {
  const { suiClient } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();

  const fetcher = async (): Promise<ParsedVault> => {
    if (!vaultId) throw new Error("Missing vaultId");
    return await parseVault(suiClient, vaultId, allAppData, address);
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<ParsedVault>(
    vaultId ? ["vault", vaultId, address] : null,
    fetcher,
  );

  return { data, isLoading, isValidating, error, mutate };
}
