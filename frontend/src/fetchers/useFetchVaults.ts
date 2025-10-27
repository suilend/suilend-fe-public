import useSWR from "swr";

import { useSettingsContext } from "@suilend/sui-fe-next";

import { ParsedVault, parseVault } from "@/fetchers/parseVault";
import { VAULTS_PACKAGE_ID, VAULT_OWNER } from "@/lib/constants";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function useFetchVaults() {
  const { suiClient } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();

  const fetcher = async (): Promise<ParsedVault[]> => {
    const type = `${VAULTS_PACKAGE_ID}::vault::VaultManagerCap<${VAULTS_PACKAGE_ID}::vault::VaultShare>`;
    const res = await suiClient.getOwnedObjects({
      owner: VAULT_OWNER,
      options: { showContent: true },
      filter: { StructType: type },
    });

    const items: ParsedVault[] = [];
    for (const o of res.data) {
      const fields = (o.data?.content as any)?.fields;
      if (fields?.vault_id)
        items.push(await parseVault(suiClient, fields.vault_id, allAppData));
    }
    console.log("items", items);
    return items;
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<
    ParsedVault[]
  >(["vaultsByOwner", VAULT_OWNER], fetcher);

  return { data: data ?? [], isLoading, isValidating, error, mutate };
}
