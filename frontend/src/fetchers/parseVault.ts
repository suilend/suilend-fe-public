import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";

import { SuilendClient, WAD } from "@suilend/sdk";
import { getAllOwnedObjects } from "@suilend/sui-fe";

import { VAULTS_PACKAGE_ID, VAULT_OWNER } from "@/lib/constants";

export type ParsedObligation = {
  obligationId: string;
  lendingMarketId: string;
  marketType: string;
  deployedAmount: BigNumber; // base units (currently 0 as placeholder)
  index: number;
};

export type ParsedVault = {
  id: string;
  baseCoinType?: string;
  undeployedAmount: BigNumber;
  deployedAmount: BigNumber;
  obligations: ParsedObligation[];
  pricingLendingMarketId?: string;
  pricingLendingMarketType?: string;
  object: SuiObjectResponse;
  managerCapId?: string;
};

export const extractVaultBaseCoinType = (
  typeStr?: string,
): string | undefined => {
  if (!typeStr) return undefined;
  const anchor = `${VAULTS_PACKAGE_ID}::vault::Vault<`;
  const start = typeStr.indexOf(anchor);
  if (start === -1) return undefined;
  let i = start + anchor.length;
  let depth = 0;
  const args: string[] = [];
  let current = "";
  for (; i < typeStr.length; i++) {
    const ch = typeStr[i];
    if (ch === "<") depth++;
    if (ch === ">") {
      if (depth === 0) {
        args.push(current.trim());
        break;
      }
      depth--;
    }
    if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    if (!(ch === ">" && depth === -1)) current += ch;
  }
  return args[1];
};

async function findManagerCapIdForVault(
  vaultId: string,
  suiClient: SuiClient,
  address: string,
) {
  if (!address) throw new Error("Wallet not connected");
  const managerCapStructType = `${VAULTS_PACKAGE_ID}::vault::VaultManagerCap<${VAULTS_PACKAGE_ID}::vault::VaultShare>`;
  const objs = await getAllOwnedObjects(suiClient, address, {
    StructType: managerCapStructType,
  });
  const match = objs.find(
    (o) => (o.data?.content as any)?.fields?.vault_id === vaultId,
  );
  return match?.data?.objectId as string | undefined;
}

export const parseVault = async (
  suiClient: SuiClient,
  vaultId: string,
  address?: string,
): Promise<ParsedVault> => {
  const res = await suiClient.getObject({
    id: vaultId,
    options: { showContent: true },
  });
  const content = res.data?.content as any;
  const fields = content?.fields ?? {};
  const id = fields.id?.id ?? vaultId;

  const typeStr: string | undefined = content?.type;
  const baseCoinType = extractVaultBaseCoinType(typeStr);

  // Undeployed amount (Balance<T>)
  let decimals = 9;
  if (baseCoinType) {
    try {
      const md = await suiClient.getCoinMetadata({ coinType: baseCoinType });
      if (md?.decimals !== undefined) decimals = md.decimals;
    } catch {}
  }
  const depositAssetRaw = fields?.deposit_asset ?? "0";
  const undeployedAmount = new BigNumber(String(depositAssetRaw)).div(
    10 ** decimals,
  );

  // Obligations via VecMap
  const registryParentId =
    "0xdc00dfa5ea142a50f6809751ba8dcf84ae5c60ca5f383e51b3438c9f6d72a86e";
  const df = await suiClient.getDynamicFields({ parentId: registryParentId });
  const entries = await Promise.all(
    df.data.map(async ({ objectId }) =>
      suiClient.getObject({ id: objectId, options: { showContent: true } }),
    ),
  );
  const typeToLmId: Record<string, string> = {};
  for (const e of entries) {
    const c = e.data?.content as any;
    if (!c) continue;
    const lmId: string = c.fields.value;
    const lmType: string = `0x${c.fields.name.fields.name}`;
    typeToLmId[lmType] = lmId;
  }

  const oblFields = fields?.obligations?.fields;
  const vmContents = oblFields?.contents ?? oblFields?.values ?? [];
  const obligations: ParsedObligation[] = [];
  for (const entry of vmContents) {
    const keyName = entry.fields?.key?.fields?.name as string | undefined;
    if (!keyName) throw new Error("Invalid obligation entry");
    const marketType = `0x${keyName}`;
    const valueArr: any[] = entry.fields?.value ?? [];

    for (let i = 0; i < valueArr.length; i++) {
      const od = valueArr[i];
      const obligationId: string | undefined = od.fields?.obligation_id;
      if (!obligationId) continue;
      obligations.push({
        obligationId,
        lendingMarketId: typeToLmId[marketType],
        marketType,
        deployedAmount: new BigNumber(0),
        index: i,
      });
    }
  }

  // Compute deployed (net USD) per obligation by reading the obligation
  if (obligations.length > 0) {
    for (const o of obligations) {
      try {
        if (!o.obligationId || !o.marketType) continue;
        const rawObligation = await SuilendClient.getObligation(
          o.obligationId,
          [o.marketType],
          suiClient,
        );

        const depositedUsd = new BigNumber(
          rawObligation.depositedValueUsd.value.toString(),
        ).div(WAD);
        const borrowedUsd = new BigNumber(
          rawObligation.unweightedBorrowedValueUsd.value.toString(),
        ).div(WAD);

        const netUsd = depositedUsd.minus(borrowedUsd);
        o.deployedAmount = netUsd;
      } catch (e) {
        console.log("error", e);
      }
    }
  }

  const deployedAmount = obligations.reduce(
    (acc, o) => acc.plus(o.deployedAmount),
    new BigNumber(0),
  );

  return {
    id,
    baseCoinType,
    undeployedAmount,
    deployedAmount,
    obligations,
    pricingLendingMarketId: obligations.find((o) => !!o.lendingMarketId)
      ?.lendingMarketId,
    pricingLendingMarketType: obligations.find((o) => !!o.lendingMarketId)
      ?.marketType,
    object: res,
    managerCapId: address
      ? await findManagerCapIdForVault(vaultId, suiClient, address)
      : undefined,
  };
};
