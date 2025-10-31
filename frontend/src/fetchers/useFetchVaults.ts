import useSWR from "swr";

import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useLoadedAppContext } from "@/contexts/AppContext";
import { ParsedVault, parseVault } from "@/fetchers/parseVault";
import { VAULTS_PACKAGE_ID, VAULT_OWNER } from "@/lib/constants";

export default function useFetchVaults() {
  const { suiClient } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();
  const { address } = useWalletContext();

  const fetcher = async (): Promise<ParsedVault[]> => {
    const res = await suiClient.getOwnedObjects({
      owner: VAULT_OWNER,
      options: { showContent: true },
      filter: {
        MoveModule: {
          package: VAULTS_PACKAGE_ID,
          module: "vault",
        },
      },
    });

    const items: ParsedVault[] = [];
    for (const o of res.data) {
      const fields = (o.data?.content as any)?.fields;
      if (fields?.vault_id)
        try {
          const parsedVault = await parseVault(
            suiClient,
            fields.vault_id,
            allAppData,
            address,
            o.data?.objectId,
          );
          items.push(parsedVault);
        } catch (error) {
          console.error("Error parsing vault", error);
          continue;
        }
    }
    return items;
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<
    ParsedVault[]
  >(["vaultsByOwner", VAULT_OWNER, address], fetcher);

  console.log("error", error);

  return { data: data ?? [], isLoading, isValidating, error, mutate };
}
