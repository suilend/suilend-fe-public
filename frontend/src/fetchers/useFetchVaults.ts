import useSWR from "swr";

import { useSettingsContext } from "@suilend/sui-fe-next";

import { VAULTS_PACKAGE_ID, VAULT_OWNER } from "@/lib/constants";
import { parseVault, ParsedVault } from "@/fetchers/parseVault";

export default function useFetchVaults() {
  const { suiClient } = useSettingsContext();

  const fetcher = async (): Promise<ParsedVault[]> => {
    const type = `${VAULTS_PACKAGE_ID}::vault::VaultManagerCap<${VAULTS_PACKAGE_ID}::vault::VaultShare>`;
    const res = await suiClient.getOwnedObjects({
      owner: VAULT_OWNER,
      options: { showContent: true },
      filter: { StructType: type },
    });

    console.log('res',res);
    const items: ParsedVault[] = [];
    for (const o of res.data) {
      const fields = (o.data?.content as any)?.fields;
      if (fields?.vault_id) items.push(await parseVault(suiClient, fields.vault_id));
    }
    console.log('items',items);
    return items;
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<ParsedVault[]>(
    ["vaultsByOwner", VAULT_OWNER],
    fetcher,
  );

  return { data: data ?? [], isLoading, isValidating, error, mutate };
}


