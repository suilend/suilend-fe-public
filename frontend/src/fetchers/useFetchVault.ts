import useSWR from "swr";

import { useSettingsContext } from "@suilend/sui-fe-next";

import { ParsedVault, parseVault } from "@/fetchers/parseVault";

export default function useFetchVault(vaultId?: string) {
  const { suiClient } = useSettingsContext();

  const fetcher = async (): Promise<ParsedVault> => {
    if (!vaultId) throw new Error("Missing vaultId");
    return await parseVault(suiClient, vaultId);
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<ParsedVault>(
    vaultId ? ["vault", vaultId] : null,
    fetcher,
  );

  return { data, isLoading, isValidating, error, mutate };
}


