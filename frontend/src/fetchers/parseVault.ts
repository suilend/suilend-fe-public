import BigNumber from "bignumber.js";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

import { VAULTS_PACKAGE_ID, VAULT_OWNER } from "@/lib/constants";

export type ParsedObligation = {
  obligationId: string;
  lendingMarketId?: string;
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
  object: SuiObjectResponse;
};

export const extractVaultBaseCoinType = (typeStr?: string): string | undefined => {
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

export const parseVault = async (
  suiClient: SuiClient,
  vaultId: string,
): Promise<ParsedVault> => {
  const res = await suiClient.getObject({ id: vaultId, options: { showContent: true } });
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
    const marketType = keyName ? `0x${keyName}` : "";
    const valueArr: any[] = entry.fields?.value ?? [];
    for (let i = 0; i < valueArr.length; i++) {
      const od = valueArr[i];
      const obligationId: string | undefined = od.fields?.obligation_id;
      if (!obligationId) continue;
      obligations.push({
        obligationId,
        lendingMarketId: marketType ? typeToLmId[marketType] : undefined,
        marketType,
        deployedAmount: new BigNumber(0),
        index: i,
      });
    }
  }

  // Compute deployed (net base) per obligation via devInspect using helper fns in vault module
  if (baseCoinType && obligations.length > 0) {
    // Detect decimals once for base
    let decimals = 9;
    try {
      const md = await suiClient.getCoinMetadata({ coinType: baseCoinType });
      if (md?.decimals !== undefined) decimals = md.decimals;
    } catch {}

    // Helper to detect lending market module path from object type
    const detectLmModule = async (lmId: string): Promise<string | undefined> => {
      const lm = await suiClient.getObject({ id: lmId, options: { showContent: true } });
      const typeStr = (lm.data?.content as any)?.type as string | undefined;
      if (!typeStr) return undefined;
      const lmBase = "::lending_market::LendingMarket";
      const idx = typeStr.indexOf(lmBase);
      if (idx === -1) return undefined;
      const pkg = typeStr.substring(0, idx);
      return `${pkg}::lending_market`;
    };

    for (const o of obligations) {
      if (!o.lendingMarketId || !o.marketType) continue;
      const lmModule = await detectLmModule(o.lendingMarketId);
      if (!lmModule) continue;
      try {
        const tx = new Transaction();
        const lmObj = tx.object(o.lendingMarketId);
        const [obRef] = tx.moveCall({
          target: `${lmModule}::obligation`,
          typeArguments: [o.marketType],
          arguments: [lmObj, tx.pure.id(o.obligationId)],
        });
        const [netBase] = tx.moveCall({
          target: `${VAULTS_PACKAGE_ID}::vault::calculate_obligation_net_value`,
          typeArguments: [o.marketType, baseCoinType],
          arguments: [obRef, lmObj],
        });

        const di = await (suiClient as any).devInspectTransactionBlock({
          sender: VAULT_OWNER,
          transactionBlock: tx,
        });
        // devInspect returns results with returnValues; get last move call result
        const results = di?.results as any[] | undefined;
        const ret = results?.[results.length - 1]?.returnValues?.[0];
        const valueBytes = ret?.[0] as number[] | undefined;
        if (valueBytes) {
          // BCS u64 is LE; JS SDK returns decoded as number in some versions; we fallback to parse BigInt from bytes
          // Simplify: Many SDKs also provide parsed value in di.effects or di.results[...].returnValues[0][1]
          const parsed = BigInt(Buffer.from(valueBytes).readBigUInt64LE?.() ?? 0n);
          const human = new BigNumber(parsed.toString()).div(10 ** decimals);
          o.deployedAmount = human;
        }
      } catch {
        // keep default 0 on failure
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
    object: res,
  };
};


