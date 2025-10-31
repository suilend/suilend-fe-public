import { CoinMetadata, SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

import { LENDING_MARKET_ID, SuilendClient, WAD } from "@suilend/sdk";

import { AllAppData } from "@/contexts/AppContext";
import { VAULT_METADATA, VaultMetadata } from "@/contexts/VaultContext";
import { VAULTS_PACKAGE_ID, VAULT_OWNER } from "@/lib/constants";

export type ParsedObligation = {
  obligationId: string;
  lendingMarketId: string;
  marketType: string;
  deployedAmount: BigNumber; // base units (currently 0 as placeholder)
  apr: BigNumber;
  index: number;
};

interface VaultFields {
  id: { id: string };
  version: string;
  obligations: any;
  share_supply: any;
  deposit_asset: any;
  total_shares: string;
  fee_receiver: string;
  management_fee_bps: string;
  performance_fee_bps: string;
  deposit_fee_bps: string;
  withdrawal_fee_bps: string;
  utilization_rate_bps: string;
  last_nav_per_share: string;
  fee_last_update_timestamp_s: string;
}

export type ParsedVault = {
  id: string;
  baseCoinType: string;
  undeployedAmount: BigNumber;
  deployedAmount: BigNumber;
  tvl: BigNumber;
  totalShares: string;
  managementFeeBps: string;
  performanceFeeBps: string;
  depositFeeBps: string;
  withdrawalFeeBps: string;
  utilizationRateBps: string;
  lastNavPerShare: string;
  feeLastUpdateTimestampS: string;
  baseCoinMetadata: CoinMetadata | null;
  apr: BigNumber;
  obligations: ParsedObligation[];
  pricingLendingMarketId?: string;
  pricingLendingMarketType?: string;
  shareType: string;
  metadata: VaultMetadata | undefined;
  managerCapId?: string;
  userShares: BigNumber;
  navPerShare: BigNumber;
  userSharesBalance: BigNumber;
  utilization: BigNumber;
  new?: boolean;
};

export const extractVaultGenerics = (
  typeStr: string,
): { shareType?: string; baseType?: string } | undefined => {
  const anchor = `${VAULTS_PACKAGE_ID}::vault::Vault<`;
  const start = typeStr.indexOf(anchor);
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
  return { shareType: args[0], baseType: args[1] };
};

export async function findManagerCapIdForVault(
  vaultId: string,
  suiClient: SuiClient,
  address?: string,
) {
  if (!address) return undefined;
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
  const match = res.data.find(
    (o) => (o.data?.content as any)?.fields?.vault_id === vaultId,
  );
  return match?.data?.objectId as string | undefined;
}

export const parseVault = async (
  suiClient: SuiClient,
  vaultId: string,
  allAppData: AllAppData,
  address?: string,
  managerCapId?: string,
): Promise<ParsedVault> => {
  const res = await suiClient.getObject({
    id: vaultId,
    options: { showContent: true },
  });
  const content = res.data?.content as any;
  const fields = (content?.fields as VaultFields) ?? {};
  const id = fields.id?.id ?? vaultId;

  const typeStr: string | undefined = content?.type;
  if (!typeStr) throw new Error("Invalid vault");

  const vaultTypes = extractVaultGenerics(typeStr);
  const baseCoinType = vaultTypes?.baseType;
  if (!baseCoinType) {
    throw new Error("Failed to detect base coin type");
  }
  if (!vaultTypes?.shareType) {
    throw new Error("Failed to detect share type");
  }
  // Undeployed amount (Balance<T>)
  let decimals = 9;
  let md: CoinMetadata | null = null;
  if (baseCoinType) {
    try {
      md = await suiClient.getCoinMetadata({ coinType: baseCoinType });
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
        apr: new BigNumber(0),
      });
    }
  }

  let interestSum: BigNumber = new BigNumber(0);

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

        const market = allAppData.allLendingMarketData[o.lendingMarketId];

        const obligationInterestSum = rawObligation.deposits.reduce(
          (acc, d) =>
            acc.plus(
              new BigNumber(d.marketValue.value.toString())
                .div(WAD)
                .times(
                  market.reserveMap[`0x${d.coinType.name}`].depositAprPercent,
                ),
            ),
          new BigNumber(0),
        );

        const depositedUsd = new BigNumber(
          rawObligation.depositedValueUsd.value.toString(),
        ).div(WAD);
        const borrowedUsd = new BigNumber(
          rawObligation.unweightedBorrowedValueUsd.value.toString(),
        ).div(WAD);

        const netUsd = depositedUsd.minus(borrowedUsd);
        o.deployedAmount = netUsd;
        interestSum = interestSum.plus(obligationInterestSum);
        o.apr = obligationInterestSum.div(netUsd);
      } catch (e) {
        console.log("error", e);
      }
    }
  }

  const deployedAmount = obligations.reduce(
    (acc, o) => acc.plus(o.deployedAmount),
    new BigNumber(0),
  );

  const baseAssetPrice =
    allAppData.allLendingMarketData[LENDING_MARKET_ID].reserveMap[baseCoinType]
      .price;

  // User shares (sum of all Coin<shareType> balances)
  let userShares = new BigNumber(0);
  if (address) {
    try {
      let nextCursor: string | null | undefined = undefined;
      let hasNextPage = true;
      while (hasNextPage) {
        const coinsRes = await suiClient.getCoins({
          owner: address,
          coinType: vaultTypes!.shareType as string,
          cursor: nextCursor ?? undefined,
          limit: 200,
        });
        for (const c of coinsRes.data ?? []) {
          userShares = userShares.plus(c.balance ?? 0);
        }
        hasNextPage = !!coinsRes.hasNextPage;
        nextCursor = coinsRes.nextCursor;
      }
    } catch (error) {
      console.log("error", error);
    }
  }

  const totalAmount = deployedAmount.plus(undeployedAmount);
  const tvl = totalAmount.times(baseAssetPrice);
  const navPerShare = deployedAmount.plus(undeployedAmount).div(userShares);
  const utilization = deployedAmount.div(totalAmount);

  return {
    id,
    baseCoinType,
    shareType: vaultTypes.shareType,
    undeployedAmount,
    deployedAmount,
    tvl,
    utilization,
    totalShares: fields.total_shares,
    managementFeeBps: fields.management_fee_bps,
    performanceFeeBps: fields.performance_fee_bps,
    depositFeeBps: fields.deposit_fee_bps,
    withdrawalFeeBps: fields.withdrawal_fee_bps,
    utilizationRateBps: fields.utilization_rate_bps,
    lastNavPerShare: fields.last_nav_per_share,
    feeLastUpdateTimestampS: fields.fee_last_update_timestamp_s,
    apr: interestSum.div(tvl),
    baseCoinMetadata: md,
    obligations,
    pricingLendingMarketId: obligations.find((o) => !!o.lendingMarketId)
      ?.lendingMarketId,
    pricingLendingMarketType: obligations.find((o) => !!o.lendingMarketId)
      ?.marketType,
    metadata: VAULT_METADATA[vaultId],
    managerCapId:
      managerCapId ??
      (await findManagerCapIdForVault(vaultId, suiClient, address)) ??
      undefined,
    userShares,
    navPerShare,
    userSharesBalance: userShares.times(navPerShare),
  };
};
